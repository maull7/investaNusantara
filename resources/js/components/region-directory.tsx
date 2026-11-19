import { Link } from '@inertiajs/react';
import { motion } from 'motion/react';
import Icon from '@/components/icons';
import { Reveal, Stagger } from '@/components/motion';
import { cn } from '@/lib/utils';
import { show as agendaShow } from '@/routes/agenda';
import { topic as topicRoute } from '@/routes';
import type {
    DirectoryEntry,
    DirectoryType,
    FactField,
    Region,
    RegionProfile,
    Topic,
} from '@/types';

export type DirectoryTab = 'berita' | 'profil' | DirectoryType;

export const eventCategoryLabel: Record<string, string> = {
    daerah: 'Event daerah',
    seminar: 'Seminar',
    workshop: 'Workshop',
    festival: 'Festival',
    pameran: 'Pameran',
};

/** Topic page URL: /investasi/jawa-barat or /investasi/jawa-barat/kabupaten-bekasi. */
export function topicHref(topic: string, province: Region, region: Region) {
    return topicRoute.url({
        topic,
        province: province.slug,
        ...(region.code !== province.code && { child: region.slug }),
    });
}

/** "Pusat Data" chips linking a region to its topic pages. */
export function TopicLinks({
    topics,
    province,
    region,
    active,
}: {
    topics: Topic[];
    province: Region;
    region: Region;
    active?: string;
}) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                Pusat data
            </span>
            {topics.map((t) => (
                <Link
                    key={t.key}
                    href={topicHref(t.key, province, region)}
                    viewTransition
                    className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors',
                        active === t.key
                            ? 'bg-accent text-white ring-accent'
                            : 'bg-surface text-slate-600 ring-slate-200 hover:bg-accent/5 hover:text-accent hover:ring-accent/30',
                    )}
                >
                    {t.label}
                </Link>
            ))}
        </div>
    );
}

const dayFmt = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

/** Host name of a source link, e.g. "bps.go.id". */
function host(url: string) {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

export function Source({
    url,
    asOf,
}: {
    url: string | null;
    asOf?: string | null;
}) {
    if (!url) {
        return null;
    }

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener nofollow"
            className="inline-flex items-center gap-1 text-[11px] text-slate-400 transition-colors hover:text-accent"
        >
            <Icon name="external" width={11} height={11} />
            {host(url)}
            {asOf && ` · ${asOf}`}
        </a>
    );
}

export function DirectoryTabs({
    tabs,
    active,
    onChange,
}: {
    tabs: { key: DirectoryTab; label: string; count?: number }[];
    active: DirectoryTab;
    onChange: (tab: DirectoryTab) => void;
}) {
    return (
        <div
            role="tablist"
            className="-mx-4 no-scrollbar flex gap-1.5 overflow-x-auto px-4 pt-2 pb-1 md:mx-0 md:px-1"
        >
            {tabs.map((t) => (
                <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={active === t.key}
                    onClick={() => onChange(t.key)}
                    className={cn(
                        'relative shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                        active === t.key
                            ? 'text-white'
                            : 'bg-surface text-slate-600 ring-1 ring-slate-200 hover:text-accent hover:ring-accent/30',
                    )}
                >
                    {active === t.key && (
                        <motion.span
                            layoutId="directory-tab"
                            transition={{
                                type: 'spring',
                                stiffness: 400,
                                damping: 32,
                            }}
                            className="absolute inset-0 rounded-full bg-accent shadow-sm shadow-accent/30"
                        />
                    )}
                    <span className="relative">
                        {t.label}
                        {t.count !== undefined && (
                            <span className="ml-1.5 text-xs opacity-70">
                                {t.count}
                            </span>
                        )}
                    </span>
                </button>
            ))}
        </div>
    );
}

export function FactCards({
    facts,
}: {
    facts: (FactField & {
        value: string;
        source: string | null;
        as_of: string | null;
    })[];
}) {
    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {facts.map((f) => (
                <Reveal key={f.key} className="card p-4">
                    <p className="text-xs text-slate-500">{f.label}</p>
                    {f.key === 'website' ? (
                        <a
                            href={f.value}
                            target="_blank"
                            rel="noopener"
                            className="mt-1 block truncate font-semibold text-accent hover:underline"
                        >
                            {host(f.value)}
                        </a>
                    ) : (
                        <p className="mt-1 font-semibold text-navy-900">
                            {f.value}
                            {f.unit && (
                                <span className="ml-1 text-xs font-normal text-slate-500">
                                    {f.unit}
                                </span>
                            )}
                        </p>
                    )}
                    <div className="mt-1.5">
                        <Source url={f.source} asOf={f.as_of} />
                    </div>
                </Reveal>
            ))}
        </div>
    );
}

const OFFICIALS = ['head', 'deputy'];

/** Bupati / Wali Kota / Gubernur and deputy, shown right in the region header. */
export function Officials({
    profile,
    region,
}: {
    profile: RegionProfile | null;
    region: Region;
}) {
    const title =
        region.level === 1
            ? 'Gubernur'
            : region.type === 'kota'
              ? 'Wali Kota'
              : 'Bupati';
    const people = [
        { key: 'head', role: title },
        { key: 'deputy', role: `Wakil ${title}` },
    ].filter((p) => profile?.facts?.[p.key]);

    if (people.length === 0) {
        return null;
    }

    return (
        <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="mb-2.5 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                Pejabat daerah
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
                {people.map((p) => {
                    const fact = profile!.facts![p.key];
                    const initials = fact.value
                        .split(/\s+/)
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();

                    return (
                        <div
                            key={p.key}
                            className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100"
                        >
                            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-merah-dark text-sm font-semibold text-white">
                                {initials}
                            </span>
                            <div className="min-w-0 leading-tight">
                                <p className="text-xs text-slate-500">
                                    {p.role}
                                </p>
                                <p className="truncate font-semibold text-navy-900">
                                    {fact.value}
                                </p>
                                <div className="mt-0.5">
                                    <Source
                                        url={fact.source}
                                        asOf={fact.as_of}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function ProfilePanel({
    profile,
    fields,
    regionName,
}: {
    profile: RegionProfile;
    fields: FactField[];
    regionName: string;
}) {
    // Officials are shown in the region header (Officials), not repeated here.
    const facts = fields.filter(
        (f) => profile.facts?.[f.key] && !OFFICIALS.includes(f.key),
    );

    return (
        <Stagger className="space-y-5">
            {facts.length > 0 && (
                <FactCards
                    facts={facts.map((f) => ({
                        ...f,
                        ...profile.facts![f.key],
                    }))}
                />
            )}
            {profile.description && (
                <Reveal className="card p-5 sm:p-6">
                    <h2 className="text-lg font-semibold text-navy-900">
                        Tentang {regionName}
                    </h2>
                    <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                        {profile.description.split(/\n\s*\n/).map((p, i) => (
                            <p key={i}>{p}</p>
                        ))}
                    </div>
                    <div className="mt-3">
                        <Source url={profile.description_source} />
                    </div>
                </Reveal>
            )}
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
                <Icon name="shield" width={13} height={13} />
                Diverifikasi redaksi{' '}
                {profile.verified_at &&
                    dayFmt.format(new Date(profile.verified_at))}
                . Data mengikuti sumber yang dicantumkan.
            </p>
        </Stagger>
    );
}

export function EntryList({ entries }: { entries: DirectoryEntry[] }) {
    return (
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((e) => (
                <Reveal key={e.id} className="flex flex-col card p-5">
                    {e.type === 'event' && e.starts_on && (
                        <p className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                            <Icon name="clock" width={12} height={12} />
                            {dayFmt.format(new Date(e.starts_on))}
                            {e.ends_on &&
                                e.ends_on !== e.starts_on &&
                                ` – ${dayFmt.format(new Date(e.ends_on))}`}
                        </p>
                    )}
                    {e.type === 'event' && e.category && (
                        <p className="mb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                            {eventCategoryLabel[e.category]}
                        </p>
                    )}
                    <h3 className="font-semibold text-navy-900">
                        {e.type === 'event' && e.slug ? (
                            <Link
                                href={agendaShow.url(e.slug)}
                                className="hover:text-accent"
                            >
                                {e.name}
                            </Link>
                        ) : (
                            e.name
                        )}
                    </h3>
                    {e.description && (
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                            {e.description}
                        </p>
                    )}
                    {e.address && (
                        <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
                            <Icon
                                name="map"
                                width={13}
                                height={13}
                                className="mt-0.5 shrink-0"
                            />
                            {e.address}
                        </p>
                    )}
                    <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                        <Source url={e.source_url} />
                        {e.website && (
                            <a
                                href={e.website}
                                target="_blank"
                                rel="noopener"
                                className="text-xs font-semibold text-accent hover:underline"
                            >
                                Situs resmi →
                            </a>
                        )}
                    </div>
                </Reveal>
            ))}
        </Stagger>
    );
}
