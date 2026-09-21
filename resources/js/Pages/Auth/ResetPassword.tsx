import { FormEventHandler } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/UI/Card';
import { Head, Link, useForm } from '@inertiajs/react';

export default function ResetPassword({
    token,
    email,
}: {
    token: string;
    email: string;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Reset Password" />

            <Card>
                <CardHeader>
                    <CardTitle>Reset Password</CardTitle>
                    <p className="text-sm text-faint">
                        Buat password baru untuk akun Anda.
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={submit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-body mb-1.5" htmlFor="email">
                                Email
                            </label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                autoComplete="username"
                                onChange={(e) => setData('email', e.target.value)}
                            />
                            {errors.email && (
                                <p className="text-danger text-xs mt-1.5">{errors.email}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-body mb-1.5" htmlFor="password">
                                Password Baru
                            </label>
                            <Input
                                id="password"
                                type="password"
                                name="password"
                                value={data.password}
                                autoComplete="new-password"
                                autoFocus
                                onChange={(e) => setData('password', e.target.value)}
                            />
                            {errors.password && (
                                <p className="text-danger text-xs mt-1.5">{errors.password}</p>
                            )}
                        </div>

                        <div>
                            <label
                                className="block text-sm font-medium text-body mb-1.5"
                                htmlFor="password_confirmation"
                            >
                                Konfirmasi Password
                            </label>
                            <Input
                                id="password_confirmation"
                                type="password"
                                name="password_confirmation"
                                value={data.password_confirmation}
                                autoComplete="new-password"
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                            />
                            {errors.password_confirmation && (
                                <p className="text-danger text-xs mt-1.5">
                                    {errors.password_confirmation}
                                </p>
                            )}
                        </div>

                        <Button className="w-full" disabled={processing}>
                            {processing ? 'Menyimpan…' : 'Reset Password'}
                        </Button>

                        <div className="text-center">
                            <Link
                                href={route('login')}
                                className="text-sm text-muted hover:text-strong transition-colors"
                            >
                                Kembali ke login
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}