import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import Badge from '@/Components/UI/Badge';
import { Card } from '@/Components/UI/Card';
import PageHeader from '@/Components/UI/PageHeader';
import EmptyState from '@/Components/UI/EmptyState';
import Pagination from '@/Components/UI/Pagination';
import { cn } from '@/Utils/cn';
import { Search, Plus, FileText, NotebookPen, Inbox } from 'lucide-react';

const TABS = [
    { key: null, label: 'Semua' },
    { key: 'note', label: 'Notes' },
    { key: 'writeup', label: 'Writeups' },
] as const;

export default function NotesIndex({ notes, kind }: { notes: any; kind: string | null }) {
    const notesData = notes.data || [];
    const [searchQuery, setSearchQuery] = useState('');

    const filteredNotes = notesData.filter((note: any) =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isWriteupTab = kind === 'writeup';
    const createHref = isWriteupTab ? route('notes.create', { kind: 'writeup' }) : route('notes.create');

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
        <AuthenticatedLayout header={isWriteupTab ? 'Writeups' : 'Notes'}>
            <Head title={isWriteupTab ? 'Writeups' : 'Notes'} />

            <PageHeader
                title={isWriteupTab ? 'Writeups' : 'Notes'}
                description={isWriteupTab
                    ? 'Dokumentasi analisis keamanan terstruktur (CTF, lab, pentest).'
                    : 'Catatan teknis dan konsep yang terorganisir.'}
                actions={
                    <Link href={createHref}>
                        <Button size="sm">
                            <Plus className="h-4 w-4" /> {isWriteupTab ? 'Writeup Baru' : 'Catatan Baru'}
                        </Button>
                    </Link>
                }
            />

            {/* Tab filter Notes vs Writeups */}
            <div className="flex w-fit rounded-md border border-edge overflow-hidden" role="tablist" aria-label="Filter jenis">
                {TABS.map((tab) => (
                    <Link
                        key={tab.label}
                        href={tab.key ? `/notes?kind=${tab.key}` : route('notes.index')}
                        role="tab"
                        aria-selected={kind === tab.key}
                        className={cn(
                            'px-4 py-1.5 text-sm transition-colors',
                            kind === tab.key
                                ? 'bg-elevated font-medium text-strong'
                                : 'text-faint hover:text-strong hover:bg-elevated/60'
                        )}
                    >
                        {tab.label}
                    </Link>
                ))}
            </div>

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
                                    {note.kind === 'writeup' && (
                                        <Badge variant="purple" className="mt-0.5 shrink-0">
                                            <NotebookPen className="h-3 w-3" /> Writeup
                                        </Badge>
                                    )}
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