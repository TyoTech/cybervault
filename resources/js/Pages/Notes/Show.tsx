import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import Button from '@/Components/UI/Button';
import { Card } from '@/Components/UI/Card';
import { ArrowLeft, Trash2, Edit, FolderOpen } from 'lucide-react';
import { sanitizeNoteHtml } from '@/Utils/sanitizeHtml';
import 'react-quill/dist/quill.snow.css';

export default function NoteShow({ note }: { note: any }) {
    const { delete: destroy, processing } = useForm();

    // Sanitasi HTML (allow-list DOMPurify) SEBELUM masuk ke dangerouslySetInnerHTML.
    const safeContent = useMemo(() => sanitizeNoteHtml(note.content || ''), [note.content]);

    const handleDelete = () => {
        if (confirm('Hapus catatan beserta file DOCX di dalamnya?')) {
            destroy(route('notes.destroy', note.id));
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return null;
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(dateString));
    };

    return (
        <AuthenticatedLayout header="Detail Catatan">
            <Head title={note.title} />

            <div className="max-w-4xl">
                <Link
                    href={route('notes.index')}
                    className="inline-flex items-center gap-1.5 text-[13px] text-faint transition-colors hover:text-body"
                >
                    <ArrowLeft className="h-4 w-4" /> Kembali
                </Link>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold tracking-tight text-strong">{note.title}</h1>
                        {formatDate(note.updated_at) && (
                            <p className="mt-1 text-[13px] text-faint">Diperbarui {formatDate(note.updated_at)}</p>
                        )}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => router.post(route('notes.openFolder', note.id))}
                        >
                            <FolderOpen className="h-4 w-4" /> Buka Folder
                        </Button>
                        <Link href={route('notes.edit', note.id)}>
                            <Button variant="secondary" size="sm">
                                <Edit className="h-4 w-4" /> Edit
                            </Button>
                        </Link>
                        <Button variant="danger" size="sm" onClick={handleDelete} disabled={processing}>
                            <Trash2 className="h-4 w-4" /> Hapus
                        </Button>
                    </div>
                </div>

                <Card className="mt-6 overflow-hidden p-6">
                    <div className="ql-editor" dangerouslySetInnerHTML={{ __html: safeContent }} />
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}