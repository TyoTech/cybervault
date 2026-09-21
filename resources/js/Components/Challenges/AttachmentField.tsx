import { useEffect, useRef, useState } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import { cn } from '@/Utils/cn';

interface PreviewFile {
    file: File;
    preview?: string;
}

interface AttachmentFieldProps {
    files: File[];
    onAdd: (files: File[]) => void;
    onRemove: (index: number) => void;
    /** File tersimpan di server (hanya untuk mode edit). */
    serverFiles?: string[];
    onDeleteServerFile?: (filename: string) => void;
}

/**
 * Dropzone upload lampiran (drag & drop / klik) + daftar file yang sudah
 * tersimpan di server (mode edit). Konsisten untuk Create & Edit.
 */
export default function AttachmentField({
    files,
    onAdd,
    onRemove,
    serverFiles = [],
    onDeleteServerFile,
}: AttachmentFieldProps) {
    const [dragging, setDragging] = useState(false);
    const [previewFiles, setPreviewFiles] = useState<PreviewFile[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const previews = files.map((file) => ({
            file,
            preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        }));
        setPreviewFiles(previews);

        return () => {
            previews.forEach((p) => {
                if (p.preview) URL.revokeObjectURL(p.preview);
            });
        };
    }, [files]);

    const handleChooseFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        onAdd(Array.from(e.target.files));
        e.target.value = '';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragging(false);
        onAdd(Array.from(e.dataTransfer.files));
    };

    return (
        <div className="space-y-4">
            {serverFiles.length > 0 && (
                <div className="rounded-md border border-edge bg-surface p-4">
                    <label className="mb-3 block text-sm font-medium text-body">
                        File Tersimpan di Server
                    </label>
                    <ul className="space-y-2">
                        {serverFiles.map((file) => (
                            <li
                                key={file}
                                className="flex items-center justify-between rounded px-3 py-2 text-sm text-muted bg-elevated/60"
                            >
                                <span className="flex items-center">
                                    <FileText className="w-4 h-4 mr-2" /> {file}
                                </span>
                                {onDeleteServerFile && (
                                    <button
                                        type="button"
                                        onClick={() => onDeleteServerFile(file)}
                                        className="text-danger hover:text-danger"
                                        aria-label={`Hapus file ${file}`}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-body mb-2">
                    Tambah File Baru (Opsional)
                </label>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    hidden
                    onChange={handleChooseFile}
                />
                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            fileInputRef.current?.click();
                        }
                    }}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    className={cn(
                        'rounded-md border border-dashed cursor-pointer p-8 transition focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/50',
                        dragging ? 'border-accent bg-accent/10' : 'border-edge'
                    )}
                >
                    <div className="flex flex-col items-center">
                        <Upload className="w-8 h-8 text-faint" />
                        <p className="mt-3 text-sm text-body">Klik untuk memilih file</p>
                        <p className="text-xs text-faint">atau drag & drop file di sini</p>
                    </div>
                </div>
            </div>

            {previewFiles.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {previewFiles.map((item, index) => (
                        <div
                            key={index}
                            className="relative overflow-hidden rounded-md border border-edge bg-code-bg"
                        >
                            <button
                                type="button"
                                onClick={() => onRemove(index)}
                                className="absolute top-2 right-2 z-20 rounded-full bg-danger p-1 hover:bg-danger"
                                aria-label={`Hapus file ${item.file.name}`}
                            >
                                <X className="w-3 h-3" />
                            </button>
                            {item.preview ? (
                                <img src={item.preview} className="w-full h-36 object-cover" alt="" />
                            ) : (
                                <div className="h-36 flex flex-col justify-center items-center">
                                    <FileText className="w-10 h-10 text-faint" />
                                </div>
                            )}
                            <div className="p-3">
                                <p className="text-sm truncate text-strong">{item.file.name}</p>
                                <p className="text-xs text-faint">
                                    {(item.file.size / 1024).toFixed(1)} KB
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}