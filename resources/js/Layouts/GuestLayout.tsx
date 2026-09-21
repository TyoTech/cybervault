import { PropsWithChildren } from 'react';
import { Shield } from 'lucide-react';
import { Link } from '@inertiajs/react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-10">
            <div className="w-full max-w-md">
                <div className="mb-8 flex flex-col items-center gap-3">
                    <Link href="/">
                        <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-edge bg-surface">
                            <Shield className="h-6 w-6 text-accent" aria-hidden="true" />
                        </span>
                    </Link>
                    <div className="text-center leading-tight">
                        <p className="text-base font-semibold tracking-tight text-strong">Cyber Vault</p>
                        <p className="mt-0.5 text-xs text-faint">Personal Security Workspace</p>
                    </div>
                </div>
                {children}
            </div>
        </div>
    );
}