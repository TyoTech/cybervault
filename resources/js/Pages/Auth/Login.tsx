import { useEffect, FormEventHandler } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/UI/Card';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Login({ status, canResetPassword }: { status?: string, canResetPassword?: boolean }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    useEffect(() => {
        return () => {
            reset('password');
        };
    }, []);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'));
    };

    return (
        <GuestLayout>
            <Head title="Masuk" />

            <Card>
                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl">Masuk ke CyberVault</CardTitle>
                    <p className="text-sm text-zinc-500 mt-2">Personal Security Workspace</p>
                </CardHeader>
                <CardContent>
                    {status && <div className="mb-4 font-medium text-sm text-green-500">{status}</div>}

                    <form onSubmit={submit} className="space-y-5 mt-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email</label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                autoComplete="username"
                                onChange={(e) => setData('email', e.target.value)}
                            />
                            {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Password</label>
                            <Input
                                id="password"
                                type="password"
                                name="password"
                                value={data.password}
                                autoComplete="current-password"
                                onChange={(e) => setData('password', e.target.value)}
                            />
                            {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password}</p>}
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center cursor-pointer group">
                                <input
                                    type="checkbox"
                                    name="remember"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="rounded border-white/10 bg-zinc-900/50 text-blue-600 shadow-sm focus:ring-blue-500/50 focus:ring-offset-zinc-900 transition-colors"
                                />
                                <span className="ms-2 text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">Ingat sesi saya</span>
                            </label>

                            {canResetPassword && (
                                <Link
                                    href={route('password.request')}
                                    className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
                                >
                                    Lupa password?
                                </Link>
                            )}
                        </div>

                        <Button className="w-full mt-2" disabled={processing}>
                            {processing ? 'Otentikasi...' : 'Masuk'}
                        </Button>

                        <div className="text-center mt-6 text-sm text-zinc-500">
                            Belum memiliki akses?{' '}
                            <Link href={route('register')} className="text-blue-500 hover:text-blue-400 font-medium transition-colors">
                                Daftar Workspace
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}
