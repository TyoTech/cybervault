import { FormEventHandler } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import { Plus, Trash2 } from 'lucide-react';

export default function ToolCreate() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        workflow: '',
        notes: '',
        commands: [{ desc: '', code: '' }],
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
        post(route('tools.store'));
    };

    return (
        <AuthenticatedLayout header="Tambah Tool">
            <Head title="Tambah Tool" />

            <form onSubmit={submit} className="space-y-6 max-w-3xl">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Nama Tool</label>
                        <Input
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                        />
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Kategori/Workflow</label>
                        <Input
                            value={data.workflow}
                            onChange={(e) => setData('workflow', e.target.value)}
                            required
                        />
                        {errors.workflow && <p className="text-red-500 text-xs mt-1">{errors.workflow}</p>}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Catatan/Pro Tip (Opsional)</label>
                    <Input
                        value={data.notes}
                        onChange={(e) => setData('notes', e.target.value)}
                    />
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="block text-sm font-medium text-zinc-300">Daftar Perintah (Commands)</label>
                        <Button type="button" variant="secondary" size="sm" onClick={addCommand}>
                            <Plus className="w-4 h-4 mr-1" /> Tambah Baris
                        </Button>
                    </div>

                    {data.commands.map((cmd, idx) => (
                        <div key={idx} className="flex gap-3 items-start border border-white/5 p-4 rounded-lg bg-zinc-900/30">
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
                    {processing ? 'Menyimpan...' : 'Simpan Tool'}
                </Button>
            </form>
        </AuthenticatedLayout>
    );
}
