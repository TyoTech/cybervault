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
                'rounded border-edge bg-surface text-accent shadow-sm focus:ring-accent/50 focus:ring-offset-canvas transition-colors ' +
                className
            }
        />
    );
}
