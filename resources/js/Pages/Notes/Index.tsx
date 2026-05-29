import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent } from '@/Components/UI/Card';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import EmptyState from '@/Components/UI/EmptyState';
import { Search, Plus, Tag, Clock, BookX } from 'lucide-react';

export default function NotesIndex({ notes = [] }: { notes: any[] }) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredNotes = notes.filter(note =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AuthenticatedLayout header="Notes Vault">
            <Head title="Notes" />

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                        placeholder="Cari catatan..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Link href={route('notes.create')}>
                    <Button><Plus className="w-4 h-4 mr-2" /> Note Baru</Button>
                </Link>
            </div>

            {filteredNotes.length === 0 ? (
                <EmptyState
                    icon={<BookX className="w-8 h-8" />}
                    title="Belum ada catatan"
                    description="Vault catatan Anda masih kosong."
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredNotes.map(note => (
                        <Card key={note.id} className="hover:border-blue-500/50 transition-colors">
                            <CardContent className="p-5">
                                <Link href={route('notes.show', note.id)}>
                                    <h3 className="font-semibold text-lg text-zinc-100 hover:text-blue-400">{note.title}</h3>
                                </Link>
                                <p className="text-sm text-zinc-400 mt-2 line-clamp-3">{note.content}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </AuthenticatedLayout>
    );
}
