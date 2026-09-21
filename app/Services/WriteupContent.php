<?php

namespace App\Services;

/**
 * Structured content untuk Note kind=writeup.
 *
 * Disimpan di kolom notes.content_json (source untuk editor), dan di-render
 * ke HTML sederhana agar tetap bisa ditulis ke catatan.docx (artifact readable
 * untuk fitur "Buka Folder" dan NoteContentExtractor milik AI).
 *
 * Semua field opsional — user tidak dipaksa mengisi semua bagian.
 * List (steps/attempts/evidence/hypotheses) dibatasi ukurannya untuk guard resource.
 */
final class WriteupContent
{
    public const MAX_ITEMS = 100;
    public const MAX_TEXT = 20000;

    public const ATTEMPT_STATUSES = ['successful', 'failed', 'inconclusive'];
    public const HYPOTHESIS_STATUSES = ['unverified', 'confirmed', 'rejected'];
    public const EVIDENCE_TYPES = ['command', 'output', 'error', 'request', 'response', 'log', 'note'];

    /** @param array<string, mixed> $data */
    public function __construct(
        public readonly array $data,
    ) {
    }

    /**
     * Rules validasi Laravel untuk input `writeup` (array).
     *
     * @return array<string, mixed>
     */
    public static function rules(string $prefix = 'writeup'): array
    {
        $text = 'nullable|string|max:' . self::MAX_TEXT;

        return [
            $prefix => 'required|array',
            "{$prefix}.goal" => $text,
            "{$prefix}.scope" => $text,
            "{$prefix}.hypotheses" => 'nullable|array|max:' . self::MAX_ITEMS,
            "{$prefix}.hypotheses.*.text" => 'nullable|string|max:2000',
            "{$prefix}.hypotheses.*.status" => 'nullable|string|in:' . implode(',', self::HYPOTHESIS_STATUSES),
            "{$prefix}.steps" => 'nullable|array|max:' . self::MAX_ITEMS,
            "{$prefix}.steps.*.title" => 'nullable|string|max:255',
            "{$prefix}.steps.*.objective" => $text,
            "{$prefix}.steps.*.approach" => $text,
            "{$prefix}.steps.*.command" => $text,
            "{$prefix}.steps.*.output" => $text,
            "{$prefix}.steps.*.result" => $text,
            "{$prefix}.steps.*.interpretation" => $text,
            "{$prefix}.attempts" => 'nullable|array|max:' . self::MAX_ITEMS,
            "{$prefix}.attempts.*.hypothesis" => $text,
            "{$prefix}.attempts.*.approach" => $text,
            "{$prefix}.attempts.*.command" => $text,
            "{$prefix}.attempts.*.expected" => $text,
            "{$prefix}.attempts.*.actual" => $text,
            "{$prefix}.attempts.*.error" => $text,
            "{$prefix}.attempts.*.status" => 'nullable|string|in:' . implode(',', self::ATTEMPT_STATUSES),
            "{$prefix}.attempts.*.lesson" => $text,
            "{$prefix}.evidence" => 'nullable|array|max:' . self::MAX_ITEMS,
            "{$prefix}.evidence.*.type" => 'nullable|string|in:' . implode(',', self::EVIDENCE_TYPES),
            "{$prefix}.evidence.*.label" => 'nullable|string|max:255',
            "{$prefix}.evidence.*.content" => $text,
            "{$prefix}.interpretation" => $text,
            "{$prefix}.risk_impact" => $text,
            "{$prefix}.recommendations" => $text,
            "{$prefix}.strategy_changes" => $text,
            "{$prefix}.lesson_learned" => 'nullable|array',
            "{$prefix}.lesson_learned.learned" => $text,
            "{$prefix}.lesson_learned.patterns" => $text,
            "{$prefix}.lesson_learned.mistakes" => $text,
            "{$prefix}.lesson_learned.revisit" => $text,
            "{$prefix}.lesson_learned.relevance" => $text,
        ];
    }

    /**
     * Normalisasi + sanitasi sederhana: hanya key yang dikenal yang dipertahankan,
     * string dipotong sesuai batas, item kosong dibuang.
     *
     * @param array<string, mixed> $input
     */
    public static function fromArray(array $input): self
    {
        $cut = fn (mixed $v, int $max = self::MAX_TEXT): string =>
            is_string($v) ? mb_substr(trim($v), 0, $max) : '';

        $filterList = function (array $items, callable $map) {
            $out = [];
            foreach (array_slice($items, 0, self::MAX_ITEMS) as $item) {
                if (! is_array($item)) {
                    continue;
                }
                $mapped = $map($item);
                // Buang item yang seluruh field-nya kosong.
                if (implode('', array_map(fn ($v) => (string) $v, $mapped)) !== '') {
                    $out[] = $mapped;
                }
            }
            return $out;
        };

        $hypotheses = $filterList((array) ($input['hypotheses'] ?? []), fn ($i) => [
            'text' => $cut($i['text'] ?? '', 2000),
            'status' => in_array($i['status'] ?? '', self::HYPOTHESIS_STATUSES, true) ? $i['status'] : 'unverified',
        ]);

        $steps = $filterList((array) ($input['steps'] ?? []), fn ($i) => [
            'title' => $cut($i['title'] ?? '', 255),
            'objective' => $cut($i['objective'] ?? ''),
            'approach' => $cut($i['approach'] ?? ''),
            'command' => $cut($i['command'] ?? ''),
            'output' => $cut($i['output'] ?? ''),
            'result' => $cut($i['result'] ?? ''),
            'interpretation' => $cut($i['interpretation'] ?? ''),
        ]);

        $attempts = $filterList((array) ($input['attempts'] ?? []), fn ($i) => [
            'hypothesis' => $cut($i['hypothesis'] ?? ''),
            'approach' => $cut($i['approach'] ?? ''),
            'command' => $cut($i['command'] ?? ''),
            'expected' => $cut($i['expected'] ?? ''),
            'actual' => $cut($i['actual'] ?? ''),
            'error' => $cut($i['error'] ?? ''),
            'status' => in_array($i['status'] ?? '', self::ATTEMPT_STATUSES, true) ? $i['status'] : 'inconclusive',
            'lesson' => $cut($i['lesson'] ?? ''),
        ]);

        $evidence = $filterList((array) ($input['evidence'] ?? []), fn ($i) => [
            'type' => in_array($i['type'] ?? '', self::EVIDENCE_TYPES, true) ? $i['type'] : 'note',
            'label' => $cut($i['label'] ?? '', 255),
            'content' => $cut($i['content'] ?? ''),
        ]);

        $learned = (array) ($input['lesson_learned'] ?? []);

        return new self([
            'goal' => $cut($input['goal'] ?? ''),
            'scope' => $cut($input['scope'] ?? ''),
            'hypotheses' => $hypotheses,
            'steps' => $steps,
            'attempts' => $attempts,
            'evidence' => $evidence,
            'interpretation' => $cut($input['interpretation'] ?? ''),
            'risk_impact' => $cut($input['risk_impact'] ?? ''),
            'recommendations' => $cut($input['recommendations'] ?? ''),
            'strategy_changes' => $cut($input['strategy_changes'] ?? ''),
            'lesson_learned' => [
                'learned' => $cut($learned['learned'] ?? ''),
                'patterns' => $cut($learned['patterns'] ?? ''),
                'mistakes' => $cut($learned['mistakes'] ?? ''),
                'revisit' => $cut($learned['revisit'] ?? ''),
                'relevance' => $cut($learned['relevance'] ?? ''),
            ],
        ]);
    }

    /**
     * Apakah writeup sama sekali tidak punya isi (untuk validasi minimal).
     */
    public function isEmpty(): bool
    {
        foreach ($this->data as $key => $value) {
            if ($key === 'lesson_learned') {
                if (implode('', $value) !== '') {
                    return false;
                }
                continue;
            }
            if (is_array($value) ? $value !== [] : trim((string) $value) !== '') {
                return false;
            }
        }

        return true;
    }

    /**
     * Render ke HTML sederhana (escaped) untuk ditulis ke catatan.docx.
     * Struktur sengaja flat (h2/h3/p/pre) karena subset HTML PhpWord terbatas.
     */
    public function toHtml(): string
    {
        $d = $this->data;
        $h = fn (string $s): string => nl2br(e($s));
        $pre = fn (string $s): string => '<pre>' . e($s) . '</pre>';
        $row = fn (string $label, string $value): string =>
            $value === '' ? '' : "<p><strong>{$label}:</strong><br/>" . $h($value) . '</p>';

        $html = '';

        if ($d['goal'] !== '') {
            $html .= '<h2>Tujuan</h2><p>' . $h($d['goal']) . '</p>';
        }
        if ($d['scope'] !== '') {
            $html .= '<h2>Environment / Scope</h2><p>' . $h($d['scope']) . '</p>';
        }

        if ($d['hypotheses'] !== []) {
            $html .= '<h2>Hypotheses</h2>';
            foreach ($d['hypotheses'] as $hyp) {
                $html .= '<p><strong>[HYPOTHESIS ' . strtoupper($hyp['status']) . "]</strong> "
                    . $h($hyp['text']) . '</p>';
            }
        }

        if ($d['steps'] !== []) {
            $html .= '<h2>Langkah Analisis</h2>';
            foreach ($d['steps'] as $i => $step) {
                $n = $i + 1;
                $title = $step['title'] !== '' ? ' — ' . e($step['title']) : '';
                $html .= "<h3>Step {$n}{$title}</h3>";
                $html .= $row('Tujuan langkah', $step['objective']);
                $html .= $row('Pendekatan', $step['approach']);
                if ($step['command'] !== '') {
                    $html .= '<p><strong>Command / Request:</strong></p>' . $pre($step['command']);
                }
                if ($step['output'] !== '') {
                    $html .= '<p><strong>Output:</strong></p>' . $pre($step['output']);
                }
                $html .= $row('Hasil (FACT)', $step['result']);
                $html .= $row('Interpretasi', $step['interpretation']);
            }
        }

        if ($d['attempts'] !== []) {
            $html .= '<h2>Experiments / Attempts</h2>';
            foreach ($d['attempts'] as $i => $att) {
                $n = $i + 1;
                $html .= "<h3>Attempt {$n} [" . strtoupper($att['status']) . ']</h3>';
                $html .= $row('Hypothesis', $att['hypothesis']);
                $html .= $row('Approach', $att['approach']);
                if ($att['command'] !== '') {
                    $html .= '<p><strong>Command / Request:</strong></p>' . $pre($att['command']);
                }
                $html .= $row('Expected', $att['expected']);
                $html .= $row('Actual', $att['actual']);
                if ($att['error'] !== '') {
                    $html .= '<p><strong>Error:</strong></p>' . $pre($att['error']);
                }
                $html .= $row('Pelajaran / perubahan strategi', $att['lesson']);
            }
        }

        if ($d['evidence'] !== []) {
            $html .= '<h2>Bukti / Output Penting</h2>';
            foreach ($d['evidence'] as $ev) {
                $label = $ev['label'] !== '' ? ' — ' . e($ev['label']) : '';
                $html .= '<p><strong>[FACT][' . strtoupper($ev['type']) . "{$label}]</strong></p>"
                    . $pre($ev['content']);
            }
        }

        if ($d['interpretation'] !== '') {
            $html .= '<h2>Interpretasi</h2><p>' . $h($d['interpretation']) . '</p>';
        }
        if ($d['risk_impact'] !== '') {
            $html .= '<h2>Risiko / Impact</h2><p>' . $h($d['risk_impact']) . '</p>';
        }
        if ($d['recommendations'] !== '') {
            $html .= '<h2>Rekomendasi</h2><p>' . $h($d['recommendations']) . '</p>';
        }
        if ($d['strategy_changes'] !== '') {
            $html .= '<h2>Strategy Changes</h2><p>' . $h($d['strategy_changes']) . '</p>';
        }

        $ll = $d['lesson_learned'];
        if (implode('', $ll) !== '') {
            $html .= '<h2>Lesson Learned</h2>';
            $html .= $row('Apa yang dipelajari', $ll['learned']);
            $html .= $row('Pola yang ditemukan', $ll['patterns']);
            $html .= $row('Kesalahan yang harus dihindari', $ll['mistakes']);
            $html .= $row('Konsep yang perlu dipahami ulang', $ll['revisit']);
            $html .= $row('Relevansi dunia nyata', $ll['relevance']);
        }

        return $html;
    }
}
