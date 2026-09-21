import { FormEventHandler } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import PageHeader from '@/Components/UI/PageHeader';
import { Save, FolderOpen } from 'lucide-react';
import { sanitizeNoteHtml } from '@/Utils/sanitizeHtml';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
// @ts-ignore
import ImageResize from 'quill-image-resize-module-react';

declare global {
    interface Window {
        Quill: any;
    }
}

if (typeof window !== 'undefined') {
    window.Quill = Quill;
    Quill.register('modules/imageResize', ImageResize);
}

const modules = {
    toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image'],
        ['clean'],
    ],
    imageResize: {
        parchment: Quill.import('parchment'),
        modules: ['Resize', 'DisplaySize'],
    },
};

export default function NoteEdit({ note }: { note: any }) {
    const { data, setData, post, processing } = useForm({
        _method: 'put',
        title: note.title,
        // Sanitasi HTML sebelum dimuat ke editor Quill (defense-in-depth).
        content: sanitizeNoteHtml(note.content || ''),
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('notes.update', note.id));
    };

    return (
        <AuthenticatedLayout header="Edit Catatan">
            <Head title={`Edit - ${note.title}`} />

            <div className="max-w-4xl">
                <PageHeader
                    title="Edit Catatan"
                    description="Perbarui judul atau konten catatan."
                    actions={
                        <>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => router.post(route('notes.openFolder', note.id))}
                            >
                                <FolderOpen className="h-4 w-4" /> Buka Folder
                            </Button>
                            <Link href={route('notes.show', note.id)}>
                                <Button variant="ghost" size="sm">Batal</Button>
                            </Link>
                        </>
                    }
                />

                <form onSubmit={submit} className="space-y-5">
                    <div>
                        <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-body">
                            Judul
                        </label>
                        <Input
                            id="title"
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="content" className="mb-1.5 block text-sm font-medium text-body">
                            Konten
                        </label>
                        <div className="overflow-hidden rounded-lg border border-edge bg-surface">
                            <ReactQuill
                                theme="snow"
                                value={data.content}
                                onChange={(val) => setData('content', val)}
                                modules={modules}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-edge pt-5">
                        <Link href={route('notes.show', note.id)}>
                            <Button type="button" variant="ghost">Batal</Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            <Save className="h-4 w-4" />
                            {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </Button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}