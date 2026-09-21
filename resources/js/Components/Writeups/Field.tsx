import { TextareaHTMLAttributes } from 'react';

interface FieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
    hint?: string;
    mono?: boolean;
}

/**
 * Label + textarea konsisten untuk form Writeup.
 * Pertanyaan pemandu ditulis sebagai hint di bawah label, bukan placeholder
 * yang menghilang saat mengetik.
 */
export default function Field({ label, hint, mono = false, className, id, ...props }: FieldProps) {
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-zinc-300 mb-1">
                {label}
            </label>
            {hint && <p className="text-xs text-zinc-500 mb-1.5">{hint}</p>}
            <textarea
                id={id}
                rows={3}
                className={
                    'w-full rounded-md border border-edge bg-elevated px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 ' +
                    'focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-50 ' +
                    (mono ? 'font-mono text-[13px] leading-relaxed ' : '') +
                    (className ?? '')
                }
                {...props}
            />
        </div>
    );
}
