import { useState } from 'react';
import axios from 'axios';
import { Check, Loader2, Sparkles, X } from 'lucide-react';
import Button from '@/Components/UI/Button';
import { markdownToSafeHtml } from '@/Utils/markdownToSafeHtml';
import { improveErrorMessage } from '@/Utils/aiImproveError';

/**
 * AI Assist untuk Writeup (kind=writeup).
 *
 * Flow: request → preview suggestion → user pilih target section →
 * Accept memasukkan teks hasil AI ke field target (client state saja) →
 * user REVIEW → user Save. AI tidak pernah menyimpan.
 *
 * Teks hasil AI ditandai marker "AI suggestion — requires verification"
 * karena AI tidak boleh diperlakukan sebagai fakta.
 */

export interface AiSuggestion {
    title: string;
    markdown: string;
    suggestions: string[];
}

interface Target {
    /** dot-path sederhana ke field WriteupContent, mis. "goal" atau "lesson_learned.learned" */
    key: string;
    label: string;
}

interface WriteupAiPanelProps {
    noteId: string;
    targets: Target[];
    onApply: (targetKey: string, text: string) => void;
}

export default function WriteupAiPanel({ noteId, targets, onApply }: WriteupAiPanelProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);
    const [target, setTarget] = useState(targets[0]?.key ?? '');

    const runImprove = async () => {
        if (loading) return;
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
        onApply(target, suggestion.markdown.trim());
        setSuggestion(null);
    };

    return (
        <div className="rounded-lg border border-edge bg-surface/40 p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="secondary" size="sm" onClick={runImprove} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    {loading ? 'Memproses AI lokal…' : 'AI Assist'}
                </Button>
                <p className="text-xs text-zinc-500 max-w-md">
                    AI lokal (Ollama) menyarankan perbaikan struktur &amp; kejelasan. AI tidak boleh
                    mengarang evidence — hasil bertanda <em>requires verification</em> wajib dicek.
                    AI tidak pernah menyimpan.
                </p>
            </div>

            {error && (
                <div className="flex items-start justify-between gap-3 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3">
                    <p className="text-sm text-red-400">{error}</p>
                    <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-300" aria-label="Tutup pesan error">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {suggestion && (
                <div className="rounded-md border border-blue-500/30 bg-zinc-900/60 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" /> AI Suggestion — review sebelum dipakai
                        </h3>
                        <span className="text-xs text-amber-400/80">requires verification</span>
                    </div>

                    <div>
                        <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Content (Markdown)</p>
                        <div
                            className="ai-preview text-sm text-zinc-200 leading-relaxed space-y-2 max-h-72 overflow-y-auto pr-2"
                            // Output AI = untrusted: sanitasi DOMPurify sebelum render preview.
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

                    <div className="flex flex-wrap items-end justify-between gap-3 pt-2 border-t border-white/10">
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1" htmlFor="ai-target">Masukkan hasil ke bagian:</label>
                            <select
                                id="ai-target"
                                className="h-9 rounded-md border border-edge bg-elevated px-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                value={target}
                                onChange={(e) => setTarget(e.target.value)}
                            >
                                {targets.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" variant="ghost" size="sm" onClick={reject}>
                                <X className="w-4 h-4 mr-1" /> Reject
                            </Button>
                            <Button type="button" variant="primary" size="sm" onClick={accept}>
                                <Check className="w-4 h-4 mr-1" /> Accept
                            </Button>
                        </div>
                    </div>
                    <p className="text-xs text-zinc-500">
                        Accept hanya mengisi field target. Simpan tetap lewat tombol Save.
                    </p>
                </div>
            )}
        </div>
    );
}
