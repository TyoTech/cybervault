import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Card } from '@/Components/UI/Card';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import Badge from '@/Components/UI/Badge';
import EmptyState from '@/Components/UI/EmptyState';
import { Search, Plus, ShieldAlert, CheckCircle2, Circle } from 'lucide-react';

export default function ChallengeIndex({ challenges = [] }: { challenges: any[] }) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredChallenges = challenges.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AuthenticatedLayout header="Challenge Tracker">
            <Head title="Challenges" />

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                        placeholder="Cari challenge..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <Link href={route('challenges.create')}>
                    <Button><Plus className="w-4 h-4 mr-2" /> Add Challenge</Button>
                </Link>
            </div>

            <Card className="overflow-hidden border-white/5">
                {filteredChallenges.length === 0 ? (
                    <EmptyState
                        icon={<ShieldAlert className="w-8 h-8" />}
                        title="Tracker Kosong"
                        description="Belum ada challenge yang Anda kerjakan."
                    />
                ) : (
                    <div className="divide-y divide-white/5">
                        {filteredChallenges.map(challenge => (
                            <div key={challenge.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group">
                                <div className="flex items-center gap-4">
                                    {challenge.status === 'Solved' ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    ) : (
                                        <Circle className="w-5 h-5 text-zinc-500" />
                                    )}
                                    <div>
                                        <Link href={route('challenges.show', challenge.id)}>
                                            <h4 className="text-zinc-100 font-medium group-hover:text-blue-400 transition-colors">
                                                {challenge.title}
                                            </h4>
                                        </Link>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                                            <span>{challenge.category}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant={challenge.status === 'Solved' ? 'success' : 'warning'}>{challenge.status}</Badge>
                                    <Badge variant="outline">{challenge.difficulty}</Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </AuthenticatedLayout>
    );
}
