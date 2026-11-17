import { Head, Link, router, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { useRef, useState } from 'react';
import {
    CountUp,
    EmptyState,
    roleLabel,
    StatusPill,
    statusMeta,
} from '@/components/admin/ui';
import Icon from '@/components/icons';
import { ease } from '@/components/motion';
import Pagination from '@/components/pagination';
import AdminLayout from '@/layouts/admin';
import { timeAgo } from '@/lib/news';
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
    cover_url: string | null;
    is_headline: boolean;
    is_breaking: boolean;
    is_ai_generated: boolean;
    published_at: string | null;
    updated_at: string;
    category: { name: string };
    region: { name: string } | null;
    author: { name: string };
    can: { update: boolean; publish: boolean; submit: boolean };
};

type Stats = Record<ArticleStatus, number> & { total: number; views: number };

type Filters = { status?: string; q?: string };

const TILES: { key: '' | ArticleStatus; label: string }[] = [
    { key: '', label: 'Semua artikel' },
    { key: 'draft', label: 'Draft' },
    { key: 'review', label: 'Menunggu review' },
    { key: 'published', label: 'Terbit' },
    { key: 'rejected', label: 'Dikembalikan' },
];

const spring = { type: 'spring', stiffness: 420, damping: 34 } as const;

function greeting(): string {
    const h = new Date().getHours();
    if (h < 11) {
        return 'Selamat pagi';
    }
    if (h < 15) {
        return 'Selamat siang';
    }
    if (h < 19) {
        return 'Selamat sore';
    }
    return 'Selamat malam';
}

export default function ArticlesIndex({
    articles,
    stats,
    filters,
}: {
    articles: Paginated<Row>;
    stats: Stats;
    filters: Filters;
}) {
    const user = usePage().props.auth.user!;
    const status = filters.status ?? '';
    const [q, setQ] = useState(filters.q ?? '');
    const [loading, setLoading] = useState(false);
    const typing = useRef<number | undefined>(undefined);

    function visit(next: Filters) {
        const params = {
            q: q || undefined,
            status: status || undefined,
            ...next,
        };
        router.get(index.url(), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: ['articles', 'filters'],
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    }

    // Live search: query the server shortly after the user stops typing.
    function onSearch(value: string) {
        setQ(value);
        window.clearTimeout(typing.current);
        typing.current = window.setTimeout(
            () => visit({ q: value || undefined }),
            350,
        );
    }

    return (
        <AdminLayout
            title="Dashboard"
            subtitle="Ringkasan aktivitas ruang redaksi"
        >
            <Head title="Dashboard Redaksi" />

            {/* Hero */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-merah from-20% via-[#cf4452] via-55% to-white p-6 text-white shadow-[0_20px_50px_-24px_rgba(165,14,30,0.55)] ring-1 ring-accent/10 sm:p-8">
                <div
                    aria-hidden
                    className="absolute -right-16 -bottom-20 size-72 rounded-full bg-white/60 blur-3xl"
                />
                <div
                    aria-hidden
                    className="absolute -top-24 -left-10 size-56 rounded-full bg-white/10 blur-2xl"
                />
                <div className="relative flex flex-wrap items-end justify-between gap-6">
                    <div>
                        <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-white/20 backdrop-blur">
                            {roleLabel[user.role]}
                        </span>
                        <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
                            {greeting()}, {user.name.split(' ')[0]}
                        </h2>
                        <p className="mt-1 max-w-md text-sm text-white/85">
                            {stats.review > 0
                                ? `Ada ${stats.review} artikel menunggu review.`
                                : 'Semua artikel sudah ditinjau. Saatnya menulis kabar baru.'}
                        </p>
                    </div>
                    {/* Frosted white card: stays readable where the gradient turns white. */}
                    <div className="flex items-end gap-6 rounded-2xl bg-white/80 p-4 text-navy-900 shadow-lg ring-1 shadow-accent/10 ring-white backdrop-blur-md">
                        <div>
                            <p className="text-xs text-slate-500">
                                Total pembaca
                            </p>
                            <p className="text-3xl font-semibold text-accent tabular-nums sm:text-4xl">
                                <CountUp value={stats.views} />
                            </p>
                        </div>
                        <Link
                            href={create.url()}
                            className="btn-primary hidden py-2.5 font-semibold transition hover:-translate-y-0.5 sm:inline-flex"
                        >
                            <Icon name="plus" width={18} height={18} />
                            Tulis artikel
                        </Link>
                    </div>
                </div>
            </section>

            {/* Status tiles double as filters */}
            <div className="-mx-4 mt-5 no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-5">
                {TILES.map((t, i) => {
                    const isActive = status === t.key;
                    const count = t.key ? stats[t.key] : stats.total;

                    return (
                        <motion.button
                            key={t.key || 'all'}
                            type="button"
                            onClick={() =>
                                visit({ status: t.key || undefined })
                            }
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                delay: 0.05 * i,
                                duration: 0.4,
                                ease,
                            }}
                            whileHover={{ y: -3 }}
                            whileTap={{ scale: 0.97 }}
                            className={cn(
                                'relative min-w-36 shrink-0 rounded-2xl bg-white p-4 text-left ring-1 transition-shadow',
                                isActive
                                    ? 'shadow-lg shadow-accent/10 ring-accent/30'
                                    : 'ring-slate-200/80 hover:shadow-md',
                            )}
                        >
                            {isActive && (
                                <motion.span
                                    layoutId="stat-active"
                                    transition={spring}
                                    className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-accent"
                                />
                            )}
                            <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                <span
                                    className={cn(
                                        'size-2 rounded-full',
                                        t.key
                                            ? statusMeta[t.key].dot
                                            : 'bg-accent',
                                    )}
                                />
                                {t.label}
                            </span>
                            <span className="mt-2 block text-2xl font-semibold text-navy-900 tabular-nums">
                                <CountUp value={count} />
                            </span>
                        </motion.button>
                    );
                })}
            </div>

            {/* List */}
            <section className="mt-6 overflow-hidden card">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:px-6">
                    <div>
                        <h2 className="font-semibold text-navy-900">
                            {status
                                ? statusMeta[status as ArticleStatus].label
                                : 'Semua artikel'}
                        </h2>
                        <p className="text-xs text-slate-500">
                            {articles.total} artikel
                            {filters.q && ` cocok dengan “${filters.q}”`}
                        </p>
                    </div>
                    <label className="relative w-full sm:w-72">
                        <Icon
                            name="search"
                            width={18}
                            height={18}
                            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            value={q}
                            onChange={(e) => onSearch(e.target.value)}
                            placeholder="Cari judul artikel…"
                            aria-label="Cari judul artikel"
                            className="input rounded-full bg-slate-50 pl-10"
                        />
                        <AnimatePresence>
                            {loading && (
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-accent/20 border-t-accent"
                                />
                            )}
                        </AnimatePresence>
                    </label>
                </div>

                <ul
                    className={cn(
                        'divide-y divide-slate-100 transition-opacity',
                        loading && 'opacity-60',
                    )}
                >
                    <AnimatePresence mode="popLayout" initial={false}>
                        {articles.data.map((a, i) => (
                            <motion.li
                                key={a.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{
                                    opacity: 1,
                                    y: 0,
                                    transition: {
                                        delay: Math.min(i, 10) * 0.03,
                                        duration: 0.35,
                                        ease,
                                    },
                                }}
                                exit={{
                                    opacity: 0,
                                    transition: { duration: 0.15 },
                                }}
                            >
                                <ArticleRow article={a} />
                            </motion.li>
                        ))}
                    </AnimatePresence>
                </ul>

                {articles.data.length === 0 && (
                    <EmptyState
                        icon="file"
                        title={
                            filters.q || status
                                ? 'Tidak ada artikel yang cocok'
                                : 'Belum ada artikel'
                        }
                    >
                        {filters.q || status ? (
                            'Coba kata kunci atau status lain.'
                        ) : (
                            <Link
                                href={create.url()}
                                className="btn-primary mt-3"
                            >
                                <Icon name="plus" width={16} height={16} />
                                Tulis artikel pertama
                            </Link>
                        )}
                    </EmptyState>
                )}
            </section>

            <Pagination data={articles} />
        </AdminLayout>
    );
}

function ArticleRow({ article: a }: { article: Row }) {
    const post = (url: string) =>
        router.post(url, {}, { preserveScroll: true });

    return (
        <div className="group flex gap-4 p-4 transition-colors hover:bg-accent/[0.025] sm:px-6">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-accent/15 to-accent/5 sm:h-16 sm:w-24">
                {a.cover_url ? (
                    <img
                        src={a.cover_url}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover transition duration-500 group-hover:scale-105"
                    />
                ) : (
                    <Icon
                        name="image"
                        className="absolute inset-0 m-auto text-accent/40"
                    />
                )}
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                    <StatusPill status={a.status} />
                    {a.is_headline && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                            <Icon name="star" width={12} height={12} />
                            Headline
                        </span>
                    )}
                    {a.is_breaking && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-white">
                            <Icon name="bolt" width={12} height={12} />
                            Breaking
                        </span>
                    )}
                    {a.is_ai_generated && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-sky-200">
                            AI
                        </span>
                    )}
                </div>
                {a.can.update ? (
                    <Link
                        href={edit.url(a.id)}
                        className="mt-1.5 line-clamp-2 font-medium text-navy-900 transition-colors hover:text-accent"
                    >
                        {a.title}
                    </Link>
                ) : (
                    <p className="mt-1.5 line-clamp-2 font-medium text-navy-900">
                        {a.title}
                    </p>
                )}
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                    <span>{a.category.name}</span>
                    <span className="text-slate-300">•</span>
                    <span>{a.region?.name ?? 'Nasional'}</span>
                    <span className="text-slate-300">•</span>
                    <span>{a.author.name}</span>
                    <span className="text-slate-300">•</span>
                    <span className="inline-flex items-center gap-1">
                        <Icon name="eye" width={13} height={13} />
                        {a.views.toLocaleString('id-ID')}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="inline-flex items-center gap-1">
                        <Icon name="clock" width={13} height={13} />
                        {timeAgo(a.updated_at)}
                    </span>
                </p>

                {/* Actions: always visible on touch, revealed on hover with a mouse. */}
                <div className="mt-3 flex flex-wrap gap-1.5 transition-opacity lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
                    {a.can.update && (
                        <Link
                            href={edit.url(a.id)}
                            className="btn-ghost px-3 py-1.5 text-xs"
                        >
                            <Icon name="edit" width={14} height={14} />
                            Edit
                        </Link>
                    )}
                    {a.status === 'published' && (
                        <a
                            href={publicArticle.url(a.slug)}
                            target="_blank"
                            className="btn-ghost px-3 py-1.5 text-xs"
                        >
                            <Icon name="external" width={14} height={14} />
                            Lihat
                        </a>
                    )}
                    {a.can.submit && a.status !== 'review' && (
                        <button
                            onClick={() => post(submit.url(a.id))}
                            className="btn-ghost px-3 py-1.5 text-xs"
                        >
                            <Icon name="send" width={14} height={14} />
                            Ajukan
                        </button>
                    )}
                    {a.can.publish && a.status !== 'published' && (
                        <button
                            onClick={() => post(publish.url(a.id))}
                            className="btn-success px-3 py-1.5 text-xs"
                        >
                            <Icon name="check" width={14} height={14} />
                            Terbitkan
                        </button>
                    )}
                    {a.can.publish && a.status === 'review' && (
                        <button
                            onClick={() => post(reject.url(a.id))}
                            className="btn-danger px-3 py-1.5 text-xs"
                        >
                            <Icon name="x" width={14} height={14} />
                            Tolak
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
