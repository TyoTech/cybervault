import { FormEventHandler } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import WriteupForm from '@/Components/Writeups/WriteupForm';
import { ArrowLeft, Save } from 'lucide-react';
import { emptyWriteup } from '@/types/writeup';

export default function WriteupCreate() {
    const { data, setData, post, processing, errors } = useForm({
        title: '',
        kind: 'writeup',
        writeup: emptyWriteup(),
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('notes.store'));
    };

    return (
        <AuthenticatedLayout header="Buat Writeup">
            <Head title="Buat Writeup" />

            <div className="max-w-4xl">
                <div className="flex justify-between items-center mb-6">
                    <Link href="/notes?kind=writeup" className="inline-flex items-center text-sm text-zinc-400 hover:text-zinc-200">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Batal
                    </Link>
                    <Button onClick={submit} disabled={processing}>
                        <Save className="w-4 h-4 mr-2" /> Simpan Writeup
                    </Button>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-zinc-300 mb-1.5">Judul Writeup</label>
                        <Input id="title" value={data.title} onChange={(e) => setData('title', e.target.value)} required autoFocus />
                        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                    </div>

                    {(errors as any).writeup && <p className="text-red-500 text-xs">{(errors as any).writeup}</p>}

                    <WriteupForm value={data.writeup} onChange={(w) => setData('writeup', w)} />

                    <div className="flex justify-end pt-4 border-t border-edge">
                        <Button type="submit" disabled={processing}>
                            <Save className="w-4 h-4 mr-2" /> Simpan Writeup
                        </Button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
