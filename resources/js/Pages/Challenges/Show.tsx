import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import Badge from '@/Components/UI/Badge';
import Button from '@/Components/UI/Button';
import { Shield, ArrowLeft, Trash2, Edit, Folder, FolderOpen } from 'lucide-react';

export default function ChallengeShow({ challenge }: { challenge: any }) {
    const { delete: destroy, processing } = useForm();

    const handleDelete = () => {
        if (confirm('Hapus challenge ini? Folder di laptop tidak akan terhapus otomatis.')) {
            destroy(route('challenges.destroy', challenge.id));
        }
    };

    return (
        <AuthenticatedLayout header="Detail Challenge">
            <Head title={challenge.judul} />

            <div className="mb-8 flex justify-between items-start">
                <div>
                    <Link href={route('challenges.index')} className="flex items-center text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
                    </Link>
                    <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
                        {challenge.judul}
                    </h1>
                    <div className="flex items-center gap-4 mt-3 text-sm text-zinc-400">
                        <span className="flex items-center"><Shield className="w-4 h-4 mr-1.5" /> {challenge.kategori}</span>
                        <Badge variant="outline">{challenge.lab}</Badge>
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

            <div className="space-y-8">
                <div className="bg-zinc-950/50 border border-white/5 p-6 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Folder className="w-10 h-10 text-blue-500" />
                        <div>
                            <h3 className="text-lg font-semibold text-zinc-200">Lokasi Penyimpanan Lokal</h3>
                            <p className="text-zinc-400 font-mono text-sm mt-1">/home/tyo/cyber/{challenge.path_folder}</p>
                        </div>
                    </div>
                    <Button variant="secondary" onClick={() => router.post(route('challenges.openFolder', challenge.id))}>
                        <FolderOpen className="w-4 h-4 mr-2" /> Buka Folder
                    </Button>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
