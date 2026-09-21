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
                <CardHeader className="pb-2">
                    <CardTitle>Masuk</CardTitle>
                    <p className="text-sm text-faint mt-1">Akses workspace keamanan Anda.</p>
                </CardHeader>
                <CardContent>
                    {status && <div className="mb-4 text-sm font-medium text-success">{status}</div>}

                    <form onSubmit={submit} className="space-y-5 mt-4">
                        <div>
                            <label className="block text-sm font-medium text-body mb-1.5">Email</label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                autoComplete="username"
                                onChange={(e) => setData('email', e.target.value)}
                            />
                            {errors.email && <p className="text-danger text-xs mt-1.5">{errors.email}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-body mb-1.5">Password</label>
                            <Input
                                id="password"
                                type="password"
                                name="password"
                                value={data.password}
                                autoComplete="current-password"
                                onChange={(e) => setData('password', e.target.value)}
                            />
                            {errors.password && <p className="text-danger text-xs mt-1.5">{errors.password}</p>}
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center cursor-pointer group">
                                <input
                                    type="checkbox"
                                    name="remember"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="rounded border-edge bg-surface text-accent focus:ring-accent/50 focus:ring-offset-surface transition-colors"
                                />
                                <span className="ms-2 text-sm text-muted group-hover:text-body transition-colors">Ingat sesi saya</span>
                            </label>

                            {canResetPassword && (
                                <Link
                                    href={route('password.request')}
                                    className="text-sm text-muted hover:text-strong transition-colors"
                                >
                                    Lupa password?
                                </Link>
                            )}
                        </div>

                        <Button className="w-full mt-2" disabled={processing}>
                            {processing ? 'Otentikasi...' : 'Masuk'}
                        </Button>

                        <div className="text-center mt-6 text-sm text-faint">
                            Belum memiliki akses?{' '}
                            <Link href={route('register')} className="text-accent hover:text-accent font-medium transition-colors">
                                Daftar Workspace
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}
