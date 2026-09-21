import Button from '@/Components/UI/Button';
import { Card, CardContent } from '@/Components/UI/Card';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function VerifyEmail({ status }: { status?: string }) {
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('verification.send'));
    };

    return (
        <GuestLayout>
            <Head title="Verifikasi Email" />

            <Card>
                <CardContent className="pt-5">
                    <div className="mb-4 text-sm text-muted">
                        Terima kasih telah mendaftar! Sebelum mulai, verifikasi alamat email Anda
                        dengan mengklik link yang kami kirimkan. Jika Anda tidak menerimanya, kami
                        akan dengan senang hati mengirimkannya lagi.
                    </div>

                    {status === 'verification-link-sent' && (
                        <div className="mb-4 rounded-md border border-success/25 bg-success/10 px-3.5 py-3 text-sm text-success">
                            Link verifikasi baru telah dikirim ke email yang Anda daftarkan.
                        </div>
                    )}

                    <form onSubmit={submit} className="mt-4 flex items-center justify-between gap-3">
                        <Button disabled={processing}>
                            {processing ? 'Mengirim...' : 'Kirim Ulang Email Verifikasi'}
                        </Button>

                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            className="text-sm text-muted underline transition-colors hover:text-strong"
                        >
                            Keluar
                        </Link>
                    </form>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}