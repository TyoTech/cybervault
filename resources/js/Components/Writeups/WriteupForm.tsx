import Section from '@/Components/Writeups/Section';
import Field from '@/Components/Writeups/Field';
import Button from '@/Components/UI/Button';
import Input from '@/Components/UI/Input';
import { Plus, Trash2 } from 'lucide-react';
import {
    WriteupContent, Hypothesis, AnalysisStepContent, Attempt, EvidenceBlock,
    emptyStep, emptyAttempt, emptyEvidence,
    HypothesisStatus, AttemptStatus, EvidenceType,
} from '@/types/writeup';

interface WriteupFormProps {
    value: WriteupContent;
    onChange: (next: WriteupContent) => void;
}

const HYPOTHESIS_STATUS: { value: HypothesisStatus; label: string }[] = [
    { value: 'unverified', label: 'Unverified' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'rejected', label: 'Rejected' },
];

const ATTEMPT_STATUS: { value: AttemptStatus; label: string }[] = [
    { value: 'successful', label: 'Successful' },
    { value: 'failed', label: 'Failed' },
    { value: 'inconclusive', label: 'Inconclusive' },
];

const EVIDENCE_TYPES: EvidenceType[] = ['command', 'output', 'error', 'request', 'response', 'log', 'note'];

export default function WriteupForm({ value, onChange }: WriteupFormProps) {
    const set = <K extends keyof WriteupContent>(key: K, v: WriteupContent[K]) =>
        onChange({ ...value, [key]: v });

    const setLearned = (key: keyof WriteupContent['lesson_learned'], v: string) =>
        set('lesson_learned', { ...value.lesson_learned, [key]: v });

    const updateList = <T,>(key: 'hypotheses' | 'steps' | 'attempts' | 'evidence', i: number, item: T) => {
        const list = [...(value[key] as T[])];
        list[i] = item;
        set(key, list as never);
    };
    const removeAt = (key: 'hypotheses' | 'steps' | 'attempts' | 'evidence', i: number) =>
        set(key, value[key].filter((_, idx) => idx !== i) as never);

    const selectClass =
        'h-9 rounded-md border border-edge bg-elevated px-2 text-sm text-zinc-100 ' +
        'focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50';

    return (
        <div className="space-y-4">
            {/* 1. Tujuan */}
            <Section title="1. Tujuan" description="Masalah yang dianalisis dan apa yang ingin dibuktikan" defaultOpen>
                <Field
                    label="Apa masalah yang sedang dianalisis?"
                    hint="Apa pertanyaan utama yang ingin dijawab? Apa hipotesis awal?"
                    value={value.goal}
                    onChange={(e) => set('goal', e.target.value)}
                    placeholder="Jelaskan masalah atau kondisi yang ingin dianalisis…"
                />
            </Section>

            {/* 2. Environment / Scope */}
            <Section title="2. Environment / Scope" description="Sistem atau lab yang sedang diuji" defaultOpen>
                <Field
                    label="Sistem atau lab apa yang sedang diuji?"
                    hint="Isi yang relevan saja — Target, Environment, IP/hostname, Application, OS, Tools."
                    value={value.scope}
                    onChange={(e) => set('scope', e.target.value)}
                    placeholder={'Target:\nEnvironment:\nIP / hostname:\nApplication:\nOS:\nTools:'}
                    mono
                />
            </Section>

            {/* 3. Hypotheses */}
            <Section
                title="3. Hypotheses"
                description="Dugaan yang belum terbukti — bedakan dari fakta"
                headerExtra={<CountBadge count={value.hypotheses.length} />}
            >
                {value.hypotheses.map((h, i) => (
                    <div key={i} className="rounded-md border border-amber-500/20 bg-amber-500/[0.03] p-4 space-y-3">
                        <ItemHeader label={`Hypothesis #${i + 1}`} onRemove={() => removeAt('hypotheses', i)} />
                        <Field
                            label="Dugaan (belum terverifikasi)"
                            hint="Apa bukti yang bisa mendukung / menolak dugaan ini?"
                            value={h.text}
                            onChange={(e) => updateList<Hypothesis>('hypotheses', i, { ...h, text: e.target.value })}
                        />
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1">Status</label>
                            <select
                                className={selectClass}
                                value={h.status}
                                onChange={(e) => updateList<Hypothesis>('hypotheses', i, { ...h, status: e.target.value as HypothesisStatus })}
                            >
                                {HYPOTHESIS_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </div>
                    </div>
                ))}
                <Button type="button" variant="secondary" size="sm" onClick={() => set('hypotheses', [...value.hypotheses, { text: '', status: 'unverified' }])}>
                    <Plus className="w-4 h-4 mr-1" /> Tambah hypothesis
                </Button>
            </Section>

            {/* 4. Langkah Analisis */}
            <Section
                title="4. Langkah Analisis"
                description="Setiap langkah: hypothesis → test → evidence → result → interpretation"
                defaultOpen
                headerExtra={<CountBadge count={value.steps.length} />}
            >
                {value.steps.map((s, i) => (
                    <div key={i} className="rounded-md border border-edge bg-elevated/40 p-4 space-y-4">
                        <ItemHeader label={`Step #${i + 1}`} onRemove={() => removeAt('steps', i)} />
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1">Judul langkah (opsional)</label>
                            <Input value={s.title} onChange={(e) => updateList<AnalysisStepContent>('steps', i, { ...s, title: e.target.value })} />
                        </div>
                        <Field label="Tujuan langkah ini apa?" value={s.objective} onChange={(e) => updateList<AnalysisStepContent>('steps', i, { ...s, objective: e.target.value })} />
                        <Field label="Pendekatan yang digunakan" hint="Kenapa pendekatan ini dipilih?" value={s.approach} onChange={(e) => updateList<AnalysisStepContent>('steps', i, { ...s, approach: e.target.value })} />
                        <Field label="Command / Request / Action" mono value={s.command} onChange={(e) => updateList<AnalysisStepContent>('steps', i, { ...s, command: e.target.value })} placeholder="curl -i https://target/api/…" />
                        <Field label="Output (apa adanya)" mono value={s.output} onChange={(e) => updateList<AnalysisStepContent>('steps', i, { ...s, output: e.target.value })} />
                        <Field label="Hasil — FACT" hint="Hanya fakta yang benar-benar teramati, bukan kesimpulan." value={s.result} onChange={(e) => updateList<AnalysisStepContent>('steps', i, { ...s, result: e.target.value })} />
                        <Field label="Interpretasi" hint="Apa makna hasil tersebut? Apakah sesuai ekspektasi? Apa hipotesis berikutnya?" value={s.interpretation} onChange={(e) => updateList<AnalysisStepContent>('steps', i, { ...s, interpretation: e.target.value })} />
                    </div>
                ))}
                <Button type="button" variant="secondary" size="sm" onClick={() => set('steps', [...value.steps, emptyStep()])}>
                    <Plus className="w-4 h-4 mr-1" /> Tambah langkah
                </Button>
            </Section>

            {/* 5. Experiments / Failed Attempts */}
            <Section
                title="5. Experiments / Failed Attempts"
                description="Catat juga percobaan yang gagal — penting untuk reproduksibilitas"
                headerExtra={<CountBadge count={value.attempts.length} />}
            >
                {value.attempts.map((a, i) => (
                    <div key={i} className="rounded-md border border-edge bg-elevated/40 p-4 space-y-4">
                        <ItemHeader label={`Attempt #${i + 1}`} onRemove={() => removeAt('attempts', i)} />
                        <Field label="Hypothesis yang diuji" value={a.hypothesis} onChange={(e) => updateList<Attempt>('attempts', i, { ...a, hypothesis: e.target.value })} />
                        <Field label="Approach" value={a.approach} onChange={(e) => updateList<Attempt>('attempts', i, { ...a, approach: e.target.value })} />
                        <Field label="Command / Request" mono value={a.command} onChange={(e) => updateList<Attempt>('attempts', i, { ...a, command: e.target.value })} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Expected result" value={a.expected} onChange={(e) => updateList<Attempt>('attempts', i, { ...a, expected: e.target.value })} />
                            <Field label="Actual result" value={a.actual} onChange={(e) => updateList<Attempt>('attempts', i, { ...a, actual: e.target.value })} />
                        </div>
                        <Field label="Error message (jika ada)" mono value={a.error} onChange={(e) => updateList<Attempt>('attempts', i, { ...a, error: e.target.value })} />
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1">Status</label>
                            <select className={selectClass} value={a.status} onChange={(e) => updateList<Attempt>('attempts', i, { ...a, status: e.target.value as AttemptStatus })}>
                                {ATTEMPT_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </div>
                        <Field
                            label="Kenapa gagal / apa yang berubah setelahnya?"
                            hint="Apa kesalahan pendekatan sebelumnya? Strategi apa yang diubah?"
                            value={a.lesson}
                            onChange={(e) => updateList<Attempt>('attempts', i, { ...a, lesson: e.target.value })}
                        />
                    </div>
                ))}
                <Button type="button" variant="secondary" size="sm" onClick={() => set('attempts', [...value.attempts, emptyAttempt()])}>
                    <Plus className="w-4 h-4 mr-1" /> Tambah attempt
                </Button>
            </Section>

            {/* 6. Bukti / Output Penting */}
            <Section
                title="6. Bukti / Output Penting"
                description="Evidence terpisah: command, output, error, request, response, log"
                headerExtra={<CountBadge count={value.evidence.length} />}
            >
                {value.evidence.map((ev, i) => (
                    <div key={i} className="rounded-md border border-emerald-500/20 bg-emerald-500/[0.03] p-4 space-y-3">
                        <ItemHeader label={`Evidence #${i + 1}`} onRemove={() => removeAt('evidence', i)} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-1">Tipe</label>
                                <select className={selectClass} value={ev.type} onChange={(e) => updateList<EvidenceBlock>('evidence', i, { ...ev, type: e.target.value as EvidenceType })}>
                                    {EVIDENCE_TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-1">Label (opsional)</label>
                                <Input value={ev.label} onChange={(e) => updateList<EvidenceBlock>('evidence', i, { ...ev, label: e.target.value })} placeholder="mis. Response POST /login" />
                            </div>
                        </div>
                        <Field label="Isi (apa adanya)" mono rows={4} value={ev.content} onChange={(e) => updateList<EvidenceBlock>('evidence', i, { ...ev, content: e.target.value })} />
                    </div>
                ))}
                <Button type="button" variant="secondary" size="sm" onClick={() => set('evidence', [...value.evidence, emptyEvidence()])}>
                    <Plus className="w-4 h-4 mr-1" /> Tambah evidence
                </Button>
            </Section>

            {/* 7. Interpretasi */}
            <Section title="7. Interpretasi Keseluruhan" description="Fakta yang terverifikasi vs yang belum diketahui">
                <Field
                    label="Interpretasi"
                    hint="Apa fakta yang sudah terverifikasi? Apa yang belum diketahui? Pisahkan jelas."
                    value={value.interpretation}
                    onChange={(e) => set('interpretation', e.target.value)}
                />
            </Section>

            <Section title="8. Risiko / Impact" description="Dampak temuan jika benar terbukti">
                <Field label="Risiko / Impact" value={value.risk_impact} onChange={(e) => set('risk_impact', e.target.value)} />
            </Section>

            <Section title="9. Rekomendasi" description="Perbaikan atau langkah mitigasi">
                <Field label="Rekomendasi" value={value.recommendations} onChange={(e) => set('recommendations', e.target.value)} />
            </Section>

            <Section title="10. Strategy Changes" description="Perubahan pendekatan selama analisis (opsional)">
                <Field label="Apa strategi yang diubah dan kenapa?" value={value.strategy_changes} onChange={(e) => set('strategy_changes', e.target.value)} />
            </Section>

            {/* 11. Lesson Learned */}
            <Section title="11. Lesson Learned" description="Pembelajaran — bukan sekadar ringkasan teknis">
                <Field label="Apa yang dipelajari?" value={value.lesson_learned.learned} onChange={(e) => setLearned('learned', e.target.value)} />
                <Field label="Pola apa yang ditemukan?" value={value.lesson_learned.patterns} onChange={(e) => setLearned('patterns', e.target.value)} />
                <Field label="Kesalahan apa yang harus dihindari?" value={value.lesson_learned.mistakes} onChange={(e) => setLearned('mistakes', e.target.value)} />
                <Field label="Konsep apa yang perlu dipahami ulang?" value={value.lesson_learned.revisit} onChange={(e) => setLearned('revisit', e.target.value)} />
                <Field label="Bagaimana temuan ini relevan di dunia nyata?" value={value.lesson_learned.relevance} onChange={(e) => setLearned('relevance', e.target.value)} />
            </Section>
        </div>
    );
}

function CountBadge({ count }: { count: number }) {
    if (!count) return null;
    return <span className="text-xs text-zinc-500 tabular-nums">{count}</span>;
}

function ItemHeader({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{label}</span>
            <button type="button" onClick={onRemove} aria-label={`Hapus ${label}`} className="text-zinc-500 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
}
