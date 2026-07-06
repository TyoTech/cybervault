import { Head, Link } from '@inertiajs/react';

export default function Welcome({ auth }: { auth: any }) {
    return (
        <>
            <Head title="Welcome" />
            <div className="min-h-screen bg-gray-950 text-gray-300 flex flex-col items-center justify-center selection:bg-blue-500 selection:text-white">
                <div className="max-w-3xl w-full p-6 text-center">
                    <h1 className="text-5xl font-bold text-white tracking-tight mb-4">
                        CyberVault
                    </h1>
                    <p className="text-lg text-gray-400 mb-8">
                        Sistem pencatatan dan pembuatan writeup untuk keamanan siber. Buat catatan, simpan writeup, dan tingkatkan keterampilan keamanan siber Anda dengan mudah.
                    </p>

                    <div className="flex justify-center gap-4">
                        {auth.user ? (
                            <Link
                                href={route('dashboard')}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={route('login')}
                                    className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors border border-gray-700"
                                >
                                    Log in
                                </Link>
                                <Link
                                    href={route('register')}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20"
                                >
                                    Register
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
