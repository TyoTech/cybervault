import { FormEventHandler } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import Button from '@/Components/UI/Button';
import PageHeader from '@/Components/UI/PageHeader';
import FolderFields from '@/Components/Challenges/FolderFields';
import AttachmentField from '@/Components/Challenges/AttachmentField';
import WriteupEditor from '@/Components/Writeup/WriteupEditor';
import AiAssistPanel from '@/Components/Writeup/AiAssistPanel';
import { WriteupData, writeupFromRaw } from '@/Components/Writeup/types';
import { Save, FolderOpen } from 'lucide-react';

const AI_MARKER = 'AI suggestion / requires verification';

export default function ChallengeEdit({ challenge }: { challenge: any }) {
    const { data, setData, post, processing, errors } = useForm({
        _method: 'put',
        lab: challenge.lab || '',
        kategori: challenge.kategori || '',
        judul: challenge.judul || '',
        writeup: writeupFromRaw(challenge.writeup_data) as WriteupData,
        files: [] as File[],
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('challenges.update', challenge.id));
    };

    const hapusFileServer = (filename: string) => {
        if (confirm(`Hapus file ${filename}?`)) {
            router.delete(route('challenges.deleteFile', challenge.id), {
                data: { filename },
            });
        }
    };

    const setField = (key: 'lab' | 'kategori' | 'judul', value: string) => {
        setData(key, value);
    };

    return (
        <AuthenticatedLayout header="Edit Writeup">
            <Head title={`Edit ${challenge.judul}`} />

            <PageHeader
                title="Edit Writeup"
                description="Perbarui workspace dan struktur writeup challenge."
                actions={
                    <>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => router.post(route('challenges.openFolder', challenge.id))}
                        >
                            <FolderOpen className="h-4 w-4" /> Buka Folder
                        </Button>
                        <Link href={route('challenges.show', challenge.id)}>
                            <Button variant="ghost" size="sm">Batal</Button>
                        </Link>
                    </>
                }
            />

            {errors.writeup && (
                <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                    {typeof errors.writeup === 'string' ? errors.writeup : 'Data writeup tidak valid.'}
                </div>
            )}

            <form onSubmit={submit} className="space-y-6" encType="multipart/form-data">
                <div className="rounded-lg border border-edge bg-surface p-5">
                    <FolderFields values={data} onChange={setField} original={challenge} />
                </div>

                {/* Panel AI — saran saja, Accept hanya mengisi notes (client state). */}
                <AiAssistPanel
                    challengeId={challenge.id}
                    onAccept={(suggestion) => {
                        const existing = data.writeup.notes.trim();
                        const marker = `## ${AI_MARKER}`;
                        const incoming =
                            existing !== ''
                                ? `${existing}\n\n${marker}\n\n${suggestion.markdown}`
                                : `${marker}\n\n${suggestion.markdown}`;
                        setData('writeup', { ...data.writeup, notes: incoming });
                    }}
                />

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
                    serverFiles={challenge.lampiran}
                    onDeleteServerFile={hapusFileServer}
                />

                <div className="flex items-center justify-end gap-2 border-t border-edge pt-5">
                    <Link href={route('challenges.show', challenge.id)}>
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