import { ReactNode } from 'react';
import { cn } from '@/Utils/cn';

interface EmptyStateProps {
    icon: ReactNode;
    title: string;
    description: string;
    action?: ReactNode;
    className?: string;
}

export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center p-12 text-center border border-dashed border-white/10 rounded-2xl bg-zinc-900/20", className)}>
            <div className="w-16 h-16 bg-zinc-900 border border-white/5 rounded-2xl flex items-center justify-center mb-4 shadow-inner text-zinc-500">
                {icon}
            </div>
            <h3 className="text-lg font-semibold text-zinc-100 mb-1">{title}</h3>
            <p className="text-sm text-zinc-400 max-w-md mb-6">{description}</p>
            {action && <div>{action}</div>}
        </div>
    );
}
