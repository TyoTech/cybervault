import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import Button from '@/Components/UI/Button';
import Badge from '@/Components/UI/Badge';
import { ArrowLeft, Edit, FolderOpen, Trash2 } from 'lucide-react';
import { AttemptStatus, EvidenceBlock, HypothesisStatus, LessonLearned, WriteupContent, WriteupNote } from '@/types/writeup';
import { ReactNode } from 'react';

const HYP_BADGE: Record<HypothesisStatus, { variant: any; label: string }> = {
    unverified: { variant: 'warning', label: 'HYPOTHESIS' },
    confirmed: { variant: 'success', label: 'CONFIRMED' },
    rejected: { variant: 'danger', label: 'REJECTED' },
};

const ATTEMPT_BADGE: Record<AttemptStatus, any> = {
    successful: 'success',
    failed: 'danger',
    inconclusive: 'warning',
};

function Block({ title, children, mono = false }: { title: string; children?: string; mono?: boolean }) {
    if (!children?.trim()) return null;
    return (
        <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1">{title}</p>
            {mono ? (
                <pre className="rounded-md border border-edge bg-canvas p-3 text-[13px] text-zinc-200 font-mono whitespace-pre-wrap overflow-x-auto">{children}</pre>
            ) : (
                <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{children}</p>
            )}
        </div>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="space-y-3">
            <h2 className="text-base font-semibold text-zinc-100 border-b border-edge pb-2">{title}</h2>
            {children}
        </section>
    );
}

export default function WriteupShow({ note }: { note: WriteupNote }) {
    const { delete: destroy, processing } = useForm();
    const w = (note.content_json ?? {}) as Partial<WriteupContent>;
    const ll: Partial<LessonLearned> = w.lesson_learned ?? {};

    const handleDelete = () => {
        if (confirm('Hapus writeup beserta file DOCX-nya?')) {
            destroy(route('notes.destroy', note.id));
        }
    };

    return (
        <AuthenticatedLayout header="Detail Writeup">
            <Head title={note.title} />

            <div className="max-w-4xl space-y-8">
                <div className="flex items-center justify-between">
                    <Link href="/notes?kind=writeup" className="flex items-center text-sm text-zinc-400 hover:text-zinc-200">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
                    </Link>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => router.post(route('notes.openFolder', note.id))}>
                            <FolderOpen className="w-4 h-4 mr-2" /> Buka Folder
                        </Button>
                        <Link href={route('notes.edit', note.id)}>
                            <Button variant="secondary"><Edit className="w-4 h-4 mr-2" /> Edit</Button>
                        </Link>
                        <Button variant="danger" onClick={handleDelete} disabled={processing}>
                            <Trash2 className="w-4 h-4 mr-2" /> Hapus
                        </Button>
                    </div>
                </div>

                <div>
                    <Badge variant="purple">Writeup</Badge>
                    <h1 className="text-3xl font-bold text-zinc-100 mt-2">{note.title}</h1>
                </div>

                {!!w.goal && <Section title="Tujuan"><Block title="Masalah">{w.goal}</Block></Section>}
                {!!w.scope && <Section title="Environment / Scope"><Block title="Scope" mono>{w.scope}</Block></Section>}

                {(w.hypotheses?.length ?? 0) > 0 && (
                    <Section title="Hypotheses">
                        {w.hypotheses!.map((h, i) => (
                            <div key={i} className="rounded-md border border-amber-500/20 bg-amber-500/[0.04] p-4 space-y-2">
                                <Badge variant={HYP_BADGE[h.status ?? 'unverified'].variant}>{HYP_BADGE[h.status ?? 'unverified'].label}</Badge>
                                <p className="text-sm text-zinc-200 whitespace-pre-wrap">{h.text}</p>
                            </div>
                        ))}
                    </Section>
                )}

                {(w.steps?.length ?? 0) > 0 && (
                    <Section title="Langkah Analisis">
                        {w.steps!.map((s, i) => (
                            <div key={i} className="rounded-md border border-edge bg-elevated/40 p-4 space-y-3">
                                <h3 className="text-sm font-semibold text-zinc-100">
                                    Step {i + 1}{s.title ? ` — ${s.title}` : ''}
                                </h3>
                                <Block title="Tujuan">{s.objective}</Block>
                                <Block title="Pendekatan">{s.approach}</Block>
                                <Block title="Command / Request" mono>{s.command}</Block>
                                <Block title="Output" mono>{s.output}</Block>
                                {!!s.result && (
                                    <div className="space-y-1">
                                        <Badge variant="success">FACT</Badge>
                                        <p className="text-sm text-zinc-200 whitespace-pre-wrap">{s.result}</p>
                                    </div>
                                )}
                                {!!s.interpretation && (
                                    <div className="space-y-1">
                                        <Badge>INTERPRETATION</Badge>
                                        <p className="text-sm text-zinc-300 whitespace-pre-wrap">{s.interpretation}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </Section>
                )}

                {(w.attempts?.length ?? 0) > 0 && (
                    <Section title="Experiments / Attempts">
                        {w.attempts!.map((a, i) => (
                            <div key={i} className="rounded-md border border-edge bg-elevated/40 p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-semibold text-zinc-100">Attempt {i + 1}</h3>
                                    <Badge variant={ATTEMPT_BADGE[a.status ?? 'inconclusive']}>{(a.status ?? 'inconclusive').toUpperCase()}</Badge>
                                </div>
                                <Block title="Hypothesis">{a.hypothesis}</Block>
                                <Block title="Approach">{a.approach}</Block>
                                <Block title="Command / Request" mono>{a.command}</Block>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Block title="Expected">{a.expected}</Block>
                                    <Block title="Actual">{a.actual}</Block>
                                </div>
                                <Block title="Error" mono>{a.error}</Block>
                                <Block title="Pelajaran / perubahan strategi">{a.lesson}</Block>
                            </div>
                        ))}
                    </Section>
                )}

                {(w.evidence?.length ?? 0) > 0 && (
                    <Section title="Bukti / Output Penting">
                        {w.evidence!.map((ev: EvidenceBlock, i: number) => (
                            <div key={i} className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Badge variant="success">FACT</Badge>
                                    <Badge variant="outline">{(ev.type ?? 'note').toUpperCase()}</Badge>
                                    {!!ev.label && <span className="text-xs text-zinc-500">{ev.label}</span>}
                                </div>
                                <pre className="rounded-md border border-edge bg-canvas p-3 text-[13px] text-zinc-200 font-mono whitespace-pre-wrap overflow-x-auto">{ev.content}</pre>
                            </div>
                        ))}
                    </Section>
                )}

                {!!w.interpretation && <Section title="Interpretasi"><Block title="Kesimpulan">{w.interpretation}</Block></Section>}
                {!!w.risk_impact && <Section title="Risiko / Impact"><Block title="Impact">{w.risk_impact}</Block></Section>}
                {!!w.recommendations && <Section title="Rekomendasi"><Block title="Rekomendasi">{w.recommendations}</Block></Section>}
                {!!w.strategy_changes && <Section title="Strategy Changes"><Block title="Perubahan strategi">{w.strategy_changes}</Block></Section>}

                {!!(ll.learned || ll.patterns || ll.mistakes || ll.revisit || ll.relevance) && (
                    <Section title="Lesson Learned">
                        <div className="rounded-md border border-blue-500/20 bg-blue-500/[0.03] p-4 space-y-4">
                            <Block title="Apa yang dipelajari">{ll.learned}</Block>
                            <Block title="Pola yang ditemukan">{ll.patterns}</Block>
                            <Block title="Kesalahan yang harus dihindari">{ll.mistakes}</Block>
                            <Block title="Konsep yang perlu dipahami ulang">{ll.revisit}</Block>
                            <Block title="Relevansi dunia nyata">{ll.relevance}</Block>
                        </div>
                    </Section>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
