import { PropsWithChildren, ReactNode, useEffect, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    LayoutDashboard,
    Book,
    Shield,
    FileText,
    Terminal,
    Wrench,
    LogOut,
    Search,
    Settings,
    Menu,
    X,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { cn } from '@/Utils/cn';
import CommandPalette from '@/Components/UI/CommandPalette';

function getNavSections() {
    return [
        {
            label: 'Workspace',
            items: [
                { name: 'Dashboard', href: route('dashboard'), icon: LayoutDashboard, active: route().current('dashboard') },
                { name: 'Notes', href: route('notes.index'), icon: Book, active: route().current('notes.*') && route().params.kind !== 'writeup' },
                { name: 'Writeups', href: '/notes?kind=writeup', icon: FileText, active: route().current('notes.*') && route().params.kind === 'writeup' },
            ],
        },
        {
            label: 'Security',
            items: [
                { name: 'Challenges', href: route('challenges.index'), icon: Shield, active: route().current('challenges.*') },
                { name: 'Payloads', href: route('payloads.index'), icon: Terminal, active: route().current('payloads.*') },
                { name: 'Tools', href: route('tools.index'), icon: Wrench, active: route().current('tools.*') },
            ],
        },
        {
            label: 'System',
            items: [
                { name: 'Settings', href: route('profile.edit'), icon: Settings, active: route().current('profile.*') || route().current('settings.*') },
            ],
        },
    ];
}

function UserAvatar({ name }: { name: string }) {
    const initials = name
        .split(/\s+/)
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();

    return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-edge bg-elevated text-xs font-semibold text-body">
            {initials || 'U'}
        </span>
    );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
    const { auth } = usePage().props as any;
    const user = auth.user;
    const navSections = getNavSections();

    const openSearch = () =>
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));

    return (
        <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-edge px-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-md border border-edge bg-surface">
                    <Shield className="h-4 w-4 text-accent" aria-hidden="true" />
                </span>
                <div className="min-w-0 leading-tight">
                    <p className="text-sm font-semibold tracking-tight text-strong">Cyber Vault</p>
                    <p className="text-[11px] text-faint">Security Workspace</p>
                </div>
            </div>

            {/* Navigasi */}
            <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navigasi utama">
                <div className="space-y-6">
                    {navSections.map((section) => (
                        <div key={section.label}>
                            <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-muted">
                                {section.label}
                            </p>
                            <div className="space-y-0.5">
                                {section.items.map((item) => (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={onNavigate}
                                        aria-current={item.active ? 'page' : undefined}
                                        className={cn(
                                            'flex h-8 items-center gap-2.5 rounded-md px-2 text-sm transition-colors',
                                            item.active
                                                ? 'bg-elevated font-medium text-strong'
                                                : 'text-faint hover:bg-elevated/60 hover:text-strong'
                                        )}
                                    >
                                        <item.icon
                                            className={cn(
                                                'h-4 w-4 shrink-0',
                                                item.active ? 'text-accent' : 'text-muted'
                                            )}
                                            aria-hidden="true"
                                        />
                                        {item.name}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </nav>

            {/* User */}
            <div className="shrink-0 border-t border-edge p-3">
                <div className="flex items-center gap-2.5 px-1 py-1">
                    <UserAvatar name={user.name} />
                    <div className="min-w-0 flex-1 leading-tight">
                        <p className="truncate text-sm font-medium text-strong">{user.name}</p>
                        <p className="truncate text-xs text-faint">{user.email}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                        <Link
                            href={route('profile.edit')}
                            aria-label="Pengaturan"
                            title="Pengaturan"
                            className="rounded-md p-1.5 text-faint transition-colors hover:bg-elevated hover:text-strong"
                        >
                            <Settings className="h-4 w-4" />
                        </Link>
                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            aria-label="Keluar"
                            title="Keluar"
                            className="rounded-md p-1.5 text-faint transition-colors hover:bg-elevated hover:text-danger"
                        >
                            <LogOut className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Pencarian (palet perintah) */}
            <div className="shrink-0 border-t border-edge px-3 py-2.5">
                <button
                    type="button"
                    onClick={openSearch}
                    className="flex h-8 w-full items-center justify-between rounded-md border border-edge bg-surface px-2.5 text-[13px] text-faint transition-colors hover:border-edge-strong hover:text-body"
                >
                    <span className="flex items-center gap-2">
                        <Search className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                        Cari...
                    </span>
                    <kbd className="rounded border border-edge bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-faint">
                        Ctrl K
                    </kbd>
                </button>
            </div>
        </div>
    );
}

export default function Authenticated({ header, children }: PropsWithChildren<{ header?: ReactNode }>) {
    const { flash } = usePage().props as any;
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    // Trigger toast otomatis saat ada pesan dari Laravel
    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    // Kunci scroll body saat drawer mobile terbuka
    useEffect(() => {
        document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileNavOpen]);

    return (
        <div className="min-h-screen bg-canvas text-body lg:flex">
            <Toaster
                theme="dark"
                position="bottom-right"
                toastOptions={{
                    style: {
                        background: '#1d1f24',
                        border: '1px solid #34373e',
                        color: '#e4e4e7',
                        fontSize: '14px',
                    },
                }}
            />

            <CommandPalette />

            {/* Sidebar Desktop */}
            <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-edge bg-canvas lg:flex lg:flex-col">
                <SidebarContent />
            </aside>

            {/* Sidebar Mobile (drawer) */}
            {mobileNavOpen && (
                <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu navigasi">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
                    <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-canvas">
                        <button
                            type="button"
                            onClick={() => setMobileNavOpen(false)}
                            aria-label="Tutup menu"
                            className="absolute right-3 top-4 rounded-md p-1.5 text-faint transition-colors hover:bg-elevated hover:text-strong"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
                    </aside>
                </div>
            )}

            {/* Area Konten Utama */}
            <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:h-screen lg:overflow-hidden">
                <header className="flex h-14 shrink-0 items-center gap-3 border-b border-edge bg-canvas px-4 sm:px-6 lg:px-8">
                    <button
                        type="button"
                        onClick={() => setMobileNavOpen(true)}
                        aria-label="Buka menu"
                        className="-ml-1.5 rounded-md p-1.5 text-muted transition-colors hover:bg-elevated hover:text-strong lg:hidden"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                    {header && (
                        <h1 className="truncate text-sm font-medium text-body">{header}</h1>
                    )}
                </header>

                <main className="flex-1 p-4 sm:p-6 lg:overflow-auto lg:p-8">
                    <div className="mx-auto max-w-6xl space-y-8">{children}</div>
                </main>
            </div>
        </div>
    );
}