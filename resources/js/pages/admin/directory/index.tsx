import { Form, Head, Link, router } from '@inertiajs/react';
import { TaskPill, type TaskStatus } from '@/components/admin/ai';
import { CountUp, EmptyState } from '@/components/admin/ui';
import Icon from '@/components/icons';
import Pagination from '@/components/pagination';
import AdminLayout from '@/layouts/admin';
import { cn } from '@/lib/utils';
import { draft, index, show } from '@/routes/admin/directory';
import type { Paginated } from '@/types';

type Row = {
    code: string;
    name: string;
    level: number;
    entries_count: number;
    pending_count: number;
    facts: number;
    verified: boolean;
    has_profile: boolean;
    draft: { status: TaskStatus; error: string | null } | null;
};

type Props = {
    regions: Paginated<Row>;
    provinces: { code: string; name: string }[];
    filters: { q?: string; status?: string; province?: string };
    stats: {
        verified: number;
        draft: number;
        regions: number;
        pending_entries: number;
    };
};

export default function DirectoryIndex({
    regions,
    provinces,
    filters,
    stats,
}: Props) {
    const tiles = [
        {
            label: 'Terverifikasi',
            value: stats.verified,
            dot: 'bg-emerald-500',
        },
        { label: 'Profil draf', value: stats.draft, dot: 'bg-amber-500' },
        {
            label: 'Belum ada profil',
            value: Math.max(0, stats.regions - stats.verified - stats.draft),
            dot: 'bg-slate-400',
        },
        {
            label: 'Entri menunggu verifikasi',
            value: stats.pending_entries,
            dot: 'bg-accent',
        },
    ];

    return (
        <AdminLayout
            title="Direktori Daerah"
            subtitle="Profil, wisata, UMKM, dan event tiap daerah. AI menyusun draf, tim memverifikasi sebelum tampil."
        >
            <Head title="Direktori Daerah" />

            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {tiles.map((t) => (
                    <div key={t.label} className="card p-4">
                        <p className="flex items-center gap-2 text-xs text-slate-500">
                            <span
                                className={cn('size-2 rounded-full', t.dot)}
                            />
                            {t.label}
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-navy-900">
                            <CountUp value={t.value} />
                        </p>
                    </div>
                ))}
            </div>

            <Form
                action={index.url()}
                method="get"
                options={{ preserveScroll: true, preserveState: true }}
                className="mb-5 grid gap-2 card p-3 sm:grid-cols-[1fr_12rem_12rem_auto]"
            >
                <input
                    name="q"
                    defaultValue={filters.q}
                    placeholder="Cari nama daerah"
                    aria-label="Cari nama daerah"
                    className="input"
                />
                <select
                    name="province"
                    defaultValue={filters.province}
                    aria-label="Provinsi"
                    className="input"
                >
                    {provinces.length > 1 && (
                        <option value="">Semua provinsi</option>
                    )}
                    {provinces.map((p) => (
                        <option key={p.code} value={p.code}>
                            {p.name}
                        </option>
                    ))}
                </select>
                <select
                    name="status"
                    defaultValue={filters.status}
                    aria-label="Status"
                    className="input"
                >
                    <option value="">Semua status</option>
                    <option value="verified">Terverifikasi</option>
                    <option value="draft">Draf</option>
                    <option value="empty">Belum ada profil</option>
                </select>
                <button className="btn-primary py-2.5">
                    <Icon name="search" width={16} height={16} />
                    Tampilkan
                </button>
            </Form>

            <div className="overflow-hidden card">
                {regions.data.length === 0 && (
                    <EmptyState icon="map" title="Tidak ada daerah">
                        Ubah filter pencarian.
                    </EmptyState>
                )}
                <ul className="divide-y divide-slate-100">
                    {regions.data.map((r) => (
                        <li
                            key={r.code}
                            className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6"
                        >
                            <Link
                                href={show.url(r.code)}
                                className="min-w-48 flex-1"
                            >
                                <span className="font-medium text-navy-900 hover:text-accent">
                                    {r.level === 1 && 'Provinsi '}
                                    {r.name}
                                </span>
                                <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                                    <span>{r.code}</span>
                                    <span>{r.facts} fakta</span>
                                    <span>{r.entries_count} entri</span>
                                    {r.pending_count > 0 && (
                                        <span className="text-amber-600">
                                            {r.pending_count} perlu verifikasi
                                        </span>
                                    )}
                                </span>
                            </Link>
                            {r.draft &&
                                !['completed'].includes(r.draft.status) && (
                                    <TaskPill status={r.draft.status} />
                                )}
                            <span
                                className={cn(
                                    'rounded-full px-2.5 py-0.5 text-xs font-medium ring-1',
                                    r.verified
                                        ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/30'
                                        : r.has_profile
                                          ? 'bg-amber-500/10 text-amber-700 ring-amber-500/30'
                                          : 'bg-slate-100 text-slate-500 ring-slate-200',
                                )}
                            >
                                {r.verified
                                    ? 'Terverifikasi'
                                    : r.has_profile
                                      ? 'Draf'
                                      : 'Belum ada'}
                            </span>
                            <button
                                type="button"
                                onClick={() =>
                                    router.post(
                                        draft.url(r.code),
                                        {},
                                        { preserveScroll: true },
                                    )
                                }
                                className="btn-ghost px-3 py-1.5 text-xs"
                            >
                                <Icon name="bolt" width={14} height={14} />
                                Draf AI
                            </button>
                            <Link
                                href={show.url(r.code)}
                                className="btn-ghost px-3 py-1.5 text-xs"
                            >
                                <Icon name="edit" width={14} height={14} />
                                Kelola
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
            <Pagination data={regions} />
        </AdminLayout>
    );
}
