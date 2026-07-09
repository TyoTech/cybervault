import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Card } from '@/Components/UI/Card';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import Badge from '@/Components/UI/Badge';
import EmptyState from '@/Components/UI/EmptyState';
import { Search, Plus, ShieldAlert, Folder } from 'lucide-react';
import Pagination from '@/Components/UI/Pagination';

export default function ChallengeIndex({ challenges }: { challenges: any }) {
    const [searchQuery, setSearchQuery] = useState('');

    // Mendukung data dengan atau tanpa paginasi
    const challengesData = challenges.data || challenges || [];

    const filteredChallenges = challengesData.filter((c: any) =>
        c.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.kategori.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AuthenticatedLayout header="Challenge Tracker">
            <Head title="Challenges" />

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                        placeholder="Cari judul challenge..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e: any) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Link href={route('challenges.create')}>
                    <Button><Plus className="w-4 h-4 mr-2" /> Add Challenge</Button>
                </Link>
            </div>

            <Card className="overflow-hidden border-white/5 bg-zinc-950">
                {filteredChallenges.length === 0 ? (
                    <EmptyState
                        icon={<ShieldAlert className="w-8 h-8 text-zinc-500" />}
                        title="Tracker Kosong"
                        description="Belum ada challenge yang Anda simpan."
                    />
                ) : (
                    <div className="divide-y divide-white/5">
                        {filteredChallenges.map((challenge: any) => (
                            <div key={challenge.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <Folder className="w-5 h-5 text-blue-500" />
                                    <div>
                                        <Link href={route('challenges.show', challenge.id)}>
                                            <h4 className="text-zinc-100 font-medium group-hover:text-blue-400 transition-colors">
                                                {challenge.judul}
                                            </h4>
                                        </Link>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500 font-mono">
                                            <span>{challenge.path_folder}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline">{challenge.kategori}</Badge>
                                    <Badge variant="outline" className="border-blue-500/30 text-blue-400">{challenge.lab}</Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Tampilkan paginasi jika ada links dari controller */}
            {challenges.links && <Pagination links={challenges.links} />}
        </AuthenticatedLayout>
    );
}
