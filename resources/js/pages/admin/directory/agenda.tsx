import { Head, Link, router } from '@inertiajs/react';
import { EmptyState } from '@/components/admin/ui';
import Icon from '@/components/icons';
import Pagination from '@/components/pagination';
import AdminLayout from '@/layouts/admin';
import { cn } from '@/lib/utils';
import { agenda, show } from '@/routes/admin/directory';
import { feature, verify } from '@/routes/admin/directory/entries';
import { show as publicShow } from '@/routes/agenda';
import type { DirectoryEntry, Paginated } from '@/types';

const STATUSES = [
    ['pending', 'Menunggu persetujuan'],
    ['featured_requested', 'Minta unggulan'],
    ['featured', 'Unggulan'],
    ['verified', 'Disetujui'],
    ['all', 'Semua'],
] as const;

const dateFmt = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

/** Moderation queue for the national agenda: approve submissions, grant "unggulan". */
export default function AgendaQueue({
    events,
    status,
    categories,
}: {
    events: Paginated<DirectoryEntry>;
    status: string;
    categories: Record<string, string>;
}) {
    const post = (url: string) =>
        router.post(url, {}, { preserveScroll: true });

    return (
        <AdminLayout
            title="Agenda"
            subtitle="Setujui event dari penyelenggara dan AI sebelum tampil di agenda nasional."
        >
            <Head title="Agenda" />

            <div className="mb-5 flex flex-wrap gap-1.5">
                {STATUSES.map(([key, label]) => (
                    <Link
                        key={key}
                        href={agenda.url({ query: { status: key } })}
                        preserveScroll
                        className={cn(
                            'rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition-colors',
                            status === key
                                ? 'bg-accent text-white ring-accent'
                                : 'bg-white text-slate-600 ring-slate-200 hover:bg-accent/5 hover:text-accent hover:ring-accent/30',
                        )}
                    >
                        {label}
                    </Link>
                ))}
            </div>

            <div className="overflow-hidden card">
                {events.data.length === 0 && (
                    <EmptyState icon="clock" title="Tidak ada event">
                        Antrean untuk filter ini kosong.
                    </EmptyState>
                )}
                <ul className="divide-y divide-slate-100">
                    {events.data.map((e) => (
                        <li
                            key={e.id}
                            className="flex flex-wrap items-start gap-3 px-4 py-4 sm:px-6"
                        >
                            <div className="min-w-56 flex-1">
                                <p className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                                    {e.category && categories[e.category]}
                                    {e.submitter ? (
                                        <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-sky-700 normal-case">
                                            Pengajuan {e.submitter.name}
                                        </span>
                                    ) : (
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 normal-case">
                                            AI / redaksi
                                        </span>
                                    )}
                                    {e.featured_at ? (
                                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-700 normal-case">
                                            Unggulan
                                        </span>
                                    ) : (
                                        e.featured_requested && (
                                            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-700 ring-1 ring-amber-500/30 normal-case">
                                                Minta unggulan
                                            </span>
                                        )
                                    )}
                                </p>
                                <p className="mt-1 font-medium text-navy-900">
                                    {e.name}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    {e.starts_on &&
                                        dateFmt.format(new Date(e.starts_on))}
                                    {e.ends_on &&
                                        e.ends_on !== e.starts_on &&
                                        ` – ${dateFmt.format(new Date(e.ends_on))}`}
                                    {' · '}
                                    {[e.region?.name, e.region?.parent?.name]
                                        .filter(Boolean)
                                        .join(', ')}
                                    {e.organizer && ` · ${e.organizer}`}
                                </p>
                                {e.contact && (
                                    <p className="mt-1 text-xs text-amber-800">
                                        Kontak: {e.contact}
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => post(verify.url(e.id))}
                                    className={
                                        e.verified_at
                                            ? 'btn-ghost px-3 py-1.5 text-xs'
                                            : 'btn-success px-3 py-1.5 text-xs'
                                    }
                                >
                                    <Icon
                                        name={
                                            e.verified_at ? 'eye-off' : 'check'
                                        }
                                        width={14}
                                        height={14}
                                    />
                                    {e.verified_at ? 'Sembunyikan' : 'Setujui'}
                                </button>
                                {e.verified_at && (
                                    <button
                                        type="button"
                                        onClick={() => post(feature.url(e.id))}
                                        className="btn-ghost px-3 py-1.5 text-xs text-amber-700"
                                    >
                                        <Icon
                                            name="star"
                                            width={14}
                                            height={14}
                                        />
                                        {e.featured_at
                                            ? 'Lepas unggulan'
                                            : 'Jadikan unggulan'}
                                    </button>
                                )}
                                {e.verified_at && e.slug && (
                                    <a
                                        href={publicShow.url(e.slug)}
                                        target="_blank"
                                        className="btn-ghost px-3 py-1.5 text-xs"
                                    >
                                        <Icon
                                            name="external"
                                            width={14}
                                            height={14}
                                        />
                                        Lihat
                                    </a>
                                )}
                                <Link
                                    href={show.url(e.region_code!)}
                                    className="btn-ghost px-3 py-1.5 text-xs"
                                >
                                    <Icon name="edit" width={14} height={14} />
                                    Edit
                                </Link>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            <Pagination data={events} />
        </AdminLayout>
    );
}
