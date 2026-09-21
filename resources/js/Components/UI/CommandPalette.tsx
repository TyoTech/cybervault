import { useState, useEffect, useRef } from 'react';
import { Search, Book, Shield, Terminal, Wrench, Loader2 } from 'lucide-react';
import { router } from '@inertiajs/react';
import axios from 'axios';

interface SearchResult {
    type: 'note' | 'challenge' | 'payload' | 'tool';
    title: string;
    url: string;
}

export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (isOpen && inputRef.current) inputRef.current.focus();
        else {
            setQuery('');
            setResults([]);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!query) {
            setResults([]);
            return;
        }

        const delaySearch = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await axios.get(`/api/search?q=${query}`);
                setResults(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }, 300); // Debounce 300ms

        return () => clearTimeout(delaySearch);
    }, [query]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'note':
                return <Book className="h-4 w-4 text-faint" />;
            case 'challenge':
                return <Shield className="h-4 w-4 text-faint" />;
            case 'payload':
                return <Terminal className="h-4 w-4 text-faint" />;
            case 'tool':
                return <Wrench className="h-4 w-4 text-faint" />;
            default:
                return <Search className="h-4 w-4" />;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-24 sm:pt-32">
            <div className="fixed inset-0 bg-black/60" onClick={() => setIsOpen(false)} />

            <div className="relative w-full max-w-xl overflow-hidden rounded-lg border border-edge bg-elevated shadow-2xl">
                <div className="flex items-center border-b border-edge px-4">
                    <Search className="mr-3 h-4 w-4 shrink-0 text-faint" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Cari notes, payload, tools..."
                        className="h-12 w-full bg-transparent text-sm text-strong placeholder:text-muted focus:outline-none"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <kbd className="rounded border border-edge bg-surface px-1.5 py-0.5 font-mono text-[10px] text-faint">
                        ESC
                    </kbd>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-1.5">
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-faint">
                            <Loader2 className="h-4 w-4 animate-spin" /> Mencari...
                        </div>
                    ) : query === '' ? (
                        <p className="px-4 py-8 text-center text-sm text-faint">
                            Ketik untuk mencari catatan, writeup, payload, atau tool.
                        </p>
                    ) : results.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-faint">
                            Tidak ada hasil untuk &ldquo;{query}&rdquo;
                        </p>
                    ) : (
                        <div className="space-y-0.5">
                            {results.map((item, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        setIsOpen(false);
                                        router.visit(item.url);
                                    }}
                                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-body transition-colors hover:bg-surface hover:text-strong"
                                >
                                    {getIcon(item.type)}
                                    <span className="truncate">{item.title}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}