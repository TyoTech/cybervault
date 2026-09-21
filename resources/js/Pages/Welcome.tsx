import { Head, Link } from '@inertiajs/react';
import { Shield } from 'lucide-react';

export default function Welcome({ auth }: { auth: any }) {
    return (
        <>
            <Head title="Cyber Vault" />
            <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4">
                <div className="flex w-full max-w-md flex-col items-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-edge bg-surface">
                        <Shield className="h-6 w-6 text-accent" aria-hidden="true" />
                    </span>
                    <h1 className="mt-5 text-2xl font-semibold tracking-tight text-strong">
                        Cyber Vault
                    </h1>
                    <p className="mt-2 text-center text-sm leading-relaxed text-faint">
                        Workspace pribadi untuk dokumentasi keamanan siber: catatan teknis,
                        writeup challenge, payload, dan command yang bisa dipakai ulang.
                    </p>

                    <div className="mt-7 flex items-center gap-3">
                        {auth.user ? (
                            <Link
                                href={route('dashboard')}
                                className="inline-flex h-9 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
                            >
                                Buka Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={route('login')}
                                    className="inline-flex h-9 items-center justify-center rounded-md border border-edge bg-surface px-4 text-sm font-medium text-strong transition-colors hover:bg-elevated hover:text-strong"
                                >
                                    Masuk
                                </Link>
                                <Link
                                    href={route('register')}
                                    className="inline-flex h-9 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
                                >
                                    Daftar
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}