import { FormEventHandler } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import Input from '@/Components/UI/Input';
import Select from '@/Components/UI/Select';
import Textarea from '@/Components/UI/Textarea';
import Button from '@/Components/UI/Button';
import PageHeader from '@/Components/UI/PageHeader';
import { Save } from 'lucide-react';

const CATEGORIES = ['SQLi', 'XSS', 'LFI', 'RCE', 'Reverse Shell', 'PrivEsc'];

export default function PayloadEdit({ payload }: { payload: any }) {
    const { data, setData, put, processing, errors } = useForm({
        title: payload.title,
        category: payload.category,
        description: payload.description || '',
        content: payload.content,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('payloads.update', payload.id));
    };

    return (
        <AuthenticatedLayout header="Edit Payload">
            <Head title={`Edit ${payload.title}`} />

            <PageHeader
                title="Edit Payload"
                description="Perbarui detail dan isi payload."
                actions={
                    <Link href={route('payloads.index')}>
                        <Button variant="ghost" size="sm">Batal</Button>
                    </Link>
                }
            />

            <form onSubmit={submit} className="max-w-2xl space-y-5">
                <div className="grid gap-5 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                        <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-body">
                            Judul
                        </label>
                        <Input
                            id="title"
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            required
                        />
                        {errors.title && <p className="mt-1.5 text-xs text-danger">{errors.title}</p>}
                    </div>

                    <div>
                        <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-body">
                            Kategori
                        </label>
                        <Select
                            id="category"
                            value={data.category}
                            onChange={(e) => setData('category', e.target.value)}
                        >
                            {CATEGORIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </Select>
                    </div>
                </div>

                <div>
                    <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-body">
                        Deskripsi Singkat <span className="font-normal text-faint">(opsional)</span>
                    </label>
                    <Input
                        id="description"
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="content" className="mb-1.5 block text-sm font-medium text-body">
                        Kode / Script Payload
                    </label>
                    <Textarea
                        id="content"
                        mono
                        value={data.content}
                        onChange={(e) => setData('content', e.target.value)}
                        className="h-56 resize-y"
                        required
                    />
                    {errors.content && <p className="mt-1.5 text-xs text-danger">{errors.content}</p>}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-edge pt-5">
                    <Link href={route('payloads.index')}>
                        <Button type="button" variant="ghost">Batal</Button>
                    </Link>
                    <Button type="submit" disabled={processing}>
                        <Save className="h-4 w-4" />
                        {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </Button>
                </div>
            </form>
        </AuthenticatedLayout>
    );
}