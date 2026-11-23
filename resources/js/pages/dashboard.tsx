import { Head, Link, router } from '@inertiajs/react';
import AccountTabs from '@/components/account-tabs';
import ArticleCard from '@/components/article-card';
import Icon, { type IconName } from '@/components/icons';
import { Reveal, Stagger } from '@/components/motion';
import PublicLayout from '@/layouts/public';
import { formatDate } from '@/lib/news';
import { cn } from '@/lib/utils';
import {
    agenda,
    bookmarks as bookmarksRoute,
    home,
    membership,
    regions as regionsRoute,
} from '@/routes';
import { create, show } from '@/routes/agenda';
import { regions as feedRoute } from '@/routes/dashboard';
import { unfollow } from '@/routes/regions';
import type { ArticleCard as Card, Region } from '@/types';

type Event = {
    id: number;
    slug: string;
    name: string;
    starts_on: string;
    ends_on?: string | null;
    organizer?: string | null;
    verified_at?: string | null;
};

type Followed = Region & { recent: number };

type Props = {
    member: {
        organization: string | null;
        ends_at: string | null;
        active: boolean;
    };
    application: {
        status: 'pending' | 'approved' | 'rejected';
        admin_note: string | null;
        created_at: string;
        plan: { name: string } | null;
    } | null;
    regions: Followed[];
    feed: Card[];
    bookmarks: Card[];
    bookmarkCount: number;
    upcoming: Event[];
    submissions: Event[];
    submissionCount: number;
};

const STATUS = {
    pending: { label: 'Sedang diproses', tone: 'bg-amber-50 text-amber-700' },
    approved: { label: 'Disetujui', tone: 'bg-emerald-50 text-emerald-700' },
    rejected: { label: 'Ditolak', tone: 'bg-red-50 text-red-700' },
};

export default function Dashboard({
    member,
    application,
    regions,
    feed,
    bookmarks,
    bookmarkCount,
    upcoming,
    submissions,
    submissionCount,
}: Props) {
    const subscription = member.active
        ? 'Aktif'
        : application
          ? STATUS[application.status].label
          : 'Belum aktif';

    return (
        <PublicLayout tabs={false}>
            <Head title="Dashboard Saya" />
            <h1 className="sr-only">Dashboard Saya</h1>
            <Stagger className="space-y-4 sm:space-y-6">
                <AccountTabs />

                <Reveal className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
                    <Stat
                        icon="map"
                        label="Wilayah diikuti"
                        value={regions.length}
                        href={regionsRoute.url()}
                    />
                    <Stat
                        icon="bookmark"
                        label="Berita tersimpan"
                        value={bookmarkCount}
                        href={bookmarksRoute.url()}
                    />
                    <Stat
                        icon="calendar"
                        label="Event diajukan"
                        value={submissionCount}
                        href={create.url()}
                    />
                    <Stat
                        icon="star"
                        label="Langganan"
                        value={subscription}
                        href={membership.url()}
                    />
                </Reveal>

                <Reveal className="card p-4 sm:p-6">
                    <SectionHead
                        icon="map"
                        title="Wilayah Saya"
                        href={regions.length > 0 ? feedRoute.url() : undefined}
                        cta="Lihat berita"
                    />
                    {regions.length === 0 ? (
                        <Empty
                            icon="map"
                            text="Ikuti provinsi atau kabupaten/kota untuk melihat beritanya di sini."
                            href={regionsRoute.url()}
                            cta="Pilih wilayah"
                        />
                    ) : (
                        <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-4">
                            {regions.map((r) => (
                                <RegionCard key={r.code} region={r} />
                            ))}
                            <Link
                                href={regionsRoute.url()}
                                className="flex min-h-36 w-36 shrink-0 snap-start flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-200 text-sm font-medium text-slate-500 transition hover:border-accent/40 hover:text-accent sm:w-auto"
                            >
                                <Icon name="plus" width={20} height={20} />
                                Tambah wilayah
                            </Link>
                        </div>
                    )}
                </Reveal>

                <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
                    <div className="min-w-0 space-y-4 sm:space-y-6 lg:col-span-2">
                        {regions.length > 0 && (
                            <Reveal className="card p-4 sm:p-6">
                                <SectionHead
                                    icon="file"
                                    title="Berita dari Wilayah Anda"
                                    href={feedRoute.url()}
                                />
                                {feed.length === 0 ? (
                                    <Empty
                                        icon="file"
                                        text="Belum ada berita dari wilayah yang Anda ikuti."
                                        href={home.url()}
                                        cta="Jelajahi berita"
                                    />
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">
                                        {feed.map((a) => (
                                            <ArticleCard key={a.id} article={a} />
                                        ))}
                                    </div>
                                )}
                            </Reveal>
                        )}

                        <Reveal className="card p-4 sm:p-6">
                            <SectionHead
                                icon="bookmark"
                                title="Berita Tersimpan"
                                href={
                                    bookmarkCount > 0
                                        ? bookmarksRoute.url()
                                        : undefined
                                }
                            />
                            {bookmarks.length === 0 ? (
                                <Empty
                                    icon="bookmark"
                                    text="Belum ada berita yang disimpan."
                                    href={home.url()}
                                    cta="Jelajahi berita"
                                />
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">
                                    {bookmarks.map((a) => (
                                        <ArticleCard key={a.id} article={a} />
                                    ))}
                                </div>
                            )}
                        </Reveal>
                    </div>

                    <div className="min-w-0 space-y-4 sm:space-y-6">
                        <Reveal className="card overflow-hidden">
                            <div className="bg-accent p-4 text-white sm:p-6">
                                <p className="flex items-center gap-2 text-sm text-white/80">
                                    <Icon name="star" width={16} height={16} />
                                    Langganan Data
                                </p>
                                <p className="mt-1 text-lg font-semibold">
                                    {member.active
                                        ? 'Aktif'
                                        : application?.plan
                                          ? `Paket ${application.plan.name}`
                                          : 'Belum berlangganan'}
                                </p>
                                {member.active && member.ends_at && (
                                    <p className="text-sm text-white/80">
                                        Berlaku sampai{' '}
                                        {formatDate(member.ends_at)}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-3 p-4 sm:p-6">
                                {!member.active && application && (
                                    <div className="space-y-1 text-sm">
                                        <span
                                            className={cn(
                                                'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
                                                STATUS[application.status].tone,
                                            )}
                                        >
                                            {STATUS[application.status].label}
                                        </span>
                                        <p className="text-xs text-slate-400">
                                            Diajukan{' '}
                                            {formatDate(application.created_at)}
                                        </p>
                                        {application.admin_note && (
                                            <p className="text-slate-600">
                                                {application.admin_note}
                                            </p>
                                        )}
                                    </div>
                                )}
                                {!member.active && !application && (
                                    <p className="text-sm text-slate-600">
                                        Pantau topik, sentimen, dan isu daerah
                                        dengan Media Intelligence.
                                    </p>
                                )}
                                <Link
                                    href={membership.url()}
                                    className="btn-primary w-full"
                                >
                                    {member.active
                                        ? 'Lihat paket'
                                        : 'Lihat paket langganan'}
                                </Link>
                            </div>
                        </Reveal>

                        <Reveal className="card p-4 sm:p-6">
                            <SectionHead
                                icon="calendar"
                                title={
                                    regions.length > 0
                                        ? 'Agenda di Wilayah Anda'
                                        : 'Agenda Terdekat'
                                }
                                href={agenda.url()}
                            />
                            {upcoming.length === 0 ? (
                                <Empty
                                    icon="calendar"
                                    text="Belum ada agenda terdekat."
                                    href={agenda.url()}
                                    cta="Lihat kalender"
                                />
                            ) : (
                                <ul className="space-y-1">
                                    {upcoming.map((e) => (
                                        <li key={e.id}>
                                            <Link
                                                href={show.url(e.slug)}
                                                className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-accent/5"
                                            >
                                                <DateBadge iso={e.starts_on} />
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-navy-900">
                                                        {e.name}
                                                    </p>
                                                    {e.organizer && (
                                                        <p className="truncate text-xs text-slate-500">
                                                            {e.organizer}
                                                        </p>
                                                    )}
                                                </div>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Reveal>

                        <Reveal className="card p-4 sm:p-6">
                            <SectionHead
                                icon="send"
                                title="Event Saya"
                                href={
                                    submissions.length > 0
                                        ? create.url()
                                        : undefined
                                }
                                cta="Ajukan"
                            />
                            {submissions.length === 0 ? (
                                <Empty
                                    icon="calendar"
                                    text="Belum mengajukan event."
                                    href={create.url()}
                                    cta="Ajukan event"
                                />
                            ) : (
                                <ul className="divide-y divide-slate-100 text-sm">
                                    {submissions.map((e) => (
                                        <li
                                            key={e.id}
                                            className="flex items-center justify-between gap-2 py-2.5"
                                        >
                                            {e.verified_at ? (
                                                <Link
                                                    href={show.url(e.slug)}
                                                    className="min-w-0 truncate text-slate-700 hover:text-accent"
                                                >
                                                    {e.name}
                                                </Link>
                                            ) : (
                                                <span className="min-w-0 truncate text-slate-700">
                                                    {e.name}
                                                </span>
                                            )}
                                            <span
                                                className={cn(
                                                    'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                                                    e.verified_at
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : 'bg-amber-50 text-amber-700',
                                                )}
                                            >
                                                {e.verified_at
                                                    ? 'Tayang'
                                                    : 'Diperiksa'}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Reveal>
                    </div>
                </div>
            </Stagger>
        </PublicLayout>
    );
}

function RegionCard({ region: r }: { region: Followed }) {
    const image = r.image_url ?? r.parent?.image_url;

    function unfollowRegion() {
        router.delete(unfollow.url(r.code), { preserveScroll: true });
    }

    return (
        <div className="group relative w-36 shrink-0 snap-start overflow-hidden rounded-2xl ring-1 ring-accent/10 sm:w-auto">
            <Link
                href={feedRoute.url({ query: { wilayah: r.code } })}
                className="block"
            >
                <div className="relative h-20 bg-accent/10">
                    {image && (
                        <img
                            src={image}
                            alt=""
                            loading="lazy"
                            className="size-full object-cover transition duration-300 group-hover:scale-105"
                        />
                    )}
                    <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                        {r.level === 1 ? 'Provinsi' : (r.type ?? 'Kab/Kota')}
                    </span>
                </div>
                <div className="bg-surface p-2.5">
                    <p className="truncate text-sm font-semibold text-navy-900 group-hover:text-accent">
                        {r.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                        {r.parent ? r.parent.name : 'Seluruh kab/kota'}
                    </p>
                    <p className="mt-1 text-xs font-medium text-accent">
                        {r.recent > 0
                            ? `${r.recent} berita minggu ini`
                            : 'Belum ada berita baru'}
                    </p>
                </div>
            </Link>
            <button
                type="button"
                onClick={unfollowRegion}
                aria-label={`Berhenti mengikuti ${r.name}`}
                title="Berhenti mengikuti"
                className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-accent sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            >
                <Icon name="x" width={14} height={14} />
            </button>
        </div>
    );
}

function Stat({
    icon,
    label,
    value,
    href,
}: {
    icon: IconName;
    label: string;
    value: string | number;
    href: string;
}) {
    return (
        <Link
            href={href}
            className="card flex min-w-0 items-center gap-3 p-3 transition hover:-translate-y-0.5 sm:p-4"
        >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/5 text-accent">
                <Icon name={icon} width={18} height={18} />
            </span>
            <span className="min-w-0">
                <span className="block truncate text-base font-semibold text-navy-900 sm:text-lg">
                    {value}
                </span>
                <span className="block truncate text-xs text-slate-500">
                    {label}
                </span>
            </span>
        </Link>
    );
}

function DateBadge({ iso }: { iso: string }) {
    const d = new Date(iso);
    return (
        <span className="grid w-12 shrink-0 place-items-center rounded-xl bg-accent/5 py-1.5 text-accent">
            <span className="text-lg leading-none font-semibold">
                {d.getDate()}
            </span>
            <span className="text-[10px] font-medium uppercase">
                {d.toLocaleDateString('id-ID', { month: 'short' })}
            </span>
        </span>
    );
}

function SectionHead({
    icon,
    title,
    href,
    cta = 'Lihat semua',
}: {
    icon: IconName;
    title: string;
    href?: string;
    cta?: string;
}) {
    return (
        <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="flex min-w-0 items-center gap-2 font-semibold text-navy-900">
                <Icon
                    name={icon}
                    width={18}
                    height={18}
                    className="shrink-0 text-accent"
                />
                <span className="truncate">{title}</span>
            </h2>
            {href && (
                <Link
                    href={href}
                    className="flex shrink-0 items-center gap-1 text-sm text-accent hover:underline"
                >
                    {cta}
                    <Icon name="chevron" width={14} height={14} />
                </Link>
            )}
        </div>
    );
}

function Empty({
    icon,
    text,
    href,
    cta,
}: {
    icon: IconName;
    text: string;
    href?: string;
    cta?: string;
}) {
    return (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
            <Icon
                name={icon}
                width={24}
                height={24}
                className="text-slate-300"
            />
            <p>{text}</p>
            {href && (
                <Link href={href} className="btn-ghost mt-1">
                    {cta}
                </Link>
            )}
        </div>
    );
}
