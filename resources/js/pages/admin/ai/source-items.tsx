import { Head, Link } from '@inertiajs/react';
import { TaskPill, type TaskStatus } from '@/components/admin/ai';
import { EmptyState } from '@/components/admin/ui';
import Icon from '@/components/icons';
import Pagination from '@/components/pagination';
import AdminLayout from '@/layouts/admin';
import { timeAgo } from '@/lib/news';
import { cn } from '@/lib/utils';
import { sources as sourcesPage } from '@/routes/admin/ai';
import type { Paginated } from '@/types';
import { type Item, ItemRow, viaLabel } from './index';

type Props = {
    source: { id: number; name: string; url: string };
    fetches: {
        id: number;
        status: TaskStatus;
        trigger: 'manual' | 'schedule';
        via: keyof typeof viaLabel | null;
        found: number;
        error: string | null;
        inspected_links: { url: string | null; title: string; reason: 'known' | 'invalid' | 'new' }[] | null;
        created_at: string;
    }[];
    items: Paginated<Item>;
};

export default function SourceItems({ source, fetches, items }: Props) {
    return (
        <AdminLayout
            title={source.name}
            subtitle="Berita yang diambil dari sumber ini, dari yang terbaru."
            actions={
                <Link
                    href={sourcesPage.url()}
                    className="btn-ghost py-2 text-sm"
                >
                    <Icon name="back" width={16} height={16} />
                    Sumber berita
                </Link>
            }
        >
            <Head title={`Berita dari ${source.name}`} />

            <h2 className="mb-2 text-sm font-semibold text-navy-900">
                Pengambilan terakhir
            </h2>
            {fetches.length === 0 ? (
                <p className="mb-6 text-sm text-slate-500">
                    Sumber ini belum pernah diambil.
                </p>
            ) : (
                <ul className="mb-6 divide-y divide-slate-100 card">
                    {fetches.map((f) => (
                        <li
                            key={f.id}
                            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 sm:px-5"
                        >
                            <p className="min-w-0 flex-1 text-xs text-slate-500">
                                {f.trigger === 'schedule'
                                    ? 'Terjadwal'
                                    : 'Manual'}{' '}
                                · {timeAgo(f.created_at)}
                                {f.via && ` · lewat ${viaLabel[f.via]}`}
                                {f.status === 'completed' &&
                                    ` · ${f.found} berita baru`}
                            </p>
                            <TaskPill status={f.status} />
                            {f.error && (
                                <p
                                    className={cn(
                                        'w-full text-xs',
                                        f.status === 'completed'
                                            ? 'text-amber-700'
                                            : 'text-red-600',
                                    )}
                                >
                                    {f.error}
                                </p>
                            )}
                            {f.inspected_links && f.inspected_links.length > 0 && (
                                <details className="w-full text-xs text-slate-600">
                                    <summary className="cursor-pointer text-navy-700">
                                        Lihat {f.inspected_links.length} tautan yang diperiksa
                                    </summary>
                                    <ul className="mt-2 space-y-2 pl-3">
                                        {f.inspected_links.map((link, index) => (
                                            <li key={`${link.url}-${index}`} className="break-all">
                                                <span className="font-medium">
                                                    {link.reason === 'known' ? 'Sudah pernah diambil' : link.reason === 'new' ? 'Berita baru' : 'Ditolak: domain lain, tautan tidak valid, atau tanpa judul'}
                                                </span>{' '}
                                                · {link.url ? (
                                                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-navy-900">
                                                        {link.title || link.url}
                                                    </a>
                                                ) : (link.title || 'Tautan kosong')}
                                            </li>
                                        ))}
                                    </ul>
                                </details>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            <h2 className="mb-2 text-sm font-semibold text-navy-900">
                Daftar berita ({items.total})
            </h2>
            {items.data.length === 0 ? (
                <div className="card">
                    <EmptyState icon="file" title="Belum ada berita">
                        Belum ada berita yang diambil dari sumber ini. Alasannya
                        biasanya tertulis di pengambilan terakhir di atas.
                    </EmptyState>
                </div>
            ) : (
                <ul className="divide-y divide-slate-100 card">
                    {items.data.map((item) => (
                        <ItemRow key={item.id} item={item} />
                    ))}
                </ul>
            )}
            <Pagination data={items} />
        </AdminLayout>
    );
}
