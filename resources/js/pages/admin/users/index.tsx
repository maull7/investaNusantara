import { Head, Link, router } from '@inertiajs/react';
import Pagination from '@/components/pagination';
import AdminLayout from '@/layouts/admin';
import { create, destroy, edit } from '@/routes/admin/users';
import type { Paginated, User } from '@/types';

type Row = User & { region: { name: string } | null };

export default function UsersIndex({ users }: { users: Paginated<Row> }) {
    return (
        <AdminLayout
            title="Pengguna"
            actions={
                <Link href={create.url()} className="btn-primary">
                    + Pengguna
                </Link>
            }
        >
            <Head title="Pengguna" />
            <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-slate-200">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                        <tr>
                            <th className="px-4 py-3">Nama</th>
                            <th className="px-4 py-3">Peran</th>
                            <th className="px-4 py-3">Wilayah</th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.data.map((u) => (
                            <tr key={u.id}>
                                <td className="px-4 py-3">
                                    <p className="font-medium text-navy-900">
                                        {u.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {u.email}
                                    </p>
                                </td>
                                <td className="px-4 py-3">{u.role}</td>
                                <td className="px-4 py-3">
                                    {u.region?.name ?? '-'}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex justify-end gap-1">
                                        <Link
                                            href={edit.url(u.id)}
                                            className="btn-ghost"
                                        >
                                            Edit
                                        </Link>
                                        <button
                                            className="btn-danger"
                                            onClick={() =>
                                                confirm(`Hapus ${u.name}?`) &&
                                                router.delete(destroy.url(u.id))
                                            }
                                        >
                                            Hapus
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pagination data={users} />
        </AdminLayout>
    );
}
