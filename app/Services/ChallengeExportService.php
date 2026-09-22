<?php

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\Shared\Html as PhpWordHtml;

/**
 * Export writeup challenge — ON-DEMAND, READ-ONLY.
 *
 * Seluruh output dibangun dari data struktur writeup yang SAMA (hasil
 * `ChallengeWriteupService::read()`/`normalize()`), jadi export tidak pernah
 * mengubah source-of-truth `writeup.json` dan tidak menyimpan file apa pun:
 * hasil dikembalikan sebagai bytes/string yang siap didownload oleh controller.
 *
 * Format yang didukung:
 * - JSON  -> canonical writeup data (dibuat di controller)
 * - MD    -> markdown (dengan judul challenge)
 * - TXT   -> teks polos (tanpa markdown simbol)
 * - DOCX  -> PhpWord (subset HTML h2/h3/p/pre agar kompatibel)
 * - PDF   -> DomPDF, print-friendly
 */
final class ChallengeExportService
{
    public function __construct(
        private readonly ChallengeWriteupService $writeups,
    ) {
    }

    /**
     * @param array<string, mixed> $data
     */
    public function markdown(array $data, string $title): string
    {
        $body = $this->writeups->toMarkdown($data);

        return '# ' . $title . "\n\n" . ($body === '' ? '' : $body . "\n");
    }

    /**
     * Teks polos: heading berbentuk baris kapital, markdown simbol dibuang,
     * isi code block dipertahankan apa adanya.
     *
     * @param array<string, mixed> $data
     */
    public function plainText(array $data, string $title): string
    {
        $markdown = $this->markdown($data, $title);
        $out = [];

        foreach (preg_split('/\r\n|\r|\n/', $markdown) ?: [] as $line) {
            $line = trim($line);

            if ($line === '') {
                continue;
            }

            // Fence code block tidak penting sebagai teks — isinya tetap dipertahankan.
            if (str_starts_with($line, '```')) {
                continue;
            }

            if (preg_match('/^#{1,6}\s*(.+)$/', $line, $heading)) {
                // Heading dipertahankan TANPA mengubah huruf (fakta/flag bisa
                // case-sensitive); hanya penanda markdown yang dibuang.
                $text = trim($heading[1]);
                $out[] = '';
                $out[] = $text;
                $out[] = str_repeat('=', min(mb_strlen($text), 60));
                $out[] = '';
                continue;
            }

            $line = $this->stripInlineMarkdown($line);

            if ($line !== '') {
                $out[] = $line;
            }
        }

        return trim(implode("\n", $out)) . "\n";
    }

    /**
     * HTML aman (semua teks di-escape) dengan subset h2/h3/p/pre — subset yang
     * didukung roundtrip PhpWord (DOCX) sekaligus cukup untuk PDF.
     *
     * @param array<string, mixed> $data
     */
    public function html(array $data, string $title): string
    {
        $d = $this->writeups->normalize($data);
        $h = fn (string $s): string => nl2br(e($s));
        $pre = fn (string $s): string => '<pre>' . e($s) . '</pre>';
        $kv = fn (string $label, string $value): string =>
            trim($value) === '' ? '' : '<p><strong>' . e($label) . ':</strong><br/>' . $h($value) . '</p>';
        $bullet = fn (string $text): string => '<p>&bull; ' . $h($text) . '</p>';

        $html = '<h1>' . e($title) . '</h1>';

        // --- Questions / Objectives --------------------------------------
        if ($d['questions'] !== []) {
            $stats = $this->writeups->questionStats($d);
            $html .= '<h2>Questions / Objectives</h2>';
            $html .= '<p><strong>' . $stats['solved'] . ' / ' . $stats['total']
                . ' solved</strong> (' . $stats['percent'] . '%)</p>';

            foreach ($d['questions'] as $i => $q) {
                $label = trim($q['question']) !== '' ? $q['question'] : 'Question ' . ($i + 1);
                $status = strtoupper(str_replace('_', ' ', $q['status']));
                $html .= '<h3>' . ($i + 1) . '. ' . e($label) . ' [' . e($status) . ']</h3>';
                $html .= $kv('Analysis', $q['notes']);

                foreach ($q['steps'] as $j => $step) {
                    $stepTitle = $step['title'] !== '' ? $step['title'] : 'Step ' . ($j + 1);
                    $html .= '<p><strong>Step ' . ($j + 1) . ' — ' . e($stepTitle)
                        . ' [' . e(strtoupper($step['type'] ?: 'test')) . ']</strong></p>';
                    $html .= $kv('Apa yang ingin diketahui', $step['question']);
                    $html .= $kv('Tujuan langkah', $step['goal']);
                    $html .= $kv('Pendekatan', $step['approach']);
                    $html .= $step['command'] === '' ? '' : '<p><strong>Command / request:</strong></p>' . $pre($step['command']);
                    $html .= $step['output'] === '' ? '' : '<p><strong>Output:</strong></p>' . $pre($step['output']);
                    $html .= $kv('Hasil', $step['result']);
                    $html .= $kv('Interpretasi', $step['interpretation']);
                }

                foreach ($q['evidence'] as $j => $ev) {
                    $evLabel = $ev['label'] !== '' ? $ev['label'] : 'Evidence ' . ($j + 1);
                    $html .= '<p><strong>Bukti ' . ($j + 1) . ' — ' . e($evLabel)
                        . ' (' . e($ev['kind']) . '):</strong></p>' . $pre($ev['content']);
                }

                $html .= $kv('Answer / Flag', $q['result']);
            }
        }

        // --- 1. Tujuan -----------------------------------------------------
        $goal = $d['goal'];
        if ($goal['problem'] !== '' || $goal['objective'] !== '' || $goal['proof'] !== '') {
            $html .= '<h2>Tujuan</h2>';
            $html .= $kv('Masalah yang dianalisis', $goal['problem']);
            $html .= $kv('Tujuan analisis', $goal['objective']);
            $html .= $kv('Yang ingin dibuktikan', $goal['proof']);
        }

        // --- 2. Environment / Scope ----------------------------------------
        $env = $d['environment'];
        $envRows = [
            'Target / scope' => $env['target'],
            'Environment' => $env['environment'],
            'IP / hostname' => $env['host'],
            'Aplikasi' => $env['application'],
            'OS' => $env['os'],
            'Tools' => $env['tools'],
            'Catatan scope' => $env['scope'],
        ];
        if (implode('', $envRows) !== '') {
            $html .= '<h2>Environment / Scope</h2>';
            foreach ($envRows as $label => $value) {
                $html .= $kv($label, $value);
            }
        }

        // --- 3. Hipotesis ---------------------------------------------------
        if ($d['hypotheses'] !== []) {
            $html .= '<h2>Hipotesis</h2>';
            foreach ($d['hypotheses'] as $item) {
                $tag = strtoupper($item['status'] ?: 'hypothesis');
                $html .= '<p><strong>[' . e($tag) . ']</strong> ' . $h($item['text']) . '</p>';
            }
        }

        // --- 4. Langkah Analisis ---------------------------------------------
        if ($d['steps'] !== []) {
            $html .= '<h2>Langkah Analisis</h2>';
            foreach ($d['steps'] as $i => $step) {
                $stepTitle = $step['title'] !== '' ? $step['title'] : 'Step ' . ($i + 1);
                $html .= '<h3>Step ' . ($i + 1) . ' — ' . e($stepTitle)
                    . ' [' . e(strtoupper($step['type'] ?: 'test')) . ']</h3>';
                $html .= $kv('Apa yang ingin diketahui', $step['question']);
                $html .= $kv('Tujuan langkah', $step['goal']);
                $html .= $kv('Pendekatan', $step['approach']);
                $html .= $step['command'] === '' ? '' : '<p><strong>Command / request:</strong></p>' . $pre($step['command']);
                $html .= $step['output'] === '' ? '' : '<p><strong>Output:</strong></p>' . $pre($step['output']);
                $html .= $kv('Hasil', $step['result']);
                $html .= $kv('Interpretasi', $step['interpretation']);
            }
        }

        // --- 5. Percobaan / Attempts ------------------------------------------
        if ($d['experiments'] !== []) {
            $html .= '<h2>Percobaan / Attempts</h2>';
            foreach ($d['experiments'] as $i => $exp) {
                $html .= '<h3>Attempt ' . ($i + 1) . ' [' . e(ucfirst($exp['status'] ?: 'inconclusive')) . ']</h3>';
                $html .= $kv('Hipotesis', $exp['hypothesis']);
                $html .= $kv('Pendekatan', $exp['approach']);
                $html .= $exp['command'] === '' ? '' : '<p><strong>Command / request:</strong></p>' . $pre($exp['command']);
                $html .= $kv('Hasil yang diharapkan', $exp['expected']);
                $html .= $kv('Hasil aktual', $exp['actual']);
                $html .= $exp['error'] === '' ? '' : '<p><strong>Error message:</strong></p>' . $pre($exp['error']);
                $html .= $kv('Kenapa gagal', $exp['whyFailed']);
                $html .= $kv('Yang berubah setelahnya', $exp['changed']);
                $html .= $kv('Interpretasi', $exp['interpretation']);
            }
        }

        // --- 6. Bukti / Evidence ------------------------------------------------
        if ($d['evidence'] !== []) {
            $html .= '<h2>Bukti / Evidence</h2>';
            foreach ($d['evidence'] as $i => $ev) {
                $label = $ev['label'] !== '' ? $ev['label'] : 'Evidence ' . ($i + 1);
                $html .= '<h3>' . e($label) . ' (' . e($ev['kind']) . ')</h3>';
                $html .= $pre($ev['content']);
            }
        }

        // --- 7. Strategi / 8. Risk / 9. Rekomendasi ------------------------------
        if ($d['strategyChanges'] !== []) {
            $html .= '<h2>Perubahan Strategi</h2>';
            foreach ($d['strategyChanges'] as $item) {
                $html .= $bullet($item['text']);
            }
        }

        if (trim($d['riskImpact']) !== '') {
            $html .= '<h2>Risiko / Impact</h2><p>' . $h($d['riskImpact']) . '</p>';
        }

        if ($d['recommendations'] !== []) {
            $html .= '<h2>Rekomendasi</h2>';
            foreach ($d['recommendations'] as $item) {
                $html .= $bullet($item['text']);
            }
        }

        // --- 10. Lesson Learned ---------------------------------------------------
        $lesson = $d['lessonLearned'];
        $lessonRows = [
            'Apa yang dipelajari' => $lesson['learned'],
            'Pola yang ditemukan' => $lesson['patterns'],
            'Kesalahan yang harus dihindari' => $lesson['mistakes'],
            'Konsep yang perlu dipahami ulang' => $lesson['concepts'],
            'Yang akan dilakukan berbeda' => $lesson['different'],
            'Relevansi di dunia nyata' => $lesson['relevance'],
        ];
        if (implode('', $lessonRows) !== '') {
            $html .= '<h2>Lesson Learned</h2>';
            foreach ($lessonRows as $label => $value) {
                $html .= $kv($label, $value);
            }
        }

        // --- Referensi & Catatan --------------------------------------------------
        if (trim($d['references']) !== '') {
            $html .= '<h2>Referensi</h2><p>' . $h($d['references']) . '</p>';
        }

        if (trim($d['notes']) !== '') {
            $html .= '<h2>Catatan</h2><p>' . $h($d['notes']) . '</p>';
        }

        return $html;
    }

    /**
     * DOCX (Word 2007) — dibangun via PhpWord, dikembalikan sebagai bytes.
     * READ-ONLY: tidak pernah menulis ke folder challenge/storage.
     *
     * @param array<string, mixed> $data
     */
    public function docx(array $data, string $title): string
    {
        $phpWord = new PhpWord();
        $section = $phpWord->addSection();

        $phpWord->setDefaultFontName('Calibri');
        $phpWord->setDefaultFontSize(11);

        libxml_use_internal_errors(true);
        PhpWordHtml::addHtml($section, $this->html($data, $title), false, false);
        libxml_clear_errors();

        $writer = IOFactory::createWriter($phpWord, 'Word2007');

        $temp = tempnam(sys_get_temp_dir(), 'writeup-export');
        if ($temp === false) {
            throw new \RuntimeException('Gagal membuat file temporary untuk export DOCX.');
        }

        try {
            $writer->save($temp);
            $bytes = (string) file_get_contents($temp);
        } finally {
            unlink($temp);
        }

        return $bytes;
    }

    /**
     * PDF print-friendly (A4) — dibangun via DomPDF, dikembalikan sebagai bytes.
     *
     * @param array<string, mixed> $data
     */
    public function pdf(array $data, string $title): string
    {
        $html = '<!DOCTYPE html><html lang="id"><head><meta charset="utf-8">'
            . '<style>'
            . 'body{font-family:DejaVu Sans,sans-serif;font-size:10pt;color:#1a1a1a;line-height:1.5}'
            . 'h1{font-size:16pt;border-bottom:2px solid #333;padding-bottom:4px}'
            . 'h2{font-size:13pt;margin-top:16px;border-bottom:1px solid #999;padding-bottom:2px}'
            . 'h3{font-size:11pt;margin-top:10px}'
            . 'pre{font-family:DejaVu Sans Mono,monospace;font-size:8.5pt;background:#f4f4f4;padding:6px;white-space:pre-wrap}'
            . 'p{margin:4px 0}'
            . '</style></head><body>' . $this->html($data, $title) . '</body></html>';

        $pdf = Pdf::loadHTML($html)->setPaper('a4', 'portrait');

        return $pdf->output();
    }

    private function stripInlineMarkdown(string $line): string
    {
        $line = preg_replace('/\*\*(.*?)\*\*/s', '$1', $line) ?? $line;
        $line = preg_replace('/`([^`]+)`/', '$1', $line) ?? $line;
        $line = preg_replace('/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/i', '$1 ($2)', $line) ?? $line;
        $line = preg_replace('/^([-*])\s+/', '- ', $line) ?? $line;

        return trim($line);
    }
}