<?php

namespace App\Services;

use App\Exceptions\AiServiceException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * AI Assist untuk Writeup (Phase 10).
 *
 * Mengirim representasi Markdown dari structured writeup ke Ollama lokal dan
 * mengembalikan saran {title, markdown, suggestions[{category,text}], note}.
 *
 * Keamanan:
 * - TIDAK pernah menulis database/file: murni transformasi + request HTTP.
 * - Output AI diperlakukan untrusted: struktur divalidasi ketat (tipe, jumlah,
 *   panjang, isi di-truncate).
 * - Prompt dengan disiplin FACT vs HYPOTHESIS: AI dilarang mengarang evidence,
 *   command output, HTTP response, atau klaim vulnerability tanpa bukti.
 * - Logging hanya metadata (kategori error + model + durasi), tidak pernah isi
 *   writeup atau prompt.
 */
final class WriteupAiAssistService
{
    private const MAX_INPUT_MARKDOWN = 24_000;
    private const MAX_RESPONSE_LENGTH = 256_000;

    private const MAX_TITLE_LENGTH = 255;
    private const MAX_SUGGESTIONS = 20;
    private const MAX_SUGGESTION_TEXT = 600;

    public function assist(string $title, string $markdown): WriteupAiAssistResult
    {
        $started = microtime(true);
        $baseUrl = (string) config('services.ollama.base_url');
        $model = (string) config('services.ollama.model');
        $timeout = max(1, (int) config('services.ollama.timeout'));

        $payload = $this->buildPayload($title, $markdown, $model);

        try {
            $response = Http::acceptJson()
                ->timeout($timeout)
                ->connectTimeout(5)
                ->post($baseUrl . '/api/generate', $payload);
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
            return $this->parseResult($raw, $title, $markdown);
        } catch (AiServiceException $e) {
            $this->logFailure('response_parse_failed', $model, $started);

            throw $e;
        } catch (\Throwable $e) {
            $this->logFailure('response_parse_failed', $model, $started);

            throw new AiServiceException(AiServiceException::INVALID_RESPONSE, '', $e);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function buildPayload(string $title, string $markdown, string $model): array
    {
        $markdown = mb_substr($markdown, 0, self::MAX_INPUT_MARKDOWN);
        $truncated = mb_strlen($markdown) > self::MAX_INPUT_MARKDOWN;

        $prompt = <<<PROMPT
        You are an experienced security analyst helping a pentester improve a
        technical writeup. Your job is to IMPROVE CLARITY and STRUCTURE — never
        to fabricate anything.

        NEVER INVENT EVIDENCE.
        NEVER INVENT COMMAND OUTPUT.
        NEVER INVENT HTTP RESPONSES OR REQUEST RESULTS.
        NEVER CLAIM A VULNERABILITY IS CONFIRMED WITHOUT EVIDENCE IN THE INPUT.

        Clearly distinguish these categories and keep their meaning intact:
        - FACT: something verified in the input.
        - HYPOTHESIS: an unproven guess (must stay labeled as a guess).
        - TEST: an experiment performed to validate a hypothesis.
        - RESULT: the actual outcome of the experiment.
        - INTERPRETATION: what the result means.

        Rules:
        - Do NOT turn a hypothesis into a fact. If evidence is insufficient, say
          the evidence is insufficient — do not invent more.
        - Do NOT add findings, CVEs, IPs, ports, commands, versions, or payloads
          that are not present in the input.
        - If you suggest something not present in the source content, mark it
          as "AI suggestion / requires verification".
        - Preserve all technical facts, commands, code blocks, URLs, IPs, ports,
          tool names, and exact evidence verbatim.
        - Improve structure, grammar, clarity, and the methodical flow
          (Goal -> Hypothesis -> Test -> Evidence -> Result -> Interpretation).
        - You may suggest missing reasoning links and lesson-learned content.

        LANGUAGE:
        - Write newly generated prose in Bahasa Indonesia.
        - Preserve technical terms, commands, code, and identifiers untranslated.

        Respond with ONLY a valid JSON object, no markdown fences, no prose:
        {"title": "...", "markdown": "...", "suggestions": [{"category": "...", "text": "..."}]}
        - "title": improved title (keep short, unchanged if fine).
        - "markdown": the full improved writeup in Markdown, preserving the
          input's sections and evidence verbatim.
        - "suggestions": 3-6 short actionable suggestions. "category" must be
          one of: clarity | structure | fact_vs_hypothesis | evidence |
          missing_reasoning | lesson_learned | other.

        INPUT WRITEUP TITLE:
        {$title}

        INPUT WRITEUP CONTENT (markdown):
        {$markdown}
        PROMPT;

        if ($truncated) {
            $prompt .= "\n\n[catatan: input dipotong karena terlalu panjang]";
        }

        return [
            'model' => $model,
            'prompt' => $prompt,
            'stream' => false,
            'format' => 'json',
            'think' => false,
            'options' => [
                'temperature' => 0.4,
            ],
        ];
    }

    private function parseResult(string $raw, string $fallbackTitle, string $fallbackMarkdown): WriteupAiAssistResult
    {
        $json = $this->extractJsonObject($raw);
        $data = $json === null ? null : json_decode($json, true);

        if (! is_array($data) || json_last_error() !== JSON_ERROR_NONE) {
            throw new AiServiceException(AiServiceException::INVALID_RESPONSE);
        }

        $aiTitle = is_string($data['title'] ?? null) ? trim($data['title']) : '';
        $aiMarkdown = is_string($data['markdown'] ?? null) ? trim($data['markdown']) : '';
        $suggestions = $this->normalizeSuggestions($data['suggestions'] ?? null);

        if ($aiTitle === '' && $aiMarkdown === '' && $suggestions === []) {
            throw new AiServiceException(AiServiceException::INVALID_RESPONSE);
        }

        // Jangan pernah mengosongkan konten: markdown kosong -> fallback ke asli.
        $title = $aiTitle !== ''
            ? mb_substr($aiTitle, 0, self::MAX_TITLE_LENGTH)
            : $fallbackTitle;

        $markdown = $aiMarkdown !== '' ? $aiMarkdown : $fallbackMarkdown;

        if ($markdown === '') {
            throw new AiServiceException(AiServiceException::INVALID_RESPONSE);
        }

        return new WriteupAiAssistResult(
            $title,
            $markdown,
            $suggestions,
            'AI suggestion / requires verification',
        );
    }

    /**
     * Ambil objek JSON paling luar dari response, lepas wrapper fence bila ada.
     */
    private function extractJsonObject(string $raw): ?string
    {
        $raw = trim($raw);

        if (preg_match('/^```(?:json)?\s*(.*?)\s*```$/is', $raw, $fence)) {
            $raw = trim($fence[1]);
        }

        $start = strpos($raw, '{');
        $end = strrpos($raw, '}');

        if ($start === false || $end === false || $end <= $start) {
            return null;
        }

        return substr($raw, $start, $end - $start + 1);
    }

    /**
     * @return list<array{category: string, text: string}>
     */
    private function normalizeSuggestions(mixed $value): array
    {
        $categories = ['clarity', 'structure', 'fact_vs_hypothesis', 'evidence', 'missing_reasoning', 'lesson_learned', 'other'];
        $out = [];

        foreach ((array) $value as $item) {
            if (count($out) >= self::MAX_SUGGESTIONS) {
                break;
            }

            if (is_string($item)) {
                $out[] = ['category' => 'other', 'text' => mb_substr(trim($item), 0, self::MAX_SUGGESTION_TEXT)];

                continue;
            }

            if (! is_array($item)) {
                continue;
            }

            $category = in_array($item['category'] ?? null, $categories, true)
                ? $item['category']
                : 'other';

            // AI kadang mengembalikan {type, original, improved, reason}.
            $original = is_string($item['original'] ?? null) ? trim($item['original']) : '';
            $improved = is_string($item['improved'] ?? null) ? trim($item['improved']) : '';
            $reason = is_string($item['reason'] ?? null) ? trim($item['reason']) : '';
            $text = '';

            if ($original !== '' || $improved !== '') {
                $text = ($original !== '' && $improved !== '')
                    ? $original . ' → ' . $improved
                    : ($improved !== '' ? $improved : $original);
                $text = $reason !== '' ? $text . ' (' . $reason . ')' : $text;
            } else {
                foreach (['text', 'suggestion', 'message', 'description'] as $key) {
                    if (isset($item[$key]) && is_string($item[$key]) && trim($item[$key]) !== '') {
                        $text = (string) $item[$key];
                        break;
                    }
                }
            }

            $text = trim($text);

            if ($text === '') {
                continue;
            }

            $out[] = ['category' => $category, 'text' => mb_substr($text, 0, self::MAX_SUGGESTION_TEXT)];
        }

        return $out;
    }

    private function logFailure(string $reason, string $model, float $started): void
    {
        // Hanya metadata — jangan pernah log isi writeup, prompt, atau response.
        Log::warning('Ollama writeup assist failed', [
            'reason' => $reason,
            'model' => $model,
            'duration_ms' => (int) round((microtime(true) - $started) * 1000),
        ]);
    }
}