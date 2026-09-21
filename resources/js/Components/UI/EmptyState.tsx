import { ReactNode } from 'react';
import { cn } from '@/Utils/cn';

interface EmptyStateProps {
    icon: ReactNode;
    title: string;
    description: string;
    action?: ReactNode;
    className?: string;
}

/**
 * Empty state sederhana: icon kecil + judul + deskripsi + aksi.
 * Tanpa ilustrasi besar / dekorasi berlebih.
 */
export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
    return (
        <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-edge bg-surface text-faint">
                {icon}
            </div>
            <h3 className="text-sm font-semibold text-strong">{title}</h3>
            <p className="mt-1 max-w-sm text-[13px] text-faint">{description}</p>
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}