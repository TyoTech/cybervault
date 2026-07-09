import { FormEventHandler } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import { Save, ArrowLeft } from 'lucide-react';
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
            <Link href={route('notes.index')} className="inline-flex items-center text-sm text-zinc-400 hover:text-zinc-200 mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" /> Batal
            </Link>

            <form onSubmit={submit} className="space-y-6 max-w-4xl">
                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Judul Catatan</label>
                    <Input value={data.title} onChange={(e) => setData('title', e.target.value)} required />
                    {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                </div>

                <div className="bg-white text-black rounded-lg overflow-hidden pb-12">
                    <ReactQuill theme="snow" value={data.content} onChange={(val) => setData('content', val)} className="h-64" modules={modules} />
                </div>

                {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content}</p>}

                <div className="flex justify-end pt-4 border-t border-white/10">
                    <Button type="submit" disabled={processing}>
                        <Save className="w-4 h-4 mr-2" /> Simpan (.docx)
                    </Button>
                </div>
            </form>
        </AuthenticatedLayout>
    );
}
