import { FormEventHandler } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';

const CATEGORIES = ['SQLi', 'XSS', 'LFI', 'RCE', 'Reverse Shell', 'PrivEsc'];

export default function PayloadCreate() {
    const { data, setData, post, processing, errors } = useForm({
        title: '',
        category: 'XSS',
        description: '',
        content: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('payloads.store'));
    };

    return (
        <AuthenticatedLayout header="Tambah Payload">
            <Head title="Tambah Payload" />

            <form onSubmit={submit} className="space-y-6 max-w-2xl">
                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Judul Payload</label>
                    <Input
                        value={data.title}
                        onChange={(e) => setData('title', e.target.value)}
                        required
                    />
                    {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Kategori</label>
                    <select
                        value={data.category}
                        onChange={(e) => setData('category', e.target.value)}
                        className="flex h-10 w-full rounded-md border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 focus:ring-1 focus:ring-blue-500/50 focus:outline-none"
                    >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Deskripsi Singkat</label>
                    <Input
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Kode/Script Payload</label>
                    <textarea
                        value={data.content}
                        onChange={(e) => setData('content', e.target.value)}
                        className="w-full h-32 rounded-md border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 font-mono focus:ring-1 focus:ring-blue-500/50 focus:outline-none resize-y"
                        required
                    />
                    {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content}</p>}
                </div>

                <Button type="submit" disabled={processing}>
                    {processing ? 'Menyimpan...' : 'Simpan Payload'}
                </Button>
            </form>
        </AuthenticatedLayout>
    );
}
