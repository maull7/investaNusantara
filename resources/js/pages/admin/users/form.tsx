import { Form, Head, Link } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin';
import { index, store, update } from '@/routes/admin/users';
import type { User } from '@/types';

type Props = {
    user: Pick<User, 'id' | 'name' | 'email' | 'role' | 'region_code'> | null;
    roles: { value: string; label: string }[];
    regions: { code: string; name: string; level: number }[];
};

export default function UserForm({ user, roles, regions }: Props) {
    return (
        <AdminLayout
            title={user ? 'Edit pengguna' : 'Pengguna baru'}
            actions={
                <Link href={index.url()} className="btn-ghost">
                    Kembali
                </Link>
            }
        >
            <Head title="Pengguna" />
            <Form
                action={user ? update.url(user.id) : store.url()}
                method={user ? 'put' : 'post'}
                className="max-w-lg space-y-4 rounded-lg bg-white p-6 ring-1 ring-slate-200"
            >
                {({ errors, processing }) => (
                    <>
                        <Input
                            label="Nama"
                            name="name"
                            defaultValue={user?.name}
                            error={errors.name}
                            required
                        />
                        <Input
                            label="Email"
                            name="email"
                            type="email"
                            defaultValue={user?.email}
                            error={errors.email}
                            required
                        />
                        <Input
                            label={
                                user
                                    ? 'Password (kosongkan jika tidak diubah)'
                                    : 'Password'
                            }
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            error={errors.password}
                            required={!user}
                        />
                        <label className="block text-sm font-medium">
                            Peran
                            <select
                                name="role"
                                defaultValue={user?.role ?? 'contributor'}
                                className="mt-1 input"
                            >
                                {roles.map((r) => (
                                    <option key={r.value} value={r.value}>
                                        {r.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="block text-sm font-medium">
                            Wilayah tugas
                            <select
                                name="region_code"
                                defaultValue={user?.region_code ?? ''}
                                className="mt-1 input"
                            >
                                <option value="">Nasional / semua</option>
                                {regions.map((r) => (
                                    <option key={r.code} value={r.code}>
                                        {r.level === 2
                                            ? `   ${r.name}`
                                            : r.name}
                                    </option>
                                ))}
                            </select>
                            {errors.region_code && (
                                <span className="text-xs text-accent">
                                    {errors.region_code}
                                </span>
                            )}
                        </label>
                        <button disabled={processing} className="btn-primary">
                            Simpan
                        </button>
                    </>
                )}
            </Form>
        </AdminLayout>
    );
}

function Input({
    label,
    error,
    ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
}) {
    return (
        <label className="block text-sm font-medium">
            {label}
            <input {...props} className="mt-1 input font-normal" />
            {error && <span className="text-xs text-accent">{error}</span>}
        </label>
    );
}
