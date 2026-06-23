import { FormEventHandler } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import { ArrowLeft, Save } from 'lucide-react';

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

            <Link href={route('payloads.index')} className="inline-flex items-center text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" /> Batal Edit
            </Link>

            <form onSubmit={submit} className="space-y-6 max-w-2xl">
                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Judul Payload</label>
                    <Input value={data.title} onChange={(e) => setData('title', e.target.value)} required />
                    {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Kategori</label>
                    <select value={data.category} onChange={(e) => setData('category', e.target.value)} className="flex h-10 w-full rounded-md border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 outline-none">
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Deskripsi Singkat</label>
                    <Input value={data.description} onChange={(e) => setData('description', e.target.value)} />
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Kode/Script Payload</label>
                    <textarea value={data.content} onChange={(e) => setData('content', e.target.value)} className="w-full h-48 rounded-md border border-white/10 bg-zinc-950/80 p-4 text-sm text-zinc-100 font-mono outline-none resize-y" required />
                    <p className="text-xs text-zinc-500 mt-2">Tips: Gunakan <code className="text-blue-400">[LHOST]</code> dan <code className="text-blue-400">[LPORT]</code> pada script. Nilai dapat diisi dinamis di halaman Index.</p>
                    {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content}</p>}
                </div>

                <Button type="submit" disabled={processing}>
                    <Save className="w-4 h-4 mr-2" /> {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
            </form>
        </AuthenticatedLayout>
    );
}
