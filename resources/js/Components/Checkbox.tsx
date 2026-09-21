import { InputHTMLAttributes } from 'react';

export default function Checkbox({
    className = '',
    ...props
}: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'rounded border-white/10 bg-zinc-900/50 text-blue-600 shadow-sm focus:ring-blue-500/50 focus:ring-offset-zinc-900 ' +
                className
            }
        />
    );
}
