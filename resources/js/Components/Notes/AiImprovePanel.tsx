import { useState } from 'react';
import axios from 'axios';
import { Check, Sparkles, X, Loader2 } from 'lucide-react';
import Button from '@/Components/UI/Button';
import { markdownToSafeHtml } from '@/Utils/markdownToSafeHtml';
import { improveErrorMessage } from '@/Utils/aiImproveError';

/**
 * Panel "Improve with AI" (Phase 4).
 *
 * - Memanggil POST /notes/{note}/ai/improve (ownership+throttle di backend).
 * - Loading state & guard duplikat request (tombol disabled selama proses).
 * - Preview hasil AI di-render dari Markdown -> HTML yang DISANITASI (DOMPurify),
 *   karena output AI diperlakukan sebagai untrusted content.
 * - Reject  -> buang suggestion, kembali ke editor normal.
 * - Accept  -> HANYA mengisi editor via onAccept (client state).
 *   Penyimpanan permanen tetap lewat tombol Save/Update (.docx) milik Editor.
 */

export interface AiSuggestion {
    title: string;
    markdown: string;
    suggestions: string[];
}

interface AiImprovePanelProps {
    noteId: string;
    onAccept: (suggestion: AiSuggestion) => void;
}

export default function AiImprovePanel({ noteId, onAccept }: AiImprovePanelProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);

    const runImprove = async () => {
        if (loading) return; // cegah request duplikat dari klik ganda
        setLoading(true);
        setError(null);

        try {
            const { data } = await axios.post(route('notes.ai.improve', noteId));
            setSuggestion(data.data as AiSuggestion);
        } catch (e) {
            setError(improveErrorMessage(e));
        } finally {
            setLoading(false);
        }
    };

    const reject = () => {
        setSuggestion(null);
        setError(null);
    };

    const accept = () => {
        if (!suggestion) return;
        onAccept(suggestion);
        setSuggestion(null);
    };

    return (
        <div className="mb-6 space-y-4">
            {/* Tombol aksi */}
            <div className="flex items-center gap-3">
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={runImprove}
                    disabled={loading}
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    {loading ? 'Memproses dengan AI lokal…' : 'Improve with AI'}
                </Button>
                <p className="text-xs text-zinc-500">
                    AI lokal (Ollama) menyusun saran perbaikan. Anda tetap mengontrol
                    perubahan — AI tidak menyimpan apa pun.
                </p>
            </div>

            {/* Error user-friendly */}
            {error && (
                <div className="flex items-start justify-between gap-3 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3">
                    <p className="text-sm text-red-400">{error}</p>
                    <button
                        type="button"
                        onClick={() => setError(null)}
                        className="text-red-400 hover:text-red-300"
                        aria-label="Tutup pesan error"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Preview hasil AI */}
            {suggestion && (
                <div className="rounded-md border border-blue-500/30 bg-zinc-900/60 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" /> AI Suggestion
                        </h3>
                        <span className="text-xs text-zinc-500">Review sebelum dipakai</span>
                    </div>

                    <div>
                        <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Title</p>
                        <p className="text-sm text-zinc-100">{suggestion.title}</p>
                    </div>

                    <div>
                        <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Content</p>
                        {/* Output AI = untrusted: sanitasi DOMPurify sebelum render preview. */}
                        <div
                            className="ai-preview text-sm text-zinc-200 leading-relaxed space-y-2"
                            // eslint-disable-next-line react/no-danger
                            dangerouslySetInnerHTML={{ __html: markdownToSafeHtml(suggestion.markdown) }}
                        />
                    </div>

                    {suggestion.suggestions.length > 0 && (
                        <div>
                            <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Suggestions</p>
                            <ul className="list-disc list-inside space-y-1">
                                {suggestion.suggestions.map((s, i) => (
                                    <li key={i} className="text-sm text-zinc-300">{s}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                        <p className="text-xs text-zinc-500">
                            Accept hanya mengisi editor. Tekan <span className="text-zinc-300">Update (.docx)</span> untuk menyimpan.
                        </p>
                        <div className="flex gap-2">
                            <Button type="button" variant="ghost" size="sm" onClick={reject}>
                                <X className="w-4 h-4 mr-1" /> Reject
                            </Button>
                            <Button type="button" variant="primary" size="sm" onClick={accept}>
                                <Check className="w-4 h-4 mr-1" /> Accept
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}