import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/Utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    'flex h-10 w-full rounded-md border border-edge bg-surface px-3 py-2 text-sm text-strong placeholder:text-muted',
                    'focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent/60',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Input.displayName = 'Input';
export default Input;