import Input from '@/Components/UI/Input';
import Textarea from '@/Components/UI/Textarea';
import Select from '@/Components/UI/Select';
import Button from '@/Components/UI/Button';
import WriteupField from '@/Components/Writeup/WriteupField';
import StatusBadge, { evidenceKindTone, stepTypeTone } from '@/Components/Writeup/StatusBadge';
import {
    EvidenceItem,
    EvidenceKind,
    QuestionItem,
    QuestionStatus,
    StepItem,
    StepType,
    uid,
} from '@/Components/Writeup/types';
import { questionStats } from '@/Utils/questionStats';
import { ChevronDown, ChevronUp, Copy, Plus, Trash2 } from 'lucide-react';

const MAX_QUESTIONS = 200;

interface QuestionsEditorProps {
    questions: QuestionItem[];
    onChange: (questions: QuestionItem[]) => void;
}

/**
 * Editor Question/Objective — unit pekerjaan di dalam Challenge.
 *
 * - 0..N pertanyaan (open-ended challenge tidak dipaksa punya soal).
 * - Reorder via naik/turun; duplicate; hapus.
 * - Setiap question memakai blok existing (steps, evidence) untuk konsistensi.
 * - Jumlah dibatasi MAX_QUESTIONS (backend menormalisasi ulang dengan benar).
 * - Status & progress diperbarui otomatis (17/20 solved).
 */
export default function QuestionsEditor({ questions, onChange }: QuestionsEditorProps) {
    const stats = questionStats(questions);

    const setQuestions = (next: QuestionItem[]) => onChange(next);

    const mapList = <T extends { id: string }>(items: T[], id: string, map: (item: T) => T): T[] =>
        items.map((i) => (i.id === id ? map(i) : i));

    // ---- Question-level ----------------------------------------------------
    const updateQuestion = (id: string, patch: Partial<QuestionItem>) =>
        setQuestions(mapList(questions, id, (q) => ({ ...q, ...patch })));

    const addQuestion = () => {
        if (questions.length >= MAX_QUESTIONS) return;
        const next: QuestionItem = {
            id: uid(),
            order: questions.length + 1,
            question: '',
            notes: '',
            status: 'unsolved',
            result: '',
            steps: [],
            evidence: [],
        };
        setQuestions([...questions, next]);
    };

    const removeQuestion = (id: string) =>
        setQuestions(questions.filter((q) => q.id !== id).map((q, i) => ({ ...q, order: i + 1 })));

    const duplicateQuestion = (id: string) => {
        if (questions.length >= MAX_QUESTIONS) return;
        const index = questions.findIndex((q) => q.id === id);
        if (index === -1) return;

        const copy: QuestionItem = {
            ...questions[index],
            id: uid(),
            order: 0,
            steps: questions[index].steps.map((s) => ({ ...s, id: uid() })),
            evidence: questions[index].evidence.map((e) => ({ ...e, id: uid() })),
        };

        const next = [...questions];
        next.splice(index + 1, 0, copy);
        setQuestions(next.map((q, i) => ({ ...q, order: i + 1 })));
    };

    const moveQuestion = (id: string, direction: -1 | 1) => {
        const index = questions.findIndex((q) => q.id === id);
        const target = index + direction;
        if (index === -1 || target < 0 || target >= questions.length) return;

        const next = [...questions];
        const [item] = next.splice(index, 1);
        next.splice(target, 0, item);
        setQuestions(next.map((q, i) => ({ ...q, order: i + 1 })));
    };

    // ---- Steps di dalam question --------------------------------------------
    const updateStep = (qid: string, sid: string, patch: Partial<StepItem>) =>
        setQuestions(mapList(questions, qid, (q) => ({ ...q, steps: mapList(q.steps, sid, (s) => ({ ...s, ...patch })) })));

    const addStep = (qid: string) =>
        setQuestions(
            mapList(questions, qid, (q) => ({
                ...q,
                steps: [
                    ...q.steps,
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
            })),
        );

    const removeStep = (qid: string, sid: string) =>
        setQuestions(mapList(questions, qid, (q) => ({ ...q, steps: q.steps.filter((s) => s.id !== sid) })));

    // ---- Evidence di dalam question ------------------------------------------
    const updateEvidence = (qid: string, eid: string, patch: Partial<EvidenceItem>) =>
        setQuestions(
            mapList(questions, qid, (q) => ({
                ...q,
                evidence: mapList(q.evidence, eid, (e) => ({ ...e, ...patch })),
            })),
        );

    const addEvidence = (qid: string) =>
        setQuestions(
            mapList(questions, qid, (q) => ({
                ...q,
                evidence: [...q.evidence, { id: uid(), label: '', kind: 'log' as EvidenceKind, content: '' }],
            })),
        );

    const removeEvidence = (qid: string, eid: string) =>
        setQuestions(mapList(questions, qid, (q) => ({ ...q, evidence: q.evidence.filter((e) => e.id !== eid) })));

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                <div>
                    {stats.total > 0 ? (
                        <p className="text-[13px] text-muted">
                            Progress:{' '}
                            <span className="font-medium text-strong">
                                {stats.solved} / {stats.total} solved
                            </span>{' '}
                            ({stats.percent}%)
                        </p>
                    ) : (
                        <p className="text-xs text-faint">
                            Challenge tanpa soal? Biarkan kosong — writeup tetap normal (open-ended).
                        </p>
                    )}
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={addQuestion} className="shrink-0">
                    <Plus className="h-3.5 w-3.5" /> Question / Objective
                </Button>
            </div>

            {questions.map((q, i) => (
                <QuestionCard
                    key={q.id}
                    question={q}
                    index={i}
                    total={questions.length}
                    onChange={(patch) => updateQuestion(q.id, patch)}
                    onMoveUp={() => moveQuestion(q.id, -1)}
                    onMoveDown={() => moveQuestion(q.id, 1)}
                    onDuplicate={() => duplicateQuestion(q.id)}
                    onRemove={() => removeQuestion(q.id)}
                    onAddStep={() => addStep(q.id)}
                    onUpdateStep={(sid, patch) => updateStep(q.id, sid, patch)}
                    onRemoveStep={(sid) => removeStep(q.id, sid)}
                    onAddEvidence={() => addEvidence(q.id)}
                    onUpdateEvidence={(eid, patch) => updateEvidence(q.id, eid, patch)}
                    onRemoveEvidence={(eid) => removeEvidence(q.id, eid)}
                />
            ))}
        </div>
    );
}

interface QuestionCardProps {
    question: QuestionItem;
    index: number;
    total: number;
    onChange: (patch: Partial<QuestionItem>) => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onDuplicate: () => void;
    onRemove: () => void;
    onAddStep: () => void;
    onUpdateStep: (id: string, patch: Partial<StepItem>) => void;
    onRemoveStep: (id: string) => void;
    onAddEvidence: () => void;
    onUpdateEvidence: (id: string, patch: Partial<EvidenceItem>) => void;
    onRemoveEvidence: (id: string) => void;
}

function QuestionCard({
    question: q,
    index,
    total,
    onChange,
    onMoveUp,
    onMoveDown,
    onDuplicate,
    onRemove,
    onAddStep,
    onUpdateStep,
    onRemoveStep,
    onAddEvidence,
    onUpdateEvidence,
    onRemoveEvidence,
}: QuestionCardProps) {
    return (
        <div className="rounded-md border border-edge bg-surface p-3">
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono text-faint">Q{index + 1}</span>
                <Select
                    value={q.status}
                    onChange={(e) => onChange({ status: e.target.value as QuestionStatus })}
                    className="h-8 w-40 py-0 text-[13px]"
                    aria-label={`Status question ${index + 1}`}
                >
                    <option value="unsolved">UNSOLVED</option>
                    <option value="in_progress">IN PROGRESS</option>
                    <option value="solved">SOLVED</option>
                </Select>

                <div className="ml-auto flex items-center gap-1">
                    <IconButton onClick={onMoveUp} disabled={index === 0} label="Naikkan urutan">
                        <ChevronUp className="h-4 w-4" />
                    </IconButton>
                    <IconButton onClick={onMoveDown} disabled={index === total - 1} label="Turunkan urutan">
                        <ChevronDown className="h-4 w-4" />
                    </IconButton>
                    <IconButton onClick={onDuplicate} label="Duplicate question">
                        <Copy className="h-4 w-4" />
                    </IconButton>
                    <IconButton onClick={onRemove} label="Hapus question" danger>
                        <Trash2 className="h-4 w-4" />
                    </IconButton>
                </div>
            </div>

            <div className="space-y-3">
                <WriteupField label="Question / Objective">
                    <Textarea
                        rows={3}
                        value={q.question}
                        onChange={(e) => onChange({ question: e.target.value })}
                        placeholder="Soal / tujuan unit pekerjaan ini (mis. 'Level 1: XSS di kolom search')."
                    />
                </WriteupField>

                <WriteupField label="Analysis">
                    <Textarea
                        rows={4}
                        value={q.notes}
                        onChange={(e) => onChange({ notes: e.target.value })}
                        placeholder="Analisis / catatan untuk question ini."
                    />
                </WriteupField>

                <WriteupField label="Answer / Flag (opsional — disembunyikan sampai Show Answer)">
                    <Textarea
                        rows={2}
                        value={q.result}
                        onChange={(e) => onChange({ result: e.target.value })}
                        placeholder="Jawaban / flag. Isi hanya jika sudah diketahui."
                    />
                </WriteupField>

                <div className="rounded-md border border-edge p-3">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-medium text-strong">Steps</p>
                        <Button type="button" variant="secondary" size="sm" onClick={onAddStep} className="self-start">
                            <Plus className="w-3.5 h-3.5" /> Step
                        </Button>
                    </div>

                    {q.steps.length === 0 && (
                        <p className="text-xs text-muted">Belum ada langkah untuk question ini.</p>
                    )}

                    <div className="space-y-3">
                        {q.steps.map((s) => (
                            <div key={s.id} className="grid grid-cols-1 gap-3 rounded-md border border-edge bg-elevated/40 p-3 md:grid-cols-2">
                                <WriteupField label="Tipe" className="md:col-span-2">
                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={s.type}
                                            onChange={(e) => onUpdateStep(s.id, { type: e.target.value as StepType })}
                                        >
                                            <option value="hypothesis">HYPOTHESIS</option>
                                            <option value="test">TEST</option>
                                            <option value="fact">FACT</option>
                                            <option value="result">RESULT</option>
                                        </Select>
                                        <StatusBadge value={s.type} tone={stepTypeTone(s.type)} />
                                        <div className="ml-auto">
                                            <IconButton onClick={() => onRemoveStep(s.id)} label="Hapus step" danger>
                                                <Trash2 className="h-4 w-4" />
                                            </IconButton>
                                        </div>
                                    </div>
                                </WriteupField>

                                <WriteupField label="Judul langkah" className="md:col-span-2">
                                    <Input
                                        value={s.title}
                                        onChange={(e) => onUpdateStep(s.id, { title: e.target.value })}
                                        placeholder="Ringkasan langkah"
                                    />
                                </WriteupField>

                                <WriteupField label="Apa yang ingin diketahui">
                                    <Textarea rows={2} value={s.question} onChange={(e) => onUpdateStep(s.id, { question: e.target.value })} />
                                </WriteupField>

                                <WriteupField label="Tujuan langkah">
                                    <Textarea rows={2} value={s.goal} onChange={(e) => onUpdateStep(s.id, { goal: e.target.value })} />
                                </WriteupField>

                                <WriteupField label="Pendekatan" className="md:col-span-2">
                                    <Textarea rows={2} value={s.approach} onChange={(e) => onUpdateStep(s.id, { approach: e.target.value })} />
                                </WriteupField>

                                <WriteupField label="Command / request">
                                    <Textarea rows={2} className="font-mono text-[13px]" value={s.command} onChange={(e) => onUpdateStep(s.id, { command: e.target.value })} />
                                </WriteupField>

                                <WriteupField label="Output">
                                    <Textarea rows={2} className="font-mono text-[13px]" value={s.output} onChange={(e) => onUpdateStep(s.id, { output: e.target.value })} />
                                </WriteupField>

                                <WriteupField label="Hasil">
                                    <Textarea rows={2} value={s.result} onChange={(e) => onUpdateStep(s.id, { result: e.target.value })} />
                                </WriteupField>

                                <WriteupField label="Interpretasi">
                                    <Textarea rows={2} value={s.interpretation} onChange={(e) => onUpdateStep(s.id, { interpretation: e.target.value })} />
                                </WriteupField>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-md border border-edge p-3">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-medium text-strong">Evidence</p>
                        <Button type="button" variant="secondary" size="sm" onClick={onAddEvidence} className="self-start">
                            <Plus className="w-3.5 h-3.5" /> Evidence
                        </Button>
                    </div>

                    {q.evidence.length === 0 && (
                        <p className="text-xs text-muted">Belum ada bukti untuk question ini.</p>
                    )}

                    <div className="space-y-3">
                        {q.evidence.map((e) => (
                            <div key={e.id} className="rounded-md border border-edge bg-elevated/40 p-3">
                                <div className="mb-2 flex items-center gap-2">
                                    <Select
                                        value={e.kind}
                                        onChange={(ev) => onUpdateEvidence(e.id, { kind: ev.target.value as EvidenceKind })}
                                    >
                                        <option value="command">CMD</option>
                                        <option value="output">OUTPUT</option>
                                        <option value="request">REQ</option>
                                        <option value="response">RESP</option>
                                        <option value="error">ERROR</option>
                                        <option value="log">LOG</option>
                                        <option value="lainya">LAINYA</option>
                                    </Select>
                                    <StatusBadge value={e.kind} tone={evidenceKindTone(e.kind)} />
                                    <div className="ml-auto">
                                        <IconButton onClick={() => onRemoveEvidence(e.id)} label="Hapus evidence" danger>
                                            <Trash2 className="h-4 w-4" />
                                        </IconButton>
                                    </div>
                                </div>

                                <Input
                                    className="mb-2"
                                    value={e.label}
                                    onChange={(ev) => onUpdateEvidence(e.id, { label: ev.target.value })}
                                    placeholder="Label bukti (opsional)"
                                />

                                <Textarea
                                    rows={3}
                                    className="font-mono text-[13px]"
                                    value={e.content}
                                    onChange={(ev) => onUpdateEvidence(e.id, { content: ev.target.value })}
                                    placeholder="Isi bukti (command, output, error, ...)"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function IconButton({
    children,
    onClick,
    disabled,
    danger,
    label,
}: {
    children: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
    label: string;
}) {
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            onClick={onClick}
            disabled={disabled}
            className={[
                'rounded-md p-1.5 text-faint transition-colors',
                danger ? 'hover:bg-danger/10 hover:text-danger' : 'hover:bg-surface-hover hover:text-body',
                disabled ? 'cursor-not-allowed opacity-40' : '',
            ].join(' ')}
        >
            {children}
        </button>
    );
}