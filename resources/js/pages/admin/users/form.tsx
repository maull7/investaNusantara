import { Form, Head, Link } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Avatar, Field } from '@/components/admin/ui';
import Icon from '@/components/icons';
import AdminLayout from '@/layouts/admin';
import { cn } from '@/lib/utils';
import { index, store, update } from '@/routes/admin/users';
import { ease } from '@/components/motion';
import type { Permission, PermissionOption, Role, User } from '@/types';

type Props = {
    user:
        | (Pick<
              User,
              'id' | 'name' | 'email' | 'role' | 'region_code' | 'permissions'
          > & {
              organization?: string | null;
              client_regions?: string[] | null;
              subscription_ends_at?: string | null;
          })
        | null;
    roles: { value: Role; label: string }[];
    permissions: PermissionOption[];
    regions: { code: string; name: string; level: number }[];
};

const roleHint: Record<Role, string> = {
    super_admin: 'Akses penuh, kelola kategori dan pengguna',
    sub_admin: 'Hanya mengakses area yang kamu tetapkan',
    editor: 'Meninjau dan menerbitkan berita wilayahnya',
    journalist: 'Menulis dan mengajukan berita ke editor',
    contributor: 'Warga yang mengirim draft berita',
    customer: 'Pembaca: hanya mengakses situs publik, bukan ruang redaksi',
    client: 'Pelanggan Media Intelligence (pemda, perusahaan, konsultan): hanya dashboard',
};

export default function UserForm({ user, roles, permissions, regions }: Props) {
    const [role, setRole] = useState<Role>(user?.role ?? 'contributor');
    const [granted, setGranted] = useState<Permission[]>(
        user?.permissions ?? [],
    );
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

                            <AnimatePresence initial={false}>
                                {role === 'client' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.3, ease }}
                                        className="-m-1 overflow-hidden p-1 sm:col-span-2"
                                    >
                                        <ClientFields
                                            user={user}
                                            provinces={regions.filter(
                                                (r) => r.level === 1,
                                            )}
                                            errors={errors}
                                        />
                                    </motion.div>
                                )}
                                {role === 'sub_admin' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.3, ease }}
                                        className="-m-1 overflow-hidden p-1 sm:col-span-2"
                                    >
                                        <PermissionPicker
                                            options={permissions}
                                            value={granted}
                                            onChange={setGranted}
                                            error={errors.permissions}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
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

/** Checklist of admin areas a Sub Admin may open. */
function PermissionPicker({
    options,
    value,
    onChange,
    error,
}: {
    options: PermissionOption[];
    value: Permission[];
    onChange: (value: Permission[]) => void;
    error?: string;
}) {
    const all = value.length === options.length;

    function toggle(p: Permission) {
        onChange(
            value.includes(p) ? value.filter((v) => v !== p) : [...value, p],
        );
    }

    return (
        <div
            role="group"
            aria-label="Akses Sub Admin"
            className="rounded-2xl bg-navy-50/60 p-4 ring-1 ring-navy-100"
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-medium text-navy-900">
                    <Icon
                        name="shield"
                        width={16}
                        height={16}
                        className="text-navy-700"
                    />
                    Akses Sub Admin
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-normal text-slate-500 ring-1 ring-slate-200">
                        {value.length}/{options.length} area
                    </span>
                </p>
                <button
                    type="button"
                    onClick={() =>
                        onChange(all ? [] : options.map((o) => o.value))
                    }
                    className="text-xs font-medium text-accent hover:text-accent-dark"
                >
                    {all ? 'Kosongkan' : 'Pilih semua'}
                </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
                Menu di luar pilihan ini tidak akan tampil dan tidak bisa
                dibuka. Tanpa akses artikel, Sub Admin hanya mengelola
                tulisannya sendiri.
            </p>

            {/* Sent as permissions[]; none checked means no extra access. */}
            {value.map((p) => (
                <input key={p} type="hidden" name="permissions[]" value={p} />
            ))}

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {options.map((o) => {
                    const on = value.includes(o.value);
                    return (
                        <label
                            key={o.value}
                            className={cn(
                                'flex cursor-pointer items-start gap-3 rounded-xl bg-white p-3 ring-1 transition',
                                on
                                    ? 'ring-2 ring-navy-700'
                                    : 'ring-slate-200 hover:ring-navy-700/40',
                            )}
                        >
                            <input
                                type="checkbox"
                                checked={on}
                                onChange={() => toggle(o.value)}
                                className="mt-0.5 size-4 shrink-0 rounded accent-navy-700"
                            />
                            <span>
                                <span className="block text-sm font-medium text-navy-900">
                                    {o.label}
                                </span>
                                <span className="block text-xs text-slate-500">
                                    {o.description}
                                </span>
                            </span>
                        </label>
                    );
                })}
            </div>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
    );
}

/** Klien Data: organization, subscribed provinces (none = all of Indonesia), end date. */
function ClientFields({
    user,
    provinces,
    errors,
}: {
    user: Props['user'];
    provinces: { code: string; name: string }[];
    errors: Record<string, string>;
}) {
    const [picked, setPicked] = useState<string[]>(user?.client_regions ?? []);
    const toggle = (code: string) =>
        setPicked((v) =>
            v.includes(code) ? v.filter((c) => c !== code) : [...v, code],
        );

    return (
        <div className="space-y-4 rounded-2xl bg-teal/5 p-4 ring-1 ring-teal/20">
            <p className="flex items-center gap-2 text-sm font-medium text-navy-900">
                <Icon
                    name="chart"
                    width={16}
                    height={16}
                    className="text-teal-dark"
                />
                Langganan Media Intelligence
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Organisasi" error={errors.organization}>
                    <input
                        name="organization"
                        defaultValue={user?.organization ?? ''}
                        placeholder="Pemkab Bekasi / PT Contoh / Konsultan"
                        className="input"
                    />
                </Field>
                <Field
                    label="Langganan sampai"
                    hint="kosong = tanpa batas"
                    error={errors.subscription_ends_at}
                >
                    <input
                        type="date"
                        name="subscription_ends_at"
                        defaultValue={user?.subscription_ends_at ?? ''}
                        className="input"
                    />
                </Field>
            </div>
            <div>
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-navy-900">
                        Provinsi yang dilanggan
                    </p>
                    <span className="text-xs text-slate-500">
                        {picked.length
                            ? `${picked.length} provinsi`
                            : 'Seluruh Indonesia'}
                    </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                    Kosongkan untuk akses seluruh Indonesia.
                </p>
                {picked.map((c) => (
                    <input
                        key={c}
                        type="hidden"
                        name="client_regions[]"
                        value={c}
                    />
                ))}
                <div className="mt-2 flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
                    {provinces.map((p) => {
                        const on = picked.includes(p.code);
                        return (
                            <button
                                key={p.code}
                                type="button"
                                aria-pressed={on}
                                onClick={() => toggle(p.code)}
                                className={cn(
                                    'rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors',
                                    on
                                        ? 'bg-teal-dark text-white ring-teal-dark'
                                        : 'bg-white text-slate-600 ring-slate-200 hover:ring-teal/50',
                                )}
                            >
                                {p.name}
                            </button>
                        );
                    })}
                </div>
                {errors['client_regions.0'] && (
                    <p className="mt-1 text-xs text-red-600">
                        {errors['client_regions.0']}
                    </p>
                )}
            </div>
        </div>
    );
}
