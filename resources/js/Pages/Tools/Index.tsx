import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/UI/Card';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import CopyButton from '@/Components/UI/CopyButton';
import Badge from '@/Components/UI/Badge';
import EmptyState from '@/Components/UI/EmptyState';
import { Search, Plus, Wrench, ChevronRight } from 'lucide-react';
import { useForm } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';

export default function ToolIndex({ tools = [] }: { tools: any[] }) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredTools = tools.filter(tool =>
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.workflow.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const { delete: destroy } = useForm();
    const handleDelete = (id: string) => {
        if (confirm('Hapus tool ini?')) destroy(route('tools.destroy', id));
    };

    return (
        <AuthenticatedLayout header="Tools Manager">
            <Head title="Tools" />

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                        placeholder="Cari tool atau workflow..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Link href={route('tools.create')}>
                    <Button><Plus className="w-4 h-4 mr-2" /> Tambah Tool</Button>
                </Link>
            </div>

            {filteredTools.length === 0 ? (
                <EmptyState
                    icon={<Wrench className="w-8 h-8" />}
                    title="Belum ada Tool"
                    description="Tambahkan command hacking Anda di sini."
                />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredTools.map(tool => (
                        <Card key={tool.id} className="flex flex-col border-white/5">
                            <CardHeader className="pb-3 border-b border-white/5">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <Wrench className="w-5 h-5 text-orange-500" />
                                        {tool.name}
                                    </CardTitle>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">{tool.workflow}</Badge>
                                        <button onClick={() => handleDelete(tool.id)} className="text-zinc-500 hover:text-red-500 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="p-0 flex-1 flex flex-col">
                                <div className="p-4 space-y-4 flex-1">
                                    {tool.commands.map((cmd: any, idx: number) => (
                                        <div key={idx} className="space-y-1.5">
                                            <div className="flex items-center text-xs text-zinc-400 font-medium">
                                                <ChevronRight className="w-3 h-3 text-blue-500 mr-1" />
                                                {cmd.desc}
                                            </div>
                                            <div className="flex items-center gap-2 group/cmd">
                                                <div className="flex-1 bg-[#0d0d0d] border border-white/5 rounded-md px-3 py-2 font-mono text-xs text-zinc-300 overflow-x-auto whitespace-nowrap">
                                                    {cmd.code}
                                                </div>
                                                <CopyButton
                                                    value={cmd.code}
                                                    className="opacity-0 group-hover/cmd:opacity-100 shrink-0"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {tool.notes && (
                                    <div className="p-4 bg-zinc-900/50 border-t border-white/5 text-xs text-zinc-500 rounded-b-xl">
                                        <span className="font-semibold text-zinc-400 block mb-1">Catatan:</span>
                                        {tool.notes}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </AuthenticatedLayout>
    );
}
