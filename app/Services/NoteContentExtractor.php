<?php

namespace App\Services;

use App\Models\Note;
use DOMDocument;
use DOMElement;
use DOMNode;
use DOMText;
use Illuminate\Support\Facades\Storage;

/**
 * Content Extraction Layer — Phase 3B.
 *
 * Mengubah content Note menjadi representasi teks biasa dan Markdown yang
 * bersih, terstruktur, dan siap diberikan ke model AI (Phase 4) TANPA mengubah
 * source-of-truth (DOCX).
 *
 * Keamanan:
 * - READ-ONLY: DOCX tidak pernah ditulis ulang; hasil tidak disimpan ke DB.
 * - Isi note TIDAK dipercaya: elemen aktif (script/style/iframe/object/form/...)
 *   dibuang beserta isinya; data URI image dan path filesystem internal yang
 *   dihasilkan aplikasi tidak pernah bocor ke output.
 * - Tidak ada eksekusi kode — transformasi murni string -> string via DOM.
 *
 * Batasan yang diketahui (dari roundtrip PhpWord DOCX -> HTML):
 * - List, code block, dan blockquote TIDAK dapat dipulihkan dari DOCX karena
 *   HTML writer PhpWord meratakannya menjadi <p>. Extractor tetap mendukung
 *   elemen-elemen tersebut bila input HTML memilikinya (contoh: HTML ReactQuill
 *   sebelum masuk DOCX), sehingga struktur yang SEMPAT hilang di roundtrip
 *   tidak diperparah oleh lapisan ekstraksi ini.
 */
final class NoteContentExtractor
{
    /** Elemen yang dibuang TOTAL beserta isinya (defense-in-depth). */
    private const DROPPED_TAGS = [
        'script', 'style', 'iframe', 'object', 'embed', 'form', 'input',
        'button', 'select', 'textarea', 'option', 'link', 'meta', 'head',
        'title', 'noscript', 'svg', 'math', 'template',
    ];

    /** Elemen blok: dipisahkan baris baru dari konteks sekitarnya. */
    private const BLOCK_TAGS = [
        'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
        'pre', 'blockquote', 'table', 'tr', 'figure', 'section', 'article',
        'header', 'footer', 'main', 'aside', 'dl', 'dt', 'dd',
    ];

    public function __construct(private readonly NoteDocumentService $documents)
    {
    }

    /**
     * Entry utama: content AI-ready dari sebuah Note.
     *
     * Membaca HTML dari DOCX (source-of-truth) via NoteDocumentService lalu
     * mengekstrak representasi teks + Markdown.
     */
    public function getAiContent(Note $note): NoteAiContent
    {
        $html = $this->documents->readHtmlFromDocx(
            Storage::disk('cyber')->path("{$note->path_folder}/catatan.docx")
        );

        return $this->fromHtml($note->title, $html);
    }

    /**
     * Ekstrak dari string HTML arbitrer (mis. hasil roundtrip DOCX atau HTML
     * ReactQuill). Murni transformasi; tidak menyentuh storage.
     */
    public function fromHtml(string $title, string $html): NoteAiContent
    {
        if (trim($html) === '') {
            return new NoteAiContent($title, '', '');
        }

        $dom = $this->parse($html);
        $markdown = $this->render($dom, 'markdown');
        $plainText = $this->render($dom, 'text');

        return new NoteAiContent($title, $plainText, $markdown);
    }

    // ----------------------------------------------------------------------
    // Parsing & traversal
    // ----------------------------------------------------------------------

    private function parse(string $html): DOMDocument
    {
        $dom = new DOMDocument();

        libxml_use_internal_errors(true);
        // Prefix <?xml encoding="UTF-8"> membuat loadHTML memperlakukan input
        // sebagai UTF-8 sehingga teks non-ASCII (Unicode) tetap utuh.
        $dom->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_NOERROR | LIBXML_NOWARNING);
        libxml_clear_errors();

        return $dom;
    }

    private function render(DOMDocument $dom, string $mode): string
    {
        $out = '';
        $body = $dom->getElementsByTagName('body')->item(0);

        if ($body !== null) {
            $this->renderNode($body, $mode, 0, $out);
        }

        return $this->normalize($out);
    }

    private function renderNode(?DOMNode $node, string $mode, int $depth, string &$out): void
    {
        if ($node === null) {
            return;
        }

        if ($node instanceof DOMText) {
            $this->appendInlineText($out, $node->nodeValue ?? '');

            return;
        }

        if (! $node instanceof DOMElement) {
            return; // komentar / processing instruction, dll.
        }

        $tag = strtolower($node->nodeName);

        if (in_array($tag, self::DROPPED_TAGS, true)) {
            return;
        }

        switch ($tag) {
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                $this->ensureLineBreak($out);
                if ($mode === 'markdown') {
                    $out .= str_repeat('#', (int) substr($tag, 1)) . ' ';
                }
                $this->renderChildren($node, $mode, $depth, $out);
                $out .= "\n\n";

                return;

            case 'p':
                $this->ensureLineBreak($out);
                $this->renderChildren($node, $mode, $depth, $out);
                $out .= "\n\n";

                return;

            case 'br':
                $out .= "\n";

                return;

            case 'hr':
                $this->ensureLineBreak($out);
                $out .= $mode === 'markdown' ? '---' : str_repeat('-', 16);
                $out .= "\n\n";

                return;

            case 'ul':
                $this->renderList($node, $mode, $depth, $out, false);

                return;

            case 'ol':
                $this->renderList($node, $mode, $depth, $out, true);

                return;

            case 'blockquote':
                $this->ensureLineBreak($out);
                $inner = '';
                $this->renderChildren($node, $mode, $depth, $inner);
                $inner = trim($inner);

                if ($mode === 'markdown' && $inner !== '') {
                    foreach (preg_split('/\r\n|\r|\n/', $inner) as $line) {
                        $out .= '> ' . rtrim($line) . "\n";
                    }
                    $out .= "\n";
                } else {
                    $out .= $inner . "\n\n";
                }

                return;

            case 'pre':
                $this->ensureLineBreak($out);
                $code = trim((string) $node->textContent);
                $code = trim($code, "\n");

                if ($mode === 'markdown') {
                    $out .= "```\n" . $code . "\n```\n\n";
                } elseif ($code !== '') {
                    foreach (preg_split('/\r\n|\r|\n/', $code) as $line) {
                        $out .= '    ' . $line . "\n";
                    }
                    $out .= "\n";
                }

                return;

            case 'code':
                $inline = trim((string) $node->textContent);
                if ($mode === 'markdown' && $inline !== '') {
                    $out .= '`' . $inline . '`';
                } else {
                    $out .= $inline;
                }

                return;

            case 'img':
                $alt = trim($node->getAttribute('alt') ?? '');
                $out .= $alt !== '' ? '[Image: ' . $alt . ']' : '[Image]';

                return;

            case 'a':
                $this->renderLink($node, $mode, $depth, $out);

                return;

            case 'table':
                $this->renderTable($node, $mode, $depth, $out);

                return;

            case 'strong':
            case 'b':
                $this->renderEmphasis($node, $mode, $depth, $out, '**');

                return;

            case 'em':
            case 'i':
                $this->renderEmphasis($node, $mode, $depth, $out, '*');

                return;

            case 'del':
            case 's':
            case 'strike':
                $this->renderEmphasis($node, $mode, $depth, $out, '~~');

                return;

            case 'u':
            case 'ins':
                // Markdown tidak punya underline; pertahankan teksnya saja.
                $this->renderChildren($node, $mode, $depth, $out);

                return;

            case 'span':
                $this->renderSpan($node, $mode, $depth, $out);

                return;

            default:
                if (in_array($tag, self::BLOCK_TAGS, true)) {
                    $this->ensureLineBreak($out);
                    $this->renderChildren($node, $mode, $depth, $out);
                    $this->ensureLineBreak($out);
                } else {
                    $this->renderChildren($node, $mode, $depth, $out);
                }
        }
    }

    private function renderChildren(DOMNode $node, string $mode, int $depth, string &$out): void
    {
        foreach ($node->childNodes as $child) {
            $this->renderNode($child, $mode, $depth, $out);
        }
    }

    private function ensureLineBreak(string &$out): void
    {
        if ($out !== '' && ! str_ends_with($out, "\n")) {
            $out .= "\n";
        }
    }

    private function appendInlineText(string &$out, string $text): void
    {
        // Kolaps semua whitespace (termasuk newline dari HTML yang diindentasi
        // writer PhpWord) menjadi satu spasi.
        $text = preg_replace('/\s+/u', ' ', $text) ?? '';

        if ($text === '') {
            return;
        }

        if ($text === ' ') {
            if ($out !== '' && ! str_ends_with($out, ' ') && ! str_ends_with($out, "\n")) {
                $out .= ' ';
            }

            return;
        }

        $out .= $text;
    }

    private function renderList(DOMNode $list, string $mode, int $depth, string &$out, bool $ordered): void
    {
        $this->ensureLineBreak($out);
        $index = 1;

        foreach ($list->childNodes as $child) {
            if (! $child instanceof DOMElement || strtolower($child->nodeName) !== 'li') {
                continue;
            }

            $this->ensureLineBreak($out);
            $out .= str_repeat('  ', $depth) . ($ordered ? $index . '. ' : '* ');
            $this->renderChildren($child, $mode, $depth + 1, $out);
            $index++;
        }

        $out .= "\n\n";
    }

    private function renderEmphasis(DOMNode $node, string $mode, int $depth, string &$out, string $marker): void
    {
        if ($mode !== 'markdown') {
            $this->renderChildren($node, $mode, $depth, $out);

            return;
        }

        $inner = trim($this->renderToString($node, $mode, $depth));
        if ($inner === '') {
            return;
        }

        $out .= $marker . $inner . $marker;
    }

    private function renderSpan(DOMNode $node, string $mode, int $depth, string &$out): void
    {
        // Output HTML writer PhpWord memakai <span style="font-weight: bold;">,
        // <span style="font-style: italic;">, <span style="text-decoration:
        // line-through;">, dst.
        $style = strtolower($node->getAttribute('style') ?? '');
        $bold = (bool) preg_match('/(?:^|;)\s*font-weight\s*:\s*(?:bold|[5-9]00)/', $style);
        $italic = (bool) preg_match('/(?:^|;)\s*font-style\s*:\s*italic/', $style);
        $strike = (bool) preg_match('/(?:^|;)\s*text-decoration(?:-line)?\s*:\s*line-through/', $style);

        $inner = trim($this->renderToString($node, $mode, $depth));
        if ($inner === '') {
            return;
        }

        if ($mode === 'markdown') {
            if ($bold) {
                $inner = '**' . $inner . '**';
            }
            if ($italic) {
                $inner = '*' . $inner . '*';
            }
            if ($strike) {
                $inner = '~~' . $inner . '~~';
            }
        }

        $out .= $inner;
    }

    private function renderLink(DOMNode $node, string $mode, int $depth, string &$out): void
    {
        $text = trim($this->renderToString($node, $mode, $depth));
        $href = $this->safeLink($node->getAttribute('href') ?? '');

        if ($mode === 'markdown' && $href !== '' && $text !== '') {
            $out .= '[' . $text . '](' . $href . ')';

            return;
        }

        // Tanpa href aman: hanya teksnya — path filesystem / javascript: tidak bocor.
        $out .= $text;
    }

    private function renderTable(DOMNode $table, string $mode, int $depth, string &$out): void
    {
        $this->ensureLineBreak($out);
        $rows = $this->tableRows($table);
        $isFirst = true;

        foreach ($rows as $row) {
            $cells = [];
            $headerRow = false;

            foreach ($row->childNodes as $cell) {
                if (! $cell instanceof DOMElement) {
                    continue;
                }
                $cellTag = strtolower($cell->nodeName);
                if (! in_array($cellTag, ['td', 'th'], true)) {
                    continue;
                }

                $value = str_replace('|', '\\|', $this->renderToString($cell, $mode, $depth));
                $cells[] = trim(preg_replace('/\s+/u', ' ', $value) ?? '');

                if ($cellTag === 'th') {
                    $headerRow = true;
                }
            }

            if ($cells === []) {
                continue;
            }

            $out .= '| ' . implode(' | ', $cells) . ' |' . "\n";

            if ($isFirst && $headerRow) {
                $out .= '| ' . implode(' | ', array_fill(0, count($cells), '---')) . ' |' . "\n";
            }
            $isFirst = false;
        }

        $out .= "\n";
    }

    private function tableRows(DOMNode $table): array
    {
        $rows = [];

        foreach ($table->childNodes as $group) {
            if (! $group instanceof DOMElement) {
                continue;
            }
            $groupTag = strtolower($group->nodeName);

            if (in_array($groupTag, ['thead', 'tbody', 'tfoot'], true)) {
                foreach ($group->childNodes as $tr) {
                    if ($tr instanceof DOMElement && strtolower($tr->nodeName) === 'tr') {
                        $rows[] = $tr;
                    }
                }
            } elseif ($groupTag === 'tr') {
                $rows[] = $group;
            }
        }

        return $rows;
    }

    private function renderToString(DOMNode $node, string $mode, int $depth): string
    {
        $buffer = '';
        $this->renderChildren($node, $mode, $depth, $buffer);

        return $buffer;
    }

    private function safeLink(string $href): string
    {
        $href = trim($href);
        if ($href === '') {
            return '';
        }

        // URL relatif / path filesystem (bukan skema) tidak pernah di-output.
        if (! preg_match('/^[a-z][a-z0-9+.-]*:/i', $href)) {
            return '';
        }

        $scheme = strtolower((string) parse_url($href, PHP_URL_SCHEME));

        return in_array($scheme, ['http', 'https', 'mailto'], true) ? $href : '';
    }

    /**
     * Rapikan output + pertahanan berlapis terhadap kebocoran media.
     *
     * HTML writer PhpWord terkadang menulis gambar sebagai TEKS literal
     * ("img border=... src=\"data:image/...\"/>") bukan elemen <img>; kedua
     * bentuk (atribut maupun teks literal) diganti placeholder [Image] dan
     * tidak pernah bocor ke AI.
     */
    private function normalize(string $out): string
    {
        $out = preg_replace('/[ \t]+$/m', '', $out) ?? '';
        $out = preg_replace('/\n{3,}/', "\n\n", $out) ?? '';

        $out = preg_replace(
            '~img\s+border="0"[^>]*src="data:image/[^"]*"[^>]*/?>~i',
            '[Image]',
            $out
        ) ?? $out;

        $out = preg_replace(
            '~data:image/[a-z0-9.+-]+;base64,[a-z0-9+/]+={0,2}~i',
            '[Image]',
            $out
        ) ?? $out;

        return trim($out);
    }
}