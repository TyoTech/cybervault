import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';

export default function Edit({ mustVerifyEmail, status }: { mustVerifyEmail: boolean, status?: string }) {
    return (
        <AuthenticatedLayout header="Pengaturan Akun">
            <Head title="Pengaturan" />
            <div className="max-w-3xl space-y-6">
                <div className="p-6 sm:p-8 bg-zinc-950 border border-white/10 rounded-xl">
                    <UpdateProfileInformationForm mustVerifyEmail={mustVerifyEmail} status={status} />
                </div>
                <div className="p-6 sm:p-8 bg-zinc-950 border border-white/10 rounded-xl">
                    <UpdatePasswordForm />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
