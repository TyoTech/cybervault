import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import Badge from '@/Components/UI/Badge';
import Button from '@/Components/UI/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/UI/Card';
import WriteupView from '@/Components/Writeup/WriteupView';
import { writeupFromRaw, WriteupData } from '@/Components/Writeup/types';
import { ArrowLeft, Trash2, Edit, FolderOpen, FileText, FileDown } from 'lucide-react';

const EXPORT_FORMATS = [
    ['json', 'JSON'],
    ['md', 'Markdown'],
    ['txt', 'TXT'],
    ['docx', 'DOCX'],
    ['pdf', 'PDF'],
] as const;

export default function ChallengeShow({ challenge }: { challenge: any }) {
    const { delete: destroy, processing } = useForm();
    const writeup: WriteupData = writeupFromRaw(challenge.writeup_data);

    const handleDelete = () => {
        if (confirm('Hapus challenge ini? Folder di laptop tidak akan terhapus otomatis.')) {
            destroy(route('challenges.destroy', challenge.id));
        }
    };

    return (
        <AuthenticatedLayout header="Detail Writeup">
            <Head title={challenge.judul} />

            <Link
                href={route('challenges.index')}
                className="inline-flex items-center gap-1.5 text-[13px] text-faint transition-colors hover:text-body"
            >
                <ArrowLeft className="h-4 w-4" /> Kembali
            </Link>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-xl font-semibold tracking-tight text-strong">{challenge.judul}</h1>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-muted">
                        <span>{challenge.kategori}</span>
                        <span className="text-muted">·</span>
                        <Badge variant="outline">{challenge.lab}</Badge>
                    </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Link href={route('challenges.edit', challenge.id)}>
                        <Button variant="secondary" size="sm">
                            <Edit className="h-4 w-4" /> Edit
                        </Button>
                    </Link>
                    <Button variant="danger" size="sm" onClick={handleDelete} disabled={processing}>
                        <Trash2 className="h-4 w-4" /> Hapus
                    </Button>
                </div>
            </div>

            {/* Export on-demand (read-only — tidak mengubah writeup.json) */}
            <div className="rounded-lg border border-edge bg-surface px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-1 inline-flex items-center gap-1.5 text-[13px] text-faint">
                        <FileDown className="h-4 w-4" aria-hidden="true" /> Export:
                    </span>
                    {EXPORT_FORMATS.map(([format, label]) => (
                        <Link
                            key={format}
                            href={route('challenges.export', { challenge: challenge.id, format })}
                            className="rounded-md border border-edge px-3 py-1.5 text-[13px] text-muted transition-colors hover:bg-surface-hover hover:text-body"
                        >
                            {label}
                        </Link>
                    ))}
                </div>
            </div>

            <div className="space-y-6">
                {/* Lokasi penyimpanan */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-edge bg-surface px-5 py-4">
                    <div className="min-w-0">
                        <h2 className="text-sm font-medium text-strong">Lokasi Penyimpanan Lokal</h2>
                        <p className="mt-1 truncate font-mono text-[13px] text-faint">{challenge.path_folder}</p>
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.post(route('challenges.openFolder', challenge.id))}
                    >
                        <FolderOpen className="h-4 w-4" /> Buka Folder
                    </Button>
                </div>

                {/* Struktur writeup (source-of-truth writeup.json → render read-only). */}
                <WriteupView value={writeup} />

                {challenge.lampiran.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-faint" aria-hidden="true" /> Lampiran
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-1.5">
                                {challenge.lampiran.map((file: string) => (
                                    <li
                                        key={file}
                                        className="flex items-center gap-2 rounded-md border border-edge bg-surface py-2 pl-3 pr-2 text-[13px] text-muted"
                                    >
                                        <FileText className="h-4 w-4 shrink-0 text-faint" aria-hidden="true" />
                                        <span className="truncate font-mono">{file}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AuthenticatedLayout>
    );
}