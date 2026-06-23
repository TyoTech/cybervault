import { useRef, useState, DragEvent, ClipboardEvent } from 'react';
import axios from 'axios';
import { Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import MarkdownViewer from '@/Components/UI/MarkdownViewer';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

export default function MarkdownEditor({ value, onChange, className = '' }: MarkdownEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [mode, setMode] = useState<'write' | 'preview'>('write');

    const insertAtCursor = (textToInsert: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const newText = text.substring(0, start) + textToInsert + text.substring(end);

        onChange(newText);

        setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
            textarea.focus();
        }, 10);
    };

    const uploadImage = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error('Hanya file gambar yang diizinkan!');
            return;
        }

        setIsUploading(true);
        const placeholder = `![Mengunggah ${file.name}...]()\n`;
        insertAtCursor(placeholder);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post(route('upload'), formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const finalImageMarkdown = `![${res.data.name}](${res.data.url})\n`;
            onChange(textareaRef.current?.value.replace(placeholder, finalImageMarkdown) || value);
            toast.success('Gambar berhasil diunggah.');
        } catch (error) {
            onChange(textareaRef.current?.value.replace(placeholder, '') || value);
            toast.error('Gagal mengunggah gambar. Pastikan ukuran < 10MB.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDragOver = (e: DragEvent<HTMLTextAreaElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = async (e: DragEvent<HTMLTextAreaElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            await uploadImage(e.dataTransfer.files[0]);
        }
    };

    const handlePaste = async (e: ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = items[i].getAsFile();
                if (file) await uploadImage(file);
                break;
            }
        }
    };

    return (
        <div className={`relative flex flex-col border border-white/10 rounded-lg overflow-hidden bg-zinc-950 ${className}`}>
            {isUploading && (
                <div className="absolute top-2 right-2 flex items-center text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full text-xs font-medium border border-blue-500/20 backdrop-blur-sm z-10">
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" /> Mengunggah...
                </div>
            )}

            <div className="flex bg-zinc-900 border-b border-white/10 px-2 py-1">
                <button
                    type="button"
                    onClick={() => setMode('write')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'write' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                    Write
                </button>
                <button
                    type="button"
                    onClick={() => setMode('preview')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'preview' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                    Preview
                </button>
            </div>

            <div className="p-0">
                {mode === 'write' ? (
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onPaste={handlePaste}
                        className="w-full min-h-[400px] bg-transparent text-zinc-100 font-mono p-4 border-none focus:ring-0 resize-y outline-none leading-relaxed text-sm"
                        placeholder="Ketik catatan di sini... (Mendukung Markdown). Drag & Drop atau Paste gambar langsung ke area ini."
                        required
                    />
                ) : (
                    <div className="p-4 min-h-[400px] overflow-y-auto bg-zinc-950/50">
                        {value ? (
                            <MarkdownViewer content={value} />
                        ) : (
                            <p className="text-zinc-500 text-sm">Tidak ada yang bisa dipratinjau.</p>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between px-4 py-2 text-xs text-zinc-500 bg-zinc-900/50 border-t border-white/5">
                <span className="flex items-center"><ImageIcon className="w-3 h-3 mr-1"/> Mendukung Drag & Drop / Paste Gambar</span>
                <span>Pro Tip: Gunakan **Tebal**, `Kode`, atau ``` untuk block code.</span>
            </div>
        </div>
    );
}
