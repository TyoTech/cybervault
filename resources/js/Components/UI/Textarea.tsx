import { TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/Utils/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    mono?: boolean;
}

/**
 * Textarea konsisten dengan Input (solid surface + focus ring).
 * `mono` dipakai untuk field teknis (command/output/log).
 */
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, mono = false, ...props }, ref) => {
        return (
            <textarea
                ref={ref}
                className={cn(
                    'flex min-h-[80px] w-full rounded-md border border-edge bg-surface px-3 py-2 text-sm text-strong placeholder:text-muted',
                    'focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent/60',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    mono && 'font-mono text-[13px] leading-relaxed',
                    className
                )}
                {...props}
            />
        );
    }
);
Textarea.displayName = 'Textarea';
export default Textarea;