import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/Utils/cn';

interface CopyButtonProps {
    value: string;
    className?: string;
    label?: string;
}

export default function CopyButton({ value, className, label }: CopyButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!value) return;

        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    return (
        <button
            type="button"
            onClick={handleCopy}
            className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors',
                copied
                    ? 'border-success/30 bg-success/10 text-success'
                    : 'border-edge bg-surface/80 text-muted hover:border-edge-strong hover:text-strong',
                className
            )}
            title={copied ? 'Tersalin' : 'Salin ke clipboard'}
            aria-label={copied ? 'Tersalin' : 'Salin ke clipboard'}
        >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {label && <span>{copied ? 'Disalin' : label}</span>}
        </button>
    );
}