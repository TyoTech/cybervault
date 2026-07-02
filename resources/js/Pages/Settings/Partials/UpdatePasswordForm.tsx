import { useRef, FormEventHandler } from 'react';
import { useForm } from '@inertiajs/react';
import Input from '@/Components/UI/Input';
import Button from '@/Components/UI/Button';
import { Lock, Save } from 'lucide-react';

export default function UpdatePasswordForm() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }
                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <section>
            <header className="mb-6 border-b border-white/10 pb-4">
                <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-orange-500" />
                    Perbarui Kata Sandi
                </h2>
                <p className="mt-1 text-sm text-zinc-400">Gunakan kata sandi acak dan panjang untuk keamanan maksimal.</p>
            </header>

            <form onSubmit={updatePassword} className="space-y-6 max-w-2xl">
                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Kata Sandi Saat Ini</label>
                    <Input ref={currentPasswordInput} type="password" value={data.current_password} onChange={(e) => setData('current_password', e.target.value)} required />
                    {errors.current_password && <p className="text-red-500 text-xs mt-1">{errors.current_password}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Kata Sandi Baru</label>
                    <Input ref={passwordInput} type="password" value={data.password} onChange={(e) => setData('password', e.target.value)} required />
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Konfirmasi Kata Sandi Baru</label>
                    <Input type="password" value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} required />
                    {errors.password_confirmation && <p className="text-red-500 text-xs mt-1">{errors.password_confirmation}</p>}
                </div>

                <div className="flex items-center gap-4 pt-4">
                    <Button type="submit" disabled={processing}>
                        <Save className="w-4 h-4 mr-2" /> Ganti Sandi
                    </Button>
                    {recentlySuccessful && <p className="text-sm text-emerald-400 transition ease-in-out">Tersimpan.</p>}
                </div>
            </form>
        </section>
    );
}
