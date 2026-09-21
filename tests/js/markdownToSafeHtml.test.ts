import { describe, expect, it } from 'vitest';
import { markdownToSafeHtml } from '@/Utils/markdownToSafeHtml';

describe('markdownToSafeHtml (AI output -> HTML aman untuk editor)', () => {
    it('mempertahankan struktur Markdown: heading, list, kode, bold, link', () => {
        const md = [
            '# Recon',
            '',
            'Scanning **Nmap**.',
            '',
            '- Port 22',
            '- Port 80',
            '',
            '```bash',
            'nmap -sV 10.10.10.10',
            '```',
            '',
            'Lihat [ref](https://example.com).',
        ].join('\n');

        const html = markdownToSafeHtml(md);

        expect(html).toContain('<h1>Recon</h1>');
        expect(html).toContain('<strong>Nmap</strong>');
        expect(html).toContain('<li>Port 22</li>');
        expect(html).toContain('nmap -sV 10.10.10.10');
        expect(html).toContain('<a href="https://example.com"');
    });

    it('tidak pernah mengeluarkan <script> dari input Markdown', () => {
        const out = markdownToSafeHtml('aman\n\n<script>alert(1)</script>\n\n<scr' + 'ipt src="x"></scr' + 'ipt>');
        expect(out).not.toContain('<script');
        expect(out).toContain('aman');
    });

    it('memblokir javascript: URL pada link Markdown', () => {
        const out = markdownToSafeHtml('[klik](javascript:alert(1))');
        expect(out).not.toContain('javascript:');
    });

    it('menghapus event handler dari HTML yang disisipkan di Markdown', () => {
        const out = markdownToSafeHtml('teks\n\n<img src="x" onerror="alert(1)">');
        expect(out).not.toContain('onerror');
        expect(out).toContain('teks');
    });

    it('menangani input kosong dengan aman', () => {
        expect(markdownToSafeHtml('')).not.toContain('<script');
    });
});