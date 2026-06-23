import { FormEventHandler } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import MarkdownEditor from '@/Components/Forms/MarkdownEditor';
import { ArrowLeft, Save } from 'lucide-react';

export default function ChallengeCreate() {
    const { data, setData, post, processing, errors } = useForm({
        event_name: '', title: '', category: 'Web', difficulty: 'Easy',
        status: 'Todo', points: '', flag: '', description: '', writeup: ''
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('challenges.store'));
    };

    return (
        <AuthenticatedLayout header="Tambah Challenge">
            <Head title="Tambah Challenge" />
            <Link href={route('challenges.index')} className="inline-flex items-center text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" /> Batal
            </Link>

            <form onSubmit={submit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Nama Event / Platform</label>
                        <Input value={data.event_name} onChange={e => setData('event_name', e.target.value)} placeholder="Contoh: HackTheBox, PicoCTF" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Nama Challenge / Mesin</label>
                        <Input value={data.title} onChange={e => setData('title', e.target.value)} required />
                        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Kategori</label>
                        <select value={data.category} onChange={e => setData('category', e.target.value)} className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 outline-none">
                            {['Web', 'Crypto', 'Pwn', 'Forensics', 'Reverse Engineering', 'OSINT', 'Misc'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Kesulitan</label>
                        <select value={data.difficulty} onChange={e => setData('difficulty', e.target.value)} className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 outline-none">
                            {['Easy', 'Medium', 'Hard', 'Insane'].map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Status</label>
                        <select value={data.status} onChange={e => setData('status', e.target.value)} className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 outline-none">
                            {['Todo', 'In Progress', 'Solved'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Poin</label>
                        <Input type="number" value={data.points} onChange={e => setData('points', e.target.value)} placeholder="0" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Flag</label>
                    <Input value={data.flag} onChange={e => setData('flag', e.target.value)} placeholder="Format: HTB{...}" className="font-mono text-emerald-400" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Deskripsi Soal (Opsional)</label>
                    <MarkdownEditor value={data.description} onChange={val => setData('description', val)} />
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Writeup / Catatan Penyelesaian</label>
                    <MarkdownEditor value={data.writeup} onChange={val => setData('writeup', val)} />
                </div>

                <div className="flex justify-end pt-4 border-t border-white/10">
                    <Button type="submit" disabled={processing}>
                        <Save className="w-4 h-4 mr-2" /> {processing ? 'Menyimpan...' : 'Simpan Challenge'}
                    </Button>
                </div>
            </form>
        </AuthenticatedLayout>
    );
}
