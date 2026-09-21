import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/Utils/cn';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'purple' | 'outline';
}

/**
 * Tag status kecil. Hanya dipakai untuk status/kategori, bukan dekorasi.
 * Ring 1px + solid transparent background → terlihat "inked", bukan glow.
 */
const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
    ({ className, variant = 'default', ...props }, ref) => {
        return (
            <span
                ref={ref}
                className={cn(
                    'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                    variant === 'default' && 'bg-faint/10 text-faint ring-faint/25',
                    variant === 'success' && 'bg-success/10 text-success ring-success/25',
                    variant === 'warning' && 'bg-warning/10 text-warning ring-warning/25',
                    variant === 'danger' && 'bg-danger/10 text-danger ring-danger/25',
                    variant === 'purple' && 'bg-purple-500/10 text-purple-700 ring-purple-500/25 dark:text-purple-400',
                    variant === 'outline' && 'text-muted ring-edge-strong',
                    className
                )}
                {...props}
            />
        );
    }
);
Badge.displayName = 'Badge';
export default Badge;