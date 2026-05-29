import { useEffect, FormEventHandler } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/UI/Card';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    useEffect(() => {
        return () => {
            reset('password', 'password_confirmation');
        };
    }, []);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'));
    };

    return (
        <GuestLayout>
            <Head title="Daftar" />

            <Card>
                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl">Inisialisasi Vault</CardTitle>
                    <p className="text-sm text-zinc-500 mt-2">Buat workspace keamanan pribadi Anda</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={submit} className="space-y-4 mt-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Nama Lengkap</label>
                            <Input
                                id="name"
                                name="name"
                                value={data.name}
                                autoComplete="name"
                                onChange={(e) => setData('name', e.target.value)}
                                required
                            />
                            {errors.name && <p className="text-red-500 text-xs mt-1.5">{errors.name}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email</label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                autoComplete="username"
                                onChange={(e) => setData('email', e.target.value)}
                                required
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
                                autoComplete="new-password"
                                onChange={(e) => setData('password', e.target.value)}
                                required
                            />
                            {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Konfirmasi Password</label>
                            <Input
                                id="password_confirmation"
                                type="password"
                                name="password_confirmation"
                                value={data.password_confirmation}
                                autoComplete="new-password"
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                required
                            />
                            {errors.password_confirmation && <p className="text-red-500 text-xs mt-1.5">{errors.password_confirmation}</p>}
                        </div>

                        <Button className="w-full mt-6" disabled={processing}>
                            {processing ? 'Menyimpan...' : 'Buat Vault'}
                        </Button>

                        <div className="text-center mt-6 text-sm text-zinc-500">
                            Sudah memiliki vault?{' '}
                            <Link href={route('login')} className="text-blue-500 hover:text-blue-400 font-medium transition-colors">
                                Masuk di sini
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}
