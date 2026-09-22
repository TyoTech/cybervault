import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Card } from '@/Components/UI/Card';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import Badge from '@/Components/UI/Badge';
import PageHeader from '@/Components/UI/PageHeader';
import EmptyState from '@/Components/UI/EmptyState';
import Pagination from '@/Components/UI/Pagination';
import { Search, Plus, Folder, ShieldAlert } from 'lucide-react';

export default function ChallengeIndex({ challenges }: { challenges: any }) {
    const [searchQuery, setSearchQuery] = useState('');

    // Mendukung data dengan atau tanpa paginasi
    const challengesData = challenges.data || challenges || [];

    const filteredChallenges = challengesData.filter((c: any) =>
        c.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.kategori.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AuthenticatedLayout header="Challenges">
            <Head title="Challenges" />

            <PageHeader
                title="Challenges"
                description="Workspace writeup untuk challenge dan lab."
                actions={
                    <Link href={route('challenges.create')}>
                        <Button size="sm">
                            <Plus className="h-4 w-4" /> Writeup Baru
                        </Button>
                    </Link>
                }
            />

            <div className="max-w-sm">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden="true" />
                    <Input
                        placeholder="Cari judul writeup..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e: any) => setSearchQuery(e.target.value)}
                        aria-label="Cari writeup"
                    />
                </div>
            </div>

            {filteredChallenges.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={<ShieldAlert className="h-4 w-4" />}
                        title={searchQuery ? 'Tidak ada hasil' : 'Workspace kosong'}
                        description={
                            searchQuery
                                ? `Tidak ada writeup yang cocok dengan "${searchQuery}".`
                                : 'Belum ada writeup. Buat workspace terstruktur untuk menganalisis challenge.'
                        }
                        action={
                            !searchQuery && (
                                <Link href={route('challenges.create')}>
                                    <Button size="sm">
                                        <Plus className="h-4 w-4" /> Writeup Baru
                                    </Button>
                                </Link>
                            )
                        }
                    />
                </Card>
            ) : (
                <Card className="overflow-hidden">
                    <ul className="divide-y divide-edge">
                        {filteredChallenges.map((challenge: any) => (
                            <li
                                key={challenge.id}
                                className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-elevated/60"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <Folder className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                                    <div className="min-w-0">
                                        <Link
                                            href={route('challenges.show', challenge.id)}
                                            className="block truncate text-sm font-medium text-strong transition-colors hover:text-accent"
                                        >
                                            {challenge.judul}
                                        </Link>
                                        <p className="mt-0.5 truncate font-mono text-xs text-faint">
                                            {challenge.path_folder}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    {challenge.question_stats && challenge.question_stats.total > 0 && (
                                        <ProgressBadge
                                            solved={challenge.question_stats.solved}
                                            total={challenge.question_stats.total}
                                            status={challenge.question_stats.status}
                                        />
                                    )}
                                    <Badge variant="outline">{challenge.kategori}</Badge>
                                    <Badge variant="outline">{challenge.lab}</Badge>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            {challenges.links && <Pagination links={challenges.links} />}
        </AuthenticatedLayout>
    );
}

function ProgressBadge({ solved, total, status }: { solved: number; total: number; status: string }) {
    const tone =
        status === 'completed'
            ? 'bg-success/10 text-success ring-success/25'
            : status === 'progress'
              ? 'bg-accent/10 text-accent ring-accent/25'
              : 'bg-faint/10 text-faint ring-faint/25';

    return (
        <span
            className={[
                'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ring-1 ring-inset',
                tone,
            ].join(' ')}
            title={`${solved} dari ${total} question solved`}
        >
            <span aria-hidden="true">{status === 'completed' ? '✓' : ''}</span>
            {solved}/{total}
        </span>
    );
}