import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import Badge from '@/Components/UI/Badge';
import Button from '@/Components/UI/Button';
import { Shield, ArrowLeft, Trash2 } from 'lucide-react';

export default function ChallengeShow({ challenge }: { challenge: any }) {
    const { delete: destroy, processing } = useForm();

    const handleDelete = () => {
        if (confirm('Hapus challenge ini dari tracker?')) {
            destroy(route('challenges.destroy', challenge.id));
        }
    };

    return (
        <AuthenticatedLayout header="Detail Challenge">
            <Head title={challenge.title} />

            <div className="mb-8 flex justify-between items-start">
                <div>
                    <Link href={route('challenges.index')} className="flex items-center text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Tracker
                    </Link>

                    <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
                        {challenge.title}
                        <Badge variant={challenge.status === 'Solved' ? 'success' : 'warning'}>{challenge.status}</Badge>
                    </h1>
                    <div className="flex items-center gap-4 mt-3 text-sm text-zinc-400">
                        <span className="flex items-center"><Shield className="w-4 h-4 mr-1.5" /> {challenge.category}</span>
                        <Badge variant="outline">{challenge.difficulty}</Badge>
                    </div>
                </div>

                <Button variant="danger" onClick={handleDelete} disabled={processing}>
                    <Trash2 className="w-4 h-4 mr-2" /> Hapus
                </Button>
            </div>

            {/* Ruang untuk Writeup/Notes spesifik challenge di masa depan */}
            <div className="p-8 border border-dashed border-white/10 rounded-xl text-center text-zinc-500">
                Fitur Editor Writeup terintegrasi akan tampil di sini.
            </div>
        </AuthenticatedLayout>
    );
}
