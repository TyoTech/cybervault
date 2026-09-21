import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Card } from '@/Components/UI/Card';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import Badge from '@/Components/UI/Badge';
import PageHeader from '@/Components/UI/PageHeader';
import CodeBlock from '@/Components/UI/CodeBlock';
import EmptyState from '@/Components/UI/EmptyState';
import { Search, Plus, Terminal, Edit, Trash2, Network, X } from 'lucide-react';
import { cn } from '@/Utils/cn';

const CATEGORIES = ['All', 'SQLi', 'XSS', 'LFI', 'RCE', 'Reverse Shell', 'PrivEsc'];

export default function PayloadIndex({ payloads }: { payloads: any[] }) {
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [lhost, setLhost] = useState('');
    const [lport, setLport] = useState('');
    const [showConfig, setShowConfig] = useState(false);

    const filteredPayloads = payloads.filter(
        (payload: any) =>
            (activeCategory === 'All' || payload.category === activeCategory) &&
            (payload.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                payload.content.toLowerCase().includes(searchQuery.toLowerCase()))
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
        <AuthenticatedLayout header="Payloads">
            <Head title="Payloads" />

            <PageHeader
                title="Payloads"
                description="Referensi payload yang bisa dipakai ulang."
                actions={
                    <>
                        <div className="relative">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setShowConfig(!showConfig)}
                                title="Konfigurasi LHOST/LPORT"
                                aria-label="Konfigurasi LHOST/LPORT"
                                aria-expanded={showConfig}
                            >
                                <Network className="h-4 w-4" /> Config
                            </Button>

                            {showConfig && (
                                <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-edge bg-elevated p-4 shadow-xl">
                                    <div className="mb-3 flex items-center justify-between">
                                        <span className="text-sm font-medium text-strong">Global Config</span>
                                        <button
                                            onClick={() => setShowConfig(false)}
                                            aria-label="Tutup konfigurasi"
                                            className="rounded p-0.5 text-faint transition-colors hover:text-body"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <label htmlFor="payload-lhost" className="mb-1 block text-xs text-faint">
                                                LHOST
                                            </label>
                                            <Input
                                                id="payload-lhost"
                                                placeholder="10.10.x.x"
                                                value={lhost}
                                                onChange={(e) => setLhost(e.target.value)}
                                                className="h-8 text-[13px]"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="payload-lport" className="mb-1 block text-xs text-faint">
                                                LPORT
                                            </label>
                                            <Input
                                                id="payload-lport"
                                                placeholder="4444"
                                                value={lport}
                                                onChange={(e) => setLport(e.target.value)}
                                                className="h-8 text-[13px]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <Link href={route('payloads.create')}>
                            <Button size="sm">
                                <Plus className="h-4 w-4" /> Payload Baru
                            </Button>
                        </Link>
                    </>
                }
            />

            {/* Pencarian + filter kategori */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative w-full lg:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden="true" />
                    <Input
                        placeholder="Cari payload..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Cari payload"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-1">
                    {CATEGORIES.map((category) => (
                        <button
                            key={category}
                            onClick={() => setActiveCategory(category)}
                            aria-pressed={activeCategory === category}
                            className={cn(
                                'rounded-md border px-2.5 py-1 text-[13px] transition-colors',
                                activeCategory === category
                                    ? 'border-edge-strong bg-elevated font-medium text-strong'
                                    : 'border-transparent text-faint hover:bg-elevated/60 hover:text-body'
                            )}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </div>

            {filteredPayloads.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={<Terminal className="h-4 w-4" />}
                        title="Tidak ada payload"
                        description={
                            searchQuery || activeCategory !== 'All'
                                ? 'Tidak ada payload yang cocok dengan filter saat ini.'
                                : 'Belum ada payload yang ditambahkan di kategori ini.'
                        }
                        action={
                            !searchQuery && activeCategory === 'All' && (
                                <Link href={route('payloads.create')}>
                                    <Button size="sm">
                                        <Plus className="h-4 w-4" /> Payload Baru
                                    </Button>
                                </Link>
                            )
                        }
                    />
                </Card>
            ) : (
                <div className="space-y-4">
                    {filteredPayloads.map((payload: any) => (
                        <Card key={payload.id} className="p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-[15px] font-medium text-strong">{payload.title}</h2>
                                        <Badge variant="outline">{payload.category}</Badge>
                                    </div>
                                    {payload.description && (
                                        <p className="mt-1 text-[13px] text-faint">{payload.description}</p>
                                    )}
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                    <Link
                                        href={route('payloads.edit', payload.id)}
                                        aria-label={`Edit ${payload.title}`}
                                        className="rounded-md p-1.5 text-faint transition-colors hover:bg-elevated hover:text-strong"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(payload.id)}
                                        aria-label={`Hapus ${payload.title}`}
                                        className="rounded-md p-1.5 text-faint transition-colors hover:bg-elevated hover:text-danger"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <CodeBlock className="mt-3.5" copyValue={parsePayload(payload.content)}>
                                {parsePayload(payload.content)}
                            </CodeBlock>
                        </Card>
                    ))}
                </div>
            )}
        </AuthenticatedLayout>
    );
}