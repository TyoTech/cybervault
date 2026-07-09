import { FormEventHandler } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import { ArrowLeft, Save, FolderOpen } from 'lucide-react';
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
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{'list': 'ordered'}, {'list': 'bullet'}],
        ['link', 'image'],
        ['clean']
    ],
    imageResize: {
        parchment: Quill.import('parchment'),
        modules: ['Resize', 'DisplaySize']
    }
};

export default function NoteEdit({ note }: { note: any }) {
    const { data, setData, post, processing } = useForm({
        _method: 'put',
        title: note.title,
        content: note.content || '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('notes.update', note.id));
    };

    return (
        <AuthenticatedLayout header="Edit Catatan">
            <Head title={`Edit - ${note.title}`} />

            <div className="max-w-4xl">
                <div className="flex justify-between items-center mb-6">
                    <Link href={route('notes.show', note.id)} className="inline-flex items-center text-sm text-zinc-400 hover:text-zinc-200">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Batal
                    </Link>
                    <Button type="button" variant="secondary" onClick={() => router.post(route('notes.openFolder', note.id))}>
                        <FolderOpen className="w-4 h-4 mr-2" /> Buka Folder Lokal
                    </Button>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Judul Catatan</label>
                        <Input value={data.title} onChange={(e) => setData('title', e.target.value)} required />
                    </div>

                    <div className="bg-white text-black rounded-lg overflow-hidden pb-12">
                        <ReactQuill theme="snow" value={data.content} onChange={(val) => setData('content', val)} className="h-64" modules={modules} />
                    </div>

                    <div className="flex justify-end pt-4 border-t border-white/10">
                        <Button type="submit" disabled={processing}>
                            <Save className="w-4 h-4 mr-2" /> Update (.docx)
                        </Button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
