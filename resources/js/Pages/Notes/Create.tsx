import { FormEventHandler } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import MarkdownEditor from '@/Components/Forms/MarkdownEditor';

export default function NoteCreate() {
    const { data, setData, post, processing, errors } = useForm({
        title: '',
        content: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('notes.store'));
    };

    return (
        <AuthenticatedLayout header="Buat Catatan Baru">
            <Head title="Buat Catatan" />

            <form onSubmit={submit} className="space-y-6 max-w-4xl">
                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Judul</label>
                    <Input
                        value={data.title}
                        onChange={(e) => setData('title', e.target.value)}
                        placeholder="Masukkan judul catatan..."
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

                <Button type="submit" disabled={processing}>
                    {processing ? 'Menyimpan...' : 'Simpan Catatan'}
                </Button>
            </form>
        </AuthenticatedLayout>
    );
}
