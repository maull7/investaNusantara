import { Head, Link } from "@inertiajs/react";
import ArticleCard from "@/components/article-card";
import Icon from "@/components/icons";
import { Reveal, Stagger } from "@/components/motion";
import PublicLayout from "@/layouts/public";
import { formatDate } from "@/lib/news";
import {
    agenda,
    bookmarks as bookmarksRoute,
    home,
    membership,
} from "@/routes";
import { create, show } from "@/routes/agenda";
import type { ArticleCard as Card } from "@/types";

type Event = {
    id: number;
    slug: string;
    name: string;
    starts_on: string;
    ends_on?: string | null;
    organizer?: string | null;
    verified_at?: string | null;
};

type Props = {
    member: {
        role: string;
        organization: string | null;
        ends_at: string | null;
        active: boolean;
    };
    application: {
        status: "pending" | "approved" | "rejected";
        admin_note: string | null;
        created_at: string;
        plan: { name: string } | null;
    } | null;
    bookmarks: Card[];
    bookmarkCount: number;
    upcoming: Event[];
    submissions: Event[];
};

const STATUS = {
    pending: "Sedang diproses",
    approved: "Disetujui",
    rejected: "Ditolak",
};

export default function Dashboard({
    member,
    application,
    bookmarks,
    bookmarkCount,
    upcoming,
    submissions,
}: Props) {
    return (
        <PublicLayout tabs={false}>
            <Head title="Dashboard Saya" />
            <Stagger className="space-y-4 sm:space-y-6">
                <Reveal>
                    <h1 className="text-xl font-semibold text-navy-900 sm:text-2xl">
                        Dashboard Saya
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {member.role}
                        {member.organization && ` · ${member.organization}`}
                    </p>
                </Reveal>

                <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
                    <div className="space-y-4 sm:space-y-6 lg:col-span-2">
                        <Reveal className="card p-4 sm:p-5">
                            <SectionHead
                                icon="bookmark"
                                title={`Berita Tersimpan (${bookmarkCount})`}
                                href={
                                    bookmarkCount > 0
                                        ? bookmarksRoute.url()
                                        : undefined
                                }
                            />
                            {bookmarks.length === 0 ? (
                                <Empty
                                    text="Belum ada berita yang disimpan."
                                    href={home.url()}
                                    cta="Jelajahi berita"
                                />
                            ) : (
                                <div className="grid gap-3 md:grid-cols-2 [&>*]:min-w-0">
                                    {bookmarks.map((a) => (
                                        <ArticleCard key={a.id} article={a} />
                                    ))}
                                </div>
                            )}
                        </Reveal>

                        <Reveal className="card p-4 sm:p-5">
                            <SectionHead
                                icon="clock"
                                title="Agenda Terdekat"
                                href={agenda.url()}
                            />
                            {upcoming.length === 0 ? (
                                <Empty text="Belum ada agenda terdekat." />
                            ) : (
                                <EventList events={upcoming} />
                            )}
                        </Reveal>
                    </div>

                    <div className="space-y-4 sm:space-y-6">
                        <Reveal className="card p-4 sm:p-5">
                            <SectionHead icon="star" title="Langganan Data" />
                            {member.active ? (
                                <p className="text-sm text-slate-600">
                                    Aktif
                                    {member.ends_at &&
                                        ` sampai ${formatDate(member.ends_at)}`}
                                    .
                                </p>
                            ) : application ? (
                                <div className="space-y-1 text-sm text-slate-600">
                                    <p>
                                        Paket {application.plan?.name}:{" "}
                                        <span className="font-medium text-navy-900">
                                            {STATUS[application.status]}
                                        </span>
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        Diajukan{" "}
                                        {formatDate(application.created_at)}
                                    </p>
                                    {application.admin_note && (
                                        <p className="text-xs">
                                            {application.admin_note}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-600">
                                    Belum berlangganan.
                                </p>
                            )}
                            <Link
                                href={membership.url()}
                                className="btn-primary mt-4 inline-flex px-4 py-2 text-sm"
                            >
                                {member.active
                                    ? "Lihat paket"
                                    : "Lihat paket langganan"}
                            </Link>
                        </Reveal>

                        <Reveal className="card p-4 sm:p-5">
                            <SectionHead
                                icon="clock"
                                title="Event yang Saya Ajukan"
                            />
                            {submissions.length === 0 ? (
                                <Empty
                                    text="Belum mengajukan event."
                                    href={create.url()}
                                    cta="Ajukan event"
                                />
                            ) : (
                                <ul className="space-y-2 text-sm">
                                    {submissions.map((e) => (
                                        <li
                                            key={e.id}
                                            className="flex items-center justify-between gap-2"
                                        >
                                            <span className="min-w-0 truncate text-slate-700">
                                                {e.verified_at ? (
                                                    <Link
                                                        href={show.url(e.slug)}
                                                        className="hover:text-accent"
                                                    >
                                                        {e.name}
                                                    </Link>
                                                ) : (
                                                    e.name
                                                )}
                                            </span>
                                            <span className="shrink-0 text-xs text-slate-400">
                                                {e.verified_at
                                                    ? "Tayang"
                                                    : "Diperiksa"}
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

function SectionHead({
    icon,
    title,
    href,
}: {
    icon: "bookmark" | "clock" | "star";
    title: string;
    href?: string;
}) {
    return (
        <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold text-navy-900">
                <Icon
                    name={icon}
                    width={18}
                    height={18}
                    className="text-accent"
                />
                {title}
            </h2>
            {href && (
                <Link
                    href={href}
                    className="text-sm text-accent hover:underline"
                >
                    Lihat semua
                </Link>
            )}
        </div>
    );
}

function Empty({
    text,
    href,
    cta,
}: {
    text: string;
    href?: string;
    cta?: string;
}) {
    return (
        <div className="py-4 text-center text-sm text-slate-500">
            <p>{text}</p>
            {href && (
                <Link
                    href={href}
                    className="mt-2 inline-block text-accent hover:underline"
                >
                    {cta}
                </Link>
            )}
        </div>
    );
}

function EventList({ events }: { events: Event[] }) {
    return (
        <ul className="divide-y divide-slate-100">
            {events.map((e) => (
                <li key={e.id} className="py-2">
                    <Link
                        href={show.url(e.slug)}
                        className="block min-w-0 hover:text-accent"
                    >
                        <p className="truncate text-sm font-medium text-navy-900">
                            {e.name}
                        </p>
                        <p className="text-xs text-slate-400">
                            {formatDate(e.starts_on)}
                            {e.organizer && ` · ${e.organizer}`}
                        </p>
                    </Link>
                </li>
            ))}
        </ul>
    );
}
