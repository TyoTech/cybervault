import { useState } from 'react';
import Section from '@/Components/UI/Section';
import Input from '@/Components/UI/Input';
import Textarea from '@/Components/UI/Textarea';
import Select from '@/Components/UI/Select';
import Button from '@/Components/UI/Button';
import WriteupField from '@/Components/Writeup/WriteupField';
import StatusBadge, {
    experimentStatusTone,
    evidenceKindTone,
    hypothesisStatusTone,
    stepTypeTone,
} from '@/Components/Writeup/StatusBadge';
import {
    EvidenceItem,
    ExperimentItem,
    HypothesisItem,
    StepItem,
    StepType,
    TextItem,
    WriteupData,
    uid,
} from '@/Components/Writeup/types';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/Utils/cn';

interface WriteupEditorProps {
    value: WriteupData;
    onChange: (next: WriteupData) => void;
}

/**
 * Editor struktural Writeup — semua field yang didukung schema writeup.json.
 * State dikelola parent (Create/Edit page) via `value`/`onChange`.
 */
export default function WriteupEditor({ value, onChange }: WriteupEditorProps) {
    const set = (patch: Partial<WriteupData>) => onChange({ ...value, ...patch });

    // ---- helper generic list ------------------------------------------------
    const mapList = <T extends { id: string }>(items: T[], id: string, map: (item: T) => T): T[] =>
        items.map((i) => (i.id === id ? map(i) : i));
    const removeById = <T extends { id: string }>(items: T[], id: string): T[] =>
        items.filter((i) => i.id !== id);

    // ---- Hypotheses ---------------------------------------------------------
    const updateHypothesis = (id: string, patch: Partial<HypothesisItem>) =>
        set({ hypotheses: mapList(value.hypotheses, id, (h) => ({ ...h, ...patch })) });

    const addHypothesis = () =>
        set({ hypotheses: [...value.hypotheses, { id: uid(), text: '', status: 'hypothesis' }] });

    const removeHypothesis = (id: string) =>
        set({ hypotheses: removeById(value.hypotheses, id) });

    // ---- Steps --------------------------------------------------------------
    const updateStep = (id: string, patch: Partial<StepItem>) =>
        set({ steps: mapList(value.steps, id, (s) => ({ ...s, ...patch })) });

    const addStep = () =>
        set({
            steps: [
                ...value.steps,
                {
                    id: uid(),
                    title: '',
                    question: '',
                    goal: '',
                    approach: '',
                    command: '',
                    output: '',
                    result: '',
                    interpretation: '',
                    type: 'test',
                },
            ],
        });

    const removeStep = (id: string) => set({ steps: removeById(value.steps, id) });

    // ---- Experiments ---------------------------------------------------------
    const updateExperiment = (id: string, patch: Partial<ExperimentItem>) =>
        set({ experiments: mapList(value.experiments, id, (e) => ({ ...e, ...patch })) });

    const addExperiment = () =>
        set({
            experiments: [
                ...value.experiments,
                {
                    id: uid(),
                    status: 'inconclusive',
                    hypothesis: '',
                    approach: '',
                    command: '',
                    expected: '',
                    actual: '',
                    error: '',
                    whyFailed: '',
                    changed: '',
                    interpretation: '',
                },
            ],
        });

    const removeExperiment = (id: string) => set({ experiments: removeById(value.experiments, id) });

    // ---- Evidence ------------------------------------------------------------
    const updateEvidence = (id: string, patch: Partial<EvidenceItem>) =>
        set({ evidence: mapList(value.evidence, id, (e) => ({ ...e, ...patch })) });

    const addEvidence = () =>
        set({ evidence: [...value.evidence, { id: uid(), label: '', kind: 'log', content: '' }] });

    const removeEvidence = (id: string) => set({ evidence: removeById(value.evidence, id) });

    // ---- Text list (strategy / recommendations) ------------------------------
    const updateTextItem = (key: 'strategyChanges' | 'recommendations', id: string, text: string) =>
        set({ [key]: mapList(value[key], id, (i) => ({ ...i, text })) });

    const addTextItem = (key: 'strategyChanges' | 'recommendations') =>
        set({ [key]: [...value[key], { id: uid(), text: '' }] });

    const removeTextItem = (key: 'strategyChanges' | 'recommendations', id: string) =>
        set({ [key]: removeById(value[key], id) });

    // ---- Lesson learned (nested object) ---------------------------------------
    const updateLesson = (k: keyof WriteupData['lessonLearned'], v: string) =>
        set({ lessonLearned: { ...value.lessonLearned, [k]: v } });

    return (
        <div className="space-y-4">
            {/* 1. Tujuan */}
            <Section
                title="1. Tujuan"
                description="Kerangka analisis: masalah yang dianalisis, tujuan, dan bukti yang ingin dicapai."
                idPrefix="goal"
                defaultOpen
            >
                <WriteupField label="Masalah yang dianalisis">
                    <Textarea
                        rows={2}
                        value={value.goal.problem}
                        onChange={(e) => set({ goal: { ...value.goal, problem: e.target.value } })}
                        placeholder="Contoh: Endpoint /api/v1/debug menampilkan stack trace pada input tertentu…"
                    />
                </WriteupField>
                <WriteupField label="Tujuan analisis">
                    <Textarea
                        rows={2}
                        value={value.goal.objective}
                        onChange={(e) => set({ goal: { ...value.goal, objective: e.target.value } })}
                        placeholder="Apa yang ingin Anda capai dari writeup ini."
                    />
                </WriteupField>
                <WriteupField label="Yang ingin dibuktikan">
                    <Textarea
                        rows={2}
                        value={value.goal.proof}
                        onChange={(e) => set({ goal: { ...value.goal, proof: e.target.value } })}
                        placeholder="Hipotesis atau klaim yang perlu diverifikasi dengan bukti."
                    />
                </WriteupField>
            </Section>

            {/* 2. Environment / Scope */}
            <Section
                title="2. Environment / Scope"
                description="Lingkungan target dan batas ruang lingkup pengujian."
                idPrefix="env"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <WriteupField label="Target / scope">
                        <Input
                            value={value.environment.target}
                            onChange={(e) => set({ environment: { ...value.environment, target: e.target.value } })}
                            placeholder="URL / IP / nama aplikasi"
                        />
                    </WriteupField>
                    <WriteupField label="Environment">
                        <Input
                            value={value.environment.environment}
                            onChange={(e) => set({ environment: { ...value.environment, environment: e.target.value } })}
                            placeholder="Prod / Staging / Lab / Lokal"
                        />
                    </WriteupField>
                    <WriteupField label="IP / hostname">
                        <Input
                            value={value.environment.host}
                            onChange={(e) => set({ environment: { ...value.environment, host: e.target.value } })}
                            placeholder="10.10.10.1"
                            className="font-mono text-[13px]"
                        />
                    </WriteupField>
                    <WriteupField label="Aplikasi">
                        <Input
                            value={value.environment.application}
                            onChange={(e) => set({ environment: { ...value.environment, application: e.target.value } })}
                            placeholder="Nama paket / service"
                        />
                    </WriteupField>
                    <WriteupField label="OS">
                        <Input
                            value={value.environment.os}
                            onChange={(e) => set({ environment: { ...value.environment, os: e.target.value } })}
                            placeholder="Linux / Windows / …"
                        />
                    </WriteupField>
                    <WriteupField label="Tools">
                        <Input
                            value={value.environment.tools}
                            onChange={(e) => set({ environment: { ...value.environment, tools: e.target.value } })}
                            placeholder="nmap, burpsuite, sqlmap, …"
                        />
                    </WriteupField>
                    <WriteupField label="Catatan scope" className="md:col-span-2">
                        <Textarea
                            rows={2}
                            value={value.environment.scope}
                            onChange={(e) => set({ environment: { ...value.environment, scope: e.target.value } })}
                            placeholder="Batas pengujian, asumsi, eksklusi."
                        />
                    </WriteupField>
                </div>
            </Section>

            {/* 3. Hipotesis */}
            <Section
                title="3. Hipotesis"
                description="Ungkapan tebakan yang BELUM terbukti. Jangan mengubah hipotesis menjadi fakta tanpa bukti."
                count={value.hypotheses.length}
                idPrefix="hyp"
            >
                {value.hypotheses.length === 0 && (
                    <p className="text-xs text-muted">Belum ada hipotesis.</p>
                )}
                {value.hypotheses.map((h) => (
                    <div
                        key={h.id}
                        className="flex flex-col sm:flex-row gap-3 rounded-md border border-edge bg-surface p-3"
                    >
                        <div className="w-full sm:w-40 shrink-0">
                            <WriteupField label="Status">
                                <div className="flex items-center gap-2">
                                    <Select
                                        value={h.status}
                                        onChange={(e) =>
                                            updateHypothesis(h.id, {
                                                status: e.target.value as HypothesisItem['status'],
                                            })
                                        }
                                    >
                                        <option value="hypothesis">HYPOTHESIS</option>
                                        <option value="verified">VERIFIED</option>
                                        <option value="rejected">REJECTED</option>
                                    </Select>
                                    <StatusBadge value={h.status} tone={hypothesisStatusTone(h.status)} />
                                </div>
                            </WriteupField>
                        </div>
                        <Textarea
                            rows={2}
                            mono
                            value={h.text}
                            onChange={(e) => updateHypothesis(h.id, { text: e.target.value })}
                            placeholder="Contoh: Parameter `id` rentan terhadap SQLi…"
                        />
                        <button
                            type="button"
                            onClick={() => removeHypothesis(h.id)}
                            className="self-start rounded-md p-2 text-faint hover:text-danger hover:bg-danger/10 transition-colors"
                            aria-label="Hapus hipotesis"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                <AddButton onClick={addHypothesis} label="Tambah Hipotesis" />
            </Section>

            {/* 4. Langkah Analisis */}
            <Section
                title="4. Langkah Analisis"
                description="Urutan investigasi: tiap langkah = test/fact/result dengan command, output, dan interpretasi."
                count={value.steps.length}
                idPrefix="steps"
            >
                {value.steps.length === 0 && (
                    <p className="text-xs text-muted">Belum ada langkah analisis.</p>
                )}
                {value.steps.map((step, i) => (
                    <StepCard
                        key={step.id}
                        index={i}
                        item={step}
                        onChange={(patch) => updateStep(step.id, patch)}
                        onRemove={() => removeStep(step.id)}
                    />
                ))}
                <AddButton onClick={addStep} label="Tambah Langkah" />
            </Section>

            {/* 5. Percobaan / Attempts */}
            <Section
                title="5. Failed Attempts / Percobaan"
                description="Rekam kegagalan & percobaan: apa yang dicoba, hasil aktual, dan kenapa gagal."
                count={value.experiments.length}
                idPrefix="exp"
            >
                {value.experiments.length === 0 && (
                    <p className="text-xs text-muted">Belum ada percobaan yang tercatat.</p>
                )}
                {value.experiments.map((exp, i) => (
                    <ExperimentCard
                        key={exp.id}
                        index={i}
                        item={exp}
                        onChange={(patch) => updateExperiment(exp.id, patch)}
                        onRemove={() => removeExperiment(exp.id)}
                    />
                ))}
                <AddButton onClick={addExperiment} label="Tambah Percobaan" />
            </Section>

            {/* 6. Bukti / Evidence */}
            <Section
                title="6. Bukti / Evidence"
                description="Bukti VERBATIM dari command/output/response — jangan mengarang bukti."
                count={value.evidence.length}
                idPrefix="ev"
            >
                {value.evidence.length === 0 && (
                    <p className="text-xs text-muted">Belum ada bukti yang dicatat.</p>
                )}
                {value.evidence.map((ev) => (
                    <div
                        key={ev.id}
                        className="rounded-md border border-edge bg-surface p-3 space-y-3"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_10rem_auto] gap-3 items-end">
                            <WriteupField label="Label">
                                <Input
                                    value={ev.label}
                                    onChange={(e) => updateEvidence(ev.id, { label: e.target.value })}
                                    placeholder="Nama bukti (opsional)"
                                />
                            </WriteupField>
                            <WriteupField label="Jenis">
                                <div className="flex items-center gap-2">
                                    <Select
                                        value={ev.kind}
                                        onChange={(e) =>
                                            updateEvidence(ev.id, {
                                                kind: e.target.value as EvidenceItem['kind'],
                                            })
                                        }
                                    >
                                        <option value="command">CMD</option>
                                        <option value="output">OUTPUT</option>
                                        <option value="request">REQ</option>
                                        <option value="response">RESP</option>
                                        <option value="error">ERROR</option>
                                        <option value="log">LOG</option>
                                    </Select>
                                    <StatusBadge value={ev.kind} tone={evidenceKindTone(ev.kind)} />
                                </div>
                            </WriteupField>
                            <button
                                type="button"
                                onClick={() => removeEvidence(ev.id)}
                                className="rounded-md p-2 text-faint hover:text-danger hover:bg-danger/10 transition-colors"
                                aria-label="Hapus bukti"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        <WriteupField label="Konten (verbatim)">
                            <Textarea
                                rows={3}
                                mono
                                value={ev.content}
                                onChange={(e) => updateEvidence(ev.id, { content: e.target.value })}
                                placeholder="Salin persis command, output, response, atau log di sini."
                            />
                        </WriteupField>
                    </div>
                ))}
                <AddButton onClick={addEvidence} label="Tambah Bukti" />
            </Section>

            {/* 7. Perubahan Strategi */}
            <Section
                title="7. Strategy Changes"
                description="Keputusan pivot: mengapa mengubah arah analisis."
                count={value.strategyChanges.length}
                idPrefix="strat"
            >
                {value.strategyChanges.length === 0 && (
                    <p className="text-xs text-muted">Belum ada perubahan strategi.</p>
                )}
                {value.strategyChanges.map((item) => (
                    <TextListItem
                        key={item.id}
                        item={item}
                        onChange={(text) => updateTextItem('strategyChanges', item.id, text)}
                        onRemove={() => removeTextItem('strategyChanges', item.id)}
                    />
                ))}
                <AddButton onClick={() => addTextItem('strategyChanges')} label="Tambah Perubahan Strategi" />
            </Section>

            {/* 8. Risiko / Impact */}
            <Section title="8. Risk / Impact" description="Risiko sisa dan dampak dari temuan." idPrefix="risk">
                <Textarea
                    rows={3}
                    value={value.riskImpact}
                    onChange={(e) => set({ riskImpact: e.target.value })}
                    placeholder="Risiko yang tersisa, dampak ke produksi/klien, mitigasi…"
                />
            </Section>

            {/* 9. Rekomendasi */}
            <Section
                title="9. Rekomendasi"
                description="Langkah perbaikan yang bisa ditindaklanjuti."
                count={value.recommendations.length}
                idPrefix="rec"
            >
                {value.recommendations.length === 0 && (
                    <p className="text-xs text-muted">Belum ada rekomendasi.</p>
                )}
                {value.recommendations.map((item) => (
                    <TextListItem
                        key={item.id}
                        item={item}
                        onChange={(text) => updateTextItem('recommendations', item.id, text)}
                        onRemove={() => removeTextItem('recommendations', item.id)}
                    />
                ))}
                <AddButton onClick={() => addTextItem('recommendations')} label="Tambah Rekomendasi" />
            </Section>

            {/* 10. Lesson Learned */}
            <Section
                title="10. Lesson Learned"
                description="Refleksi: pola, kesalahan, konsep, dan relevansi untuk aktivitas berikutnya."
                idPrefix="lesson"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <WriteupField label="Apa yang dipelajari">
                        <Textarea rows={2} value={value.lessonLearned.learned} onChange={(e) => updateLesson('learned', e.target.value)} />
                    </WriteupField>
                    <WriteupField label="Pola yang ditemukan">
                        <Textarea rows={2} value={value.lessonLearned.patterns} onChange={(e) => updateLesson('patterns', e.target.value)} />
                    </WriteupField>
                    <WriteupField label="Kesalahan yang harus dihindari">
                        <Textarea rows={2} value={value.lessonLearned.mistakes} onChange={(e) => updateLesson('mistakes', e.target.value)} />
                    </WriteupField>
                    <WriteupField label="Konsep yang perlu dipahami ulang">
                        <Textarea rows={2} value={value.lessonLearned.concepts} onChange={(e) => updateLesson('concepts', e.target.value)} />
                    </WriteupField>
                    <WriteupField label="Yang akan dilakukan berbeda">
                        <Textarea rows={2} value={value.lessonLearned.different} onChange={(e) => updateLesson('different', e.target.value)} />
                    </WriteupField>
                    <WriteupField label="Relevansi di dunia nyata">
                        <Textarea rows={2} value={value.lessonLearned.relevance} onChange={(e) => updateLesson('relevance', e.target.value)} />
                    </WriteupField>
                </div>
            </Section>

            {/* 11. Referensi */}
            <Section title="Referensi" description="Link/dokumen pendukung." idPrefix="refs">
                <Textarea
                    rows={3}
                    value={value.references}
                    onChange={(e) => set({ references: e.target.value })}
                    placeholder="URL, CVE, advisory, ID corrected, …"
                />
            </Section>

            {/* 12. Catatan */}
            <Section
                title="Catatan (freeform Markdown)"
                description="Dokumentasi bebas (Markdown). Hasil AI yang Anda Accept masuk ke sini dan tetap Anda review sebelum Save."
                idPrefix="notes"
            >
                <Textarea
                    rows={6}
                    mono
                    value={value.notes}
                    onChange={(e) => set({ notes: e.target.value })}
                    placeholder="Dokumentasi bebas…"
                />
            </Section>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
    return (
        <Button type="button" variant="secondary" size="sm" onClick={onClick} className="self-start">
            <Plus className="w-3.5 h-3.5" /> {label}
        </Button>
    );
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="rounded-md p-2 text-faint hover:text-danger hover:bg-danger/10 transition-colors"
            aria-label={label}
        >
            <Trash2 className="w-4 h-4" />
        </button>
    );
}

function TextListItem({
    item,
    onChange,
    onRemove,
}: {
    item: TextItem;
    onChange: (text: string) => void;
    onRemove: () => void;
}) {
    return (
        <div className="flex items-start gap-2">
            <Input
                value={item.text}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Tulis satu item…"
            />
            <RemoveButton onClick={onRemove} label="Hapus item" />
        </div>
    );
}

function StepCard({
    index,
    item,
    onChange,
    onRemove,
}: {
    index: number;
    item: StepItem;
    onChange: (patch: Partial<StepItem>) => void;
    onRemove: () => void;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div className="rounded-md border border-edge bg-surface">
            <div className="flex items-center gap-2 px-3 py-2">
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    className="flex flex-1 items-center gap-2 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/50 rounded"
                >
                    <ChevronDown className={cn('w-4 h-4 shrink-0 text-faint transition-transform', open && 'rotate-180')} />
                    <span className="text-sm font-medium text-body truncate">
                        {item.title !== '' ? item.title : `Step ${index + 1}`}
                    </span>
                    <StatusBadge value={item.type} tone={stepTypeTone(item.type)} />
                </button>
                <RemoveButton onClick={onRemove} label="Hapus langkah" />
            </div>

            {open && (
                <div className="px-3 pb-3 pt-1 space-y-3 border-t border-edge">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-3">
                        <WriteupField label="Judul langkah">
                            <Input value={item.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="Judul singkat" />
                        </WriteupField>
                        <WriteupField label="Tipe">
                            <div className="flex items-center gap-2">
                                <Select
                                    value={item.type}
                                    onChange={(e) => onChange({ type: e.target.value as StepType })}
                                >
                                    <option value="hypothesis">HYPOTHESIS</option>
                                    <option value="test">TEST</option>
                                    <option value="fact">FACT</option>
                                    <option value="result">RESULT</option>
                                </Select>
                            </div>
                        </WriteupField>
                    </div>
                    <WriteupField label="Apa yang ingin diketahui">
                        <Textarea rows={2} value={item.question} onChange={(e) => onChange({ question: e.target.value })} />
                    </WriteupField>
                    <WriteupField label="Tujuan langkah">
                        <Textarea rows={2} value={item.goal} onChange={(e) => onChange({ goal: e.target.value })} />
                    </WriteupField>
                    <WriteupField label="Pendekatan">
                        <Textarea rows={2} value={item.approach} onChange={(e) => onChange({ approach: e.target.value })} />
                    </WriteupField>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <WriteupField label="Command / request">
                            <Textarea rows={3} mono value={item.command} onChange={(e) => onChange({ command: e.target.value })} />
                        </WriteupField>
                        <WriteupField label="Output">
                            <Textarea rows={3} mono value={item.output} onChange={(e) => onChange({ output: e.target.value })} />
                        </WriteupField>
                    </div>
                    <WriteupField label="Hasil">
                        <Textarea rows={2} value={item.result} onChange={(e) => onChange({ result: e.target.value })} />
                    </WriteupField>
                    <WriteupField label="Interpretasi">
                        <Textarea rows={2} value={item.interpretation} onChange={(e) => onChange({ interpretation: e.target.value })} />
                    </WriteupField>
                </div>
            )}
        </div>
    );
}

function ExperimentCard({
    index,
    item,
    onChange,
    onRemove,
}: {
    index: number;
    item: ExperimentItem;
    onChange: (patch: Partial<ExperimentItem>) => void;
    onRemove: () => void;
}) {
    const [open, setOpen] = useState(false);
    const label =
        item.hypothesis !== ''
            ? item.hypothesis
            : `Attempt ${index + 1}`;

    return (
        <div className="rounded-md border border-edge bg-surface">
            <div className="flex items-center gap-2 px-3 py-2">
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    className="flex flex-1 items-center gap-2 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/50 rounded"
                >
                    <ChevronDown className={cn('w-4 h-4 shrink-0 text-faint transition-transform', open && 'rotate-180')} />
                    <span className="text-sm font-medium text-body truncate">Attempt {index + 1}</span>
                    {item.hypothesis !== '' && <span className="text-xs text-faint truncate hidden sm:inline">— {label}</span>}
                    <StatusBadge value={item.status} tone={experimentStatusTone(item.status)} />
                </button>
                <RemoveButton onClick={onRemove} label="Hapus percobaan" />
            </div>

            {open && (
                <div className="px-3 pb-3 pt-1 space-y-3 border-t border-edge">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_10rem] gap-3">
                        <WriteupField label="Hipotesis">
                            <Textarea rows={2} value={item.hypothesis} onChange={(e) => onChange({ hypothesis: e.target.value })} />
                        </WriteupField>
                        <WriteupField label="Status">
                            <Select
                                value={item.status}
                                onChange={(e) =>
                                    onChange({ status: e.target.value as ExperimentItem['status'] })
                                }
                            >
                                <option value="inconclusive">INCONCLUSIVE</option>
                                <option value="successful">SUCCESSFUL</option>
                                <option value="failed">FAILED</option>
                            </Select>
                        </WriteupField>
                    </div>
                    <WriteupField label="Pendekatan">
                        <Textarea rows={2} value={item.approach} onChange={(e) => onChange({ approach: e.target.value })} />
                    </WriteupField>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <WriteupField label="Command / request">
                            <Textarea rows={3} mono value={item.command} onChange={(e) => onChange({ command: e.target.value })} />
                        </WriteupField>
                        <WriteupField label="Error message">
                            <Textarea rows={3} mono value={item.error} onChange={(e) => onChange({ error: e.target.value })} />
                        </WriteupField>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <WriteupField label="Hasil yang diharapkan">
                            <Textarea rows={2} value={item.expected} onChange={(e) => onChange({ expected: e.target.value })} />
                        </WriteupField>
                        <WriteupField label="Hasil aktual">
                            <Textarea rows={2} value={item.actual} onChange={(e) => onChange({ actual: e.target.value })} />
                        </WriteupField>
                    </div>
                    <WriteupField label="Kenapa gagal">
                        <Textarea rows={2} value={item.whyFailed} onChange={(e) => onChange({ whyFailed: e.target.value })} />
                    </WriteupField>
                    <WriteupField label="Yang berubah setelahnya">
                        <Textarea rows={2} value={item.changed} onChange={(e) => onChange({ changed: e.target.value })} />
                    </WriteupField>
                    <WriteupField label="Interpretasi">
                        <Textarea rows={2} value={item.interpretation} onChange={(e) => onChange({ interpretation: e.target.value })} />
                    </WriteupField>
                </div>
            )}
        </div>
    );
}