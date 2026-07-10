import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Card, CardContent } from '@/Components/UI/Card';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import CopyButton from '@/Components/UI/CopyButton';
import Badge from '@/Components/UI/Badge';
import EmptyState from '@/Components/UI/EmptyState';
import { Search, Plus, Terminal, Edit, Trash2, Network, X } from 'lucide-react';

const CATEGORIES = ['All', 'SQLi', 'XSS', 'LFI', 'RCE', 'Reverse Shell', 'PrivEsc'];

export default function PayloadIndex({ payloads }: { payloads: any[] }) {
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [lhost, setLhost] = useState('');
    const [lport, setLport] = useState('');
    const [showConfig, setShowConfig] = useState(false);

    const filteredPayloads = payloads.filter((payload: any) =>
        (activeCategory === 'All' || payload.category === activeCategory) &&
        (payload.title.toLowerCase().includes(searchQuery.toLowerCase()) || payload.content.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const { delete: destroy } = useForm();
    const handleDelete = (id: string) => {
        if (confirm('Hapus payload ini?')) destroy(route('payloads.destroy', id));
    };

    const parsePayload = (content: string) => {
        let parsed = content;
        if (lhost) parsed = parsed.replace(/\[LHOST\]/g, lhost);
        if (lport) parsed = parsed.replace(/\[LPORT\]/g, lport);
        return parsed;
    };

    return (
        <AuthenticatedLayout header="Payloads Vault">
            <Head title="Payloads" />

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input placeholder="Cari payload..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Button variant="secondary" onClick={() => setShowConfig(!showConfig)} title="Konfigurasi LHOST/LPORT">
                            <Network className="w-4 h-4" />
                        </Button>

                        {showConfig && (
                            <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-4 z-50">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-medium text-zinc-300">Global Config</span>
                                    <button onClick={() => setShowConfig(false)} className="text-zinc-500 hover:text-zinc-300">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-zinc-500 mb-1 block">LHOST</label>
                                        <Input placeholder="10.10.x.x" value={lhost} onChange={(e) => setLhost(e.target.value)} className="h-8 text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-zinc-500 mb-1 block">LPORT</label>
                                        <Input placeholder="4444" value={lport} onChange={(e) => setLport(e.target.value)} className="h-8 text-sm" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <Link href={route('payloads.create')}>
                        <Button><Plus className="w-4 h-4 mr-2" /> Tambah Payload</Button>
                    </Link>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                <div className="w-full lg:w-48 shrink-0">
                    <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">Kategori</h3>
                    <div className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
                        {CATEGORIES.map(category => (
                            <button
                                key={category}
                                onClick={() => setActiveCategory(category)}
                                className={`text-left px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${
                                    activeCategory === category ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                                }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1">
                    {filteredPayloads.length === 0 ? (
                        <EmptyState icon={<Terminal className="w-8 h-8" />} title="Tidak ada payload" description="Belum ada payload yang ditambahkan di kategori ini." />
                    ) : (
                        filteredPayloads.map((payload: any) => (
                            <Card key={payload.id} className="mb-4">
                                <CardContent className="p-5">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-semibold text-lg text-zinc-100">{payload.title}</h3>
                                                <Badge variant="outline">{payload.category}</Badge>
                                            </div>
                                            {payload.description && <p className="text-sm text-zinc-400 mt-1">{payload.description}</p>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Link href={route('payloads.edit', payload.id)} className="text-zinc-500 hover:text-blue-400 transition-colors">
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
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
