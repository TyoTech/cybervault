import { PropsWithChildren, useId, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/Utils/cn';
import Badge from '@/Components/UI/Badge';

interface SectionProps extends PropsWithChildren {
    title: string;
    description?: string;
    count?: number;
    defaultOpen?: boolean;
    idPrefix?: string;
}

/**
 * Section collapsible (progressive disclosure). Header berupa <button> dengan
 * aria-expanded + aria-controls agar keyboard/AT friendly. Flat, minimal.
 */
export default function Section({
    title,
    description,
    count,
    defaultOpen = true,
    idPrefix,
    children,
}: SectionProps) {
    const [open, setOpen] = useState(defaultOpen);
    const panelId = `${idPrefix ?? 'sec'}-${useId()}`;
    const countVisible = typeof count === 'number' && count > 0;

    return (
        <section className="rounded-lg border border-edge bg-surface">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls={panelId}
                className="group flex w-full items-center justify-between gap-3 rounded-t-lg px-4 py-3 text-left transition-colors hover:bg-elevated focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/60"
            >
                <span className="flex min-w-0 items-center gap-2">
                    <ChevronRight
                        className={cn(
                            'h-4 w-4 shrink-0 text-faint transition-transform',
                            open && 'rotate-90'
                        )}
                        aria-hidden="true"
                    />
                    <span className="truncate text-sm font-medium text-strong">{title}</span>
                    {countVisible && (
                        <Badge variant="outline" className="px-1.5 py-0 font-mono text-[11px]">
                            {count}
                        </Badge>
                    )}
                </span>
                {description && !open && (
                    <span className="hidden truncate text-xs text-faint sm:block">{description}</span>
                )}
            </button>
            {open && (
                <div id={panelId} className="border-t border-edge px-4 py-4">
                    {description && <p className="mb-3 text-[13px] text-faint">{description}</p>}
                    {children}
                </div>
            )}
        </section>
    );
}