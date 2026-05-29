import { FormEventHandler } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import MarkdownEditor from '@/Components/Forms/MarkdownEditor';
import { ArrowLeft, Save } from 'lucide-react';

interface EditProps {
    note: {
        id: string;
        title: string;
        content: string;
    };
}

export default function NoteEdit({ note }: EditProps) {
    // Inisialisasi useForm dengan data asli dari database
    const { data, setData, put, processing, errors } = useForm({
        title: note.title,
        content: note.content,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        // Gunakan PUT/PATCH untuk update data di Laravel
        put(route('notes.update', note.id));
    };

    return (
        <AuthenticatedLayout header="Edit Catatan">
            <Head title={`Edit - ${note.title}`} />

            <div className="max-w-4xl">
                <Link href={route('notes.show', note.id)} className="inline-flex items-center text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-6">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Batal Edit
                </Link>

                <form onSubmit={submit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Judul Catatan</label>
                        <Input
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            className="text-lg font-medium"
                            required
                        />
                        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Konten (Markdown)</label>
                        <MarkdownEditor
                            value={data.content}
                            onChange={(val) => setData('content', val)}
                        />
                        {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content}</p>}
                    </div>

                    <div className="flex justify-end pt-4 border-t border-white/10">
                        <Button type="submit" disabled={processing} className="w-full sm:w-auto">
                            <Save className="w-4 h-4 mr-2" />
                            {processing ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}
                        </Button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
