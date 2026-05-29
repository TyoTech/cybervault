import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, File, Loader2, X } from 'lucide-react';
import { cn } from '@/Utils/cn';
import axios from 'axios';

interface DropzoneProps {
    onUploadSuccess: (url: string, filename: string) => void;
    className?: string;
    accept?: string;
}

export default function Dropzone({ onUploadSuccess, className, accept }: DropzoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            uploadFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            uploadFile(e.target.files[0]);
        }
    };

    const uploadFile = async (file: globalThis.File) => {
        setIsUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post(route('upload'), formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onUploadSuccess(response.data.url, response.data.name);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Gagal mengunggah file.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = ''; // reset input
        }
    };

    return (
        <div
            className={cn(
                "relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all",
                isDragging ? "border-blue-500 bg-blue-500/10" : "border-white/10 bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-white/20",
                isUploading && "opacity-50 pointer-events-none",
                className
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
        >
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
                accept={accept}
            />

            {isUploading ? (
                <div className="flex flex-col items-center text-blue-500">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <span className="text-sm font-medium">Mengenkripsi & Mengunggah...</span>
                </div>
            ) : (
                <div className="flex flex-col items-center text-zinc-400">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
                        <UploadCloud className="w-6 h-6 text-zinc-300" />
                    </div>
                    <span className="text-sm font-medium text-zinc-200">
                        Klik atau Drag & Drop file ke sini
                    </span>
                    <span className="text-xs text-zinc-500 mt-1">
                        Mendukung PDF, ZIP, PCAP, JPG, PNG (Max 10MB)
                    </span>
                </div>
            )}

            {error && (
                <div className="absolute bottom-2 text-xs text-red-500 flex items-center bg-red-500/10 px-2 py-1 rounded">
                    <X className="w-3 h-3 mr-1" /> {error}
                </div>
            )}
        </div>
    );
}
