import { FormEventHandler } from 'react';
import { Link, useForm, usePage } from '@inertiajs/react';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import { Save, User } from 'lucide-react';

export default function UpdateProfileInformation({ mustVerifyEmail, status }: { mustVerifyEmail: boolean, status?: string }) {
    const user = usePage().props.auth.user as any;
    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        name: user.name,
        email: user.email,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('settings.profile.update'));
    };

    return (
        <section>
            <header className="mb-6 border-b border-edge pb-4">
                <h2 className="text-lg font-semibold text-strong flex items-center gap-2">
                    <User className="w-5 h-5 text-accent" />
                    Informasi Profil
                </h2>
                <p className="mt-1 text-sm text-muted">Perbarui nama pengguna dan alamat email akun Anda.</p>
            </header>

            <form onSubmit={submit} className="space-y-6 max-w-2xl">
                <div>
                    <label className="block text-sm font-medium text-body mb-1.5">Nama</label>
                    <Input value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                    {errors.name && <p className="text-danger text-xs mt-1">{errors.name}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-body mb-1.5">Email</label>
                    <Input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} required />
                    {errors.email && <p className="text-danger text-xs mt-1">{errors.email}</p>}
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div className="text-sm text-warning bg-warning/10 p-3 rounded border border-warning/20 mt-4">
                        Alamat email belum diverifikasi.{' '}
                        <Link href={route('verification.send')} method="post" as="button" className="underline hover:text-warning">
                            Kirim ulang email verifikasi.
                        </Link>
                    </div>
                )}

                <div className="flex items-center gap-4 pt-4">
                    <Button type="submit" disabled={processing}>
                        <Save className="w-4 h-4 mr-2" /> Simpan Profil
                    </Button>
                    {recentlySuccessful && <p className="text-sm text-success transition ease-in-out">Tersimpan.</p>}
                </div>
            </form>
        </section>
    );
}
