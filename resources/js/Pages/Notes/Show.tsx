import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import Button from '@/Components/UI/Button';
import { ArrowLeft, Trash2, Edit, FolderOpen } from 'lucide-react';
import 'react-quill/dist/quill.snow.css';

export default function NoteShow({ note }: { note: any }) {
    const { delete: destroy, processing } = useForm();

    const handleDelete = () => {
        if (confirm('Hapus catatan beserta file DOCX di dalamnya?')) {
            destroy(route('notes.destroy', note.id));
        }
    };

    return (
        <AuthenticatedLayout header="Detail Catatan">
            <Head title={note.title} />

            <div className="max-w-4xl space-y-6">
                <div className="flex items-center justify-between">
                    <Link href={route('notes.index')} className="flex items-center text-sm text-zinc-400 hover:text-zinc-200">
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

                <div className="border-b border-white/10 pb-6">
                    <h1 className="text-3xl font-bold text-zinc-100">{note.title}</h1>
                </div>

                <div className="mt-6 rounded-lg border border-zinc-700 bg-[#09090b] overflow-hidden">
                    <div
                        className="ql-editor p-6"
                        dangerouslySetInnerHTML={{ __html: note.content }}
                    />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
