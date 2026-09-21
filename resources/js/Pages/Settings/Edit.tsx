import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { Card } from '@/Components/UI/Card';
import PageHeader from '@/Components/UI/PageHeader';
import ThemeSetting from '@/Components/UI/ThemeSetting';
import { SunMoon } from 'lucide-react';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';

export default function Edit({ mustVerifyEmail, status }: { mustVerifyEmail: boolean, status?: string }) {
    return (
        <AuthenticatedLayout header="Pengaturan Akun">
            <Head title="Pengaturan" />

            <PageHeader
                title="Pengaturan"
                description="Kelola informasi profil, tampilan aplikasi, dan keamanan akun Anda."
            />

            <div className="max-w-3xl space-y-4">
                <Card className="p-5 sm:p-6">
                    <UpdateProfileInformationForm mustVerifyEmail={mustVerifyEmail} status={status} />
                </Card>

                <Card className="p-5 sm:p-6">
                    <div className="mb-4">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-strong">
                            <SunMoon className="h-4 w-4 text-muted" aria-hidden="true" />
                            Tampilan
                        </h2>
                        <p className="mt-1 text-sm text-muted">
                            Pilih tema aplikasi. Tema Sistem mengikuti pengaturan OS/browser.
                        </p>
                    </div>
                    <ThemeSetting />
                </Card>

                <Card className="p-5 sm:p-6">
                    <UpdatePasswordForm />
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}