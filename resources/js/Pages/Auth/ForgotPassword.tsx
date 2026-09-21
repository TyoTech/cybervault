import { FormEventHandler } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/UI/Card';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <GuestLayout>
            <Head title="Lupa Password" />

            <Card>
                <CardHeader>
                    <CardTitle>Lupa Password</CardTitle>
                    <p className="text-sm text-faint">
                        Masukkan email Anda. Jika terdaftar, kami akan mengirimkan
                        link reset password.
                    </p>
                </CardHeader>
                <CardContent>
                    {/* Status generik (anti-enumeration): respon sama untuk
                        email terdaftar maupun tidak terdaftar. */}
                    {status && (
                        <div className="mb-4 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
                            {status}
                        </div>
                    )}

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
                                autoFocus
                                onChange={(e) => setData('email', e.target.value)}
                            />
                            {errors.email && (
                                <p className="text-danger text-xs mt-1.5">{errors.email}</p>
                            )}
                        </div>

                        <Button className="w-full" disabled={processing}>
                            {processing ? 'Mengirim…' : 'Kirim Link Reset Password'}
                        </Button>

                        <div className="text-center">
                            <Link
                                href={route('login')}
                                className="inline-flex items-center text-sm text-muted hover:text-strong transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke login
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}