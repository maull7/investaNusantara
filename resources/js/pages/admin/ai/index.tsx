import { Head, Link, router } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import {
    AiTabs,
    HermesBadge,
    type HermesStatus,
    TaskPill,
    type TaskStatus,
} from '@/components/admin/ai';
import { CountUp, EmptyState } from '@/components/admin/ui';
import Icon, { type IconName } from '@/components/icons';
import { ease } from '@/components/motion';
import AdminLayout from '@/layouts/admin';
import { timeAgo } from '@/lib/news';
import { cn } from '@/lib/utils';
import { article as articleRoute } from '@/routes';
import { sources as sourcesPage } from '@/routes/admin/ai';
import { retry as retryFetch } from '@/routes/admin/ai/fetches';
import { retry as retryItem } from '@/routes/admin/ai/items';
import { fetch as fetchSource } from '@/routes/admin/ai/sources';
import { edit as editArticle } from '@/routes/admin/articles';

type Item = {
    id: number;
    title: string;
    url: string;
    status: TaskStatus;
    attempts: number;
    error: string | null;
    updated_at: string;
    article: { id: number; slug: string; status: string } | null;
};

type Fetch = {
    id: number;
    status: TaskStatus;
    trigger: 'manual' | 'schedule';
    via: 'rss' | 'sitemap' | 'hermes' | null;
    attempts: number;
    found: number;
    error: string | null;
    created_at: string;
    finished_at: string | null;
    source: { id: number; name: string; url: string } | null;
    items: Item[];
};

type Props = {
    hermes: HermesStatus;
    stats: {
        published: number;
        review: number;
        failed: number;
        duplicate: number;
        active: number;
        tokens: number;
    };
    fetches: Fetch[];
    sources: { id: number; name: string }[];
};

const viaLabel = {
    rss: 'RSS (tanpa token)',
    sitemap: 'sitemap (tanpa token)',
    hermes: 'Hermes',
} as const;

const live: TaskStatus[] = ['queued', 'running', 'paused'];

export default function AiQueue({ hermes, stats, fetches, sources }: Props) {
    const busy =
        stats.active > 0 ||
        fetches.some((f) => live.includes(f.status)) ||
        hermes.status !== 'online';

    // Live view: refresh fast while something is moving, slowly otherwise.
    useEffect(() => {
        const t = window.setTimeout(
            () =>
                router.reload({
                    only: ['hermes', 'stats', 'fetches'],
                }),
            busy ? 3000 : 20000,
        );

        return () => window.clearTimeout(t);
    }, [busy, hermes, stats, fetches]);

    const tiles: {
        label: string;
        value: number;
        icon: IconName;
        tone: string;
    }[] = [
        {
            label: 'Terbit hari ini',
            value: stats.published,
            icon: 'check',
            tone: 'text-emerald-600 bg-emerald-50',
        },
        {
            label: 'Perlu review',
            value: stats.review,
            icon: 'eye',
            tone: 'text-violet-600 bg-violet-50',
        },
        {
            label: 'Sedang diproses',
            value: stats.active,
            icon: 'bolt',
            tone: 'text-sky-600 bg-sky-50',
        },
        {
            label: 'Gagal',
            value: stats.failed,
            icon: 'x',
            tone: 'text-red-600 bg-red-50',
        },
        {
            label: 'Duplikat dilewati',
            value: stats.duplicate,
            icon: 'file',
            tone: 'text-slate-500 bg-slate-100',
        },
        {
            label: 'Token hari ini',
            value: stats.tokens,
            icon: 'flame',
            tone: 'text-amber-600 bg-amber-50',
        },
    ];

    return (
        <AdminLayout
            title="Berita AI"
            subtitle="Hermes mencari berita dari situs sumber, menulis sinopsis, lalu menerbitkannya dengan atribusi sumber."
            actions={
                <a
                    href="/horizon"
                    target="_blank"
                    className="btn-ghost py-2 text-sm"
                >
                    <Icon name="external" width={16} height={16} />
                    Horizon
                </a>
            }
        >
            <Head title="Berita AI" />
            <AiTabs />

            <HermesPanel hermes={hermes} sources={sources} />

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {tiles.map((t, i) => (
                    <motion.div
                        key={t.label}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.45, ease }}
                        className="card p-4"
                    >
                        <span
                            className={cn(
                                'grid size-9 place-items-center rounded-xl',
                                t.tone,
                            )}
                        >
                            <Icon name={t.icon} width={18} height={18} />
                        </span>
                        <p className="mt-3 text-2xl font-semibold text-navy-900 tabular-nums">
                            <CountUp value={t.value} />
                        </p>
                        <p className="text-xs text-slate-500">{t.label}</p>
                    </motion.div>
                ))}
            </div>

            <h2 className="mt-8 mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
                Riwayat pengambilan
            </h2>
            {fetches.length === 0 ? (
                <div className="card">
                    <EmptyState
                        icon="bolt"
                        title="Belum ada pengambilan berita"
                    >
                        Tambahkan situs di{' '}
                        <Link
                            href={sourcesPage.url()}
                            className="font-medium text-accent"
                        >
                            Sumber berita
                        </Link>
                        , lalu klik “Ambil sekarang”.
                    </EmptyState>
                </div>
            ) : (
                <div className="space-y-3">
                    {fetches.map((f, i) => (
                        <FetchCard key={f.id} fetch={f} index={i} />
                    ))}
                </div>
            )}
        </AdminLayout>
    );
}

function HermesPanel({
    hermes,
    sources,
}: {
    hermes: HermesStatus;
    sources: Props['sources'];
}) {
    const [source, setSource] = useState(sources[0]?.id ?? 0);
    const [sending, setSending] = useState(false);

    return (
        <div className="flex flex-wrap items-center gap-4 card p-4 sm:p-5">
            <div className="min-w-56 flex-1">
                <HermesBadge hermes={hermes} />
                <p className="mt-2 text-sm text-slate-500">
                    {hermes.status === 'online' &&
                        'Gateway Hermes terhubung. Antrean berjalan normal.'}
                    {hermes.status === 'offline' &&
                        'Gateway tidak menjawab. Tugas tetap tersimpan dan otomatis lanjut setelah Hermes kembali — cek SSH tunnel / autossh.'}
                    {hermes.status === 'paused' &&
                        `Provider AI bermasalah, antrean menunggu sampai ${new Date(hermes.paused_until!).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.`}
                </p>
                {hermes.last_error && (
                    <p className="mt-1 text-xs text-red-600">
                        {hermes.last_error}
                    </p>
                )}
            </div>
            {sources.length > 0 && (
                <div className="flex w-full items-center gap-2 sm:w-auto">
                    <select
                        value={source}
                        onChange={(e) => setSource(Number(e.target.value))}
                        aria-label="Sumber berita"
                        className="input min-w-0 flex-1 py-2 sm:w-52"
                    >
                        {sources.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        disabled={sending || !source}
                        onClick={() =>
                            router.post(
                                fetchSource.url(source),
                                {},
                                {
                                    preserveScroll: true,
                                    onStart: () => setSending(true),
                                    onFinish: () => setSending(false),
                                },
                            )
                        }
                        className="btn-primary shrink-0 py-2"
                    >
                        <Icon name="bolt" width={16} height={16} />
                        Ambil sekarang
                    </button>
                </div>
            )}
        </div>
    );
}

function FetchCard({ fetch: f, index }: { fetch: Fetch; index: number }) {
    const [open, setOpen] = useState(index === 0 || live.includes(f.status));
    const counts = f.items.reduce<Record<string, number>>((acc, it) => {
        acc[it.status] = (acc[it.status] ?? 0) + 1;

        return acc;
    }, {});
    const canRetry = f.status === 'failed' || f.status === 'paused';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                delay: Math.min(index, 8) * 0.04,
                duration: 0.45,
                ease,
            }}
            className="overflow-hidden card"
        >
            <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                    <motion.span
                        animate={{ rotate: open ? 90 : 0 }}
                        className="text-slate-400"
                    >
                        <Icon name="chevron" width={16} height={16} />
                    </motion.span>
                    <div className="min-w-0">
                        <p className="truncate font-semibold text-navy-900">
                            {f.source?.name ?? 'Sumber dihapus'}
                        </p>
                        <p className="text-xs text-slate-500">
                            {f.trigger === 'schedule' ? 'Terjadwal' : 'Manual'}{' '}
                            · {timeAgo(f.created_at)}
                            {f.via && ` · lewat ${viaLabel[f.via]}`}
                            {f.attempts > 1 && ` · percobaan ke-${f.attempts}`}
                            {f.status === 'completed' &&
                                ` · ${f.found} berita baru`}
                        </p>
                    </div>
                </button>
                <div className="flex flex-wrap items-center gap-1.5">
                    {(
                        ['published', 'review', 'running', 'failed'] as const
                    ).map((s) =>
                        counts[s] ? (
                            <TaskPill
                                key={s}
                                status={s}
                                className="hidden sm:inline-flex"
                            />
                        ) : null,
                    )}
                    <TaskPill status={f.status} />
                    {canRetry && (
                        <button
                            type="button"
                            onClick={() =>
                                router.post(
                                    retryFetch.url(f.id),
                                    {},
                                    { preserveScroll: true },
                                )
                            }
                            className="btn-ghost px-3 py-1 text-xs"
                        >
                            Coba lagi
                        </button>
                    )}
                </div>
                {f.error && (
                    <p
                        className={cn(
                            'w-full pl-7 text-xs',
                            f.status === 'completed'
                                ? 'text-amber-700'
                                : 'text-red-600',
                        )}
                    >
                        {f.error}
                    </p>
                )}
            </div>

            <AnimatePresence initial={false}>
                {open && f.items.length > 0 && (
                    <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease }}
                        className="divide-y divide-slate-100 border-t border-slate-100"
                    >
                        {f.items.map((it) => (
                            <ItemRow key={it.id} item={it} />
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function ItemRow({ item }: { item: Item }) {
    return (
        <li className="flex flex-wrap items-start gap-3 px-4 py-3 sm:px-5 sm:pl-12">
            <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium text-navy-900">
                    {item.title}
                </p>
                <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 block truncate text-xs text-slate-400 hover:text-accent"
                >
                    {item.url}
                </a>
                {item.error && (
                    <p
                        className={cn(
                            'mt-1 text-xs',
                            item.status === 'review'
                                ? 'text-violet-700'
                                : 'text-red-600',
                        )}
                    >
                        {item.error}
                    </p>
                )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
                <TaskPill status={item.status} />
                {item.article && (
                    <>
                        <Link
                            href={editArticle.url(item.article.id)}
                            className="btn-ghost px-2.5 py-1 text-xs"
                        >
                            <Icon name="edit" width={14} height={14} />
                            Edit
                        </Link>
                        {item.article.status === 'published' && (
                            <a
                                href={articleRoute.url(item.article.slug)}
                                target="_blank"
                                aria-label="Lihat artikel"
                                className="btn-ghost px-2.5 py-1 text-xs"
                            >
                                <Icon name="external" width={14} height={14} />
                            </a>
                        )}
                    </>
                )}
                {(item.status === 'failed' || item.status === 'paused') &&
                    !item.article && (
                        <button
                            type="button"
                            onClick={() =>
                                router.post(
                                    retryItem.url(item.id),
                                    {},
                                    { preserveScroll: true },
                                )
                            }
                            className="btn-ghost px-3 py-1 text-xs"
                        >
                            Coba lagi
                        </button>
                    )}
            </div>
        </li>
    );
}
