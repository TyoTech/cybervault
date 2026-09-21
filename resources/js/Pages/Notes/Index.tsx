import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import { Card } from '@/Components/UI/Card';
import PageHeader from '@/Components/UI/PageHeader';
import EmptyState from '@/Components/UI/EmptyState';
import Pagination from '@/Components/UI/Pagination';
import { Search, Plus, FileText, Inbox } from 'lucide-react';

export default function NotesIndex({ notes }: { notes: any }) {
    const notesData = notes.data || [];
    const [searchQuery, setSearchQuery] = useState('');

    const filteredNotes = notesData.filter((note: any) =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (dateString?: string) => {
        if (!dateString) return null;
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }).format(new Date(dateString));
    };

    const preview = (note: any) =>
        String(note.content || '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

    return (
        <AuthenticatedLayout header="Notes">
            <Head title="Notes" />

            <PageHeader
                title="Notes"
                description="Catatan teknis dan konsep yang terorganisir."
                actions={
                    <Link href={route('notes.create')}>
                        <Button size="sm">
                            <Plus className="h-4 w-4" /> Catatan Baru
                        </Button>
                    </Link>
                }
            />

            <div className="max-w-sm">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden="true" />
                    <Input
                        placeholder="Cari catatan..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Cari catatan"
                    />
                </div>
            </div>

            {filteredNotes.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={<Inbox className="h-4 w-4" />}
                        title={searchQuery ? 'Tidak ada hasil' : 'Belum ada catatan'}
                        description={
                            searchQuery
                                ? `Tidak ada catatan yang cocok dengan "${searchQuery}".`
                                : 'Mulai dokumentasikan hal yang Anda pelajari.'
                        }
                        action={
                            !searchQuery && (
                                <Link href={route('notes.create')}>
                                    <Button size="sm">
                                        <Plus className="h-4 w-4" /> Buat Catatan
                                    </Button>
                                </Link>
                            )
                        }
                    />
                </Card>
            ) : (
                <Card className="overflow-hidden">
                    <ul className="divide-y divide-edge">
                        {filteredNotes.map((note: any) => (
                            <li key={note.id}>
                                <Link
                                    href={route('notes.show', note.id)}
                                    className="group flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-elevated/60"
                                >
                                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                                    <div className="min-w-0 flex-1">
                                        <h3 className="truncate text-sm font-medium text-strong group-hover:text-accent">
                                            {note.title}
                                        </h3>
                                        {preview(note) && (
                                            <p className="mt-0.5 line-clamp-1 text-[13px] text-faint">{preview(note)}</p>
                                        )}
                                    </div>
                                    {note.updated_at && (
                                        <span className="mt-0.5 shrink-0 text-xs text-faint">
                                            Diperbarui {formatDate(note.updated_at)}
                                        </span>
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            <Pagination links={notes.links} />
        </AuthenticatedLayout>
    );
}