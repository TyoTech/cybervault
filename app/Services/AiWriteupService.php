<?php

namespace App\Services;

use App\Exceptions\AiServiceException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Service "Improve Writeup" — fase 4.
 *
 * Mengirim content AI-ready (dari NoteContentExtractor) ke Ollama lokal dan
 * mengembalikan structured suggestion {title, markdown, suggestions} yang sudah
 * DIVALIDASI. Service ini:
 *
 * - tidak pernah menulis database / DOCX (murni transformasi + request HTTP);
 * - tidak pernah menerima path filesystem atau input user (base URL dari env);
 * - memperlakukan output AI sebagai untrusted: struktur divalidasi ketat;
 * - menangani connection refused, timeout, HTTP error, model hilang,
 *   JSON malformed, dan response oversized;
 * - logging hanya exception class + kategori — TIDAK pernah isi note/prompt.
 */
final class AiWriteupService
{
    /** Batas karakter isi note yang dikirim di prompt (guard resource). */
    private const MAX_INPUT_MARKDOWN = 24_000;

    /** Batas teks response Ollama yang diterima (guard resource). */
    private const MAX_RESPONSE_LENGTH = 256_000;

    private const MAX_TITLE_LENGTH = 255;
    private const MAX_SUGGESTIONS = 20;
    private const MAX_SUGGESTION_LENGTH = 500;

    public function improve(NoteAiContent $content): AiWriteupSuggestion
    {
        $started = microtime(true);
        $baseUrl = (string) config('services.ollama.base_url');
        $model = (string) config('services.ollama.model');
        $timeout = max(1, (int) config('services.ollama.timeout'));

        $payload = $this->buildPayload($content, $model);

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
            return $this->parseSuggestion($raw, $content->title, $content->markdown);
        } catch (AiServiceException $e) {
            $this->logFailure('response_parse_failed', $model, $started);

            throw $e;
        } catch (\Throwable $e) {
            // Error tak terduga saat parsing tetap diklasifikasikan sebagai
            // invalid_response (502), bukan 500 — agar UI tidak jatuh ke pesan
            // generik "service unavailable".
            $this->logFailure('response_parse_failed', $model, $started);

            throw new AiServiceException(AiServiceException::INVALID_RESPONSE, '', $e);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function buildPayload(NoteAiContent $content, string $model): array
    {
        $markdown = mb_substr($content->markdown, 0, self::MAX_INPUT_MARKDOWN);
        $truncated = mb_strlen($content->markdown) > self::MAX_INPUT_MARKDOWN;

        $prompt = <<<PROMPT
        You are a professional cybersecurity writeup writing assistant. Your job is to
        IMPROVE an existing writeup — never to invent facts.

        Allowed:
        - Fix structure, clarity, grammar, and Markdown formatting.
        - Point out unclear or missing sections.
        - Keep every technical fact exactly as given.

        FORBIDDEN:
        - Do NOT fabricate exploits, commands, CVEs, IPs, domains, scan results, or findings.
        - Do NOT claim anything succeeded unless the input says so.
        - Do NOT invent evidence, command output, HTTP responses, or error messages.
        - Never claim a vulnerability is confirmed without evidence present in the input.
        - Never turn a hypothesis into a fact.
        - Do NOT change technical facts (IPs, ports, commands, payloads, versions) without
        mentioning it in suggestions.

        FACT vs HYPOTHESIS:
        - Clearly distinguish: FACT (verified observation), HYPOTHESIS (unproven guess),
        TEST (experiment), RESULT (actual outcome), INTERPRETATION (meaning of the result).
        - If evidence is insufficient, explicitly state that the evidence is insufficient.
        - If you propose a new check that is NOT in the source material, mark it as
        "AI suggestion - requires verification" and never present it as a finding.

        LANGUAGE:
        - Write all newly generated or improved prose in Bahasa Indonesia.
        - The "title", "markdown", and "suggestions" fields MUST be written in Bahasa Indonesia.
        - Preserve technical terms, commands, code blocks, URLs, IPs, ports, CVEs,
        tool names, product names, protocol names, and other technical identifiers.
        - Do NOT translate commands, code, tool names, product names, protocol names,
        or technical identifiers.
        - If the original writeup is already in Bahasa Indonesia, preserve its language
        and improve it in Bahasa Indonesia.

        Preserve the original structure: headings, paragraphs, lists, code blocks,
        commands, URLs, IPs, findings, and evidence.

        Respond with ONLY a valid JSON object, no markdown fences, no prose, in this exact shape:
        {"title": "...", "markdown": "...", "suggestions": ["...", "..."]}
        - "title": improved title (1-200 chars, unchanged if fine).
        - "markdown": the full improved writeup in Markdown.
        - "suggestions": 3-6 short, concrete, actionable improvement suggestions.

        INPUT WRITEUP TITLE:
        {$content->title}

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
            // Paksa Ollama menghasilkan JSON agar output lebih predictable.
            'format' => 'json',
            // Nonaktifkan mode "thinking" qwen3. Terverifikasi empiris: dengan
            // thinking aktif (default) + format:json pada prompt panjang, model
            // mengembalikan objek JSON kosong "{}" -> selalu invalid_response.
            'think' => false,
            'options' => [
                'temperature' => 0.4,
            ],
        ];
    }

    private function parseSuggestion(string $raw, string $fallbackTitle, string $fallbackMarkdown): AiWriteupSuggestion
    {
        $json = $this->extractJsonObject($raw);
        $data = $json === null ? null : json_decode($json, true);

        if (! is_array($data) || json_last_error() !== JSON_ERROR_NONE) {
            throw new AiServiceException(AiServiceException::INVALID_RESPONSE);
        }

        $aiTitle = is_string($data['title'] ?? null) ? trim($data['title']) : '';
        $aiMarkdown = is_string($data['markdown'] ?? null) ? trim($data['markdown']) : '';
        $suggestions = $this->normalizeSuggestions($data['suggestions'] ?? null);

        // Tolak response yang benar-benar tidak membawa konten AI (mis. "{}").
        // Response berisi title/suggestions saja tetap diterima — markdown
        // jatuh ke konten asli agar editor tidak pernah dikosongkan.
        if ($aiTitle === '' && $aiMarkdown === '' && $suggestions === []) {
            throw new AiServiceException(AiServiceException::INVALID_RESPONSE);
        }

        $title = $aiTitle !== ''
            ? mb_substr($aiTitle, 0, self::MAX_TITLE_LENGTH)
            : $fallbackTitle;

        $markdown = $aiMarkdown !== '' ? $aiMarkdown : $fallbackMarkdown;

        if ($markdown === '') {
            throw new AiServiceException(AiServiceException::INVALID_RESPONSE);
        }

        return new AiWriteupSuggestion($title, $markdown, $suggestions);
    }

    /**
     * Ambil objek JSON paling luar dari teks response.
     *
     * Penting: regex fence HARUS di-anchor (^...$). Markdown hasil AI hampir
     * selalu memuat code fence (```bash ... ```); regex non-anchor akan
     * memotong JSON tepat di fence pertama sehingga JSON rusak dan memicu
     * response_parse_failed. Wrapper fence hanya dilepas bila SELURUH output
     * dibungkus satu fence.
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
     * @return list<string>
     */
    private function normalizeSuggestions(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        $out = [];

        foreach ($value as $item) {
            if (count($out) >= self::MAX_SUGGESTIONS) {
                break;
            }

            $text = $this->suggestionToText($item);

            if ($text === '') {
                continue;
            }

            $out[] = mb_substr($text, 0, self::MAX_SUGGESTION_LENGTH);
        }

        return $out;
    }

    /**
     * AI dapat mengembalikan suggestion sebagai string sederhana ATAU objek
     * terstruktur (mis. {type, original, improved, reason}). Keduanya
     * dinormalisasi menjadi satu string agar tidak hilang diam-diam.
     */
    private function suggestionToText(mixed $item): string
    {
        if (is_string($item)) {
            return trim($item);
        }

        if (! is_array($item)) {
            return '';
        }

        $original = isset($item['original']) && is_string($item['original']) ? trim($item['original']) : '';
        $improved = isset($item['improved']) && is_string($item['improved']) ? trim($item['improved']) : '';
        $reason = isset($item['reason']) && is_string($item['reason']) ? trim($item['reason']) : '';

        if ($original !== '' || $improved !== '') {
            $text = ($original !== '' && $improved !== '')
                ? $original . ' → ' . $improved
                : ($improved !== '' ? $improved : $original);

            return $reason !== '' ? $text . ' (' . $reason . ')' : $text;
        }

        foreach (['suggestion', 'text', 'message', 'description', 'detail'] as $key) {
            if (isset($item[$key]) && is_string($item[$key]) && trim($item[$key]) !== '') {
                return trim($item[$key]);
            }
        }

        return '';
    }

    private function logFailure(string $reason, string $model, float $started): void
    {
        // Hanya metadata — jangan pernah log isi note, prompt, atau response.
        Log::warning('Ollama improve failed', [
            'reason' => $reason,
            'model' => $model,
            'duration_ms' => (int) round((microtime(true) - $started) * 1000),
        ]);
    }
}