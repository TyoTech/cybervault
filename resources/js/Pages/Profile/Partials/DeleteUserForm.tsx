import DangerButton from '@/Components/DangerButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef, useState } from 'react';
import { cn } from '@/Utils/cn';

export default function DeleteUserForm({ className = '' }: { className?: string }) {
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
    const passwordInput = useRef<HTMLInputElement>(null);

    const { data, setData, delete: destroy, processing, reset, errors, clearErrors } = useForm({
        password: '',
    });

    const confirmUserDeletion = () => {
        setConfirmingUserDeletion(true);
    };

    const deleteUser: FormEventHandler = (e) => {
        e.preventDefault();

        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current?.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);
        clearErrors();
        reset();
    };

    return (
        <section className={cn('space-y-6', className)}>
            <header>
                <h2 className="text-base font-medium text-strong">Hapus Akun</h2>
                <p className="mt-1 text-sm text-muted">
                    Setelah akun dihapus, semua data dan sumber dayanya akan hilang permanen. Sebelum
                    menghapus, pastikan Anda telah menyimpan data yang ingin dipertahankan.
                </p>
            </header>

            <div>
                <DangerButton onClick={confirmUserDeletion}>Hapus Akun</DangerButton>
            </div>

            <Modal show={confirmingUserDeletion} onClose={closeModal}>
                <form onSubmit={deleteUser} className="p-6">
                    <h2 className="text-base font-medium text-strong">
                        Yakin ingin menghapus akun?
                    </h2>

                    <p className="mt-1.5 text-sm text-muted">
                        Akun beserta semua datanya akan dihapus permanen. Masukkan kata sandi untuk
                        mengonfirmasi penghapusan.
                    </p>

                    <div className="mt-5">
                        <InputLabel htmlFor="password" value="Kata Sandi" />

                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            ref={passwordInput}
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            className="mt-1 block w-full"
                            isFocused
                            placeholder="Kata sandi Anda"
                            autoComplete="current-password"
                        />

                        <InputError message={errors.password} className="mt-2" />
                    </div>

                    <div className="mt-6 flex justify-end gap-2">
                        <SecondaryButton onClick={closeModal} type="button">
                            Batal
                        </SecondaryButton>

                        <DangerButton disabled={processing}>Hapus Akun</DangerButton>
                    </div>
                </form>
            </Modal>
        </section>
    );
}