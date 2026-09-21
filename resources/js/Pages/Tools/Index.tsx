import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/UI/Card';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import Badge from '@/Components/UI/Badge';
import PageHeader from '@/Components/UI/PageHeader';
import EmptyState from '@/Components/UI/EmptyState';
import CopyButton from '@/Components/UI/CopyButton';
import Pagination from '@/Components/UI/Pagination';
import { Search, Plus, Wrench, ChevronRight, Edit, Trash2, Inbox } from 'lucide-react';
import { useForm } from '@inertiajs/react';

export default function ToolIndex({ tools }: { tools: any }) {
    const [searchQuery, setSearchQuery] = useState('');
    const toolsData = tools.data || [];

    const filteredTools = toolsData.filter(
        (tool: any) =>
            tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tool.workflow.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const { delete: destroy } = useForm();
    const handleDelete = (id: string) => {
        if (confirm('Hapus tool ini?')) destroy(route('tools.destroy', id));
    };

    return (
        <AuthenticatedLayout header="Tools">
            <Head title="Tools" />

            <PageHeader
                title="Tools"
                description="Perintah dan workflow yang sering dipakai."
                actions={
                    <Link href={route('tools.create')}>
                        <Button size="sm">
                            <Plus className="h-4 w-4" /> Tool Baru
                        </Button>
                    </Link>
                }
            />

            <div className="max-w-sm">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden="true" />
                    <Input
                        placeholder="Cari tool atau workflow..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Cari tool"
                    />
                </div>
            </div>

            {filteredTools.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={<Inbox className="h-4 w-4" />}
                        title={searchQuery ? 'Tidak ada hasil' : 'Belum ada tool'}
                        description={
                            searchQuery
                                ? `Tidak ada tool yang cocok dengan "${searchQuery}".`
                                : 'Tambahkan command yang sering Anda pakai di sini.'
                        }
                        action={
                            !searchQuery && (
                                <Link href={route('tools.create')}>
                                    <Button size="sm">
                                        <Plus className="h-4 w-4" /> Tool Baru
                                    </Button>
                                </Link>
                            )
                        }
                    />
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {filteredTools.map((tool: any) => (
                        <Card key={tool.id} className="flex flex-col">
                            <CardHeader className="flex-row items-start justify-between gap-2 border-b border-edge pb-3.5">
                                <CardTitle className="flex items-center gap-2">
                                    <Wrench className="h-4 w-4 text-faint" aria-hidden="true" />
                                    <span className="truncate">{tool.name}</span>
                                </CardTitle>
                                <div className="flex shrink-0 items-center gap-1">
                                    <Badge variant="outline">{tool.workflow}</Badge>
                                    <Link
                                        href={route('tools.edit', tool.id)}
                                        aria-label={`Edit ${tool.name}`}
                                        className="rounded-md p-1.5 text-faint transition-colors hover:bg-elevated hover:text-strong"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(tool.id)}
                                        aria-label={`Hapus ${tool.name}`}
                                        className="rounded-md p-1.5 text-faint transition-colors hover:bg-elevated hover:text-danger"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </CardHeader>

                            <CardContent className="flex flex-1 flex-col gap-3.5 pt-4">
                                {tool.commands.map((cmd: any, idx: number) => (
                                    <div key={idx} className="space-y-1.5">
                                        <p className="flex items-center gap-1.5 text-[13px] font-medium text-muted">
                                            <ChevronRight className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                                            {cmd.desc}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <pre className="flex-1 overflow-x-auto whitespace-nowrap rounded-md border border-edge bg-code-bg px-3 py-2 font-mono text-xs text-code-text">
                                                {cmd.code}
                                            </pre>
                                            <CopyButton value={cmd.code} className="shrink-0" />
                                        </div>
                                    </div>
                                ))}

                                {tool.notes && (
                                    <div className="mt-auto rounded-md border border-edge bg-elevated/60 px-3 py-2.5 text-xs text-faint">
                                        <span className="mb-0.5 block font-medium text-muted">Catatan</span>
                                        {tool.notes}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                    {tools.links && <Pagination links={tools.links} />}
                </div>
            )}
        </AuthenticatedLayout>
    );
}