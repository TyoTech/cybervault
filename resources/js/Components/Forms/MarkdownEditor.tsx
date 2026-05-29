import { useRef, useState, DragEvent, ClipboardEvent, ChangeEvent } from 'react';
import axios from 'axios';
import { Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

export default function MarkdownEditor({ value, onChange, className = '' }: MarkdownEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Fungsi untuk menyisipkan teks tepat di posisi kursor
    const insertAtCursor = (textToInsert: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const newText = text.substring(0, start) + textToInsert + text.substring(end);

        onChange(newText);

        // Kembalikan fokus ke text area setelah disisipkan
        setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
            textarea.focus();
        }, 10);
    };

    // Logika utama pengunggahan
    const uploadImage = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error('Hanya file gambar yang diizinkan!');
            return;
        }

        setIsUploading(true);
        const placeholder = `![Mengunggah ${file.name}...]()\n`;
        insertAtCursor(placeholder); // Munculkan indikator loading di text

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post(route('upload'), formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Ganti placeholder dengan URL asli setelah sukses
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

    // Cegah tab baru terbuka
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
                e.preventDefault(); // Cegah path lokal ter-paste
                const file = items[i].getAsFile();
                if (file) await uploadImage(file);
                break;
            }
        }
    };

    return (
        <div className={`relative flex flex-col ${className}`}>
            {isUploading && (
                <div className="absolute top-2 right-2 flex items-center text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full text-xs font-medium border border-blue-500/20 backdrop-blur-sm z-10">
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" /> Mengunggah...
                </div>
            )}
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onPaste={handlePaste}
                className="w-full min-h-400px rounded-lg border border-white/10 bg-zinc-950/50 p-4 text-sm text-zinc-100 font-mono focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 resize-y transition-colors leading-relaxed"
                placeholder="Ketik catatan di sini... (Mendukung Markdown). Drag & Drop atau Paste gambar langsung ke area ini."
                required
            />
            <div className="flex items-center justify-between px-2 py-2 mt-1 text-xs text-zinc-500 bg-zinc-900/30 rounded border border-white/5">
                <span className="flex items-center"><ImageIcon className="w-3 h-3 mr-1"/> Mendukung Drag & Drop / Paste Gambar</span>
                <span>Pro Tip: Gunakan **Tebal**, `Kode`, atau ``` untuk block code.</span>
            </div>
        </div>
    );
}
