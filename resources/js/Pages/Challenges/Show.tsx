import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import Badge from '@/Components/UI/Badge';
import Button from '@/Components/UI/Button';
import MarkdownViewer from '@/Components/UI/MarkdownViewer';
import CopyButton from '@/Components/UI/CopyButton';
import { Shield, ArrowLeft, Trash2, Edit, Trophy, Flag, Star } from 'lucide-react';

export default function ChallengeShow({ challenge }: { challenge: any }) {
    const { delete: destroy, processing } = useForm();

    const handleDelete = () => {
        if (confirm('Hapus challenge ini dari tracker?')) destroy(route('challenges.destroy', challenge.id));
    };

    return (
        <AuthenticatedLayout header="Detail Challenge">
            <Head title={challenge.title} />

            <div className="mb-8 flex justify-between items-start">
                <div>
                    <Link href={route('challenges.index')} className="flex items-center text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
                    </Link>
                    <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
                        {challenge.title}
                        <Badge variant={challenge.status === 'Solved' ? 'success' : 'warning'}>{challenge.status}</Badge>
                    </h1>
                    <div className="flex items-center gap-4 mt-3 text-sm text-zinc-400">
                        {challenge.event_name && <span className="flex items-center"><Trophy className="w-4 h-4 mr-1.5" /> {challenge.event_name}</span>}
                        <span className="flex items-center"><Shield className="w-4 h-4 mr-1.5" /> {challenge.category}</span>
                        <Badge variant="outline">{challenge.difficulty}</Badge>
                        {challenge.points && <span className="flex items-center"><Star className="w-4 h-4 mr-1.5" /> {challenge.points} Pts</span>}
                    </div>
                </div>

                <div className="flex gap-2">
                    <Link href={route('challenges.edit', challenge.id)}>
                        <Button variant="secondary"><Edit className="w-4 h-4 mr-2" /> Edit</Button>
                    </Link>
                    <Button variant="danger" onClick={handleDelete} disabled={processing}>
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {challenge.flag && (
                <div className="mb-8 bg-zinc-900/50 border border-emerald-500/20 p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Flag className="w-5 h-5 text-emerald-500" />
                        <div>
                            <p className="text-xs text-zinc-500 mb-0.5">Flag Tersimpan</p>
                            <code className="text-emerald-400 font-mono text-sm">{challenge.flag}</code>
                        </div>
                    </div>
                    <CopyButton value={challenge.flag} />
                </div>
            )}

            <div className="space-y-8">
                {challenge.description && (
                    <div className="bg-zinc-950/50 border border-white/5 p-6 rounded-xl">
                        <h3 className="text-lg font-semibold text-zinc-200 mb-4 border-b border-white/5 pb-2">Deskripsi Soal</h3>
                        <MarkdownViewer content={challenge.description} />
                    </div>
                )}

                <div className="bg-zinc-950/50 border border-white/5 p-6 rounded-xl">
                    <h3 className="text-lg font-semibold text-zinc-200 mb-4 border-b border-white/5 pb-2">Writeup / Dokumentasi</h3>
                    {challenge.writeup ? (
                        <MarkdownViewer content={challenge.writeup} />
                    ) : (
                        <p className="text-zinc-500 text-sm">Belum ada writeup untuk challenge ini.</p>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
