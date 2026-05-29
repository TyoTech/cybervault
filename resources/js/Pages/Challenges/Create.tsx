import { FormEventHandler } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';

export default function ChallengeCreate() {
    const { data, setData, post, processing, errors } = useForm({
        title: '',
        category: 'Web',
        difficulty: 'Easy',
        status: 'Todo',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('challenges.store'));
    };

    return (
        <AuthenticatedLayout header="Tambah Challenge">
            <Head title="Tambah Challenge" />

            <form onSubmit={submit} className="space-y-6 max-w-2xl">
                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Nama Challenge / Mesin</label>
                    <Input
                        value={data.title}
                        onChange={(e) => setData('title', e.target.value)}
                        required
                    />
                    {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Kategori</label>
                        <select
                            value={data.category}
                            onChange={(e) => setData('category', e.target.value)}
                            className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 focus:outline-none"
                        >
                            {['Web', 'Crypto', 'Pwn', 'Forensics', 'Reverse Engineering'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Kesulitan</label>
                        <select
                            value={data.difficulty}
                            onChange={(e) => setData('difficulty', e.target.value)}
                            className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 focus:outline-none"
                        >
                            {['Easy', 'Medium', 'Hard', 'Insane'].map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Status</label>
                        <select
                            value={data.status}
                            onChange={(e) => setData('status', e.target.value)}
                            className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 focus:outline-none"
                        >
                            {['Todo', 'In Progress', 'Solved'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <Button type="submit" disabled={processing}>
                    {processing ? 'Menyimpan...' : 'Simpan Challenge'}
                </Button>
            </form>
        </AuthenticatedLayout>
    );
}
