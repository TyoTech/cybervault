import { FormEventHandler } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import WriteupForm from '@/Components/Writeups/WriteupForm';
import WriteupAiPanel from '@/Components/Writeups/WriteupAiPanel';
import { ArrowLeft, FolderOpen, Save } from 'lucide-react';
import { emptyWriteup, WriteupContent, WriteupNote } from '@/types/writeup';

/** Gabungkan content_json tersimpan dengan default agar field baru tetap ada. */
function hydrate(note: WriteupNote): WriteupContent {
    const base = emptyWriteup();
    const saved = note.content_json ?? {};
    return {
        ...base,
        ...saved,
        lesson_learned: { ...base.lesson_learned, ...(saved.lesson_learned ?? {}) },
    } as WriteupContent;
}

const AI_TARGETS = [
    { key: 'goal', label: 'Tujuan' },
    { key: 'interpretation', label: 'Interpretasi' },
    { key: 'risk_impact', label: 'Risiko / Impact' },
    { key: 'recommendations', label: 'Rekomendasi' },
    { key: 'strategy_changes', label: 'Strategy Changes' },
    { key: 'lesson_learned.learned', label: 'Lesson Learned — Yang dipelajari' },
    { key: 'lesson_learned.patterns', label: 'Lesson Learned — Pola' },
    { key: 'lesson_learned.mistakes', label: 'Lesson Learned — Kesalahan' },
    { key: 'lesson_learned.revisit', label: 'Lesson Learned — Konsep ulang' },
    { key: 'lesson_learned.relevance', label: 'Lesson Learned — Relevansi' },
];

export default function WriteupEdit({ note }: { note: WriteupNote }) {
    const { data, setData, post, processing, errors } = useForm({
        _method: 'put',
        title: note.title,
        writeup: hydrate(note),
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('notes.update', note.id));
    };

    /** Sisipkan teks AI ke field target dengan marker verifikasi (client state saja). */
    const applyAi = (key: string, text: string) => {
        const marked = `> [AI suggestion — requires verification]\n\n${text}`;
        const w = { ...data.writeup };
        if (key.startsWith('lesson_learned.')) {
            const field = key.split('.')[1] as keyof WriteupContent['lesson_learned'];
            const prev = w.lesson_learned[field];
            w.lesson_learned = { ...w.lesson_learned, [field]: prev ? `${prev}\n\n${marked}` : marked };
        } else {
            const field = key as keyof WriteupContent;
            const prev = w[field] as string;
            (w as any)[field] = prev ? `${prev}\n\n${marked}` : marked;
        }
        setData('writeup', w);
    };

    return (
        <AuthenticatedLayout header="Edit Writeup">
            <Head title={`Edit - ${note.title}`} />

            <div className="max-w-4xl">
                <div className="flex justify-between items-center mb-6">
                    <Link href={route('notes.show', note.id)} className="inline-flex items-center text-sm text-zinc-400 hover:text-zinc-200">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Batal
                    </Link>
                    <div className="flex gap-2">
                        <Button type="button" variant="secondary" onClick={() => router.post(route('notes.openFolder', note.id))}>
                            <FolderOpen className="w-4 h-4 mr-2" /> Buka Folder Lokal
                        </Button>
                        <Button onClick={submit} disabled={processing}>
                            <Save className="w-4 h-4 mr-2" /> Simpan
                        </Button>
                    </div>
                </div>

                <WriteupAiPanel noteId={note.id} targets={AI_TARGETS} onApply={applyAi} />

                <form onSubmit={submit} className="space-y-6 mt-6">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-zinc-300 mb-1.5">Judul Writeup</label>
                        <Input id="title" value={data.title} onChange={(e) => setData('title', e.target.value)} required />
                        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                    </div>

                    {(errors as any).writeup && <p className="text-red-500 text-xs">{(errors as any).writeup}</p>}

                    <WriteupForm value={data.writeup} onChange={(w) => setData('writeup', w)} />

                    <div className="flex justify-end pt-4 border-t border-edge">
                        <Button type="submit" disabled={processing}>
                            <Save className="w-4 h-4 mr-2" /> Simpan
                        </Button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
