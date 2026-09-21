import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/Utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
}

/**
 * Tombol dengan hirarki yang jelas dan tenang:
 * - primary  → aksi utama (solid accent)
 * - secondary → aksi sekunder (surface + border)
 * - ghost    → aksi pasif / link-like (Edit, View)
 * - danger   → aksi destruktif (Delete)
 * Semua radius kecil, tanpa glow/gradient.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center rounded-md font-medium transition-colors select-none whitespace-nowrap',
                    'focus:outline-none disabled:opacity-50 disabled:pointer-events-none',
                    // Variants
                    variant === 'primary' && 'bg-accent text-white hover:bg-accent-hover',
                    variant === 'secondary' &&
                        'bg-elevated text-strong border border-edge hover:bg-edge hover:text-strong hover:border-edge-strong',
                    variant === 'ghost' && 'text-muted hover:text-strong hover:bg-elevated',
                    variant === 'danger' &&
                        'text-danger border border-danger/25 bg-danger/10 hover:bg-danger/20 hover:text-danger',
                    // Sizes
                    size === 'sm' && 'h-8 px-3 text-[13px] gap-1.5',
                    size === 'md' && 'h-9 px-4 text-sm gap-2',
                    size === 'lg' && 'h-11 px-5 text-sm gap-2',
                    className
                )}
                {...props}
            />
        );
    }
);
Button.displayName = 'Button';
export default Button;