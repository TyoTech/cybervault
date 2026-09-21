import { marked } from 'marked';
import { sanitizeNoteHtml } from '@/Utils/sanitizeHtml';

/**
 * Konversi Markdown (hasil AI "Improve Writeup") menjadi HTML yang AMAN untuk
 * editor Quill / preview.
 *
 * Output AI diperlakukan sebagai UNTRUSTED user-generated content: hasil
 * `marked` selalu dilewatkan ke `sanitizeNoteHtml` (DOMPurify allow-list yang
 * sama dengan isi catatan biasa) sehingga script/event handler/javascript: URL
 * tidak pernah masuk ke editor. DOMPurify hanya berjalan di browser (jsdom di
 * test), jadi util ini hanya dipakai di client.
 */
export function markdownToSafeHtml(markdown: string): string {
    let html: string;

    try {
        html = marked.parse(markdown ?? '', {
            async: false,
            gfm: true,
            breaks: false,
        }) as string;
    } catch {
        // Jatuh ke sanitasi teks mentah, bukan mengembalikan HTML tidak aman.
        html = markdown ?? '';
    }

    return sanitizeNoteHtml(html);
}