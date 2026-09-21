<?php

namespace Tests\Unit;

use App\Services\NoteAiContent;
use App\Services\NoteContentExtractor;
use App\Services\NoteDocumentService;
use Tests\TestCase;

class NoteContentExtractorTest extends TestCase
{
    /** PNG 1x1 valid (sama dengan yang dipakai test Note lain). */
    private const PNG_A = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    private NoteContentExtractor $extractor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->extractor = new NoteContentExtractor(new NoteDocumentService());
    }

    private function extract(string $html): NoteAiContent
    {
        return $this->extractor->fromHtml('Judul Tes', $html);
    }

    // ------------------------------------------------------------------
    // Dasar
    // ------------------------------------------------------------------

    public function test_simple_html_to_plain_text(): void
    {
        $result = $this->extract('<p>Halo dunia, ini catatan.</p>');

        $this->assertSame('Judul Tes', $result->title);
        $this->assertSame('Halo dunia, ini catatan.', $result->plainText);
        $this->assertSame('Halo dunia, ini catatan.', $result->markdown);
    }

    public function test_heading_structure_is_preserved(): void
    {
        $result = $this->extract('<h1>Recon</h1><p>teks</p><h2>Result</h2><h3>Detail</h3>');
        $md = $result->markdown;

        $this->assertStringContainsString('# Recon', $md);
        $this->assertStringContainsString('## Result', $md);
        $this->assertStringContainsString('### Detail', $md);
        $this->assertStringContainsString('Recon', $result->plainText);
        $this->assertStringContainsString('Result', $result->plainText);
    }

    public function test_unordered_list_preserved(): void
    {
        $result = $this->extract('<ul><li>Port 22</li><li>Port 80</li></ul>');

        $this->assertStringContainsString('* Port 22', $result->markdown);
        $this->assertStringContainsString('* Port 80', $result->markdown);
        $this->assertStringContainsString('Port 22', $result->plainText);
    }

    public function test_ordered_list_preserved(): void
    {
        $result = $this->extract('<ol><li>Pertama</li><li>Kedua</li></ol>');

        $this->assertStringContainsString('1. Pertama', $result->markdown);
        $this->assertStringContainsString('2. Kedua', $result->markdown);
    }

    public function test_nested_list_is_indented(): void
    {
        $result = $this->extract('<ul><li>Level A<ul><li>Sub A1</li></ul></li><li>Level B</li></ul>');
        $md = $result->markdown;

        $this->assertStringContainsString('* Level A', $md);
        $this->assertStringContainsString('  * Sub A1', $md);
        $this->assertStringContainsString('* Level B', $md);
    }

    public function test_code_block_preserved(): void
    {
        $result = $this->extract('<p>Jalankan:</p><pre><code>nmap -sV -p- 10.10.10.10</code></pre>');

        $this->assertStringContainsString("```\nnmap -sV -p- 10.10.10.10\n```", $result->markdown);
        $this->assertStringContainsString('nmap -sV -p- 10.10.10.10', $result->plainText);
        $this->assertStringContainsString('Jalankan:', $result->plainText);
    }

    public function test_inline_code_preserved(): void
    {
        $result = $this->extract('<p>Gunakan <code>sudo -l</code> sekarang.</p>');

        $this->assertStringContainsString('`sudo -l`', $result->markdown);
        $this->assertStringContainsString('sudo -l', $result->plainText);
    }

    public function test_emphasis_and_phpword_span_bold(): void
    {
        $result = $this->extract('<p>Scanning <strong>Nmap</strong> dan <em>nuclei</em> ' .
            'serta <span style="font-weight: bold;">burst</span>.</p>');

        $this->assertStringContainsString('Scanning **Nmap** dan *nuclei* serta **burst**.', $result->markdown);
        $this->assertStringContainsString('Scanning Nmap dan nuclei serta burst.', $result->plainText);
    }

    public function test_blockquote_preserved(): void
    {
        $result = $this->extract('<blockquote>Simpan verbose selalu.</blockquote>');

        $this->assertStringContainsString('> Simpan verbose selalu.', $result->markdown);
        $this->assertStringContainsString('Simpan verbose selalu.', $result->plainText);
    }

    public function test_safe_links_become_markdown(): void
    {
        $result = $this->extract('<p>Lihat <a href="https://example.com/ref">referensi</a>.</p>');

        $this->assertStringContainsString('[referensi](https://example.com/ref)', $result->markdown);
        $this->assertStringContainsString('referensi', $result->plainText);
    }

    public function test_table_rendered_as_pipe_rows(): void
    {
        $html = '<table><thead><tr><th>Host</th><th>Port</th></tr></thead>' .
            '<tbody><tr><td>10.0.0.1</td><td>22</td></tr></tbody></table>';
        $md = $this->extract($html)->markdown;

        $this->assertStringContainsString('| Host | Port |', $md);
        $this->assertStringContainsString('| --- | --- |', $md);
        $this->assertStringContainsString('| 10.0.0.1 | 22 |', $md);
    }

    // ------------------------------------------------------------------
    // Keamanan: media & path tidak boleh bocor
    // ------------------------------------------------------------------

    public function test_base64_image_never_leaks_into_output(): void
    {
        $result = $this->extract('<p>diagram:</p><img src="data:image/png;base64,' . self::PNG_A . '" alt="arsitektur">');
        $combined = $result->plainText . "\n" . $result->markdown;

        $this->assertStringNotContainsString('data:image', $combined);
        $this->assertStringNotContainsString('base64', $combined);
        $this->assertStringNotContainsString(self::PNG_A, $combined);
        $this->assertStringContainsString('[Image: arsitektur]', $result->markdown);
        $this->assertStringContainsString('[Image: arsitektur]', $result->plainText);
        $this->assertStringContainsString('diagram', $combined);
    }

    public function test_phpword_literal_image_text_is_replaced_with_placeholder(): void
    {
        // Bentuk literal yang dihasilkan HTML writer PhpWord saat DOCX berisi gambar:
        // tag img ditulis sebagai TEKS (tanpa kurung <>) beserta data URI base64.
        $result = $this->extract(
            '<div><p>gambar:</p><p>img border="0" style="width: 1px; height: 1px;" ' .
            'src="data:image/png;base64,' . self::PNG_A . '"/></p></div>'
        );
        $combined = $result->plainText . "\n" . $result->markdown;

        $this->assertStringNotContainsString('data:image', $combined);
        $this->assertStringNotContainsString('base64', $combined);
        $this->assertStringNotContainsString(self::PNG_A, $combined);
        $this->assertStringNotContainsString('/p>', $combined);
        $this->assertStringContainsString('[Image]', $combined);
        $this->assertStringContainsString('gambar', $combined);
    }

    public function test_absolute_filesystem_path_never_leaks(): void
    {
        $result = $this->extract(
            '<p>file lokal:</p><img src="/home/tyo/cyber/notes/recon/img_1.png" alt="lokal">' .
            '<p>lihat <a href="/home/tyo/cyber/notes/recon/catatan.docx">dokumen lokal</a> ' .
            'atau <a href="https://example.com/file">versi web</a>.</p>'
        );
        $combined = $result->plainText . "\n" . $result->markdown;

        $this->assertStringNotContainsString('/home/tyo', $combined);
        $this->assertStringNotContainsString('notes/recon', $combined);
        $this->assertStringNotContainsString('catatan.docx', $combined);
        $this->assertStringContainsString('[Image: lokal]', $result->markdown);
        $this->assertStringContainsString('dokumen lokal', $result->markdown);
        $this->assertStringContainsString('[versi web](https://example.com/file)', $result->markdown);
    }

    public function test_malicious_html_is_neutralized(): void
    {
        $html = '<script>alert(document.cookie)</script>' .
            '<p onmouseover="steal()">aman</p>' .
            '<iframe src="http://evil.test"></iframe>' .
            '<a href="javascript:alert(1)">klik</a>' .
            '<style>body{display:none}</style>';
        $result = $this->extract($html);
        $combined = $result->plainText . "\n" . $result->markdown;

        $this->assertStringNotContainsString('<script>', $combined);
        $this->assertStringNotContainsString('alert', $combined);
        $this->assertStringNotContainsString('iframe', $combined);
        $this->assertStringNotContainsString('onmouseover', $combined);
        $this->assertStringNotContainsString('javascript:', $combined);
        $this->assertStringNotContainsString('display:none', $combined);
        $this->assertStringContainsString('aman', $combined);
        $this->assertStringContainsString('klik', $combined);
    }

    // ------------------------------------------------------------------
    // Edge cases
    // ------------------------------------------------------------------

    public function test_empty_content(): void
    {
        $result = $this->extract('');

        $this->assertSame('Judul Tes', $result->title);
        $this->assertSame('', $result->plainText);
        $this->assertSame('', $result->markdown);

        $result2 = $this->extract('<p></p>');
        $this->assertSame('', trim($result2->markdown));
        $this->assertSame('', trim($result2->plainText));
    }

    public function test_unicode_content_survives(): void
    {
        $result = $this->extract('<p>Bahasa: 🇮🇩 — “kutipan” dan —€— serta 😀 emoji.</p>');
        $combined = $result->plainText . "\n" . $result->markdown;

        $this->assertStringContainsString('Bahasa:', $combined);
        $this->assertStringContainsString('kutipan', $combined);
        $this->assertStringContainsString('€', $combined);
        $this->assertStringContainsString('😀', $combined);
    }

    public function test_long_content(): void
    {
        $paragraphs = [];
        for ($i = 1; $i <= 500; $i++) {
            $paragraphs[] = '<p>Paragraf ke-' . $i . ' — konten panjang untuk menguji ekstraktor pada dokumen besar.</p>';
        }
        $result = $this->extract(implode("\n", $paragraphs));

        $this->assertStringContainsString('Paragraf ke-1', $result->plainText);
        $this->assertStringContainsString('Paragraf ke-500', $result->markdown);
        // 500 paragraf => minimal 499 pemisah baris kosong.
        $this->assertGreaterThanOrEqual(499, substr_count($result->plainText, "\n\n"));
    }
}