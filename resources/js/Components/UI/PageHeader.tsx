import { ReactNode } from 'react';

interface PageHeaderProps {
    title: string;
    description?: string;
    actions?: ReactNode;
}

/**
 * Header halaman konsisten: judul + deskripsi fungsi + area aksi (kanan).
 * Judul moderat (20px), bukan hero. Copy natural, bukan marketing.
 */
export default function PageHeader({ title, description, actions }: PageHeaderProps) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight text-strong">{title}</h1>
                {description && <p className="mt-1 text-sm text-faint">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}