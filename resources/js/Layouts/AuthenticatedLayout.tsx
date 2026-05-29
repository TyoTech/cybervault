import { PropsWithChildren, ReactNode, useEffect } from 'react'; 
import { Link, usePage } from '@inertiajs/react';
import { LayoutDashboard, Book, Shield, Terminal, Wrench, LogOut, Search } from 'lucide-react';
import { Toaster, toast } from 'sonner'; // Tambah toast
import CommandPalette from '@/Components/UI/CommandPalette';

export default function Authenticated({ header, children }: PropsWithChildren<{ header?: ReactNode }>) {
    // Ambil user dan flash message dari Inertia props
    const { auth, flash } = usePage().props as any;
    const user = auth.user;

    // Trigger toast otomatis saat ada pesan dari Laravel
    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const navItems = [
        { name: 'Dashboard', href: route('dashboard'), icon: LayoutDashboard, active: route().current('dashboard') },
        { name: 'Notes Vault', href: route('notes.index'), icon: Book, active: route().current('notes.*') },
        { name: 'Challenges', href: route('challenges.index'), icon: Shield, active: route().current('challenges.*') },
        { name: 'Payloads', href: route('payloads.index'), icon: Terminal, active: route().current('payloads.*') },
        { name: 'Tools', href: route('tools.index'), icon: Wrench, active: route().current('tools.*') },
    ];

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 flex overflow-hidden">
            <Toaster theme="dark" position="bottom-right" toastOptions={{
                style: { background: '#09090b', border: '1px solid rgba(255,255,255,0.1)', color: '#f4f4f5' }
            }} />

            <CommandPalette />

            {/* Sidebar Utama - Diberi shrink-0 agar ukurannya absolut */}
            <aside className="w-64 shrink-0 border-r border-white/5 bg-zinc-950/50 flex flex-col h-screen">
                {/* Bagian Header Sidebar */}
                <div className="h-16 flex items-center px-6 border-b border-white/5 shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mr-3">
                        <Shield className="w-4 h-4 text-blue-500" />
                    </div>
                    <span className="font-bold text-zinc-100 tracking-wide text-lg">CyberVault</span>
                </div>

                {/* Search Trigger (Di dalam sidebar) */}
                <div className="px-4 pt-4 shrink-0">
                    <button
                        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm bg-zinc-900 border border-white/5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:border-white/10 transition-colors"
                    >
                        <div className="flex items-center">
                            <Search className="w-4 h-4 mr-2 text-zinc-500" />
                            Search...
                        </div>
                        <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 bg-zinc-950 border border-white/10 rounded">
                            Ctrl K
                        </kbd>
                    </button>
                </div>

                {/* Navigasi Link */}
                <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
                    {navItems.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                                item.active
                                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/10'
                                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5 border border-transparent'
                            }`}
                        >
                            <item.icon className={`w-4 h-4 mr-3 ${item.active ? 'text-blue-500' : 'text-zinc-500'}`} />
                            {item.name}
                        </Link>
                    ))}
                </nav>

                {/* Profil User */}
                <div className="p-4 border-t border-white/5 shrink-0">
                    <div className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg border border-white/5">
                        <div className="flex flex-col truncate pr-2">
                            <span className="text-sm font-medium text-zinc-200 truncate">{user.name}</span>
                            <span className="text-xs text-zinc-500 truncate">Hacker</span>
                        </div>
                        <Link href={route('logout')} method="post" as="button" className="text-zinc-500 hover:text-red-400 transition-colors shrink-0">
                            <LogOut className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </aside>

            {/* Area Konten Utama */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {header && (
                    <header className="h-16 flex items-center px-8 border-b border-white/5 bg-zinc-950/30 backdrop-blur-md shrink-0">
                        <h2 className="text-lg font-semibold leading-tight text-zinc-100">
                            {header}
                        </h2>
                    </header>
                )}
                <div className="flex-1 overflow-auto p-8">
                    <div className="max-w-7xl mx-auto space-y-6">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
