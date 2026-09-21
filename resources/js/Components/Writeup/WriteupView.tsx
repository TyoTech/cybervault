import Section from '@/Components/UI/Section';
import StatusBadge, {
    experimentStatusTone,
    evidenceKindTone,
    hypothesisStatusTone,
    stepTypeTone,
} from '@/Components/Writeup/StatusBadge';
import MarkdownViewer from '@/Components/UI/MarkdownViewer';
import { WriteupData } from '@/Components/Writeup/types';

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