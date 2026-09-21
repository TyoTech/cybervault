import { LabelHTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '@/Utils/cn';

interface WriteupFieldProps extends PropsWithChildren {
    label: string;
    hint?: string;
    className?: string;
    labelProps?: LabelHTMLAttributes<HTMLLabelElement>;
}

/**
 * Field berlabel untuk editor Writeup — <label> eksplisit agar
 * accessibility & klik-ke-focus berfungsi.
 */
export default function WriteupField({
    label,
    hint,
    className,
    labelProps,
    children,
}: WriteupFieldProps) {
    return (
        <div className={cn('space-y-1.5', className)}>
            <label
                {...labelProps}
                className={cn('block text-xs font-medium text-muted', labelProps?.className)}
            >
                {label}
            </label>
            {children}
            {hint && <p className="text-[11px] text-muted">{hint}</p>}
        </div>
    );
}