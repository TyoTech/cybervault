import { ReactNode } from 'react';
import { cn } from '@/Utils/cn';
import CopyButton from '@/Components/UI/CopyButton';

interface CodeBlockProps {
    children: ReactNode;
    className?: string;
    /** Teks yang disalin ke clipboard (default: innerText children). */
    copyValue?: string;
    showCopy?: boolean;
    label?: string;
}

/**
 * Blok kode/terminal/log yang konsisten untuk payload, command, output.
 * Latar sedikit lebih gelap dari page + border subtle + scroll horizontal.
 * Tombol salin kecil dan tidak mencolok di kanan atas.
 */
export default function CodeBlock({
    children,
    className,
    copyValue,
    showCopy = true,
}: CodeBlockProps) {
    const value = copyValue ?? String(children ?? '').trim();

    return (
        <div className={cn('group relative', className)}>
            <pre className="overflow-x-auto rounded-md border border-edge bg-code-bg p-3.5 font-mono text-[13px] leading-relaxed text-code-text">
                <code>{children}</code>
            </pre>
            {showCopy && value && (
                <div className="absolute right-2 top-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                    <CopyButton value={value} />
                </div>
            )}
        </div>
    );
}