import { FormEventHandler } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import PageHeader from '@/Components/UI/PageHeader';
import { Plus, Trash2, Save } from 'lucide-react';
import { cn } from '@/Utils/cn';

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

            <PageHeader
                title="Edit Tool"
                description="Perbarui kumpulan perintah dan workflow."
                actions={
                    <Link href={route('tools.index')}>
                        <Button variant="ghost" size="sm">Batal</Button>
                    </Link>
                }
            />

            <form onSubmit={submit} className="max-w-3xl space-y-6">
                <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                        <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-body">
                            Nama Tool
                        </label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                        />
                        {errors.name && <p className="mt-1.5 text-xs text-danger">{errors.name}</p>}
                    </div>
                    <div>
                        <label htmlFor="workflow" className="mb-1.5 block text-sm font-medium text-body">
                            Workflow
                        </label>
                        <Input
                            id="workflow"
                            value={data.workflow}
                            onChange={(e) => setData('workflow', e.target.value)}
                            required
                        />
                        {errors.workflow && <p className="mt-1.5 text-xs text-danger">{errors.workflow}</p>}
                    </div>
                </div>

                <div>
                    <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-body">
                        Catatan <span className="font-normal text-faint">(opsional)</span>
                    </label>
                    <Input
                        id="notes"
                        value={data.notes}
                        onChange={(e) => setData('notes', e.target.value)}
                    />
                </div>

                <div>
                    <div className="mb-3 flex items-center justify-between">
                        <label className="text-sm font-medium text-body">Daftar Perintah</label>
                        <Button type="button" variant="secondary" size="sm" onClick={addCommand}>
                            <Plus className="h-4 w-4" /> Tambah Baris
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {data.commands.map((cmd: any, idx: number) => (
                            <div
                                key={idx}
                                className={cn(
                                    'flex items-start gap-3 rounded-md border border-edge bg-surface p-4',
                                    idx > 0 && 'border-dashed bg-transparent'
                                )}
                            >
                                <div className="flex-1 space-y-3">
                                    <Input
                                        placeholder="Deskripsi (Contoh: Fast Scan)"
                                        value={cmd.desc}
                                        onChange={(e) => updateCommand(idx, 'desc', e.target.value)}
                                        required
                                    />
                                    <Input
                                        placeholder="Perintah (Contoh: nmap -F target)"
                                        value={cmd.code}
                                        onChange={(e) => updateCommand(idx, 'code', e.target.value)}
                                        className="font-mono text-[13px]"
                                        required
                                    />
                                </div>
                                {data.commands.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="danger"
                                        size="sm"
                                        onClick={() => removeCommand(idx)}
                                        className="mt-0.5"
                                        aria-label={`Hapus perintah ${idx + 1}`}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-edge pt-5">
                    <Link href={route('tools.index')}>
                        <Button type="button" variant="ghost">Batal</Button>
                    </Link>
                    <Button type="submit" disabled={processing}>
                        <Save className="h-4 w-4" />
                        {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </Button>
                </div>
            </form>
        </AuthenticatedLayout>
    );
}