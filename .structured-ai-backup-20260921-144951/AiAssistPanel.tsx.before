import { useState } from 'react';
import axios from 'axios';
import { Check, Sparkles, X, Loader2 } from 'lucide-react';
import Button from '@/Components/UI/Button';
import { markdownToSafeHtml } from '@/Utils/markdownToSafeHtml';
import { improveErrorMessage } from '@/Utils/aiImproveError';

export interface AiAssistSuggestion {
    title: string;
    markdown: string;
    suggestions: Array<{ category: string; text: string }>;
    note: string;
}

const CATEGORY_LABEL: Record<string, string> = {
    clarity: 'Kejelasan',
    structure: 'Struktur',
    fact_vs_hypothesis: 'Fact vs Hypothesis',
    evidence: 'Bukti',
    missing_reasoning: 'Reasoning yang hilang',
    lesson_learned: 'Lesson Learned',
    other: 'Lainnya',
};

interface AiAssistPanelProps {
    challengeId: string;
    onAccept: (suggestion: AiAssistSuggestion) => void;
}

/**
 * Panel "AI Assist" untuk Writeup (Phase 10).
 *
 * - Memanggil POST /challenges/{challenge}/ai/assist (ownership + throttle di backend).
 * - READ-ONLY: AI hanya memberi SARAN. Accept hanya mengisi field `notes`
 *   (client state). Penyimpanan permanen tetap lewat tombol Save/Update di page.
 * - Preview di-render dari Markdown -> HTML yang DISANITASI (DOMPurify) karena
 *   output AI diperlakukan sebagai untrusted content.
 */
export default function AiAssistPanel({ challengeId, onAccept }: AiAssistPanelProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [suggestion, setSuggestion] = useState<AiAssistSuggestion | null>(null);

    const runAssist = async () => {
        if (loading) return;
        setLoading(true);
        setError(null);

        try {
            const { data } = await axios.post(route('challenges.ai.assist', challengeId));
            setSuggestion(data.data as AiAssistSuggestion);
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
        <div className="space-y-3">
            <div className="flex items-start gap-3">
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={runAssist}
                    disabled={loading}
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Sparkles className="w-4 h-4" />
                    )}
                    {loading ? 'Memproses dengan AI lokal…' : 'Analisis dengan AI'}
                </Button>
                <p className="text-xs text-faint leading-relaxed pt-1">
                    AI menyusun saran struktur & kejelasan. Hasil tetap di-review oleh Anda —
                    AI tidak menyimpan apa pun ke disk.
                </p>
            </div>

            {error && (
                <div className="flex items-start justify-between gap-3 rounded-md border border-danger/30 bg-danger/10 px-4 py-3">
                    <p className="text-sm text-danger">{error}</p>
                    <button
                        type="button"
                        onClick={() => setError(null)}
                        className="text-danger hover:text-danger"
                        aria-label="Tutup pesan error"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {suggestion && (
                <div className="rounded-md border border-accent/30 bg-surface p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-accent flex items-center gap-2">
                            <Sparkles className="w-4 h-4" /> AI Suggestion
                        </h3>
                        <span className="text-xs text-faint">Review sebelum dipakai</span>
                    </div>

                    {suggestion.title && (
                        <div>
                            <p className="text-xs uppercase tracking-wide text-faint mb-1">Judul usulan</p>
                            <p className="text-sm text-strong">{suggestion.title}</p>
                        </div>
                    )}

                    <div>
                        <p className="text-xs uppercase tracking-wide text-faint mb-1">
                            Isi yang disarankan
                        </p>
                        {suggestion.note && (
                            <p className="text-[11px] text-warning/90 mb-2">⚠ {suggestion.note}</p>
                        )}
                        {/* Output AI = untrusted: sanitasi DOMPurify sebelum render preview. */}
                        <div
                            className="text-sm text-strong leading-relaxed space-y-2"
                            // eslint-disable-next-line react/no-danger
                            dangerouslySetInnerHTML={{ __html: markdownToSafeHtml(suggestion.markdown) }}
                        />
                    </div>

                    {suggestion.suggestions.length > 0 && (
                        <div>
                            <p className="text-xs uppercase tracking-wide text-faint mb-1">Saran</p>
                            <ul className="space-y-1.5">
                                {suggestion.suggestions.map((s, i) => (
                                    <li key={i} className="text-sm text-body flex items-start gap-2">
                                        <span className="shrink-0 rounded border border-edge bg-elevated/60 px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted mt-0.5">
                                            {CATEGORY_LABEL[s.category] ?? s.category}
                                        </span>
                                        <span>{s.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-edge">
                        <p className="text-xs text-faint">
                            Accept hanya mengisi field <span className="text-body">Catatan</span>.
                            Tekan <span className="text-body">Save</span> untuk menyimpan ke disk.
                        </p>
                        <div className="flex gap-2 shrink-0">
                            <Button type="button" variant="ghost" size="sm" onClick={reject}>
                                <X className="w-4 h-4" /> Reject
                            </Button>
                            <Button type="button" variant="primary" size="sm" onClick={accept}>
                                <Check className="w-4 h-4" /> Accept
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}