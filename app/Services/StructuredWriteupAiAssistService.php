<?php

namespace App\Services;

use App\Exceptions\AiServiceException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

final class StructuredWriteupAiAssistService
{
    private const MAX_INPUT_LENGTH = 40_000;
    private const MAX_RESPONSE_LENGTH = 256_000;
    private const MAX_ITEMS = 50;
    private const MAX_QUESTIONS = 200;
    private const MAX_REFERENCES = 5;
    private const MAX_REFERENCE_TEXT = 600;
    private const MAX_REFERENCE_LIST_ITEMS = 8;
    private const MAX_REFERENCE_CONTEXT = 12_000;
    private const MAX_STRING = 20_000;

    /**
     * Structured AI Assist (suggestion only, never writes to storage).
     *
     * - `$writeup` adalah CURRENT (source-of-truth) yang mau dirapikan.
     * - `$references` hanya KONTEKS: digest ringkas per-reference; isi teknis
     *   (evidence, command/output/result, notes) tidak dikirim ke AI.
     * - Hasil berupa PATCH yang digabung ke data asli; field yang diragukan AI
     *   dibiarkan kosong sehingga fakta asli tetap dipertahankan.
     *
     * @param array<string,mixed> $writeup
     * @param array<int,mixed> $references
     */
    public function structure(string $title, array $writeup, array $references = []): StructuredWriteupAiAssistResult
    {
        $started = microtime(true);
        $baseUrl = rtrim((string) config('services.ollama.base_url'), '/');
        $model = (string) config('services.ollama.model');
        $timeout = max(1, (int) config('services.ollama.timeout'));

        $original = $this->normalize($writeup);

        // Reference = konteks ringkas. Budget total dibatasi; reference yang
        // tidak muat dijatuhkan (bukan dipotong acak) agar JSON tetap valid.
        $referenceContext = $this->buildReferenceContext($references);

        $input = json_encode(
            [
                'current' => [
                    'title' => mb_substr($title, 0, 255),
                    'writeup' => $original,
                ],
                'references' => json_decode($referenceContext['data'], true) ?? [],
            ],
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );

        if (!is_string($input)) {
            throw new AiServiceException(AiServiceException::INVALID_RESPONSE);
        }

        $input = mb_substr($input, 0, self::MAX_INPUT_LENGTH);

        $prompt = <<<PROMPT
Kamu editor writeup cybersecurity. Kembalikan PATCH JSON untuk merapikan CURRENT WRITEUP.

Aturan:
- Jangan mengarang fakta teknis.
- Jangan mengubah atau membuat credential, password, URL, IP, port, command, output, evidence, CVE, vulnerability, impact, atau hasil.
- Pertahankan urutan kejadian.
- REFERENCE hanya konteks tambahan. Jangan pindahkan fakta reference ke CURRENT, dan jangan menambahkan fakta dari reference.
- Jika tidak yakin atau faktanya tidak ada di CURRENT, field harus kosong ("" atau []).
- Jangan gunakan Markdown. Semua string plain text.
- Steps: jika bisa disusun hanya dari fakta CURRENT, kirim daftar langkah; jika tidak, kirim [].
- Questions: TIDAK wajib. Hanya kirim daftar questions jika CURRENT dengan jelas menyebutkan lebih dari satu tujuan/soal/flag yang bisa dipecah menjadi unit pekerjaan. Isi hanya 'question' dan 'notes' (analisis). JANGAN mengisi result/steps/evidence/status — itu fakta teknis dan tetap kosong.
- Jangan menyertakan command/output/result/evidence arcara apapun dalam PATCH.
- Return JSON saja, tanpa teks lain.

PATCH schema:
{"goal":{"problem":"","objective":"","proof":""},"environment":{"target":"","environment":"","host":"","application":"","os":"","tools":"","scope":""},"steps":[{"title":"","question":"","goal":"","approach":"","interpretation":""}],"lessonLearned":{"learned":"","patterns":"","mistakes":"","concepts":"","different":"","relevance":""},"notes":"","questions":[{"question":"","notes":""}]}

CURRENT + REFERENCES:
{$input}
PROMPT;

        try {
            $response = Http::acceptJson()
                ->timeout($timeout)
                ->connectTimeout(5)
                ->post($baseUrl . '/api/generate', [
                    'model' => $model,
                    'prompt' => $prompt,
                    'stream' => false,
                    'format' => 'json',
                    'think' => false,
                    'options' => [
                        'temperature' => 0.1,
                        'num_predict' => 600,
                    ],
                ]);
        } catch (ConnectionException $e) {
            $this->logFailure('connection_failed', $model, $started);

            if (preg_match('/timed?\s*out|timeout/i', $e->getMessage())) {
                throw new AiServiceException(AiServiceException::TIMEOUT, '', $e);
            }

            throw new AiServiceException(AiServiceException::UNAVAILABLE, '', $e);
        } catch (\Throwable $e) {
            $this->logFailure('request_failed', $model, $started);
            throw new AiServiceException(AiServiceException::UNAVAILABLE, '', $e);
        }

        if ($response->status() === 404) {
            $this->logFailure('model_not_found', $model, $started);
            throw new AiServiceException(AiServiceException::MODEL_UNAVAILABLE);
        }

        if ($response->failed()) {
            $this->logFailure('ollama_error_' . $response->status(), $model, $started);
            throw new AiServiceException(AiServiceException::UNAVAILABLE);
        }

        $raw = (string) $response->json('response');

        if ($raw === '' || strlen($raw) > self::MAX_RESPONSE_LENGTH) {
            $this->logFailure('response_out_of_bounds', $model, $started);
            throw new AiServiceException(AiServiceException::INVALID_RESPONSE);
        }

        try {
            $json = $this->extractJsonObject($raw);
            $decoded = $json === null ? null : json_decode($json, true, 512, JSON_THROW_ON_ERROR);

            if (!is_array($decoded)) {
                throw new \RuntimeException('AI response is not an object.');
            }

            $patch = $this->normalizePatch($decoded);
            $merged = $this->applyPatch($original, $patch);

            $warnings = $this->buildWarnings($original, $merged);

            if ($original['questions'] !== [] && $patch['questions'] !== []) {
                $warnings[] = 'Daftar Questions/Objectives asli dipertahankan — AI tidak menimpa unit pekerjaan yang sudah ada.';
            }

            if ($referenceContext['dropped'] > 0) {
                $warnings[] = sprintf(
                    '%d reference dipotong agar tidak melebihi batas konteks AI.',
                    $referenceContext['dropped']
                );
            }

            return new StructuredWriteupAiAssistResult($merged, $warnings);
        } catch (\Throwable $e) {
            Log::error('Structured writeup AI parse failed', [
                'exception' => get_class($e),
                'message' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
                'trace' => $e->getTraceAsString(),
            ]);

            $this->logFailure('response_parse_failed', $model, $started);

            throw new AiServiceException(
                AiServiceException::INVALID_RESPONSE,
                '',
                $e
            );
        }
    }

    // ---------------------------------------------------------------------
    // Reference → digest konteks ringkas (bukan sumber fakta)
    // ---------------------------------------------------------------------

    /**
     * Reference diflatkan menjadi digest kecil berisi informasi pendekatan
     * saja. Evidence, command/output/result, error mentah, dan notes TIDAK
     * dikirim — reference hanya boleh mempengaruhi cara penyusunan teks,
     * bukan isi teknis current writeup.
     *
     * @param array<int,mixed> $references
     * @return array{data: string, dropped: int}
     */
    private function buildReferenceContext(array $references): array
    {
        $digests = $this->digestReferences($references);

        if ($digests === []) {
            return ['data' => '[]', 'dropped' => 0];
        }

        $json = json_encode($digests, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if (is_string($json) && mb_strlen($json) <= self::MAX_REFERENCE_CONTEXT) {
            return ['data' => $json, 'dropped' => 0];
        }

        // Pastikan output selalu JSON yang valid: jatuhkan reference dari
        // belakang sampai total konteks muat dalam budget.
        $dropped = 0;
        for ($count = count($digests) - 1; $count >= 0; $count--) {
            $dropped = count($digests) - $count;
            $json = json_encode(
                array_slice($digests, 0, $count),
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            );

            if (is_string($json) && mb_strlen($json) <= self::MAX_REFERENCE_CONTEXT) {
                return ['data' => $json, 'dropped' => $dropped];
            }
        }

        // Fallback keamanan: pastikan selalu ada nilai default yang valid.
        return ['data' => '[]', 'dropped' => count($digests)];
    }

    /**
     * @param array<int,mixed> $references
     * @return list<array<string,mixed>>
     */
    private function digestReferences(array $references): array
    {
        $out = [];

        foreach ($references as $reference) {
            if (count($out) >= self::MAX_REFERENCES || !is_array($reference)) {
                break;
            }

            $writeup = is_array($reference['writeup'] ?? null)
                ? $this->digestReference($this->normalize($reference['writeup']))
                : [];

            $out[] = [
                'id' => is_numeric($reference['id'] ?? null) ? (int) $reference['id'] : 0,
                'title' => is_string($reference['title'] ?? null) ? mb_substr(trim($reference['title']), 0, 255) : '',
                'lab' => is_string($reference['lab'] ?? null) ? mb_substr(trim($reference['lab']), 0, 255) : '',
                'kategori' => is_string($reference['kategori'] ?? null) ? mb_substr(trim($reference['kategori']), 0, 255) : '',
                'writeup' => $writeup,
            ];
        }

        return $out;
    }

    /**
     * Ringkasan konteks sebuah writeup — hanya field deskriptif.
     *
     * @param array<string,mixed> $writeup
     * @return array<string,mixed>
     */
    private function digestReference(array $writeup): array
    {
        $text = fn (mixed $value): string => is_string($value)
            ? mb_substr(trim($value), 0, self::MAX_REFERENCE_TEXT)
            : '';

        $list = function (mixed $items, callable $map) use (&$list): array {
            if (!is_array($items)) {
                return [];
            }

            $out = [];
            foreach ($items as $item) {
                if (!is_array($item)) {
                    continue;
                }

                $row = $map($item);
                if ($row === '') {
                    continue;
                }

                $out[] = $row;
                if (count($out) >= self::MAX_REFERENCE_LIST_ITEMS) {
                    break;
                }
            }

            return $out;
        };

        $goal = $writeup['goal'] ?? [];
        $env = $writeup['environment'] ?? [];
        $lesson = $writeup['lessonLearned'] ?? [];

        return [
            'goal' => [
                'problem' => $text($goal['problem'] ?? ''),
                'objective' => $text($goal['objective'] ?? ''),
                'proof' => $text($goal['proof'] ?? ''),
            ],
            'environment' => [
                'target' => $text($env['target'] ?? ''),
                'environment' => $text($env['environment'] ?? ''),
                'os' => $text($env['os'] ?? ''),
                'tools' => $text($env['tools'] ?? ''),
                'scope' => $text($env['scope'] ?? ''),
            ],
            'hypotheses' => $list($writeup['hypotheses'] ?? null, fn (array $item): string => $text($item['text'] ?? '')),
            'steps' => $list($writeup['steps'] ?? null, function (array $item) use ($text): string {
                return implode(' | ', array_values(array_filter([
                    $text($item['title'] ?? ''),
                    $text($item['question'] ?? ''),
                    $text($item['approach'] ?? ''),
                    $text($item['interpretation'] ?? ''),
                ])));
            }),
            'experiments' => $list($writeup['experiments'] ?? null, function (array $item) use ($text): string {
                return implode(' | ', array_values(array_filter([
                    $text($item['hypothesis'] ?? ''),
                    $text($item['approach'] ?? ''),
                    $text($item['whyFailed'] ?? ''),
                    $text($item['interpretation'] ?? ''),
                ])));
            }),
            'strategyChanges' => $list($writeup['strategyChanges'] ?? null, fn (array $item): string => $text($item['text'] ?? '')),
            'riskImpact' => $text($writeup['riskImpact'] ?? ''),
            'recommendations' => $list($writeup['recommendations'] ?? null, fn (array $item): string => $text($item['text'] ?? '')),
            'lessonLearned' => [
                'learned' => $text($lesson['learned'] ?? ''),
                'patterns' => $text($lesson['patterns'] ?? ''),
                'mistakes' => $text($lesson['mistakes'] ?? ''),
                'relevance' => $text($lesson['relevance'] ?? ''),
            ],
            'questions' => $list($writeup['questions'] ?? null, function (array $item) use ($text): string {
                return implode(' | ', array_values(array_filter([
                    $text($item['question'] ?? ''),
                    $text($item['notes'] ?? ''),
                ])));
            }),
        ];
    }

    private function extractJsonObject(string $raw): ?string
    {
        $raw = trim($raw);

        if (preg_match('/^```(?:json)?\s*(.*?)\s*```$/is', $raw, $m)) {
            $raw = trim($m[1]);
        }

        $start = strpos($raw, '{');
        $end = strrpos($raw, '}');

        if ($start === false || $end === false || $end <= $start) {
            return null;
        }

        return substr($raw, $start, $end - $start + 1);
    }

    /**
     * @param array<string,mixed> $value
     * @return array<string,mixed>
     */
    private function normalize(array $value): array
    {
        $str = fn(mixed $v): string => is_string($v) ? mb_substr(trim($v), 0, self::MAX_STRING) : '';

        $nested = fn(mixed $v): array => is_array($v) ? $v : [];

        $normalizeList = function (mixed $value, callable $mapper): array {
            if (!is_array($value)) {
                return [];
            }

            $out = [];
            foreach ($value as $item) {
                if (count($out) >= self::MAX_ITEMS || !is_array($item)) {
                    if (count($out) >= self::MAX_ITEMS) {
                        break;
                    }
                    continue;
                }
                $out[] = $mapper($item);
            }
            return $out;
        };

        $goal = $nested($value['goal'] ?? null);
        $env = $nested($value['environment'] ?? null);
        $lesson = $nested($value['lessonLearned'] ?? null);

        $hypotheses = $normalizeList($value['hypotheses'] ?? null, function (array $i) use ($str) {
            $status = in_array($str($i['status'] ?? ''), ['hypothesis', 'verified', 'rejected'], true)
                ? $str($i['status'])
                : 'hypothesis';
            return ['id' => '', 'text' => $str($i['text'] ?? ''), 'status' => $status];
        });

        $mapStep = function (array $i) use ($str) {
            $type = in_array($str($i['type'] ?? ''), ['hypothesis', 'test', 'fact', 'result'], true)
                ? $str($i['type'])
                : 'test';
            return [
                'id' => '',
                'title' => $str($i['title'] ?? ''),
                'question' => $str($i['question'] ?? ''),
                'goal' => $str($i['goal'] ?? ''),
                'approach' => $str($i['approach'] ?? ''),
                'command' => $str($i['command'] ?? ''),
                'output' => $str($i['output'] ?? ''),
                'result' => $str($i['result'] ?? ''),
                'interpretation' => $str($i['interpretation'] ?? ''),
                'type' => $type,
            ];
        };

        $steps = $normalizeList($value['steps'] ?? null, $mapStep);

        $experiments = $normalizeList($value['experiments'] ?? null, function (array $i) use ($str) {
            $status = in_array($str($i['status'] ?? ''), ['successful', 'failed', 'inconclusive'], true)
                ? $str($i['status'])
                : 'inconclusive';
            return [
                'id' => '',
                'status' => $status,
                'hypothesis' => $str($i['hypothesis'] ?? ''),
                'approach' => $str($i['approach'] ?? ''),
                'command' => $str($i['command'] ?? ''),
                'expected' => $str($i['expected'] ?? ''),
                'actual' => $str($i['actual'] ?? ''),
                'error' => $str($i['error'] ?? ''),
                'whyFailed' => $str($i['whyFailed'] ?? ''),
                'changed' => $str($i['changed'] ?? ''),
                'interpretation' => $str($i['interpretation'] ?? ''),
            ];
        });

        $mapEvidence = function (array $i) use ($str) {
            $kind = in_array($str($i['kind'] ?? ''), ['command', 'output', 'request', 'response', 'error', 'log', 'lainya'], true)
                ? $str($i['kind'])
                : 'log';
            return [
                'id' => '',
                'label' => $str($i['label'] ?? ''),
                'kind' => $kind,
                'content' => $str($i['content'] ?? ''),
            ];
        };

        $evidence = $normalizeList($value['evidence'] ?? null, $mapEvidence);

        $questions = $normalizeList($value['questions'] ?? null, function (array $item) use ($str, $normalizeList, $mapStep, $mapEvidence) {
            $status = in_array($str($item['status'] ?? ''), ['unsolved', 'in_progress', 'solved'], true)
                ? $str($item['status'])
                : 'unsolved';

            return [
                'id' => '',
                'order' => 0,
                'question' => $str($item['question'] ?? ''),
                'notes' => $str($item['notes'] ?? ''),
                'status' => $status,
                'result' => $str($item['result'] ?? ''),
                'steps' => $normalizeList($item['steps'] ?? null, $mapStep),
                'evidence' => $normalizeList($item['evidence'] ?? null, $mapEvidence),
            ];
        });

        $textItems = function (mixed $items) use ($str): array {
            if (!is_array($items)) {
                return [];
            }
            $out = [];
            foreach ($items as $item) {
                if (count($out) >= self::MAX_ITEMS) {
                    break;
                }
                if (is_string($item)) {
                    $text = $str($item);
                } elseif (is_array($item)) {
                    $text = $str($item['text'] ?? '');
                } else {
                    continue;
                }
                if ($text !== '') {
                    $out[] = ['id' => '', 'text' => $text];
                }
            }
            return $out;
        };

        return [
            'goal' => [
                'problem' => $str($goal['problem'] ?? ''),
                'objective' => $str($goal['objective'] ?? ''),
                'proof' => $str($goal['proof'] ?? ''),
            ],
            'environment' => [
                'target' => $str($env['target'] ?? ''),
                'environment' => $str($env['environment'] ?? ''),
                'host' => $str($env['host'] ?? ''),
                'application' => $str($env['application'] ?? ''),
                'os' => $str($env['os'] ?? ''),
                'tools' => $str($env['tools'] ?? ''),
                'scope' => $str($env['scope'] ?? ''),
            ],
            'hypotheses' => $hypotheses,
            'steps' => $steps,
            'experiments' => $experiments,
            'evidence' => $evidence,
            'strategyChanges' => $textItems($value['strategyChanges'] ?? null),
            'riskImpact' => $str($value['riskImpact'] ?? ''),
            'recommendations' => $textItems($value['recommendations'] ?? null),
            'lessonLearned' => [
                'learned' => $str($lesson['learned'] ?? ''),
                'patterns' => $str($lesson['patterns'] ?? ''),
                'mistakes' => $str($lesson['mistakes'] ?? ''),
                'concepts' => $str($lesson['concepts'] ?? ''),
                'different' => $str($lesson['different'] ?? ''),
                'relevance' => $str($lesson['relevance'] ?? ''),
            ],
            'references' => $str($value['references'] ?? ''),
            'notes' => $str($value['notes'] ?? ''),
            'questions' => $questions,
        ];
    }

    /**
     * Normalize only fields allowed in the compact AI patch.
     *
     * Field teknis (command/output/result) sengaja TIDAK diterima dari AI —
     * fakta teknis tetap sepenuhnya di tangan user/source-of-truth.
     *
     * @param array<string,mixed> $value
     * @return array<string,mixed>
     */
    private function normalizePatch(array $value): array
    {
        $clean = fn(mixed $v): string => $this->cleanAiText(
            is_string($v) ? mb_substr(trim($v), 0, self::MAX_STRING) : ''
        );

        $nested = fn(mixed $v): array => is_array($v) ? $v : [];

        $out = [
            'goal' => [],
            'environment' => [],
            'steps' => [],
            'lessonLearned' => [],
            'notes' => '',
            'questions' => [],
        ];

        $goal = $nested($value['goal'] ?? null);
        foreach (['problem', 'objective', 'proof'] as $key) {
            $v = $clean($goal[$key] ?? '');
            if ($v !== '') $out['goal'][$key] = $v;
        }

        $env = $nested($value['environment'] ?? null);
        foreach (['target', 'environment', 'host', 'application', 'os', 'tools', 'scope'] as $key) {
            $v = $clean($env[$key] ?? '');
            if ($v !== '') $out['environment'][$key] = $v;
        }

        if (is_array($value['steps'] ?? null)) {
            foreach ($value['steps'] as $item) {
                if (!is_array($item)) continue;
                $step = [];
                foreach (['title', 'question', 'goal', 'approach', 'interpretation'] as $key) {
                    $v = $clean($item[$key] ?? '');
                    if ($v !== '') $step[$key] = $v;
                }
                if ($step !== []) $out['steps'][] = $step;
                if (count($out['steps']) >= self::MAX_ITEMS) break;
            }
        }

        $lesson = $nested($value['lessonLearned'] ?? null);
        foreach (['learned', 'patterns', 'mistakes', 'concepts', 'different', 'relevance'] as $key) {
            $v = $clean($lesson[$key] ?? '');
            if ($v !== '') $out['lessonLearned'][$key] = $v;
        }

        $out['notes'] = $clean($value['notes'] ?? '');

        // Questions: AI hanya boleh menyarankan 'question' + 'notes' (analisis).
        // Result/steps/evidence/status TIDAK diterima — fakta teknis milik user.
        if (is_array($value['questions'] ?? null)) {
            foreach ($value['questions'] as $item) {
                if (! is_array($item)) {
                    continue;
                }

                $q = [];
                foreach (['question', 'notes'] as $key) {
                    $v = $clean($item[$key] ?? '');
                    if ($v !== '') {
                        $q[$key] = $v;
                    }
                }

                if ($q === []) {
                    continue;
                }

                $out['questions'][] = $q;
                if (count($out['questions']) >= self::MAX_QUESTIONS) {
                    break;
                }
            }
        }

        return $out;
    }

    private function cleanAiText(string $text): string
    {
        $text = preg_replace('/\*\*(.*?)\*\*/s', '$1', $text) ?? $text;
        $text = preg_replace('/__(.*?)__/s', '$1', $text) ?? $text;
        $text = preg_replace('/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/i', '$1 ($2)', $text) ?? $text;
        $text = preg_replace('/`([^`]+)`/', '$1', $text) ?? $text;
        return trim($text);
    }

    /**
     * Apply only non-empty AI patch fields. Original data remains the source of truth.
     *
     * Teknikal detail (command/output/result/evidence/dll.) TIDAK pernah ditimpa
     * oleh AI: section yang tidak ada di patch dibiarkan utuh, dan field teknis
     * dalam step selalu diambil dari versi asli.
     *
     * @param array<string,mixed> $original
     * @param array<string,mixed> $patch
     * @return array<string,mixed>
     */
    private function applyPatch(array $original, array $patch): array
    {
        foreach ($patch['goal'] as $key => $value) {
            $original['goal'][$key] = $value;
        }

        foreach ($patch['environment'] as $key => $value) {
            $original['environment'][$key] = $value;
        }

        if ($patch['steps'] !== []) {
            $steps = [];
            foreach ($patch['steps'] as $index => $step) {
                $existing = $original['steps'][$index] ?? [
                    'id' => '', 'title' => '', 'question' => '', 'goal' => '',
                    'approach' => '', 'command' => '', 'output' => '', 'result' => '',
                    'interpretation' => '', 'type' => 'test',
                ];

                // Hanya field deskriptif yang boleh diubah AI. command/output/
                // result/type/id tetap milik fakta asli.
                foreach ($step as $key => $value) {
                    $existing[$key] = $value;
                }
                $steps[] = $existing;
            }
            // Pertahankan step asli di luar rentang yang diganti AI.
            if (count($original['steps']) > count($steps)) {
                $steps = array_merge($steps, array_slice($original['steps'], count($steps)));
            }
            $original['steps'] = $steps;
        }

        foreach ($patch['lessonLearned'] as $key => $value) {
            $original['lessonLearned'][$key] = $value;
        }

        if ($patch['notes'] !== '') {
            $original['notes'] = $patch['notes'];
        }

        $this->applyQuestionsPatch($original, $patch);

        return $this->normalize($original);
    }

    /**
     * Terapkan usulan questions AI dengan aturan data-safety ketat:
     *
     * - Hanya diterapkan ketika CURRENT belum punya questions sama sekali
     *   (structural inference murni — tidak pernah menimpa unit pekerjaan user).
     * - Result/steps/evidence/status tidak pernah berasal dari AI: semua item
     *   baru dibuat status `unsolved`, result kosong, steps/evidence kosong.
     *
     * @param array<string, mixed> $original
     * @param array<string, mixed> $patch
     */
    private function applyQuestionsPatch(array &$original, array $patch): void
    {
        if (($patch['questions'] ?? []) === []) {
            return;
        }

        // CURRENT sudah punya questions → source-of-truth dipertahankan.
        if ($original['questions'] !== []) {
            return;
        }

        foreach ($patch['questions'] as $q) {
            if (count($original['questions']) >= self::MAX_QUESTIONS) {
                break;
            }

            $original['questions'][] = [
                'question' => (string) ($q['question'] ?? ''),
                'notes' => (string) ($q['notes'] ?? ''),
                'status' => 'unsolved',
                'result' => '',
                'steps' => [],
                'evidence' => [],
            ];
        }
    }

    /**
     * @return list<string>
     */
    private function buildWarnings(array $original, array $ai): array
    {
        $warnings = [];

        if ($original['evidence'] !== [] && $ai['evidence'] === $original['evidence']) {
            $warnings[] = 'Evidence asli dipertahankan karena AI tidak menghasilkan evidence baru.';
        } elseif ($original['evidence'] === [] && $ai['evidence'] === []) {
            $warnings[] = 'Tidak ada evidence konkret pada input; Evidence dibiarkan kosong.';
        }

        if ($original['notes'] !== '' && $ai['notes'] === $original['notes']) {
            $warnings[] = 'Catatan asli dipertahankan karena AI tidak menghasilkan pengganti yang aman.';
        }

        return $warnings;
    }

    private function logFailure(string $reason, string $model, float $started): void
    {
        Log::warning('Structured writeup AI failed', [
            'reason' => $reason,
            'model' => $model,
            'duration_ms' => (int) round((microtime(true) - $started) * 1000),
        ]);
    }
}