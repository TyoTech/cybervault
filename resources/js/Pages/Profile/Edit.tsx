import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import { Card } from '@/Components/UI/Card';
import PageHeader from '@/Components/UI/PageHeader';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({
    mustVerifyEmail,
    status,
}: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
    return (
        <AuthenticatedLayout header="Pengaturan Akun">
            <Head title="Pengaturan" />

            <PageHeader
                title="Pengaturan"
                description="Kelola informasi profil dan keamanan akun Anda."
            />

            <div className="space-y-4">
                <Card className="p-5 sm:p-6">
                    <UpdateProfileInformationForm
                        mustVerifyEmail={mustVerifyEmail}
                        status={status}
                    />
                </Card>

                <Card className="p-5 sm:p-6">
                    <UpdatePasswordForm />
                </Card>

                <Card className="p-5 sm:p-6">
                    <DeleteUserForm />
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}