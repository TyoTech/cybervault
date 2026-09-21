import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/Utils/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

/**
 * Select seragam dengan Input (solid surface + focus ring). Anak elemennya
 * (option) di-styling gelap agar terbaca di popup OS/dark theme.
 */
const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <select
                ref={ref}
                className={cn(
                    'flex h-10 w-full rounded-md border border-edge bg-surface px-3 py-2 text-sm text-strong cursor-pointer',
                    'focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent/60',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2371717a%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E")] bg-no-repeat bg-[right_0.75rem_center] pr-9 appearance-none',
                    className
                )}
                {...props}
            >
                {children}
            </select>
        );
    }
);
Select.displayName = 'Select';
export default Select;