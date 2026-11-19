import { Head, Link } from '@inertiajs/react';
import Icon from '@/components/icons';
import { Reveal, Stagger } from '@/components/motion';
import { Source } from '@/components/region-directory';
import PublicLayout from '@/layouts/public';
import { regionHref } from '@/lib/news';
import { agenda } from '@/routes';
import { ics } from '@/routes/agenda';
import type { DirectoryEntry } from '@/types';

const longFmt = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

/** All-day Google Calendar link: dates as YYYYMMDD, end date exclusive. */
function googleCalendar(e: DirectoryEntry) {
    const compact = (d: string) => d.replaceAll('-', '');
    const end = new Date(e.ends_on ?? e.starts_on!);
    end.setDate(end.getDate() + 1);
    const endIso = `${end.getFullYear()}${String(end.getMonth() + 1).padStart(2, '0')}${String(end.getDate()).padStart(2, '0')}`;
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: e.name,
        dates: `${compact(e.starts_on!)}/${endIso}`,
        details: `${e.description ?? ''}\n\n${window.location.href}`,
        location: e.address ?? '',
    });

    return `https://calendar.google.com/calendar/render?${params}`;
}

export default function AgendaShow({
    event,
    categories,
}: {
    event: DirectoryEntry;
    categories: Record<string, string>;
}) {
    const region = event.region;
    const sameDay = !event.ends_on || event.ends_on === event.starts_on;

    return (
        <PublicLayout tabs={false}>
            <Head title={event.name} />
            <Stagger className="mx-auto max-w-3xl space-y-5">
                <Reveal>
                    <Link
                        href={agenda.url()}
                        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-accent"
                    >
                        <Icon name="back" width={16} height={16} />
                        Agenda nasional
                    </Link>
                </Reveal>

                <Reveal className="card p-6 sm:p-8">
                    <p className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wide text-accent uppercase">
                        {event.category && categories[event.category]}
                        {event.featured_at && (
                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-700 normal-case">
                                Unggulan
                            </span>
                        )}
                    </p>
                    <h1 className="mt-2 text-2xl leading-snug font-semibold text-navy-900 md:text-3xl">
                        {event.name}
                    </h1>

                    <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                        <Detail icon="clock" label="Tanggal">
                            {longFmt.format(new Date(event.starts_on!))}
                            {!sameDay &&
                                ` – ${longFmt.format(new Date(event.ends_on!))}`}
                        </Detail>
                        <Detail icon="map" label="Lokasi">
                            {event.address}
                            {region && (
                                <Link
                                    href={regionHref(region)}
                                    className="block text-accent hover:underline"
                                >
                                    {[region.name, region.parent?.name]
                                        .filter(Boolean)
                                        .join(', ')}
                                </Link>
                            )}
                        </Detail>
                        {event.organizer && (
                            <Detail icon="users" label="Penyelenggara">
                                {event.organizer}
                            </Detail>
                        )}
                        {event.website && (
                            <Detail icon="external" label="Situs resmi">
                                <a
                                    href={event.website}
                                    target="_blank"
                                    rel="noopener"
                                    className="break-all text-accent hover:underline"
                                >
                                    {event.website}
                                </a>
                            </Detail>
                        )}
                    </dl>

                    {event.description && (
                        <p className="mt-6 text-[15px] leading-relaxed whitespace-pre-line text-slate-600">
                            {event.description}
                        </p>
                    )}

                    <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
                        <a
                            href={googleCalendar(event)}
                            target="_blank"
                            rel="noopener"
                            className="btn-primary"
                        >
                            <Icon name="plus" width={16} height={16} />
                            Google Calendar
                        </a>
                        <a href={ics.url(event.slug!)} className="btn-ghost">
                            <Icon name="clock" width={16} height={16} />
                            Unduh .ics
                        </a>
                        <a
                            href={`https://wa.me/?text=${encodeURIComponent(`${event.name}\n${window.location.href}`)}`}
                            target="_blank"
                            rel="noopener"
                            className="btn-ghost"
                        >
                            <Icon name="whatsapp" width={16} height={16} />
                            Bagikan
                        </a>
                    </div>
                    {event.source_url && (
                        <p className="mt-4">
                            <Source url={event.source_url} />
                        </p>
                    )}
                </Reveal>
            </Stagger>
        </PublicLayout>
    );
}

function Detail({
    icon,
    label,
    children,
}: {
    icon: 'clock' | 'map' | 'users' | 'external';
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                <Icon name={icon} width={16} height={16} />
            </span>
            <div className="min-w-0 text-sm">
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="font-medium text-navy-900">{children}</dd>
            </div>
        </div>
    );
}
