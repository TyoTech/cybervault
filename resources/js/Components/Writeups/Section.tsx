import { PropsWithChildren, ReactNode, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/Utils/cn';

interface SectionProps {
    title: string;
    description?: string;
    defaultOpen?: boolean;
    headerExtra?: ReactNode;
}

/**
 * Section collapsible (progressive disclosure) untuk Writeup editor.
 * Mengurangi cognitive load: bagian opsional default tertutup.
 */
export default function Section({ title, description, defaultOpen = false, headerExtra, children }: PropsWithChildren<SectionProps>) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <section className="rounded-lg border border-edge bg-surface/40 overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/50"
            >
                <span>
                    <span className="block text-sm font-semibold text-zinc-100">{title}</span>
                    {description && <span className="block text-xs text-zinc-500 mt-0.5">{description}</span>}
                </span>
                <span className="flex items-center gap-3">
                    {headerExtra}
                    <ChevronDown className={cn('w-4 h-4 text-zinc-500 transition-transform', open && 'rotate-180')} />
                </span>
            </button>
            {open && <div className="px-5 pb-5 pt-1 space-y-4 border-t border-edge">{children}</div>}
        </section>
    );
}
