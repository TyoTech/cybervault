import { Link } from '@inertiajs/react';

export default function Pagination({ links }: { links: any[] }) {
    if (links.length <= 3) return null; // Sembunyikan jika hanya 1 halaman

    return (
        <div className="flex flex-wrap justify-center gap-1 mt-8">
            {links.map((link, key) => (
                link.url === null ? (
                    <div
                        key={key}
                        className="px-4 py-2 text-sm text-zinc-500 bg-zinc-900/50 border border-white/5 rounded-md cursor-not-allowed"
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ) : (
                    <Link
                        key={key}
                        href={link.url}
                        className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                            link.active
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 font-medium'
                                : 'text-zinc-400 bg-zinc-900/50 border-white/5 hover:bg-zinc-800'
                        }`}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                )
            ))}
        </div>
    );
}
