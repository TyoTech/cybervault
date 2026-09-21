import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { Card } from '@/Components/UI/Card';
import PageHeader from '@/Components/UI/PageHeader';
import ThemeSetting from '@/Components/UI/ThemeSetting';
import { FolderOpen, SunMoon } from 'lucide-react';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';

interface Props {
    mustVerifyEmail: boolean;
    status?: string;
    cyberStorage: {
        parent: string;
        folder: string;
        root: string;
    };
}

export default function Edit({
    mustVerifyEmail,
    status,
    cyberStorage,
}: Props) {
    const {
        data,
        setData,
        patch,
        processing,
        errors,
    } = useForm({
        parent: cyberStorage.parent,
        folder: cyberStorage.folder,
    });

    const submitStorage = (e: React.FormEvent) => {
        e.preventDefault();

        patch(route('settings.storage.update'));
    };

    return (
        <AuthenticatedLayout header="Pengaturan Akun">
            <Head title="Pengaturan" />

            <PageHeader
                title="Pengaturan"
                description="Kelola informasi profil, penyimpanan, tampilan aplikasi, dan keamanan."
            />

            <div className="max-w-3xl space-y-4">
                <Card className="p-5 sm:p-6">
                    <UpdateProfileInformationForm
                        mustVerifyEmail={mustVerifyEmail}
                        status={status}
                    />
                </Card>

                <Card className="p-5 sm:p-6">
                    <div className="mb-4">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-strong">
                            <FolderOpen
                                className="h-4 w-4 text-muted"
                                aria-hidden="true"
                            />
                            Penyimpanan Cyber Vault
                        </h2>

                        <p className="mt-1 text-sm text-muted">
                            Tentukan lokasi folder tempat data lab, challenge,
                            payload, dan file Cyber Vault disimpan.
                        </p>
                    </div>

                    <form onSubmit={submitStorage} className="space-y-4">
                        <div>
                            <label
                                htmlFor="storage-parent"
                                className="block text-sm font-medium text-strong"
                            >
                                Lokasi induk
                            </label>

                            <input
                                id="storage-parent"
                                type="text"
                                value={data.parent}
                                onChange={(e) =>
                                    setData('parent', e.target.value)
                                }
                                placeholder="/home/tyo"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />

                            {errors.parent && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.parent}
                                </p>
                            )}

                            <p className="mt-1 text-xs text-muted">
                                Contoh: /home/tyo atau /home/tyo/Documents
                            </p>
                        </div>

                        <div>
                            <label
                                htmlFor="storage-folder"
                                className="block text-sm font-medium text-strong"
                            >
                                Nama folder
                            </label>

                            <input
                                id="storage-folder"
                                type="text"
                                value={data.folder}
                                onChange={(e) =>
                                    setData('folder', e.target.value)
                                }
                                placeholder="cyber"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />

                            {errors.folder && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.folder}
                                </p>
                            )}

                            <p className="mt-1 text-xs text-muted">
                                Hanya huruf, angka, titik, underscore, dan
                                tanda minus.
                            </p>
                        </div>

                        <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-900/50">
                            <p className="text-xs text-muted">
                                Lokasi saat ini
                            </p>
                            <p className="mt-1 break-all text-sm font-medium text-strong">
                                {cyberStorage.root}
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {processing
                                ? 'Menyimpan...'
                                : 'Simpan lokasi'}
                        </button>
                    </form>
                </Card>

                <Card className="p-5 sm:p-6">
                    <div className="mb-4">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-strong">
                            <SunMoon
                                className="h-4 w-4 text-muted"
                                aria-hidden="true"
                            />
                            Tampilan
                        </h2>

                        <p className="mt-1 text-sm text-muted">
                            Pilih tema aplikasi. Tema Sistem mengikuti
                            pengaturan OS/browser.
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