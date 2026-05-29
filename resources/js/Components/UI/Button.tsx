import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/Utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center rounded-md font-medium transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-none',
                    // Variants
                    variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.2)] border border-blue-500/50',
                    variant === 'secondary' && 'bg-zinc-800/80 text-zinc-100 hover:bg-zinc-700 border border-white/5',
                    variant === 'ghost' && 'bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-white/5',
                    variant === 'danger' && 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20',
                    // Sizes
                    size === 'sm' && 'h-8 px-3 text-xs',
                    size === 'md' && 'h-10 px-4 py-2 text-sm',
                    size === 'lg' && 'h-12 px-8 text-base',
                    className
                )}
                {...props}
            />
        );
    }
);
Button.displayName = 'Button';
export default Button;
