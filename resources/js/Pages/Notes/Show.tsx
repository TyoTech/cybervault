import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import Button from '@/Components/UI/Button';
import { ArrowLeft, Trash2, Edit } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface NoteProps {
    note: {
        id: string;
        title: string;
        content: string;
        created_at: string;
    };
}

export default function NoteShow({ note }: NoteProps) {
    const { delete: destroy, processing } = useForm();

    const handleDelete = () => {
        if (confirm('Apakah Anda yakin ingin menghapus catatan ini?')) {
            destroy(route('notes.destroy', note.id));
        }
    };

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(dateString));
    };

    return (
        <AuthenticatedLayout header="Detail Catatan">
            <Head title={note.title} />

            <div className="max-w-4xl space-y-6">
                <div className="flex items-center justify-between">
                    <Link href={route('notes.index')} className="flex items-center text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Vault
                    </Link>
                    <div className="flex gap-2">
                        <Link href={route('notes.edit', note.id)}>
                            <Button variant="secondary">
                                <Edit className="w-4 h-4 mr-2" /> Edit
                            </Button>
                        </Link>
                        <Button variant="danger" onClick={handleDelete} disabled={processing}>
                            <Trash2 className="w-4 h-4 mr-2" /> Hapus
                        </Button>
                    </div>
                </div>

                <div className="border-b border-white/10 pb-6">
                    <h1 className="text-3xl font-bold text-zinc-100">{note.title}</h1>
                    <p className="text-sm text-zinc-500 mt-2">Dibuat pada {formatDate(note.created_at)}</p>
                </div>

                <div className="prose prose-invert prose-blue max-w-none">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            code({node, inline, className, children, ...props}: any) {
                                const match = /language-(\w+)/.exec(className || '');
                                return !inline && match ? (
                                    <SyntaxHighlighter
                                        style={vscDarkPlus as any}
                                        language={match[1]}
                                        PreTag="div"
                                        className="mt-0! bg-[#0d0d0d]! border! border-white/5! rounded-xl!"
                                        {...props}
                                    >
                                        {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                ) : (
                                    <code className="bg-zinc-800/50 px-1.5 py-0.5 rounded text-blue-300 font-mono text-sm" {...props}>
                                        {children}
                                    </code>
                                );
                            }
                        }}
                    >
                        {note.content}
                    </ReactMarkdown>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
