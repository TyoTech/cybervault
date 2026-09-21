import DOMPurify from 'dompurify';

/**
 * Allow-list HTML yang cocok dengan output ReactQuill (editor Note) dan
 * output HTML writer PhpWord (DOCX -> HTML).
 *
 * DOMPurify otomatis:
 * - membuang tag script/style/iframe/object/embed/form, dst,
 * - membuang semua atribut event handler (onerror, onclick, ...),
 * - memblokir URL berbahaya (javascript:, data: selain image di src).
 *
 * Catatan: DOMPurify versi modern TIDAK lagi mensanitasi isi atribut `style` secara
 * otomatis, jadi kami menambahkan hook yang membersihkan properti CSS berbahaya
 * (url(), expression(), @import, behavior, javascript:, dll.) secara eksplisit.
 */

const ALLOWED_TAGS = [
    'a',
    'blockquote',
    'br',
    'code',
    'del',
    'div',
    'em',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'img',
    'ins',
    'li',
    'ol',
    'p',
    'pre',
    's',
    'span',
    'strong',
    'sub',
    'sup',
    'table',
    'tbody',
    'td',
    'th',
    'thead',
    'tr',
    'u',
    'ul',
];

const ALLOWED_ATTR = [
    'href',
    'title',
    'target',
    'rel',
    'src',
    'alt',
    'width',
    'height',
    'style',
    'class',
];

/** Pola CSS yang berbahaya: dibuang dari nilai atribut style. */
const UNSAFE_CSS_PATTERNS: RegExp[] = [
    /url\s*\([^)]*\)/gi,
    /expression\s*\([^)]*\)/gi,
    /@import[^;]*/gi,
    /-moz-binding\s*:[^;]*/gi,
    /behavior\s*:[^;]*/gi,
    /javascript\s*:/gi,
    /vbscript\s*:/gi,
    /data\s*:/gi,
];

function sanitizeCssValue(value: string): string {
    return UNSAFE_CSS_PATTERNS.reduce((acc, pattern) => acc.replace(pattern, ''), value).trim();
}

let styleHookRegistered = false;

/**
 * Sanitasi HTML Note sebelum dimasukkan ke dangerouslySetInnerHTML (Show)
 * atau ke editor Quill (Edit).
 */
export function sanitizeNoteHtml(html: string): string {
    if (!styleHookRegistered) {
        DOMPurify.addHook('afterSanitizeAttributes', (node) => {
            if (!node.hasAttribute('style')) {
                return;
            }

            const cleaned = sanitizeCssValue(node.getAttribute('style') || '');
            if (cleaned === '') {
                node.removeAttribute('style');
            } else {
                node.setAttribute('style', cleaned);
            }
        });
        styleHookRegistered = true;
    }

    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
        ALLOW_DATA_ATTR: false,
        ALLOW_ARIA_ATTR: false,
        FORBID_TAGS: [
            'style',
            'form',
            'input',
            'button',
            'textarea',
            'select',
            'option',
            'iframe',
            'object',
            'embed',
            'link',
            'meta',
            'script',
        ],
        FORBID_ATTR: ['formaction', 'xlink:href', 'ping'],
    });
}