import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent } from '@/Components/UI/Card';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import CopyButton from '@/Components/UI/CopyButton';
import Badge from '@/Components/UI/Badge';
import EmptyState from '@/Components/UI/EmptyState';
import { Search, Plus, Terminal, Edit, Trash2, Network } from 'lucide-react';
import { useForm } from '@inertiajs/react';
import Pagination from '@/Components/UI/Pagination';

const CATEGORIES = ['All', 'SQLi', 'XSS', 'LFI', 'RCE', 'Reverse Shell', 'PrivEsc'];

export default function PayloadIndex({ payloads }: { payloads: any }) {
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [lhost, setLhost] = useState('');
    const [lport, setLport] = useState('');
    const payloadsData = payloads.data || [];

    const filteredPayloads = payloadsData.filter((payload: any) =>
        (activeCategory === 'All' || payload.category === activeCategory) &&
        (payload.title.toLowerCase().includes(searchQuery.toLowerCase()) || payload.content.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const { delete: destroy } = useForm();
    const handleDelete = (id: string) => {
        if (confirm('Hapus payload ini?')) destroy(route('payloads.destroy', id));
    };

    const parsePayload = (text: string) => {
        let parsed = text;
        if (lhost) parsed = parsed.replace(/\[LHOST\]|\[IP\]/gi, lhost);
        if (lport) parsed = parsed.replace(/\[LPORT\]|\[PORT\]/gi, lport);
        return parsed;
    };

    return (
        <AuthenticatedLayout header="Payload Vault">
            <Head title="Payloads" />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input placeholder="Cari payload..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-md border border-white/5">
                        <Network className="w-4 h-4 text-zinc-500 ml-2" />
                        <Input placeholder="LHOST (IP)" value={lhost} onChange={(e) => setLhost(e.target.value)} className="w-32 h-8 text-xs border-none bg-zinc-950" />
                        <Input placeholder="LPORT" value={lport} onChange={(e) => setLport(e.target.value)} className="w-20 h-8 text-xs border-none bg-zinc-950" />
                    </div>
                </div>
                <Link href={route('payloads.create')} className="shrink-0">
                    <Button><Plus className="w-4 h-4 mr-2" /> Tambah Payload</Button>
                </Link>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                <aside className="w-full lg:w-48 shrink-0 flex gap-2 lg:flex-col overflow-x-auto pb-2 lg:pb-0">
                    {CATEGORIES.map(category => (
                        <button
                            key={category}
                            onClick={() => setActiveCategory(category)}
                            className={`whitespace-nowrap text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                activeCategory === category ? 'bg-blue-600/10 text-blue-400 border border-blue-500/10' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
                            }`}
                        >
                            {category}
                        </button>
                    ))}
                </aside>

                <div className="flex-1 w-full space-y-4">
                    {filteredPayloads.length === 0 ? (
                        <EmptyState icon={<Terminal className="w-8 h-8" />} title="Tidak ada payload" description="Belum ada payload yang tersimpan di kategori ini." />
                    ) : (
                        filteredPayloads.map((payload: any) => (
                            <Card key={payload.id} className="group border-white/5">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-semibold text-zinc-100 flex items-center gap-2">
                                                <Terminal className="w-4 h-4 text-purple-500" />
                                                {payload.title}
                                            </h3>
                                            <p className="text-sm text-zinc-400 mt-1">{payload.description}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">{payload.category}</Badge>
                                            <Link href={route('payloads.edit', payload.id)} className="text-zinc-500 hover:text-blue-400 transition-colors ml-2">
                                                <Edit className="w-4 h-4" />
                                            </Link>
                                            <button onClick={() => handleDelete(payload.id)} className="text-zinc-500 hover:text-red-500 transition-colors ml-1">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-4 relative group/code">
                                        <div className="bg-[#0d0d0d] border border-white/10 rounded-lg p-4 font-mono text-sm text-zinc-300 overflow-x-auto whitespace-pre-wrap break-all">
                                            {parsePayload(payload.content)}
                                        </div>
                                        <div className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity">
                                            <CopyButton value={parsePayload(payload.content)} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                    <Pagination links={payloads.links} />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
