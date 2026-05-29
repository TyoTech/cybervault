import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/Utils/cn';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'purple' | 'outline';
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
    ({ className, variant = 'default', ...props }, ref) => {
        return (
            <span
                ref={ref}
                className={cn(
                    'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset transition-colors',
                    variant === 'default' && 'bg-zinc-400/10 text-zinc-400 ring-zinc-400/20',
                    variant === 'success' && 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
                    variant === 'warning' && 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
                    variant === 'danger' && 'bg-red-500/10 text-red-400 ring-red-500/20',
                    variant === 'purple' && 'bg-purple-500/10 text-purple-400 ring-purple-500/20',
                    variant === 'outline' && 'text-zinc-300 ring-white/10',
                    className
                )}
                {...props}
            />
        );
    }
);
Badge.displayName = 'Badge';
export default Badge;
