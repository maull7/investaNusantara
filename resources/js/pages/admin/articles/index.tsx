import { Form, Head, Link, router } from '@inertiajs/react';
import Pagination from '@/components/pagination';
import AdminLayout from '@/layouts/admin';
import { formatDate } from '@/lib/news';
import { cn } from '@/lib/utils';
import { article as publicArticle } from '@/routes';
import {
    create,
    edit,
    index,
    publish,
    reject,
    submit,
} from '@/routes/admin/articles';
import type { ArticleStatus, Paginated } from '@/types';

type Row = {
    id: number;
    title: string;
    slug: string;
    status: ArticleStatus;
    views: number;
    published_at: string | null;
    updated_at: string;
    category: { name: string };
    region: { name: string } | null;
    author: { name: string };
    can: { update: boolean; publish: boolean; submit: boolean };
};

export const statusLabel: Record<ArticleStatus, string> = {
    draft: 'Draft',
    review: 'Menunggu review',
    published: 'Terbit',
    rejected: 'Dikembalikan',
};

const statusColor: Record<ArticleStatus, string> = {
    draft: 'bg-slate-200 text-slate-700',
    review: 'bg-amber-100 text-amber-800',
    published: 'bg-teal/15 text-teal-dark',
    rejected: 'bg-red-100 text-red-700',
};

export default function ArticlesIndex({
    articles,
    filters,
}: {
    articles: Paginated<Row>;
    filters: { status?: string; q?: string };
}) {
    return (
        <AdminLayout
            title="Artikel"
            actions={
                <Link href={create.url()} className="btn-primary">
                    + Tulis artikel
                </Link>
            }
        >
            <Head title="Artikel" />
            <Form
                action={index.url()}
                method="get"
                className="mb-4 flex flex-wrap gap-2"
            >
                <input
                    name="q"
                    defaultValue={filters.q}
                    placeholder="Cari judul…"
                    className="input max-w-xs"
                />
                <select
                    name="status"
                    defaultValue={filters.status ?? ''}
                    className="input max-w-48"
                >
                    <option value="">Semua status</option>
                    {Object.entries(statusLabel).map(([v, l]) => (
                        <option key={v} value={v}>
                            {l}
                        </option>
                    ))}
                </select>
                <button className="btn-ghost">Filter</button>
            </Form>

            <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-slate-200">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                        <tr>
                            <th className="px-4 py-3">Judul</th>
                            <th className="px-4 py-3">Wilayah</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Diperbarui</th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {articles.data.map((a) => (
                            <tr key={a.id}>
                                <td className="max-w-md px-4 py-3">
                                    <p className="font-medium text-navy-900">
                                        {a.title}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {a.category.name} · {a.author.name} ·{' '}
                                        {a.views} views
                                    </p>
                                </td>
                                <td className="px-4 py-3">
                                    {a.region?.name ?? 'Nasional'}
                                </td>
                                <td className="px-4 py-3">
                                    <span
                                        className={cn(
                                            'rounded px-2 py-0.5 text-xs font-medium',
                                            statusColor[a.status],
                                        )}
                                    >
                                        {statusLabel[a.status]}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-500">
                                    {formatDate(a.updated_at)}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex justify-end gap-1 whitespace-nowrap">
                                        {a.status === 'published' && (
                                            <a
                                                href={publicArticle.url(a.slug)}
                                                target="_blank"
                                                className="btn-ghost"
                                            >
                                                Lihat
                                            </a>
                                        )}
                                        {a.can.update && (
                                            <Link
                                                href={edit.url(a.id)}
                                                className="btn-ghost"
                                            >
                                                Edit
                                            </Link>
                                        )}
                                        {a.can.submit &&
                                            a.status !== 'review' && (
                                                <button
                                                    onClick={() =>
                                                        router.post(
                                                            submit.url(a.id),
                                                        )
                                                    }
                                                    className="btn-ghost"
                                                >
                                                    Ajukan
                                                </button>
                                            )}
                                        {a.can.publish &&
                                            a.status !== 'published' && (
                                                <button
                                                    onClick={() =>
                                                        router.post(
                                                            publish.url(a.id),
                                                        )
                                                    }
                                                    className="btn-teal"
                                                >
                                                    Terbitkan
                                                </button>
                                            )}
                                        {a.can.publish &&
                                            a.status === 'review' && (
                                                <button
                                                    onClick={() =>
                                                        router.post(
                                                            reject.url(a.id),
                                                        )
                                                    }
                                                    className="btn-danger"
                                                >
                                                    Tolak
                                                </button>
                                            )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {articles.data.length === 0 && (
                    <p className="p-8 text-center text-slate-500">
                        Belum ada artikel.
                    </p>
                )}
            </div>
            <Pagination data={articles} />
        </AdminLayout>
    );
}
