<?php

namespace App\Services;

use PhpOffice\PhpWord\IOFactory;

/**
 * Membaca isi DOCX note menjadi HTML.
 *
 * READ-ONLY terhadap source: file catatan.docx TETAP source-of-truth, layanan
 * ini hanya membaca (PhpWord::load -> HTML writer) dan tidak pernah menulis
 * kembali ke file source. Logika ini dipindahkan dari NoteController supaya
 * tidak diduplikasi oleh Content Extractor (Phase 3B).
 */
class NoteDocumentService
{
    public function readHtmlFromDocx(string $filePath): string
    {
        if (! file_exists($filePath)) {
            return '';
        }

        $phpWord = IOFactory::load($filePath, 'Word2007');
        $writer = IOFactory::createWriter($phpWord, 'HTML');
        $temp = tempnam(sys_get_temp_dir(), 'docx');
        $writer->save($temp);
        $html = file_get_contents($temp);
        unlink($temp);

        preg_match('/<body>(.*)<\/body>/is', $html, $matches);

        return $matches[1] ?? $html;
    }
}