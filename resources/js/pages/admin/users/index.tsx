import { Head, Link, router, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Avatar, EmptyState, RoleBadge, roleLabel } from '@/components/admin/ui';
import Icon from '@/components/icons';
import { ease } from '@/components/motion';
import Pagination from '@/components/pagination';
import AdminLayout from '@/layouts/admin';
import { cn } from '@/lib/utils';
import { create, destroy, edit } from '@/routes/admin/users';
import type { Paginated, PermissionOption, Role, User } from '@/types';

type Row = User & { region: { name: string } | null; manageable: boolean };

export default function UsersIndex({
    users,
    permissions,
}: {
    users: Paginated<Row>;
    permissions: PermissionOption[];
}) {
    const permissionLabel = Object.fromEntries(
        permissions.map((p) => [p.value, p.label]),
    );
    const me = usePage().props.auth.user!;
    const [search, setSearch] = useState('');
    const [selectedRole, setSelectedRole] = useState<string>('all');

    // Filter users locally for quick real-time search & role
    const filteredUsers = useMemo(() => {
        return users.data.filter((u) => {
            const query = search.toLowerCase().trim();
            const matchesSearch =
                query === '' ||
                u.name.toLowerCase().includes(query) ||
                u.email.toLowerCase().includes(query) ||
                (u.region?.name &&
                    u.region.name.toLowerCase().includes(query));

            const matchesRole =
                selectedRole === 'all' || u.role === selectedRole;

            return matchesSearch && matchesRole;
        });
    }, [users.data, search, selectedRole]);

    // Role statistics
    const rolesSummary = useMemo(() => {
        const counts: Record<string, number> = { all: users.data.length };
        for (const u of users.data) {
            counts[u.role] = (counts[u.role] ?? 0) + 1;
        }
        return counts;
    }, [users.data]);

    const roleTabs: { id: string; label: string; activeClass: string; inactiveClass: string; badgeActive: string; badgeInactive: string }[] = [
        {
            id: 'all',
            label: 'Semua Anggota',
            activeClass: 'bg-navy-900 text-white shadow-sm ring-navy-900',
            inactiveClass: 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-navy-900 ring-slate-200/60',
            badgeActive: 'bg-white/20 text-white',
            badgeInactive: 'bg-white text-slate-700 shadow-2xs',
        },
        {
            id: 'super_admin',
            label: 'Super Admin',
            activeClass: 'bg-accent text-white shadow-sm ring-accent',
            inactiveClass: 'bg-accent/10 text-accent hover:bg-accent/15 ring-accent/25',
            badgeActive: 'bg-white/25 text-white',
            badgeInactive: 'bg-white text-accent shadow-2xs',
        },
        {
            id: 'sub_admin',
            label: 'Sub Admin',
            activeClass: 'bg-navy-700 text-white shadow-sm ring-navy-700',
            inactiveClass: 'bg-navy-50 text-navy-700 hover:bg-navy-100 ring-navy-200',
            badgeActive: 'bg-white/25 text-white',
            badgeInactive: 'bg-white text-navy-700 shadow-2xs',
        },
        {
            id: 'editor',
            label: 'Editor Daerah',
            activeClass: 'bg-violet-600 text-white shadow-sm ring-violet-600',
            inactiveClass: 'bg-violet-50 text-violet-700 hover:bg-violet-100 ring-violet-200',
            badgeActive: 'bg-white/25 text-white',
            badgeInactive: 'bg-white text-violet-700 shadow-2xs',
        },
        {
            id: 'journalist',
            label: 'Wartawan',
            activeClass: 'bg-sky-600 text-white shadow-sm ring-sky-600',
            inactiveClass: 'bg-sky-50 text-sky-700 hover:bg-sky-100 ring-sky-200',
            badgeActive: 'bg-white/25 text-white',
            badgeInactive: 'bg-white text-sky-700 shadow-2xs',
        },
        {
            id: 'contributor',
            label: 'Kontributor',
            activeClass: 'bg-amber-600 text-white shadow-sm ring-amber-600',
            inactiveClass: 'bg-amber-50 text-amber-700 hover:bg-amber-100 ring-amber-200',
            badgeActive: 'bg-white/25 text-white',
            badgeInactive: 'bg-white text-amber-700 shadow-2xs',
        },
        {
            id: 'customer',
            label: 'Pelanggan',
            activeClass: 'bg-emerald-600 text-white shadow-sm ring-emerald-600',
            inactiveClass: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ring-emerald-200',
            badgeActive: 'bg-white/25 text-white',
            badgeInactive: 'bg-white text-emerald-700 shadow-2xs',
        },
        {
            id: 'client',
            label: 'Klien Data',
            activeClass: 'bg-teal text-white shadow-sm ring-teal',
            inactiveClass: 'bg-teal/10 text-teal-dark hover:bg-teal/20 ring-teal/30',
            badgeActive: 'bg-white/25 text-white',
            badgeInactive: 'bg-white text-teal-dark shadow-2xs',
        },
    ];

    return (
        <AdminLayout
            title="Pengguna"
            subtitle={`${users.total} anggota tim redaksi terdaftar`}
            actions={
                <Link
                    href={create.url()}
                    className="btn-primary flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium shadow-sm transition hover:shadow-md"
                >
                    <Icon name="plus" width={16} height={16} />
                    <span>Tambah pengguna</span>
                </Link>
            }
        >
            <Head title="Pengguna" />

            {/* List Container Card */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
                {/* Header Filter Bar */}
                <div className="border-b border-slate-100 p-4 sm:p-5">
                    <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-base font-semibold text-navy-900">
                                Daftar Anggota Redaksi
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-500">
                                {filteredUsers.length} pengguna ditampilkan
                                {search && ` untuk pencarian "${search}"`}
                            </p>
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-80">
                            <Icon
                                name="search"
                                width={18}
                                height={18}
                                className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari nama, email, wilayah…"
                                aria-label="Cari pengguna"
                                className="input rounded-full bg-slate-50/90 pr-9 pl-10 text-xs sm:text-sm"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    aria-label="Hapus pencarian"
                                    className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <Icon name="x" width={14} height={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter Pills with Color Theme */}
                    <div className="no-scrollbar mt-3.5 flex items-center gap-2 overflow-x-auto pt-1 text-xs">
                        {roleTabs
                            .filter(
                                (tab) => tab.id === 'all' || rolesSummary[tab.id],
                            )
                            .map((tab) => {
                                const count = rolesSummary[tab.id] ?? 0;
                                const active = selectedRole === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setSelectedRole(tab.id)}
                                        className={cn(
                                            'inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 font-medium ring-1 transition-all',
                                            active
                                                ? tab.activeClass
                                                : tab.inactiveClass,
                                        )}
                                    >
                                        <span>{tab.label}</span>
                                        <span
                                            className={cn(
                                                'rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors',
                                                active
                                                    ? tab.badgeActive
                                                    : tab.badgeInactive,
                                            )}
                                        >
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                    </div>
                </div>

                {/* Table Data View */}
                {filteredUsers.length === 0 ? (
                    <div className="p-10 text-center">
                        <EmptyState
                            icon="users"
                            title="Pengguna tidak ditemukan"
                        >
                            {search
                                ? `Tidak ada anggota yang cocok dengan kata kunci "${search}".`
                                : 'Belum ada pengguna pada kategori ini.'}
                        </EmptyState>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                    <th className="px-6 py-3.5">Nama & Kontak</th>
                                    <th className="px-6 py-3.5">Peran</th>
                                    <th className="px-6 py-3.5">Wilayah Tugas</th>
                                    <th className="px-6 py-3.5">Izin / Akses Khusus</th>
                                    <th className="px-6 py-3.5 text-right">Tindakan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <AnimatePresence mode="popLayout" initial={false}>
                                    {filteredUsers.map((u, i) => (
                                        <motion.tr
                                            key={u.id}
                                            layout
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{
                                                opacity: 1,
                                                y: 0,
                                                transition: {
                                                    delay: Math.min(i, 10) * 0.02,
                                                    duration: 0.25,
                                                    ease,
                                                },
                                            }}
                                            exit={{
                                                opacity: 0,
                                                transition: { duration: 0.15 },
                                            }}
                                            className="group transition-colors hover:bg-slate-50/70"
                                        >
                                            {/* Kolom 1: Avatar + Nama + Email */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3.5">
                                                    <Avatar
                                                        name={u.name}
                                                        className="size-10 shrink-0 text-xs font-bold shadow-sm ring-2 ring-white"
                                                    />
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-navy-900">
                                                                {u.name}
                                                            </span>
                                                            {u.id === me.id && (
                                                                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-accent ring-1 ring-accent/20">
                                                                    KAMU
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="block truncate text-xs text-slate-500">
                                                            {u.email}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Kolom 2: Peran (RoleBadge) */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <RoleBadge role={u.role} />
                                            </td>

                                            {/* Kolom 3: Wilayah Tugas */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200/60">
                                                    <Icon
                                                        name="map"
                                                        width={13}
                                                        height={13}
                                                        className="text-slate-400"
                                                    />
                                                    <span>
                                                        {u.region?.name ?? 'Nasional'}
                                                    </span>
                                                </span>
                                            </td>

                                            {/* Kolom 4: Izin Sub Admin */}
                                            <td className="px-6 py-4">
                                                {u.role === 'sub_admin' ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {u.permissions?.length ? (
                                                            u.permissions.map((p) => (
                                                                <span
                                                                    key={p}
                                                                    className="inline-flex items-center gap-1 rounded-md bg-navy-50 px-2 py-0.5 text-[11px] font-medium text-navy-700 ring-1 ring-navy-100"
                                                                >
                                                                    <Icon
                                                                        name="shield"
                                                                        width={10}
                                                                        height={10}
                                                                        className="text-navy-400"
                                                                    />
                                                                    <span>{permissionLabel[p]}</span>
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-slate-400 italic">
                                                                Belum ada akses
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400">
                                                        Hak akses standar
                                                    </span>
                                                )}
                                            </td>

                                            {/* Kolom 5: Aksi (Icon buttons) */}
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {/* Tombol Edit */}
                                                    {u.manageable ? (
                                                        <Link
                                                            href={edit.url(u.id)}
                                                            aria-label={`Edit ${u.name}`}
                                                            title={`Edit ${u.name}`}
                                                            className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-navy-900"
                                                        >
                                                            <Icon
                                                                name="edit"
                                                                width={15}
                                                                height={15}
                                                            />
                                                        </Link>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            disabled
                                                            aria-label="Edit tidak diizinkan"
                                                            title="Hanya Super Admin yang dapat mengedit akun ini"
                                                            className="inline-flex size-8 cursor-not-allowed items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-300 opacity-60"
                                                        >
                                                            <Icon
                                                                name="edit"
                                                                width={15}
                                                                height={15}
                                                            />
                                                        </button>
                                                    )}

                                                    {/* Tombol Hapus */}
                                                    {u.manageable && u.id !== me.id ? (
                                                        <button
                                                            type="button"
                                                            aria-label={`Hapus ${u.name}`}
                                                            title={`Hapus ${u.name}`}
                                                            className="inline-flex size-8 items-center justify-center rounded-lg border border-red-200 bg-red-50/50 text-red-600 transition hover:bg-red-100 hover:text-red-700"
                                                            onClick={() =>
                                                                confirm(
                                                                    `Hapus pengguna ${u.name}? Tindakan ini tidak dapat dibatalkan.`,
                                                                ) &&
                                                                router.delete(
                                                                    destroy.url(u.id),
                                                                    {
                                                                        preserveScroll: true,
                                                                    },
                                                                )
                                                            }
                                                        >
                                                            <Icon
                                                                name="trash"
                                                                width={15}
                                                                height={15}
                                                            />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            disabled
                                                            aria-label="Hapus tidak diizinkan"
                                                            title={
                                                                u.id === me.id
                                                                    ? 'Tidak dapat menghapus akun sendiri'
                                                                    : 'Hanya Super Admin yang dapat menghapus akun ini'
                                                            }
                                                            className="inline-flex size-8 cursor-not-allowed items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-300 opacity-60"
                                                        >
                                                            <Icon
                                                                name="trash"
                                                                width={15}
                                                                height={15}
                                                            />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="mt-6">
                <Pagination data={users} />
            </div>
        </AdminLayout>
    );
}
