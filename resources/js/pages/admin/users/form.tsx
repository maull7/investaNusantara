import { Form, Head, Link } from '@inertiajs/react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Avatar, Field } from '@/components/admin/ui';
import Icon from '@/components/icons';
import AdminLayout from '@/layouts/admin';
import { cn } from '@/lib/utils';
import { index, store, update } from '@/routes/admin/users';
import type { Role, User } from '@/types';

type Props = {
    user: Pick<User, 'id' | 'name' | 'email' | 'role' | 'region_code'> | null;
    roles: { value: Role; label: string }[];
    regions: { code: string; name: string; level: number }[];
};

const roleHint: Record<Role, string> = {
    super_admin: 'Akses penuh, kelola kategori dan pengguna',
    editor: 'Meninjau dan menerbitkan berita wilayahnya',
    journalist: 'Menulis dan mengajukan berita ke editor',
    contributor: 'Warga yang mengirim draft berita',
};

export default function UserForm({ user, roles, regions }: Props) {
    const [role, setRole] = useState<Role>(user?.role ?? 'contributor');
    const [name, setName] = useState(user?.name ?? '');
    const [showPassword, setShowPassword] = useState(false);
    const title = user ? 'Edit pengguna' : 'Pengguna baru';

    return (
        <AdminLayout
            title={title}
            actions={
                <Link href={index.url()} className="btn-ghost">
                    <Icon name="back" width={16} height={16} />
                    Kembali
                </Link>
            }
        >
            <Head title={title} />
            <Form
                action={user ? update.url(user.id) : store.url()}
                method={user ? 'put' : 'post'}
                className="max-w-3xl overflow-hidden card"
            >
                {({ errors, processing }) => (
                    <>
                        {/* Live identity preview */}
                        <div className="flex items-center gap-4 border-b border-slate-100 bg-gradient-to-r from-accent/[0.06] to-transparent p-5 sm:p-6">
                            <Avatar
                                name={name || '?'}
                                className="size-14 text-base"
                            />
                            <div className="min-w-0">
                                <p className="truncate text-lg font-semibold text-navy-900">
                                    {name || 'Nama pengguna'}
                                </p>
                                <p className="text-sm text-slate-500">
                                    {roles.find((r) => r.value === role)?.label}
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
                            <Field label="Nama" error={errors.name}>
                                <input
                                    name="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="input"
                                />
                            </Field>
                            <Field label="Email" error={errors.email}>
                                <input
                                    name="email"
                                    type="email"
                                    defaultValue={user?.email}
                                    required
                                    className="input"
                                />
                            </Field>
                            <Field
                                label="Password"
                                hint={
                                    user
                                        ? 'Kosongkan jika tidak diubah'
                                        : undefined
                                }
                                error={errors.password}
                            >
                                <span className="relative block">
                                    <input
                                        name="password"
                                        type={
                                            showPassword ? 'text' : 'password'
                                        }
                                        autoComplete="new-password"
                                        required={!user}
                                        className="input pr-11"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword((v) => !v)
                                        }
                                        aria-label={
                                            showPassword
                                                ? 'Sembunyikan password'
                                                : 'Tampilkan password'
                                        }
                                        className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 hover:text-accent"
                                    >
                                        <Icon
                                            name={
                                                showPassword ? 'eye-off' : 'eye'
                                            }
                                            width={18}
                                            height={18}
                                        />
                                    </button>
                                </span>
                            </Field>
                            <Field
                                label="Wilayah tugas"
                                error={errors.region_code}
                            >
                                <select
                                    name="region_code"
                                    defaultValue={user?.region_code ?? ''}
                                    className="input"
                                >
                                    <option value="">Nasional / semua</option>
                                    {regions.map((r) => (
                                        <option key={r.code} value={r.code}>
                                            {r.level === 2
                                                ? `   ${r.name}`
                                                : r.name}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <fieldset className="sm:col-span-2">
                                <legend className="text-sm font-medium text-navy-900">
                                    Peran
                                </legend>
                                <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                                    {roles.map((r) => {
                                        const on = role === r.value;
                                        return (
                                            <label
                                                key={r.value}
                                                className={cn(
                                                    'relative flex cursor-pointer items-start gap-3 rounded-2xl p-3.5 ring-1 transition',
                                                    on
                                                        ? 'bg-accent/[0.04] ring-2 ring-accent'
                                                        : 'ring-slate-200 hover:ring-accent/40',
                                                )}
                                            >
                                                <input
                                                    type="radio"
                                                    name="role"
                                                    value={r.value}
                                                    checked={on}
                                                    onChange={() =>
                                                        setRole(r.value)
                                                    }
                                                    className="sr-only"
                                                />
                                                <span
                                                    className={cn(
                                                        'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ring-2 transition',
                                                        on
                                                            ? 'bg-accent ring-accent'
                                                            : 'ring-slate-300',
                                                    )}
                                                >
                                                    {on && (
                                                        <motion.span
                                                            initial={{
                                                                scale: 0,
                                                            }}
                                                            animate={{
                                                                scale: 1,
                                                            }}
                                                            className="size-2 rounded-full bg-white"
                                                        />
                                                    )}
                                                </span>
                                                <span>
                                                    <span className="block text-sm font-medium text-navy-900">
                                                        {r.label}
                                                    </span>
                                                    <span className="block text-xs text-slate-500">
                                                        {roleHint[r.value]}
                                                    </span>
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                                {errors.role && (
                                    <p className="mt-1 text-xs text-red-600">
                                        {errors.role}
                                    </p>
                                )}
                            </fieldset>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6">
                            <Link href={index.url()} className="btn-ghost">
                                Batal
                            </Link>
                            <button
                                disabled={processing}
                                className="btn-primary"
                            >
                                <Icon name="check" width={16} height={16} />
                                {processing ? 'Menyimpan…' : 'Simpan pengguna'}
                            </button>
                        </div>
                    </>
                )}
            </Form>
        </AdminLayout>
    );
}
