import { useState, useEffect, useRef } from 'react';
import { Search, Book, Terminal, Shield, Wrench } from 'lucide-react';
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
                setIsOpen(prev => !prev);
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
            case 'note': return <Book className="w-4 h-4 mr-3 text-zinc-500 group-hover:text-blue-500" />;
            case 'challenge': return <Shield className="w-4 h-4 mr-3 text-zinc-500 group-hover:text-emerald-500" />;
            case 'payload': return <Terminal className="w-4 h-4 mr-3 text-zinc-500 group-hover:text-purple-500" />;
            case 'tool': return <Wrench className="w-4 h-4 mr-3 text-zinc-500 group-hover:text-orange-500" />;
            default: return <Search className="w-4 h-4 mr-3" />;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 sm:pt-32 px-4">
            <div className="fixed inset-0 bg-[#0a0a0a]/80 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

            <div className="relative w-full max-w-xl bg-zinc-950 border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col">
                <div className="flex items-center px-4 py-4 border-b border-white/5">
                    <Search className="w-5 h-5 text-blue-500 mr-3 shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Cari notes, payload, tools..."
                        className="flex-1 bg-transparent border-none text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-0 text-base"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-2">
                    {loading ? (
                        <div className="px-4 py-8 text-center text-sm text-zinc-500">Mencari...</div>
                    ) : query === '' ? (
                        <div className="px-4 py-8 text-center text-sm text-zinc-500">Ketik untuk mencari.</div>
                    ) : results.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-zinc-500">Tidak ada hasil untuk "{query}"</div>
                    ) : (
                        <div className="space-y-1">
                            {results.map((item, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        setIsOpen(false);
                                        router.visit(item.url);
                                    }}
                                    className="w-full flex items-center px-3 py-3 text-sm rounded-lg hover:bg-white/5 text-zinc-300 transition-colors group text-left"
                                >
                                    {getIcon(item.type)}
                                    {item.title}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
