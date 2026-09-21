import { FormEventHandler } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import PageHeader from '@/Components/UI/PageHeader';
import { Save } from 'lucide-react';
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
        <AuthenticatedLayout header="Catatan Baru">
            <Head title="Buat Catatan" />

            <PageHeader
                title="Catatan Baru"
                description="Tulis catatan teknis atau konsep yang ingin Anda dokumentasikan."
                actions={
                    <Link href={route('notes.index')}>
                        <Button variant="ghost" size="sm">Batal</Button>
                    </Link>
                }
            />

            <form onSubmit={submit} className="max-w-4xl space-y-5">
                <div>
                    <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-body">
                        Judul
                    </label>
                    <Input
                        id="title"
                        value={data.title}
                        onChange={(e) => setData('title', e.target.value)}
                        placeholder="Contoh: Enumeration Nmap Dasar"
                        required
                    />
                    {errors.title && <p className="mt-1.5 text-xs text-danger">{errors.title}</p>}
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
                            placeholder="Tulis dokumentasi di sini..."
                            modules={modules}
                        />
                    </div>
                    {errors.content && <p className="mt-1.5 text-xs text-danger">{errors.content}</p>}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-edge pt-5">
                    <Link href={route('notes.index')}>
                        <Button type="button" variant="ghost">Batal</Button>
                    </Link>
                    <Button type="submit" disabled={processing}>
                        <Save className="h-4 w-4" />
                        {processing ? 'Menyimpan...' : 'Simpan Catatan'}
                    </Button>
                </div>
            </form>
        </AuthenticatedLayout>
    );
}