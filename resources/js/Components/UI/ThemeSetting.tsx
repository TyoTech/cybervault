import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/Utils/cn';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'cv-theme';

const MODES: { value: ThemeMode; label: string; description: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Terang', description: 'Tema terang', icon: Sun },
    { value: 'dark', label: 'Gelap', description: 'Tema gelap', icon: Moon },
    { value: 'system', label: 'Sistem', description: 'Ikuti pengaturan perangkat', icon: Monitor },
];

/**
 * Sumber kebenaran tunggal untuk tema (diatur hanya dari Settings).
 * Persistensi via localStorage ('cv-theme') + class `.dark` di <html>.
 * Script kecil di app.blade.php menerapkan tema sebelum paint agar
 * tidak ada flash ketika reload.
 */
function getInitial(): ThemeMode {
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        if (v === 'light' || v === 'dark' || v === 'system') return v;
    } catch {
        /* localStorage tidak tersedia — default system */
    }
    return 'system';
}

function apply(mode: ThemeMode) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = mode === 'dark' || (mode === 'system' && prefersDark);
    document.documentElement.classList.toggle('dark', dark);
}

export default function ThemeSetting() {
    const [mode, setMode] = useState<ThemeMode>(getInitial);

    useEffect(() => {
        apply(mode);

        if (mode === 'system') {
            const media = window.matchMedia('(prefers-color-scheme: dark)');
            const onChange = () => apply('system');
            media.addEventListener('change', onChange);
            return () => media.removeEventListener('change', onChange);
        }
    }, [mode]);

    const select = (value: ThemeMode) => {
        setMode(value);
        try {
            localStorage.setItem(STORAGE_KEY, value);
        } catch {
            /* simpan gagal — tema berlaku untuk sesi ini saja */
        }
    };

    return (
        <div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Tema aplikasi">
                {MODES.map((m) => {
                    const Icon = m.icon;
                    const active = mode === m.value;
                    return (
                        <button
                            key={m.value}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => select(m.value)}
                            className={cn(
                                'flex items-center gap-3 rounded-md border px-3.5 py-3 text-left text-sm transition-colors',
                                active
                                    ? 'border-accent/60 bg-accent/10 text-strong'
                                    : 'border-edge bg-surface text-muted hover:bg-elevated hover:text-strong'
                            )}
                        >
                            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span className="min-w-0">
                                <span className="block font-medium">{m.label}</span>
                                <span className="block text-xs text-faint">{m.description}</span>
                            </span>
                        </button>
                    );
                })}
            </div>
            <p className="mt-2.5 text-xs text-faint">
                Pilihan tema tersimpan di perangkat ini. Tema Sistem mengikuti pengaturan OS/browser.
            </p>
        </div>
    );
}