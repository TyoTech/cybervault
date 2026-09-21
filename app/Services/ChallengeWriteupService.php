<?php

namespace App\Services;

use App\Models\Challenge;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Structured Writeup persistence untuk Challenge (Writeup Workspace).
 *
 * Source-of-truth: file `writeup.json` di dalam folder challenge
 * (`lab/{lab}/{kategori}/{judul}/`). File `writeup.txt` TETAP diregenerasi
 * setiap kali save sebagai artefak human-readable (backward compatible dengan
 * behavior lama, dan tetap dilindungi dari endpoint deleteFile).
 *
 * Backward compatibility:
 * - Jika `writeup.json` belum ada tetapi `writeup.txt` ada (data lama), konten
 *   plain-text lama dibaca ulang dan dimasukkan ke field `notes` (bagian
 *   dokumentasi bebas) — READ-ONLY: tidak ditulis ulang sampai user Save.
 * - `normalize()` memakai whitelist key: field/kunci asing dari input user
 *   tidak pernah masuk ke JSON.
 */
final class ChallengeWriteupService
{
    private const FILE_JSON = 'writeup.json';
    private const FILE_TXT = 'writeup.txt';

    private const MAX_ITEMS = 50;      // batas jumlah item per list
    private const MAX_EVIDENCE = 100;  // evidence boleh lebih banyak (bukti)
    private const MAX_TEXT = 10_000;   // batas field teks biasa
    private const MAX_LONG = 20_000;   // batas field panjang (command/output/notes/...)
    private const MAX_SHORT = 4_000;   // batas field pendek (label/pertanyaan)
    private const MAX_LABEL = 255;

    /** @return array<string, mixed> struktur writeup ternormalisasi */
    public function read(Challenge $challenge): array
    {
        $jsonPath = $challenge->path_folder . '/' . self::FILE_JSON;

        if (Storage::disk('cyber')->exists($jsonPath)) {
            $raw = Storage::disk('cyber')->get($jsonPath);

            try {
                $decoded = is_string($raw) ? json_decode($raw, true) : null;

                if (is_array($decoded)) {
                    return $this->normalize($decoded);
                }
            } catch (\Throwable $e) {
                // JSON rusak -> fall through ke default (tanpa crash).
            }
        }

        // Data lama: writeup.txt plain text (READ-ONLY migrasi-on-read).
        $legacy = $this->readLegacyTxt($challenge);

        return $legacy !== '' ? $this->normalize(['notes' => $legacy]) : $this->normalize([]);
    }

    /**
     * Simpan struktur writeup ke writeup.json DAN regenerasi writeup.txt.
     *
     * @param array<string, mixed> $data
     */
    public function save(Challenge $challenge, array $data): void
    {
        $normalized = $this->normalize($data);
        $normalized['updated_at_iso'] = now()->toIso8601String();

        $folder = $challenge->path_folder;

        Storage::disk('cyber')->put(
            $folder . '/' . self::FILE_JSON,
            (string) json_encode($normalized, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        );

        // Artefak human-readable lama tetap dipertahankan agar flow on-disk tidak berubah.
        Storage::disk('cyber')->put(
            $folder . '/' . self::FILE_TXT,
            $this->toMarkdown($normalized)
        );
    }

    /**
     * Render struktur writeup menjadi Markdown (untuk export .txt + input AI).
     *
     * @param array<string, mixed> $data
     */
    public function toMarkdown(array $data): string
    {
        $d = $this->normalize($data);
        $lines = [];

        // Judul diambil dari DB judul challenge (bukan dari JSON) — dikenal pasti.
        // Tapi bagian ini tetap dipakai untuk dokumen, jadi konstekstual.

        $goal = $d['goal'];
        if ($goal['problem'] !== '' || $goal['objective'] !== '' || $goal['proof'] !== '') {
            $lines[] = '## 1. Tujuan';
            $this->pushKeyValue($lines, 'Masalah yang dianalisis', $goal['problem']);
            $this->pushKeyValue($lines, 'Tujuan analisis', $goal['objective']);
            $this->pushKeyValue($lines, 'Yang ingin dibuktikan', $goal['proof']);
            $lines[] = '';
        }

        $env = $d['environment'];
        if ($this->anyFilled($env)) {
            $lines[] = '## 2. Environment / Scope';
            $this->pushKeyValue($lines, 'Target / scope', $env['target']);
            $this->pushKeyValue($lines, 'Environment', $env['environment']);
            $this->pushKeyValue($lines, 'IP / hostname', $env['host']);
            $this->pushKeyValue($lines, 'Aplikasi', $env['application']);
            $this->pushKeyValue($lines, 'OS', $env['os']);
            $this->pushKeyValue($lines, 'Tools', $env['tools']);
            $this->pushKeyValue($lines, 'Catatan scope', $env['scope']);
            $lines[] = '';
        }

        if ($d['hypotheses'] !== []) {
            $lines[] = '## 3. Hipotesis';
            foreach ($d['hypotheses'] as $h) {
                $tag = $h['status'] === 'verified'
                    ? 'FACT'
                    : ($h['status'] === 'rejected'
                        ? 'REJECTED'
                        : 'HYPOTHESIS');
                $lines[] = '- **[' . $tag . ']** ' . $h['text'];
            }
            $lines[] = '';
        }

        $steps = $d['steps'];
        if ($steps !== []) {
            $lines[] = '## 4. Langkah Analisis';
            foreach ($steps as $i => $step) {
                $type = strtoupper($step['type'] ?: 'test');
                $title = $step['title'] !== ''
                    ? $step['title']
                    : 'Step ' . ($i + 1);

                $lines[] = '### Step ' . ($i + 1) . ' — ' . $title . ' [' . $type . ']';
                $this->pushKeyValue($lines, 'Apa yang ingin diketahui', $step['question']);
                $this->pushKeyValue($lines, 'Tujuan langkah', $step['goal']);
                $this->pushKeyValue($lines, 'Pendekatan', $step['approach']);
                $this->pushCodeBlock($lines, 'Command / request', $step['command']);
                $this->pushCodeBlock($lines, 'Output', $step['output']);
                $this->pushKeyValue($lines, 'Hasil', $step['result']);
                $this->pushKeyValue($lines, 'Interpretasi', $step['interpretation']);
                $lines[] = '';
            }
        }

        if ($d['experiments'] !== []) {
            $lines[] = '## 5. Percobaan / Attempts';
            foreach ($d['experiments'] as $i => $exp) {
                $status = ucfirst($exp['status'] ?: 'inconclusive');

                $lines[] = '### Attempt ' . ($i + 1) . ' [' . $status . ']';
                $this->pushKeyValue($lines, 'Hipotesis', $exp['hypothesis']);
                $this->pushKeyValue($lines, 'Pendekatan', $exp['approach']);
                $this->pushCodeBlock($lines, 'Command / request', $exp['command']);
                $this->pushKeyValue($lines, 'Hasil yang diharapkan', $exp['expected']);
                $this->pushKeyValue($lines, 'Hasil aktual', $exp['actual']);
                $this->pushCodeBlock($lines, 'Error message', $exp['error']);
                $this->pushKeyValue($lines, 'Kenapa gagal', $exp['whyFailed']);
                $this->pushKeyValue($lines, 'Yang berubah setelahnya', $exp['changed']);
                $this->pushKeyValue($lines, 'Interpretasi', $exp['interpretation']);
                $lines[] = '';
            }
        }

        if ($d['evidence'] !== []) {
            $lines[] = '## 6. Bukti / Evidence';
            foreach ($d['evidence'] as $i => $ev) {
                $label = $ev['label'] !== ''
                    ? $ev['label']
                    : 'Evidence ' . ($i + 1);
                $lines[] = '### ' . $label . ' (' . $ev['kind'] . ')';
                $this->pushCodeBlock($lines, '', $ev['content']);
                $lines[] = '';
            }
        }

        if ($d['strategyChanges'] !== []) {
            $lines[] = '## 7. Perubahan Strategi';
            foreach ($d['strategyChanges'] as $sc) {
                $lines[] = '- ' . $sc['text'];
            }
            $lines[] = '';
        }

        $this->pushKeyValue($lines, '## 8. Risiko / Impact', $d['riskImpact'], true);

        if ($d['recommendations'] !== []) {
            $lines[] = '## 9. Rekomendasi';
            foreach ($d['recommendations'] as $r) {
                $lines[] = '- ' . $r['text'];
            }
            $lines[] = '';
        }

        $lesson = $d['lessonLearned'];
        if ($this->anyFilled($lesson)) {
            $lines[] = '## 10. Lesson Learned';
            $this->pushKeyValue($lines, 'Apa yang dipelajari', $lesson['learned']);
            $this->pushKeyValue($lines, 'Pola yang ditemukan', $lesson['patterns']);
            $this->pushKeyValue($lines, 'Kesalahan yang harus dihindari', $lesson['mistakes']);
            $this->pushKeyValue($lines, 'Konsep yang perlu dipahami ulang', $lesson['concepts']);
            $this->pushKeyValue($lines, 'Yang akan dilakukan berbeda', $lesson['different']);
            $this->pushKeyValue($lines, 'Relevansi di dunia nyata', $lesson['relevance']);
            $lines[] = '';
        }

        if ($d['references'] !== '') {
            $lines[] = '## Referensi';
            $lines[] = $d['references'];
            $lines[] = '';
        }

        if ($d['notes'] !== '') {
            $lines[] = '## Catatan';
            $lines[] = $d['notes'];
            $lines[] = '';
        }

        return trim(implode("\n", $lines));
    }

    /**
     * @param array<string, mixed> $data
     *
     * @return array<string, mixed>
     */
    public function normalize(array $data): array
    {
        // --- Global scalar larik default ---------------------------------
        $goal = $this->stringMap($data['goal'] ?? null, ['problem', 'objective', 'proof'], self::MAX_TEXT);

        $envKeys = ['target', 'environment', 'host', 'application', 'os', 'tools', 'scope'];
        $environment = $this->stringMap($data['environment'] ?? null, $envKeys, self::MAX_SHORT);

        $lessonKeys = ['learned', 'patterns', 'mistakes', 'concepts', 'different', 'relevance'];
        $lessonLearned = $this->stringMap($data['lessonLearned'] ?? null, $lessonKeys, self::MAX_TEXT);

        $riskImpact = $this->cap((string) ($data['riskImpact'] ?? ''), self::MAX_TEXT);
        $references = $this->cap((string) ($data['references'] ?? ''), self::MAX_TEXT);
        $notes = $this->cap((string) ($data['notes'] ?? ''), self::MAX_LONG);

        return [
            'version' => 1,
            'goal' => $goal,
            'environment' => $environment,
            'hypotheses' => $this->normalizeHypotheses($data['hypotheses'] ?? null),
            'steps' => $this->normalizeSteps($data['steps'] ?? null),
            'experiments' => $this->normalizeExperiments($data['experiments'] ?? null),
            'evidence' => $this->normalizeEvidence($data['evidence'] ?? null),
            'strategyChanges' => $this->normalizeTextItems($data['strategyChanges'] ?? null, 'text'),
            'riskImpact' => $riskImpact,
            'recommendations' => $this->normalizeTextItems($data['recommendations'] ?? null, 'text'),
            'lessonLearned' => $lessonLearned,
            'references' => $references,
            'notes' => $notes,
        ];
    }

    // ---------------------------------------------------------------------
    // Normalisasi per-section
    // ---------------------------------------------------------------------

    /** @return list<array{id: string, text: string, status: string}> */
    private function normalizeHypotheses(mixed $items): array
    {
        $out = [];

        foreach ((array) $items as $item) {
            if (count($out) >= self::MAX_ITEMS) {
                break;
            }

            if (! is_array($item)) {
                continue;
            }

            $status = in_array($item['status'] ?? null, ['verified', 'rejected'], true)
                ? $item['status']
                : 'hypothesis';

            $text = $this->cap((string) ($item['text'] ?? ''), self::MAX_SHORT);

            if (trim($text) === '') {
                continue;
            }

            $out[] = [
                'id' => $this->itemId($item['id'] ?? null),
                'text' => $text,
                'status' => $status,
            ];
        }

        return $out;
    }

    /** @return list<array<string, string>> */
    private function normalizeSteps(mixed $items): array
    {
        $keys = ['title', 'question', 'goal', 'approach', 'command', 'output', 'result', 'interpretation'];
        $out = [];

        foreach ((array) $items as $item) {
            if (count($out) >= self::MAX_ITEMS) {
                break;
            }

            if (! is_array($item)) {
                continue;
            }

            $row = $this->stringMap($item, $keys, self::MAX_LONG, self::MAX_SHORT);
            $type = in_array($item['type'] ?? null, ['hypothesis', 'test', 'fact', 'result'], true)
                ? $item['type']
                : 'test';

            $out[] = array_merge($row, [
                'id' => $this->itemId($item['id'] ?? null),
                'type' => $type,
            ]);
        }

        return $out;
    }

    /** @return list<array<string, string>> */
    private function normalizeExperiments(mixed $items): array
    {
        $keys = ['hypothesis', 'approach', 'command', 'expected', 'actual', 'error', 'whyFailed', 'changed', 'interpretation'];
        $out = [];

        foreach ((array) $items as $item) {
            if (count($out) >= self::MAX_ITEMS) {
                break;
            }

            if (! is_array($item)) {
                continue;
            }

            $row = $this->stringMap($item, $keys, self::MAX_LONG, self::MAX_SHORT);
            $status = in_array($item['status'] ?? null, ['successful', 'failed', 'inconclusive'], true)
                ? $item['status']
                : 'inconclusive';

            $out[] = array_merge($row, [
                'id' => $this->itemId($item['id'] ?? null),
                'status' => $status,
            ]);
        }

        return $out;
    }

    /** @return list<array{id: string, label: string, kind: string, content: string}> */
    private function normalizeEvidence(mixed $items): array
    {
        $kinds = ['command', 'output', 'request', 'response', 'error', 'log'];
        $out = [];

        foreach ((array) $items as $item) {
            if (count($out) >= self::MAX_EVIDENCE) {
                break;
            }

            if (! is_array($item)) {
                continue;
            }

            $kind = in_array($item['kind'] ?? null, $kinds, true) ? $item['kind'] : 'log';
            $label = $this->cap((string) ($item['label'] ?? ''), self::MAX_LABEL);
            $content = $this->cap((string) ($item['content'] ?? ''), self::MAX_LONG);

            if (trim($content) === '') {
                continue;
            }

            $out[] = [
                'id' => $this->itemId($item['id'] ?? null),
                'label' => $label,
                'kind' => $kind,
                'content' => $content,
            ];
        }

        return $out;
    }

    /** @return list<array{id: string, text: string}> */
    private function normalizeTextItems(mixed $items, string $key): array
    {
        $out = [];

        foreach ((array) $items as $item) {
            if (count($out) >= self::MAX_ITEMS) {
                break;
            }

            if (! is_array($item)) {
                continue;
            }

            $text = $this->cap((string) ($item[$key] ?? ''), self::MAX_SHORT);

            if (trim($text) === '') {
                continue;
            }

            $out[] = [
                'id' => $this->itemId($item['id'] ?? null),
                $key => $text,
            ];
        }

        return $out;
    }

    // ---------------------------------------------------------------------
    // Util
    // ---------------------------------------------------------------------

    /**
     * Map daftar key menjadi field string dengan batas panjang.
     *
     * @param array<string, mixed>|null $source
     * @param list<string> $keys
     *
     * @return array<string, string>
     */
    private function stringMap(?array $source, array $keys, int $longCap, ?int $shortCap = null): array
    {
        $source = $source ?? [];
        $out = [];

        foreach ($keys as $key) {
            $out[$key] = $this->cap((string) ($source[$key] ?? ''), $shortCap ?? $longCap);
        }

        return $out;
    }

    private function cap(string $value, int $max): string
    {
        if ($max <= 0) {
            return '';
        }

        return mb_substr($value, 0, $max);
    }

    private function itemId(mixed $id): string
    {
        $id = is_string($id) ? trim($id) : '';

        return $id !== '' ? mb_substr($id, 0, 64) : (string) Str::uuid();
    }

    private function anyFilled(array $values): bool
    {
        foreach ($values as $v) {
            if (is_string($v) && trim($v) !== '') {
                return true;
            }
        }

        return false;
    }

    /** @param list<string> $lines */
    private function pushKeyValue(array &$lines, string $label, string $value, bool $rawHeading = false): void
    {
        if (trim($value) === '') {
            return;
        }

        if ($rawHeading && str_starts_with($label, '##')) {
            $lines[] = $label;
            $lines[] = $value;
            $lines[] = '';

            return;
        }

        $lines[] = '**' . $label . ':** ' . trim($value);
    }

    /** @param list<string> $lines */
    private function pushCodeBlock(array &$lines, string $label, string $value): void
    {
        if (trim($value) === '') {
            return;
        }

        if ($label !== '') {
            $lines[] = '**' . $label . ':**';
        }

        $lines[] = '```';
        $lines[] = rtrim($value);
        $lines[] = '```';
    }

    /**
     * Baca writeup.txt lama (plain text). Mengembalikan string kosong bila tidak ada.
     */
    private function readLegacyTxt(Challenge $challenge): string
    {
        $path = $challenge->path_folder . '/' . self::FILE_TXT;

        if (! Storage::disk('cyber')->exists($path)) {
            return '';
        }

        $content = Storage::disk('cyber')->get($path);

        return is_string($content) ? $content : '';
    }
}