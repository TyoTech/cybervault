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
                isDragging ? "border-accent bg-accent/10" : "border-edge bg-surface hover:bg-elevated hover:border-edge-strong",
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
                <div className="flex flex-col items-center text-accent">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <span className="text-sm font-medium">Mengenkripsi & Mengunggah...</span>
                </div>
            ) : (
                <div className="flex flex-col items-center text-muted">
                    <div className="w-12 h-12 rounded-full bg-elevated border border-edge flex items-center justify-center mb-3">
                        <UploadCloud className="w-6 h-6 text-muted" />
                    </div>
                    <span className="text-sm font-medium text-strong">
                        Klik atau Drag & Drop file ke sini
                    </span>
                    <span className="text-xs text-faint mt-1">
                        Mendukung PDF, ZIP, PCAP, JPG, PNG (Max 10MB)
                    </span>
                </div>
            )}

            {error && (
                <div className="absolute bottom-2 text-xs text-danger flex items-center bg-danger/10 px-2 py-1 rounded" role="alert">
                    <X className="w-3 h-3 mr-1" /> {error}
                </div>
            )}
        </div>
    );
}
