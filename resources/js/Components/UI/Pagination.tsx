import { Link } from '@inertiajs/react';

export default function Pagination({ links }: { links: any[] }) {
    if (!links || links.length <= 3) return null; // Sembunyikan jika hanya 1 halaman

    return (
        <nav className="mt-6 flex flex-wrap items-center gap-1" aria-label="Navigasi halaman">
            {links.map((link, key) =>
                link.url === null ? (
                    <span
                        key={key}
                        aria-disabled="true"
                        className="pointer-events-none rounded-md border border-edge px-3 py-1.5 text-sm text-muted"
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ) : (
                    <Link
                        key={key}
                        href={link.url}
                        aria-current={link.active ? 'page' : undefined}
                        className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                            link.active
                                ? 'border-accent/40 bg-accent/10 font-medium text-accent'
                                : 'border-edge bg-surface text-muted hover:bg-elevated hover:text-strong'
                        }`}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                )
            )}
        </nav>
    );
}