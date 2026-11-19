import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import Icon from '@/components/icons';
import { Reveal, Stagger } from '@/components/motion';
import PublicLayout, { SectionTitle } from '@/layouts/public';
import { cn } from '@/lib/utils';
import { agenda } from '@/routes';
import { create, show } from '@/routes/agenda';
import type { DirectoryEntry } from '@/types';

type Props = {
    month: string; // YYYY-MM
    events: DirectoryEntry[];
    featured: DirectoryEntry[];
    filters: { provinsi: string; kategori: string };
    provinces: { code: string; name: string }[];
    categories: Record<string, string>;
};

const monthFmt = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
});
const dayFmt = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
});
const shortFmt = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
});
const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

/** "2026-11" + offset months => "2026-12". */
function shift(month: string, by: number) {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + by, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** True when the event runs on that day (YYYY-MM-DD strings compare as dates). */
const on = (e: DirectoryEntry, day: string) =>
    !!e.starts_on && e.starts_on <= day && (e.ends_on ?? e.starts_on) >= day;

export default function AgendaIndex({
    month,
    events,
    featured,
    filters,
    provinces,
    categories,
}: Props) {
    const { flash } = usePage().props;
    const [picked, setPicked] = useState<string | null>(null);
    const [y, m] = month.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const today = iso(new Date());

    // Monday-first grid with leading blanks.
    const lead = (first.getDay() + 6) % 7;
    const days = new Date(y, m, 0).getDate();
    const cells = [
        ...Array<null>(lead).fill(null),
        ...Array.from({ length: days }, (_, i) =>
            iso(new Date(y, m - 1, i + 1)),
        ),
    ];

    const go = (query: Record<string, string>) =>
        router.get(
            agenda.url(),
            Object.fromEntries(
                Object.entries({ ...filters, bulan: month, ...query }).filter(
                    ([, v]) => v,
                ),
            ),
            { preserveScroll: true, preserveState: true, replace: true },
        );

    const list = picked ? events.filter((e) => on(e, picked)) : events;

    return (
        <PublicLayout tabs={false}>
            <Head title={`Agenda ${monthFmt.format(first)}`} />
            <Stagger className="space-y-6">
                <Reveal className="flex flex-wrap items-end justify-between gap-4 card p-5 sm:p-7">
                    <div>
                        <p className="text-xs font-semibold tracking-wide text-accent uppercase">
                            Agenda Nasional
                        </p>
                        <h1 className="mt-1 text-2xl font-semibold text-navy-900 md:text-3xl">
                            Event & kegiatan di seluruh Indonesia
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Event daerah, seminar, workshop, festival, dan
                            pameran yang sudah diperiksa redaksi.
                        </p>
                    </div>
                    <Link href={create.url()} className="btn-primary">
                        <Icon name="plus" width={16} height={16} />
                        Ajukan event
                    </Link>
                </Reveal>

                {flash.success && (
                    <Reveal className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-700 ring-1 ring-emerald-500/30">
                        <Icon name="check" width={16} height={16} />
                        {flash.success}
                    </Reveal>
                )}

                {featured.length > 0 && (
                    <section>
                        <SectionTitle>Event unggulan</SectionTitle>
                        <div className="-mx-4 no-scrollbar flex snap-x gap-4 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-3 md:px-0">
                            {featured.map((e) => (
                                <FeaturedCard
                                    key={e.id}
                                    event={e}
                                    categories={categories}
                                />
                            ))}
                        </div>
                    </section>
                )}

                <Reveal className="flex flex-wrap items-center gap-2 card p-3">
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            aria-label="Bulan sebelumnya"
                            onClick={() => go({ bulan: shift(month, -1) })}
                            className="grid size-9 place-items-center rounded-full text-slate-500 ring-1 ring-slate-200 transition-colors hover:text-accent hover:ring-accent/30"
                        >
                            <Icon name="back" width={16} height={16} />
                        </button>
                        <span className="min-w-36 text-center font-semibold text-navy-900">
                            {monthFmt.format(first)}
                        </span>
                        <button
                            type="button"
                            aria-label="Bulan berikutnya"
                            onClick={() => go({ bulan: shift(month, 1) })}
                            className="grid size-9 place-items-center rounded-full text-slate-500 ring-1 ring-slate-200 transition-colors hover:text-accent hover:ring-accent/30"
                        >
                            <Icon name="chevron" width={16} height={16} />
                        </button>
                    </div>
                    <select
                        value={filters.provinsi}
                        onChange={(e) => go({ provinsi: e.target.value })}
                        aria-label="Provinsi"
                        className="input w-auto sm:ml-auto"
                    >
                        <option value="">Semua provinsi</option>
                        {provinces.map((p) => (
                            <option key={p.code} value={p.code}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                    <div className="flex w-full flex-wrap gap-1.5">
                        {[['', 'Semua'], ...Object.entries(categories)].map(
                            ([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => go({ kategori: key })}
                                    className={cn(
                                        'rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors',
                                        filters.kategori === key
                                            ? 'bg-accent text-white ring-accent'
                                            : 'bg-surface text-slate-600 ring-slate-200 hover:bg-accent/5 hover:text-accent hover:ring-accent/30',
                                    )}
                                >
                                    {label}
                                </button>
                            ),
                        )}
                    </div>
                </Reveal>

                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                    <Reveal className="card p-4 sm:p-5">
                        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-400">
                            {WEEKDAYS.map((d) => (
                                <span key={d} className="py-1">
                                    {d}
                                </span>
                            ))}
                        </div>
                        <div className="mt-1 grid grid-cols-7 gap-1">
                            {cells.map((day, i) => {
                                if (!day) {
                                    return <span key={`b${i}`} />;
                                }
                                const count = events.filter((e) =>
                                    on(e, day),
                                ).length;

                                return (
                                    <button
                                        key={day}
                                        type="button"
                                        disabled={count === 0}
                                        onClick={() =>
                                            setPicked((p) =>
                                                p === day ? null : day,
                                            )
                                        }
                                        aria-pressed={picked === day}
                                        aria-label={`${day}: ${count} event`}
                                        className={cn(
                                            'flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition-colors',
                                            picked === day
                                                ? 'bg-accent text-white'
                                                : count > 0
                                                  ? 'bg-accent/5 font-semibold text-navy-900 hover:bg-accent/15'
                                                  : 'text-slate-400',
                                            day === today &&
                                                picked !== day &&
                                                'ring-2 ring-accent/40',
                                        )}
                                    >
                                        {Number(day.slice(8))}
                                        {count > 0 && (
                                            <span
                                                className={cn(
                                                    'mt-0.5 text-[10px] font-medium',
                                                    picked === day
                                                        ? 'text-white/80'
                                                        : 'text-accent',
                                                )}
                                            >
                                                {count} event
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </Reveal>

                    <section>
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-navy-900">
                                {picked
                                    ? dayFmt.format(new Date(picked))
                                    : `Semua event ${monthFmt.format(first)}`}
                            </h2>
                            {picked && (
                                <button
                                    type="button"
                                    onClick={() => setPicked(null)}
                                    className="text-sm font-medium text-accent hover:underline"
                                >
                                    Tampilkan semua
                                </button>
                            )}
                        </div>
                        {list.length === 0 ? (
                            <div className="card p-10 text-center text-sm text-slate-500">
                                Belum ada event untuk pilihan ini.{' '}
                                <Link
                                    href={create.url()}
                                    className="font-semibold text-accent hover:underline"
                                >
                                    Ajukan event Anda →
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {list.map((e) => (
                                    <EventRow
                                        key={e.id}
                                        event={e}
                                        categories={categories}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </Stagger>
        </PublicLayout>
    );
}

function dateRange(e: DirectoryEntry) {
    if (!e.starts_on) {
        return '';
    }
    const start = shortFmt.format(new Date(e.starts_on));

    return e.ends_on && e.ends_on !== e.starts_on
        ? `${start} – ${shortFmt.format(new Date(e.ends_on))}`
        : start;
}

function place(e: DirectoryEntry) {
    return [e.region?.name, e.region?.parent?.name].filter(Boolean).join(', ');
}

function EventRow({
    event,
    categories,
}: {
    event: DirectoryEntry;
    categories: Record<string, string>;
}) {
    const date = event.starts_on ? new Date(event.starts_on) : null;

    return (
        <Link
            href={show.url(event.slug!)}
            className="group flex gap-4 card p-4 transition-shadow hover:shadow-lg"
        >
            {date && (
                <span className="grid w-14 shrink-0 place-items-center rounded-2xl bg-accent/10 py-2 text-accent">
                    <span className="text-xl leading-none font-bold">
                        {date.getDate()}
                    </span>
                    <span className="text-[11px] font-medium uppercase">
                        {new Intl.DateTimeFormat('id-ID', {
                            month: 'short',
                        }).format(date)}
                    </span>
                </span>
            )}
            <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                    {event.category && categories[event.category]}
                    {event.featured_at && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-700 normal-case">
                            Unggulan
                        </span>
                    )}
                </span>
                <span className="mt-0.5 block font-semibold text-navy-900 group-hover:text-accent">
                    {event.name}
                </span>
                <span className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500">
                    <span>{dateRange(event)}</span>
                    {place(event) && <span>{place(event)}</span>}
                </span>
            </span>
        </Link>
    );
}

function FeaturedCard({
    event,
    categories,
}: {
    event: DirectoryEntry;
    categories: Record<string, string>;
}) {
    return (
        <Link
            href={show.url(event.slug!)}
            className="group relative w-72 shrink-0 snap-start overflow-hidden rounded-3xl bg-gradient-to-br from-accent to-merah-dark p-5 text-white shadow-lg shadow-accent/25 md:w-auto"
        >
            <span className="absolute -top-8 -right-8 size-32 rounded-full bg-white/10" />
            <span className="relative text-[11px] font-semibold tracking-wide text-white/80 uppercase">
                {event.category && categories[event.category]} · Unggulan
            </span>
            <span className="relative mt-2 line-clamp-2 block text-lg font-semibold">
                {event.name}
            </span>
            <span className="relative mt-3 flex flex-wrap gap-x-3 text-xs text-white/85">
                <span className="inline-flex items-center gap-1">
                    <Icon name="clock" width={12} height={12} />
                    {dateRange(event)}
                </span>
                {place(event) && (
                    <span className="inline-flex items-center gap-1">
                        <Icon name="map" width={12} height={12} />
                        {place(event)}
                    </span>
                )}
            </span>
        </Link>
    );
}
