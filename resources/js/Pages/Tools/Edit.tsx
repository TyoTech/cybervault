import { FormEventHandler } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';

export default function ToolEdit({ tool }: { tool: any }) {
    const { data, setData, put, processing, errors } = useForm({
        name: tool.name,
        workflow: tool.workflow,
        notes: tool.notes || '',
        commands: tool.commands || [{ desc: '', code: '' }],
    });

    const addCommand = () => {
        setData('commands', [...data.commands, { desc: '', code: '' }]);
    };

    const removeCommand = (index: number) => {
        const newCommands = [...data.commands];
        newCommands.splice(index, 1);
        setData('commands', newCommands);
    };

    const updateCommand = (index: number, field: 'desc' | 'code', value: string) => {
        const newCommands = [...data.commands];
        newCommands[index][field] = value;
        setData('commands', newCommands);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('tools.update', tool.id));
    };

    return (
        <AuthenticatedLayout header="Edit Tool">
            <Head title={`Edit ${tool.name}`} />

            <Link href={route('tools.index')} className="inline-flex items-center text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" /> Batal Edit
            </Link>

            <form onSubmit={submit} className="space-y-6 max-w-3xl">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Nama Tool (Contoh: Nmap)</label>
                        <Input value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Workflow (Contoh: Reconnaissance)</label>
                        <Input value={data.workflow} onChange={(e) => setData('workflow', e.target.value)} required />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Catatan Tambahan (Opsional)</label>
                    <Input value={data.notes} onChange={(e) => setData('notes', e.target.value)} />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-zinc-300">Daftar Perintah</label>
                        <Button type="button" variant="secondary" size="sm" onClick={addCommand}>
                            <Plus className="w-4 h-4 mr-1" /> Tambah Baris
                        </Button>
                    </div>

                    {data.commands.map((cmd: any, idx: number) => (
                        <div key={idx} className="flex gap-3 mb-4 items-start p-4 border border-white/5 rounded-lg bg-zinc-900/30">
                            <div className="flex-1 space-y-3">
                                <Input
                                    placeholder="Deskripsi (Contoh: Fast Scan)"
                                    value={cmd.desc}
                                    onChange={(e) => updateCommand(idx, 'desc', e.target.value)}
                                    required
                                />
                                <Input
                                    placeholder="Perintah (Contoh: nmap -F <target>)"
                                    value={cmd.code}
                                    onChange={(e) => updateCommand(idx, 'code', e.target.value)}
                                    className="font-mono text-sm"
                                    required
                                />
                            </div>
                            {data.commands.length > 1 && (
                                <Button type="button" variant="danger" size="sm" onClick={() => removeCommand(idx)} className="mt-1">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>

                <Button type="submit" disabled={processing}>
                    <Save className="w-4 h-4 mr-2" /> {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
            </form>
        </AuthenticatedLayout>
    );
}
