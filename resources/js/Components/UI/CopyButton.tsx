import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/Utils/cn';

interface CopyButtonProps {
    value: string;
    className?: string;
}

export default function CopyButton({ value, className }: CopyButtonProps) {
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
                "p-1.5 rounded-md border transition-all flex items-center justify-center",
                copied
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                    : "bg-zinc-800/50 border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 hover:border-white/10",
                className
            )}
            title="Copy to clipboard"
        >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
    );
}
