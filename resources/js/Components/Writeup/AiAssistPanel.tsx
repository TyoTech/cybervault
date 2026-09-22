import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Button from '@/Components/UI/Button';
import { writeupFromRaw, WriteupData } from '@/Components/Writeup/types';
import ReferencePicker from '@/Components/Writeup/ReferencePicker';
import { pruneMissingSelection, ReferenceOption } from '@/Components/Writeup/referencePicker';
import { aiAssistMessage } from '@/Utils/aiAssistMessage';
import { Sparkles, Check, X, Loader2, AlertTriangle } from 'lucide-react';

interface Props {
    title: string;
    writeup: WriteupData;
    references?: ReferenceOption[];
    currentChallengeId?: number;
    onApply: (next: WriteupData) => void;
}

const labels: Record<string, string> = {
    'goal.problem': 'Masalah',
    'goal.objective': 'Tujuan',
    'goal.proof': 'Yang ingin dibuktikan',
    'environment.target': 'Target / Scope',
    'environment.environment': 'Environment',
    'environment.host': 'IP / Hostname',
    'environment.application': 'Aplikasi',
    'environment.os': 'OS',
    'environment.tools': 'Tools',
    'environment.scope': 'Catatan Scope',
    hypotheses: 'Hipotesis',
    steps: 'Langkah Analisis',
    experiments: 'Percobaan / Failed Attempts',
    evidence: 'Evidence',
    strategyChanges: 'Strategy Changes',
    riskImpact: 'Risk / Impact',
    recommendations: 'Rekomendasi',
    lessonLearned: 'Lesson Learned',
    references: 'Referensi',
    notes: 'Analysis / Catatan',
};

function isMeaningful(value: unknown): boolean {
    if (typeof value === 'string') return value.trim() !== '';
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === 'object') {
        return Object.values(value).some(isMeaningful);
    }
    return false;
}

function summarize(writeup: WriteupData): string[] {
    const paths: string[] = [];

    const visit = (value: unknown, path: string) => {
        if (typeof value === 'string') {
            if (value.trim()) paths.push(path);
            return;
        }
        if (Array.isArray(value)) {
            if (value.length) paths.push(path);
            return;
        }
        if (value && typeof value === 'object') {
            Object.entries(value).forEach(([key, child]) => {
                visit(child, path ? `${path}.${key}` : key);
            });
        }
    };

    visit(writeup, '');
    return [...new Set(paths.filter(Boolean))];
}

export default function AiAssistPanel({
    title,
    writeup,
    references = [],
    currentChallengeId,
    onApply,
}: Props) {
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<WriteupData | null>(null);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [selectedReferenceIds, setSelectedReferenceIds] = useState<number[]>([]);

    // Challenge aktif tidak pernah bisa menjadi reference dirinya sendiri.
    const availableReferences = useMemo(
        () =>
            currentChallengeId === undefined
                ? references
                : references.filter((reference) => reference.id !== currentChallengeId),
        [references, currentChallengeId],
    );

    // Bersihkan pilihan yang tidak lagi tersedia (mis. reference dihapus
    // atau challenge aktif berubah) tanpa kehilangan pilihan valid lainnya.
    useEffect(() => {
        setSelectedReferenceIds((current) => {
            const pruned = pruneMissingSelection(current, availableReferences);
            return pruned.length === current.length ? current : pruned;
        });
    }, [availableReferences]);

    const run = async () => {
        setLoading(true);
        setError('');
        setPreview(null);
        setWarnings([]);

        try {
            const response = await axios.post(route('challenges.ai.assist'), {
                title,
                writeup,
                current_challenge_id: currentChallengeId,
                reference_ids: selectedReferenceIds.slice(0, 5),
            });

            const next = writeupFromRaw(response.data?.writeup);
            setPreview(next);
            setWarnings(Array.isArray(response.data?.warnings) ? response.data.warnings : []);
        } catch (e: unknown) {
            setError(aiAssistMessage(e));
        } finally {
            setLoading(false);
        }
    };

    const apply = () => {
        if (!preview) return;
        onApply(preview);
        setPreview(null);
        setWarnings([]);
        setError('');
    };

    const previewPaths = preview ? summarize(preview) : [];

    return (
        <section className="rounded-lg border border-edge bg-surface p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-accent" />
                        <h2 className="text-sm font-medium text-strong">AI Writeup Assistant</h2>
                    </div>
                    <p className="mt-1 text-xs text-faint">
                        Strukturkan catatan kasar ke field Writeup. AI tidak menyimpan otomatis.
                    </p>
                </div>

                <Button type="button" variant="secondary" size="sm" onClick={run} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {loading ? 'Memproses…' : 'Isi dengan AI'}
                </Button>
            </div>

            <div className="mt-4 rounded-md border border-edge bg-surface p-3">
                <ReferencePicker
                    references={availableReferences}
                    selectedIds={selectedReferenceIds}
                    onChange={setSelectedReferenceIds}
                    disabled={loading}
                />
            </div>

            {error && (
                <div className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                    {error}
                </div>
            )}

            {preview && (
                <div className="mt-4 space-y-3 border-t border-edge pt-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-medium text-strong">Preview hasil AI</p>
                            <p className="text-xs text-faint">
                                {previewPaths.length} bagian terisi. Belum disimpan ke writeup.json.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" variant="ghost" size="sm" onClick={() => setPreview(null)}>
                                <X className="h-4 w-4" /> Batal
                            </Button>
                            <Button type="button" size="sm" onClick={apply}>
                                <Check className="h-4 w-4" /> Terapkan
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {previewPaths.map((path) => (
                            <span key={path} className="rounded-md border border-edge px-2 py-1 text-xs text-muted">
                                {labels[path] ?? path}
                            </span>
                        ))}
                    </div>

                    {warnings.length > 0 && (
                        <div className="space-y-1 rounded-md border border-warning/30 bg-warning/10 px-3 py-2">
                            {warnings.map((warning) => (
                                <div key={warning} className="flex gap-2 text-xs text-muted">
                                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    <span>{warning}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}