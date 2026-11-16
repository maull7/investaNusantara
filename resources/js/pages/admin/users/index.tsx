import { Head, Link, router, usePage } from '@inertiajs/react';
import { motion } from 'motion/react';
import { Avatar, EmptyState, RoleBadge } from '@/components/admin/ui';
import Icon from '@/components/icons';
import { ease } from '@/components/motion';
import Pagination from '@/components/pagination';
import AdminLayout from '@/layouts/admin';
import { create, destroy, edit } from '@/routes/admin/users';
import type { Paginated, User } from '@/types';

type Row = User & { region: { name: string } | null };

export default function UsersIndex({ users }: { users: Paginated<Row> }) {
    const me = usePage().props.auth.user!;

    return (
        <AdminLayout
            title="Pengguna"
            subtitle={`${users.total} anggota tim redaksi`}
            actions={
                <Link href={create.url()} className="btn-primary">
                    <Icon name="plus" width={16} height={16} />
                    Tambah pengguna
                </Link>
            }
        >
            <Head title="Pengguna" />

            {users.data.length === 0 ? (
                <div className="card">
                    <EmptyState icon="users" title="Belum ada pengguna" />
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {users.data.map((u, i) => (
                        <motion.article
                            key={u.id}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                delay: i * 0.04,
                                duration: 0.45,
                                ease,
                            }}
                            whileHover={{ y: -3 }}
                            className="group flex flex-col card p-5 transition-shadow hover:shadow-[0_16px_40px_-20px_rgba(107,7,18,0.35)]"
                        >
                            <div className="flex items-start gap-3">
                                <Avatar name={u.name} className="size-12" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-navy-900">
                                        {u.name}
                                        {u.id === me.id && (
                                            <span className="ml-1.5 text-xs font-normal text-slate-400">
                                                (kamu)
                                            </span>
                                        )}
                                    </p>
                                    <p className="truncate text-xs text-slate-500">
                                        {u.email}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <RoleBadge role={u.role} />
                                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                    <Icon name="map" width={13} height={13} />
                                    {u.region?.name ?? 'Nasional'}
                                </span>
                            </div>
                            <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
                                <Link
                                    href={edit.url(u.id)}
                                    className="btn-ghost flex-1 py-1.5 text-xs"
                                >
                                    <Icon name="edit" width={14} height={14} />
                                    Edit
                                </Link>
                                {u.id !== me.id && (
                                    <button
                                        aria-label={`Hapus ${u.name}`}
                                        className="btn-danger px-2.5 py-1.5 text-xs"
                                        onClick={() =>
                                            confirm(`Hapus ${u.name}?`) &&
                                            router.delete(destroy.url(u.id), {
                                                preserveScroll: true,
                                            })
                                        }
                                    >
                                        <Icon
                                            name="trash"
                                            width={14}
                                            height={14}
                                        />
                                    </button>
                                )}
                            </div>
                        </motion.article>
                    ))}
                </div>
            )}
            <Pagination data={users} />
        </AdminLayout>
    );
}
