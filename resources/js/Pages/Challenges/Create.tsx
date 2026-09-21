import { FormEventHandler } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import Button from '@/Components/UI/Button';
import PageHeader from '@/Components/UI/PageHeader';
import FolderFields from '@/Components/Challenges/FolderFields';
import AttachmentField from '@/Components/Challenges/AttachmentField';
import WriteupEditor from '@/Components/Writeup/WriteupEditor';
import { emptyWriteup, WriteupData } from '@/Components/Writeup/types';
import { Save } from 'lucide-react';

export default function ChallengeCreate() {
    const { data, setData, post, processing, errors } = useForm({
        lab: '',
        kategori: '',
        judul: '',
        writeup: emptyWriteup() as WriteupData,
        files: [] as File[],
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('challenges.store'));
    };

    const setField = (key: 'lab' | 'kategori' | 'judul', value: string) => {
        setData(key, value);
    };

    return (
        <AuthenticatedLayout header="Writeup Baru">
            <Head title="Tambah Writeup" />

            <PageHeader
                title="Writeup Baru"
                description="Buat workspace terstruktur untuk menganalisis challenge."
                actions={
                    <Link href={route('challenges.index')}>
                        <Button variant="ghost" size="sm">Batal</Button>
                    </Link>
                }
            />

            {/* Path target folder */}
            <div className="rounded-md border border-edge bg-surface px-4 py-3">
                <p className="text-[13px] text-faint">
                    Writeup akan disimpan sebagai workspace folder di:
                </p>
                <p className="mt-1 font-mono text-[13px] text-accent">
                    ~/Cyber/lab/{data.lab || 'Lab'}/{data.kategori || 'Kategori'}/{data.judul || 'Judul'}
                </p>
            </div>

            {errors.writeup && (
                <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                    {typeof errors.writeup === 'string' ? errors.writeup : 'Data writeup tidak valid.'}
                </div>
            )}

            <form onSubmit={submit} className="space-y-6" encType="multipart/form-data">
                <div className="rounded-lg border border-edge bg-surface p-5">
                    <FolderFields values={data} onChange={setField} />
                </div>

                <div>
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-sm font-medium text-strong">Workspace Writeup</h2>
                        <p className="text-xs text-faint">
                            Source-of-truth: <code className="text-muted">writeup.json</code> di folder challenge
                        </p>
                    </div>
                    <WriteupEditor
                        value={data.writeup}
                        onChange={(next) => setData('writeup', next)}
                    />
                </div>

                <AttachmentField
                    files={data.files}
                    onAdd={(files) => setData('files', [...data.files, ...files])}
                    onRemove={(index) => setData('files', data.files.filter((_, i) => i !== index))}
                />

                <div className="flex items-center justify-end gap-2 border-t border-edge pt-5">
                    <Link href={route('challenges.index')}>
                        <Button type="button" variant="ghost">Batal</Button>
                    </Link>
                    <Button type="submit" disabled={processing}>
                        <Save className="h-4 w-4" />
                        {processing ? 'Menyimpan…' : 'Simpan Writeup'}
                    </Button>
                </div>
            </form>
        </AuthenticatedLayout>
    );
}