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
    private const MAX_STRING = 20_000;

    /**
     * @param array<string,mixed> $writeup
     */
    public function structure(string $title, array $writeup): StructuredWriteupAiAssistResult
    {
        $started = microtime(true);
        $baseUrl = rtrim((string) config('services.ollama.base_url'), '/');
        $model = (string) config('services.ollama.model');
        $timeout = max(1, (int) config('services.ollama.timeout'));

        $original = $this->normalize($writeup);
        $input = json_encode(
            ['title' => mb_substr($title, 0, 255), 'writeup' => $original],
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT
        );

        if (!is_string($input)) {
            throw new AiServiceException(AiServiceException::INVALID_RESPONSE);
        }

        $input = mb_substr($input, 0, self::MAX_INPUT_LENGTH);

        $prompt = <<<PROMPT
You are a cybersecurity writeup structuring assistant.

Your task is to turn a user's rough writeup into the EXISTING structured WriteupData schema.

CRITICAL RULES:
- Never invent facts.
- Never invent IP addresses, ports, usernames, passwords, CVEs, vulnerabilities,
  versions, commands, outputs, requests, responses, exploits, impact, or evidence.
- Only use facts present in the input.
- If a field is not supported by the input, leave it empty.
- Preserve technical values verbatim whenever possible.
- Do not convert a hypothesis into a verified fact.
- Do not create Evidence unless concrete evidence is present in the input.
- Do not create command/output evidence from your own knowledge.
- If the input is Bahasa Indonesia, write the structured result in Bahasa Indonesia.
- The existing user content must not be lost.
- IDs are not meaningful; return empty string IDs. The backend will generate IDs.
- Return ONLY JSON. No Markdown fences. No explanation outside JSON.

IMPORTANT:
The "notes" field may contain rough/freeform analysis written by the user.
Extract factual information from notes into the appropriate structured fields when
the input supports it.

For example, if notes say:
"aku nemu port ssh terbuka lalu aku akses dan bisa login"

you may structure this as:
- a step describing finding the SSH port,
- a step describing the SSH access,
- a result saying access was possible,
but you MUST NOT invent the port number, username, password, IP, SSH version,
command, or evidence.

EXISTING SCHEMA:
{
  "goal": {
    "problem": "",
    "objective": "",
    "proof": ""
  },
  "environment": {
    "target": "",
    "environment": "",
    "host": "",
    "application": "",
    "os": "",
    "tools": "",
    "scope": ""
  },
  "hypotheses": [
    {"id":"","text":"","status":"hypothesis|verified|rejected"}
  ],
  "steps": [
    {
      "id":"","title":"","question":"","goal":"","approach":"",
      "command":"","output":"","result":"","interpretation":"",
      "type":"hypothesis|test|fact|result"
    }
  ],
  "experiments": [
    {
      "id":"","status":"successful|failed|inconclusive",
      "hypothesis":"","approach":"","command":"","expected":"",
      "actual":"","error":"","whyFailed":"","changed":"","interpretation":""
    }
  ],
  "evidence": [
    {"id":"","label":"","kind":"command|output|request|response|error|log","content":""}
  ],
  "strategyChanges": [{"id":"","text":""}],
  "riskImpact": "",
  "recommendations": [{"id":"","text":""}],
  "lessonLearned": {
    "learned":"","patterns":"","mistakes":"","concepts":"","different":"","relevance":""
  },
  "references": "",
  "notes": ""
}

Return the COMPLETE object using exactly these keys.

INPUT:
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
                    'options' => ['temperature' => 0.2],
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

            $ai = $this->normalize($decoded);
            $merged = $this->merge($original, $ai);

            $warnings = $this->buildWarnings($original, $ai);

            return new StructuredWriteupAiAssistResult($merged, $warnings);
        } catch (\Throwable $e) {
            $this->logFailure('response_parse_failed', $model, $started);
            throw new AiServiceException(AiServiceException::INVALID_RESPONSE, '', $e);
        }
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

        $steps = $normalizeList($value['steps'] ?? null, function (array $i) use ($str) {
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
        });

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

        $evidence = $normalizeList($value['evidence'] ?? null, function (array $i) use ($str) {
            $kind = in_array($str($i['kind'] ?? ''), ['command', 'output', 'request', 'response', 'error', 'log'], true)
                ? $str($i['kind'])
                : 'log';
            return [
                'id' => '',
                'label' => $str($i['label'] ?? ''),
                'kind' => $kind,
                'content' => $str($i['content'] ?? ''),
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
        ];
    }

    /**
     * Preserve existing non-empty data if AI omitted it.
     * @param array<string,mixed> $original
     * @param array<string,mixed> $ai
     * @return array<string,mixed>
     */
    private function merge(array $original, array $ai): array
    {
        foreach (['problem','objective','proof'] as $key) {
            if (($ai['goal'][$key] ?? '') === '' && ($original['goal'][$key] ?? '') !== '') {
                $ai['goal'][$key] = $original['goal'][$key];
            }
        }

        foreach (['target','environment','host','application','os','tools','scope'] as $key) {
            if (($ai['environment'][$key] ?? '') === '' && ($original['environment'][$key] ?? '') !== '') {
                $ai['environment'][$key] = $original['environment'][$key];
            }
        }

        foreach (['riskImpact','references','notes'] as $key) {
            if (($ai[$key] ?? '') === '' && ($original[$key] ?? '') !== '') {
                $ai[$key] = $original[$key];
            }
        }

        foreach (['hypotheses','steps','experiments','evidence','strategyChanges','recommendations'] as $key) {
            if (($ai[$key] ?? []) === [] && ($original[$key] ?? []) !== []) {
                $ai[$key] = $original[$key];
            }
        }

        foreach (['learned','patterns','mistakes','concepts','different','relevance'] as $key) {
            if (($ai['lessonLearned'][$key] ?? '') === '' && ($original['lessonLearned'][$key] ?? '') !== '') {
                $ai['lessonLearned'][$key] = $original['lessonLearned'][$key];
            }
        }

        return $ai;
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
