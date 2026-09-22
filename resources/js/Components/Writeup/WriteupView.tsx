import { useState } from 'react';
import Section from '@/Components/UI/Section';
import StatusBadge, {
    experimentStatusTone,
    evidenceKindTone,
    hypothesisStatusTone,
    questionStatusTone,
    stepTypeTone,
} from '@/Components/Writeup/StatusBadge';
import MarkdownViewer from '@/Components/UI/MarkdownViewer';
import { QuestionItem, WriteupData } from '@/Components/Writeup/types';
import { questionStats } from '@/Utils/questionStats';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/Utils/cn';

/**
 * Tampilan READ-ONLY structured writeup (halaman Show). Semua konten tetap
 * bersumber dari props `value` (writeup_data) yang dikirim controller.
 */
export default function WriteupView({ value }: { value: WriteupData }) {
    const env = value.environment;
    const envRows = (
        [
            ['Target / scope', env.target],
            ['Environment', env.environment],
            ['IP / hostname', env.host],
            ['Aplikasi', env.application],
            ['OS', env.os],
            ['Tools', env.tools],
            ['Catatan scope', env.scope],
        ] as Array<[string, string]>
    ).filter(([, v]) => v.trim() !== '');

    const lesson = value.lessonLearned;
    const lessonRows = (
        [
            ['Apa yang dipelajari', lesson.learned],
            ['Pola yang ditemukan', lesson.patterns],
            ['Kesalahan yang harus dihindari', lesson.mistakes],
            ['Konsep yang perlu dipahami ulang', lesson.concepts],
            ['Yang akan dilakukan berbeda', lesson.different],
            ['Relevansi di dunia nyata', lesson.relevance],
        ] as Array<[string, string]>
    ).filter(([, v]) => v.trim() !== '');

    return (
        <div className="space-y-4">
            {value.questions.length > 0 && <QuestionsView questions={value.questions} />}

            {(value.goal.problem.trim() !== '' ||
                value.goal.objective.trim() !== '' ||
                value.goal.proof.trim() !== '') && (
                <Section title="1. Tujuan" idPrefix="v-goal" defaultOpen>
                    <KvList
                        rows={[
                            ['Masalah yang dianalisis', value.goal.problem],
                            ['Tujuan analisis', value.goal.objective],
                            ['Yang ingin dibuktikan', value.goal.proof],
                        ]}
                    />
                </Section>
            )}

            {envRows.length > 0 && (
                <Section title="2. Environment / Scope" idPrefix="v-env">
                    <KvList rows={envRows} />
                </Section>
            )}

            {value.hypotheses.length > 0 && (
                <Section title="3. Hipotesis" count={value.hypotheses.length} idPrefix="v-hyp">
                    <ul className="space-y-2">
                        {value.hypotheses.map((h) => (
                            <li key={h.id} className="flex items-start gap-2">
                                <StatusBadge value={h.status} tone={hypothesisStatusTone(h.status)} className="mt-0.5 shrink-0" />
                                <p className="text-sm text-strong whitespace-pre-wrap">{h.text}</p>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            {value.steps.length > 0 && (
                <Section title="4. Langkah Analisis" count={value.steps.length} idPrefix="v-steps">
                    <ol className="space-y-4">
                        {value.steps.map((s, i) => (
                            <li key={s.id} className="space-y-2 rounded-md border border-edge bg-surface p-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-faint">Step {i + 1}</span>
                                    <StatusBadge value={s.type} tone={stepTypeTone(s.type)} />
                                    {s.title !== '' && <span className="text-sm font-medium text-strong">{s.title}</span>}
                                </div>
                                <KvList
                                    rows={[
                                        ['Apa yang ingin diketahui', s.question],
                                        ['Tujuan langkah', s.goal],
                                        ['Pendekatan', s.approach],
                                        ['Hasil', s.result],
                                        ['Interpretasi', s.interpretation],
                                    ]}
                                />
                                <CodeFences
                                    rows={[
                                        ['Command / request', s.command],
                                        ['Output', s.output],
                                    ]}
                                />
                            </li>
                        ))}
                    </ol>
                </Section>
            )}

            {value.experiments.length > 0 && (
                <Section title="5. Failed Attempts / Percobaan" count={value.experiments.length} idPrefix="v-exp">
                    <ol className="space-y-4">
                        {value.experiments.map((e, i) => (
                            <li key={e.id} className="space-y-2 rounded-md border border-edge bg-surface p-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-faint">Attempt {i + 1}</span>
                                    <StatusBadge value={e.status} tone={experimentStatusTone(e.status)} />
                                </div>
                                <KvList
                                    rows={[
                                        ['Hipotesis', e.hypothesis],
                                        ['Pendekatan', e.approach],
                                        ['Hasil yang diharapkan', e.expected],
                                        ['Hasil aktual', e.actual],
                                        ['Kenapa gagal', e.whyFailed],
                                        ['Yang berubah setelahnya', e.changed],
                                        ['Interpretasi', e.interpretation],
                                    ]}
                                />
                                <CodeFences
                                    rows={[
                                        ['Command / request', e.command],
                                        ['Error message', e.error],
                                    ]}
                                />
                            </li>
                        ))}
                    </ol>
                </Section>
            )}

            {value.evidence.length > 0 && (
                <Section title="6. Bukti / Evidence" count={value.evidence.length} idPrefix="v-ev">
                    <ol className="space-y-3">
                        {value.evidence.map((ev) => (
                            <li key={ev.id} className="overflow-hidden rounded-md border border-edge bg-surface">
                                <div className="flex items-center gap-2 border-b border-edge bg-elevated/50 px-3 py-2">
                                    <StatusBadge value={ev.kind} tone={evidenceKindTone(ev.kind)} />
                                    {ev.label !== '' && <span className="text-sm text-strong">{ev.label}</span>}
                                </div>
                                <pre className="whitespace-pre-wrap p-3 font-mono text-[13px] text-body">{ev.content}</pre>
                            </li>
                        ))}
                    </ol>
                </Section>
            )}

            {value.strategyChanges.length > 0 && (
                <Section title="7. Strategy Changes" count={value.strategyChanges.length} idPrefix="v-strat">
                    <ul className="space-y-1.5">
                        {value.strategyChanges.map((s) => (
                            <li key={s.id} className="text-sm text-strong">• {s.text}</li>
                        ))}
                    </ul>
                </Section>
            )}

            {value.riskImpact.trim() !== '' && (
                <Section title="8. Risk / Impact" idPrefix="v-risk">
                    <p className="text-sm text-strong whitespace-pre-wrap">{value.riskImpact}</p>
                </Section>
            )}

            {value.recommendations.length > 0 && (
                <Section title="9. Rekomendasi" count={value.recommendations.length} idPrefix="v-rec">
                    <ul className="space-y-1.5">
                        {value.recommendations.map((r) => (
                            <li key={r.id} className="text-sm text-strong">• {r.text}</li>
                        ))}
                    </ul>
                </Section>
            )}

            {lessonRows.length > 0 && (
                <Section title="10. Lesson Learned" idPrefix="v-lesson">
                    <KvList rows={lessonRows} />
                </Section>
            )}

            {value.references.trim() !== '' && (
                <Section title="Referensi" idPrefix="v-refs">
                    <pre className="text-sm text-body whitespace-pre-wrap font-sans">{value.references}</pre>
                </Section>
            )}

            {value.notes.trim() !== '' && (
                <Section title="Catatan" idPrefix="v-notes">
                    <MarkdownViewer content={value.notes} />
                </Section>
            )}
        </div>
    );
}

function KvList({ rows }: { rows: Array<[string, string]> }) {
    const visible = rows.filter(([, v]) => v.trim() !== '');

    if (visible.length === 0) {
        return null;
    }

    return (
        <dl className="space-y-2">
            {visible.map(([label, v]) => (
                <div key={label}>
                    <dt className="text-[11px] uppercase tracking-wide text-faint">{label}</dt>
                    <dd className="text-sm text-strong whitespace-pre-wrap mt-0.5">{v}</dd>
                </div>
            ))}
        </dl>
    );
}

function CodeFences({ rows }: { rows: Array<[string, string]> }) {
    const visible = rows.filter(([, v]) => v.trim() !== '');

    if (visible.length === 0) {
        return null;
    }

    return (
        <div className="space-y-2">
            {visible.map(([label, v]) => (
                <div key={label}>
                    <p className="mb-1 text-[11px] uppercase tracking-wide text-faint">{label}</p>
                    <pre className="whitespace-pre-wrap rounded-md border border-edge bg-code-bg p-3 font-mono text-[13px] text-code-text">
                        {v}
                    </pre>
                </div>
            ))}
        </div>
    );
}

/**
 * Daftar Question/Objective read-only (halaman Show).
 *
 * - Progress otomatis (solved / total).
 * - Navigasi Previous / Next Question.
 * - Result/flag disembunyikan sampai user memilih "Show Answer".
 */
function QuestionsView({ questions }: { questions: QuestionItem[] }) {
    const stats = questionStats(questions);
    const [activeIndex, setActiveIndex] = useState(0);
    const [revealed, setRevealed] = useState<Record<string, boolean>>({});

    const active = Math.min(activeIndex, questions.length - 1);

    const prev = () => setActiveIndex((i) => Math.max(i - 1, 0));
    const next = () => setActiveIndex((i) => Math.min(i + 1, questions.length - 1));

    return (
        <Section
            title="Questions / Objectives"
            description={`${stats.solved} / ${stats.total} solved (${stats.percent}%)`}
            count={questions.length}
            idPrefix="v-questions"
            defaultOpen
        >
            <div
                className="mb-3 h-1.5 overflow-hidden rounded-full bg-faint/10"
                role="progressbar"
                aria-valuenow={stats.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progress question"
            >
                <div
                    className={cn('h-full rounded-full', stats.percent === 100 ? 'bg-success' : 'bg-accent')}
                    style={{ width: `${stats.percent}%` }}
                />
            </div>

            <div className="mb-3 flex items-center justify-between gap-2">
                <NavButton onClick={prev} disabled={active === 0} label="Question sebelumnya">
                    <ChevronLeft className="h-4 w-4" /> Previous
                </NavButton>
                <span className="text-xs font-mono text-faint">
                    Question {active + 1} / {questions.length}
                </span>
                <NavButton onClick={next} disabled={active >= questions.length - 1} label="Question berikutnya">
                    Next <ChevronRight className="h-4 w-4" />
                </NavButton>
            </div>

            <ol className="space-y-2">
                {questions.map((q, i) => {
                    const isActive = i === active;
                    const showAnswer = Boolean(revealed[q.id]);

                    return (
                        <li
                            key={q.id}
                            className={cn(
                                'overflow-hidden rounded-md border',
                                isActive ? 'border-edge bg-surface' : 'border-edge/60 bg-surface/50',
                            )}
                        >
                            <button
                                type="button"
                                onClick={() => setActiveIndex(i)}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
                                aria-expanded={isActive}
                            >
                                <span className="text-xs font-mono text-faint">Q{i + 1}</span>
                                <span
                                    className={cn(
                                        'min-w-0 flex-1 truncate text-sm',
                                        isActive ? 'text-strong' : 'text-muted',
                                    )}
                                >
                                    {q.question.trim() !== '' ? q.question : `Question ${i + 1}`}
                                </span>
                                <StatusBadge value={q.status} tone={questionStatusTone(q.status)} />
                            </button>

                            {isActive && (
                                <div className="space-y-3 border-t border-edge px-3 py-3">
                                    {q.notes.trim() !== '' && <KvList rows={[['Analysis', q.notes]]} />}

                                    {q.steps.length > 0 && (
                                        <div>
                                            <p className="mb-2 text-[11px] uppercase tracking-wide text-faint">Steps</p>
                                            <ol className="space-y-3">
                                                {q.steps.map((s, j) => (
                                                    <li key={s.id} className="space-y-2 rounded-md border border-edge bg-elevated/40 p-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-mono text-faint">Step {j + 1}</span>
                                                            <StatusBadge value={s.type} tone={stepTypeTone(s.type)} />
                                                            {s.title !== '' && <span className="text-sm font-medium text-strong">{s.title}</span>}
                                                        </div>
                                                        <KvList
                                                            rows={[
                                                                ['Apa yang ingin diketahui', s.question],
                                                                ['Tujuan langkah', s.goal],
                                                                ['Pendekatan', s.approach],
                                                                ['Hasil', s.result],
                                                                ['Interpretasi', s.interpretation],
                                                            ]}
                                                        />
                                                        <CodeFences
                                                            rows={[
                                                                ['Command / request', s.command],
                                                                ['Output', s.output],
                                                            ]}
                                                        />
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>
                                    )}

                                    {q.evidence.length > 0 && (
                                        <div>
                                            <p className="mb-2 text-[11px] uppercase tracking-wide text-faint">Evidence</p>
                                            <ol className="space-y-3">
                                                {q.evidence.map((ev, j) => (
                                                    <li key={ev.id} className="overflow-hidden rounded-md border border-edge bg-elevated/40">
                                                        <div className="flex items-center gap-2 border-b border-edge bg-elevated/60 px-3 py-1.5">
                                                            <StatusBadge value={ev.kind} tone={evidenceKindTone(ev.kind)} />
                                                            {ev.label !== '' && <span className="text-sm text-strong">{ev.label}</span>}
                                                        </div>
                                                        <pre className="whitespace-pre-wrap p-3 font-mono text-[13px] text-body">{ev.content}</pre>
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>
                                    )}

                                    {q.result.trim() !== '' && (
                                        <div>
                                            {!showAnswer ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setRevealed((r) => ({ ...r, [q.id]: true }))}
                                                    className="rounded-md border border-edge px-3 py-1.5 text-[13px] text-muted transition-colors hover:bg-surface-hover hover:text-body"
                                                >
                                                    Show Answer
                                                </button>
                                            ) : (
                                                <div className="space-y-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setRevealed((r) => ({ ...r, [q.id]: false }))}
                                                        className="rounded-md border border-edge px-3 py-1.5 text-[13px] text-muted transition-colors hover:bg-surface-hover hover:text-body"
                                                    >
                                                        Hide Answer
                                                    </button>
                                                    <CodeFences rows={[['Answer / Flag', q.result]]} />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ol>
        </Section>
    );
}

function NavButton({
    children,
    onClick,
    disabled,
    label,
}: {
    children: React.ReactNode;
    onClick: () => void;
    disabled: boolean;
    label: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            className={cn(
                'inline-flex items-center gap-1 rounded-md border border-edge px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:bg-surface-hover hover:text-body',
                disabled && 'cursor-not-allowed opacity-40',
            )}
        >
            {children}
        </button>
    );
}