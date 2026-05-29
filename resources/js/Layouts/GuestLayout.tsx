import { PropsWithChildren } from 'react';
import { Shield } from 'lucide-react';
import { Link } from '@inertiajs/react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="min-h-screen flex flex-col sm:justify-center items-center pt-6 sm:pt-0 bg-[#0a0a0a] relative overflow-hidden">
            {/* Ambient background glow */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 w-full sm:max-w-md mt-6 px-6 py-4">
                <div className="flex justify-center mb-8">
                    <Link href="/">
                        <div className="h-14 w-14 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center shadow-lg shadow-black/50 group transition-all hover:border-white/10 hover:shadow-blue-500/10">
                            <Shield className="w-7 h-7 text-blue-500 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                    </Link>
                </div>
                {children}
            </div>
        </div>
    );
}
