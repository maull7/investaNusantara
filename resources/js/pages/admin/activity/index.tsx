import { Head, router } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Avatar, EmptyState, RoleBadge } from '@/components/admin/ui';
import Icon, { type IconName } from '@/components/icons';
import { ease } from '@/components/motion';
import Pagination from '@/components/pagination';
import AdminLayout from '@/layouts/admin';
import { cn } from '@/lib/utils';
import { index } from '@/routes/admin/activity';
import type { Paginated, Role } from '@/types';

type Change = { from: unknown; to: unknown };

type Log = {
    id: number;
    event: string;
    description: string;
    properties: { changes?: Record<string, Change>; email?: string } | null;
    ip_address: string | null;
    created_at: string;
    user: { id: number; name: string; role: Role } | null;
};

type Props = {
    logs: Paginated<Log>;
    modules: { value: string; label: string }[];
    users: { id: number; name: string }[];
    filters: { module?: string; user?: string; q?: string };
};

/** Icon and tint per event prefix (article.published -> article). */
const moduleMeta: Record<string, { icon: IconName; tone: string }> = {
    auth: { icon: 'lock', tone: 'bg-slate-100 text-slate-600' },
    article: { icon: 'file', tone: 'bg-accent/10 text-accent' },
    category: { icon: 'tag', tone: 'bg-amber-50 text-amber-700' },
    user: { icon: 'users', tone: 'bg-violet-50 text-violet-700' },
    news_source: { icon: 'bolt', tone: 'bg-teal/10 text-teal-dark' },
};

/** Events that deserve attention get a stronger tint. */
const eventTone: Record<string, string> = {
    'auth.failed': 'bg-red-50 text-red-600',
    'article.published': 'bg-emerald-50 text-emerald-700',
    'article.rejected': 'bg-red-50 text-red-600',
};

const fieldLabel: Record<string, string> = {
    title: 'Judul',
    excerpt: 'Ringkasan',
    body: 'Isi',
    status: 'Status',
    category_id: 'Kategori',
    region_code: 'Wilayah',
    cover_path: 'Sampul',
    is_headline: 'Headline',
    is_breaking: 'Breaking',
    published_at: 'Terbit',
    editor_id: 'Editor',
    slug: 'Slug',
    name: 'Nama',
    email: 'Email',
    password: 'Password',
    role: 'Peran',
    permissions: 'Akses',
    sort: 'Urutan',
    active: 'Aktif',
    url: 'URL',
};

function show(value: unknown): string {
    if (value === null || value === undefined || value === '') {
        return '—';
    }
    if (typeof value === 'boolean') {
        return value ? 'Ya' : 'Tidak';
    }
    if (Array.isArray(value)) {
        return value.length ? value.join(', ') : '—';
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    return String(value);
}

const dayFmt = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});
const timeFmt = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
});

function dayLabel(date: Date): string {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) {
        return 'Hari ini';
    }
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Kemarin';
    }

    return dayFmt.format(date);
}

export default function ActivityIndex({
    logs,
    modules,
    users,
    filters,
}: Props) {
    const [q, setQ] = useState(filters.q ?? '');
    const first = useRef(true);

    function visit(next: Partial<Props['filters']>) {
        router.get(
            index.url(),
            { ...filters, ...next },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    // Search as you type, debounced.
    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        const timer = window.setTimeout(
            () => visit({ q: q || undefined }),
            350,
        );

        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q]);

    // Group rows by calendar day, keeping server order (newest first).
    const groups: { label: string; rows: Log[] }[] = [];
    for (const log of logs.data) {
        const label = dayLabel(new Date(log.created_at));
        const last = groups.at(-1);
        if (last?.label === label) {
            last.rows.push(log);
        } else {
            groups.push({ label, rows: [log] });
        }
    }

    return (
        <AdminLayout
            title="Log Aktivitas"
            subtitle={`${logs.total.toLocaleString('id-ID')} aktivitas tercatat`}
        >
            <Head title="Log Aktivitas" />

            <div className="mb-5 flex flex-wrap items-center gap-3 card p-3 sm:p-4">
                <label className="relative min-w-56 flex-1">
                    <span className="sr-only">Cari aktivitas</span>
                    <Icon
                        name="search"
                        width={16}
                        height={16}
                        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Cari aktivitas, judul, atau email…"
                        className="input pl-10"
                    />
                </label>
                <select
                    aria-label="Jenis aktivitas"
                    value={filters.module ?? ''}
                    onChange={(e) =>
                        visit({ module: e.target.value || undefined })
                    }
                    className="input w-auto min-w-40"
                >
                    <option value="">Semua jenis</option>
                    {modules.map((m) => (
                        <option key={m.value} value={m.value}>
                            {m.label}
                        </option>
                    ))}
                </select>
                <select
                    aria-label="Pengguna"
                    value={filters.user ?? ''}
                    onChange={(e) =>
                        visit({ user: e.target.value || undefined })
                    }
                    className="input w-auto min-w-40"
                >
                    <option value="">Semua pengguna</option>
                    {users.map((u) => (
                        <option key={u.id} value={u.id}>
                            {u.name}
                        </option>
                    ))}
                </select>
            </div>

            {logs.data.length === 0 ? (
                <div className="card">
                    <EmptyState icon="activity" title="Belum ada aktivitas">
                        Aktivitas tim akan muncul di sini, misalnya login,
                        menerbitkan artikel, atau mengubah pengguna.
                    </EmptyState>
                </div>
            ) : (
                <div className="space-y-6">
                    {groups.map((g) => (
                        <section key={g.label}>
                            <h2 className="mb-2 px-1 text-xs font-medium tracking-[0.18em] text-slate-400 uppercase">
                                {g.label}
                            </h2>
                            <ol className="divide-y divide-slate-100 overflow-hidden card">
                                {g.rows.map((log, i) => (
                                    <Row key={log.id} log={log} index={i} />
                                ))}
                            </ol>
                        </section>
                    ))}
                </div>
            )}
            <Pagination data={logs} />
        </AdminLayout>
    );
}

function Row({ log, index }: { log: Log; index: number }) {
    const [open, setOpen] = useState(false);
    const area = log.event.split('.')[0];
    const meta = moduleMeta[area] ?? moduleMeta.auth;
    const changes = Object.entries(log.properties?.changes ?? {});

    return (
        <motion.li
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                delay: Math.min(index, 12) * 0.03,
                duration: 0.3,
                ease,
            }}
            className="p-4 sm:px-5"
        >
            <div className="flex items-start gap-3">
                <span className="relative shrink-0">
                    {log.user ? (
                        <Avatar
                            name={log.user.name}
                            className="size-9 text-xs"
                        />
                    ) : (
                        <span className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-500">
                            <Icon name="bolt" width={16} height={16} />
                        </span>
                    )}
                    <span
                        className={cn(
                            'absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full ring-2 ring-white',
                            eventTone[log.event] ?? meta.tone,
                        )}
                    >
                        <Icon name={meta.icon} width={11} height={11} />
                    </span>
                </span>

                <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-600">
                        <span className="font-semibold text-navy-900">
                            {log.user?.name ?? 'Sistem'}
                        </span>{' '}
                        <span
                            className={cn(
                                log.event === 'auth.failed' && 'text-red-600',
                            )}
                        >
                            {log.description}
                        </span>
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                        <time
                            dateTime={log.created_at}
                            className="tabular-nums"
                        >
                            {timeFmt.format(new Date(log.created_at))}
                        </time>
                        {log.user && <RoleBadge role={log.user.role} />}
                        {log.ip_address && (
                            <span className="font-mono">{log.ip_address}</span>
                        )}
                        {changes.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setOpen((v) => !v)}
                                aria-expanded={open}
                                className="flex items-center gap-1 font-medium text-accent hover:text-accent-dark"
                            >
                                {changes.length} perubahan
                                <Icon
                                    name="chevron"
                                    width={12}
                                    height={12}
                                    className={cn(
                                        'transition-transform',
                                        open && 'rotate-90',
                                    )}
                                />
                            </button>
                        )}
                    </div>

                    <AnimatePresence initial={false}>
                        {open && (
                            <motion.dl
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.25, ease }}
                                className="overflow-hidden"
                            >
                                <div className="mt-3 grid gap-1.5 rounded-xl bg-slate-50 p-3 text-xs ring-1 ring-slate-100">
                                    {changes.map(([field, c]) => (
                                        <div
                                            key={field}
                                            className="grid gap-1 sm:grid-cols-[7rem_1fr]"
                                        >
                                            <dt className="font-medium text-slate-500">
                                                {fieldLabel[field] ?? field}
                                            </dt>
                                            <dd className="min-w-0 break-words text-navy-900">
                                                {c.from === null &&
                                                c.to === null ? (
                                                    <span className="text-slate-400">
                                                        diubah
                                                    </span>
                                                ) : (
                                                    <>
                                                        <span className="text-slate-400 line-through">
                                                            {show(c.from)}
                                                        </span>{' '}
                                                        →{' '}
                                                        <span>
                                                            {show(c.to)}
                                                        </span>
                                                    </>
                                                )}
                                            </dd>
                                        </div>
                                    ))}
                                </div>
                            </motion.dl>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.li>
    );
}
