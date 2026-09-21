import { describe, expect, it } from 'vitest';
import { sanitizeNoteHtml } from '@/Utils/sanitizeHtml';

// PNG 1x1 valid (magic bytes \x89PNG\r\n\x1a\n)
const PNG_1X1 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('sanitizeNoteHtml (allow-list DOMPurify)', () => {
    it('menghapus tag <script>', () => {
        const out = sanitizeNoteHtml('<p>aman</p><script>alert(1)</script>');
        expect(out).not.toContain('<script');
        expect(out).toContain('<p>aman</p>');
    });

    it('menghapus event handler seperti onerror', () => {
        const out = sanitizeNoteHtml(`<img src="${PNG_1X1}" onerror="alert(1)">`);
        expect(out).not.toContain('onerror');
    });

    it('memblokir javascript: URL pada href', () => {
        const out = sanitizeNoteHtml('<a href="javascript:alert(1)">x</a>');
        expect(out).not.toContain('javascript:');
    });

    it('mempertahankan formatting valid (h1, p, strong, em, ul, li, blockquote, a)', () => {
        const html =
            '<h1>Judul</h1><p><strong>tebal</strong> dan <em>miring</em></p>' +
            '<ul><li>item</li></ul><blockquote>quote</blockquote>' +
            '<a href="https://example.com" target="_blank">link</a>';
        const out = sanitizeNoteHtml(html);

        expect(out).toContain('<h1>Judul</h1>');
        expect(out).toContain('<strong>tebal</strong>');
        expect(out).toContain('<em>miring</em>');
        expect(out).toContain('<ul><li>item</li></ul>');
        expect(out).toContain('<blockquote>quote</blockquote>');
        expect(out).toContain('https://example.com');
    });

    it('mempertahankan gambar data URI yang valid', () => {
        const out = sanitizeNoteHtml(`<p>gambar:</p><img src="${PNG_1X1}" alt="x">`);
        expect(out).toContain('<img');
        expect(out).toContain('data:image/png;base64');
    });

    it('mensanitasi isi atribut style (buang url(), pertahankan warna)', () => {
        const out = sanitizeNoteHtml(
            '<span style="color:red;background:url(javascript:alert(1))">teks</span>'
        );
        expect(out).not.toContain('url(');
        expect(out).not.toContain('javascript:');
        expect(out).toContain('color:red');
    });

    it('memblokir tag berbahaya lain (iframe, object, embed, form, input)', () => {
        const out = sanitizeNoteHtml(
            '<iframe src="https://evil.example"></iframe><object data="x"></object><embed src="x"><form action="https://evil.example"><input name="x"></form>'
        );
        expect(out).not.toContain('<iframe');
        expect(out).not.toContain('<object');
        expect(out).not.toContain('<embed');
        expect(out).not.toContain('<form');
        expect(out).not.toContain('<input');
    });

    it('menghapus atribut data-* dan aria-*', () => {
        const out = sanitizeNoteHtml('<div data-payload="x" aria-hidden="true">teks</div>');
        expect(out).not.toContain('data-payload');
        expect(out).not.toContain('aria-hidden');
    });
});