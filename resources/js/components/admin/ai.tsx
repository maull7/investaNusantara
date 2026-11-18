import { Link, router, usePage } from '@inertiajs/react';
import { motion } from 'motion/react';
import Icon from '@/components/icons';
import { cn } from '@/lib/utils';
import { index as aiIndex, sources as aiSources } from '@/routes/admin/ai';

export type TaskStatus =
    | 'queued'
    | 'running'
    | 'paused'
    | 'completed'
    | 'published'
    | 'review'
    | 'duplicate'
    | 'failed';

export type HermesStatus = {
    status: 'online' | 'offline' | 'paused';
    paused_until: string | null;
    last_error: string | null;
    checked_at: string;
};

export const taskMeta: Record<
    TaskStatus,
    { label: string; pill: string; dot: string; live?: boolean }
> = {
    queued: {
        label: 'Antre',
        pill: 'bg-slate-100 text-slate-600 ring-slate-200',
        dot: 'bg-slate-400',
    },
    running: {
        label: 'Diproses Hermes',
        pill: 'bg-sky-50 text-sky-700 ring-sky-200',
        dot: 'bg-sky-500',
        live: true,
    },
    paused: {
        label: 'Dijeda',
        pill: 'bg-amber-50 text-amber-700 ring-amber-200',
        dot: 'bg-amber-500',
        live: true,
    },
    completed: {
        label: 'Selesai',
        pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        dot: 'bg-emerald-500',
    },
    published: {
        label: 'Terbit',
        pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        dot: 'bg-emerald-500',
    },
    review: {
        label: 'Perlu review',
        pill: 'bg-violet-50 text-violet-700 ring-violet-200',
        dot: 'bg-violet-500',
    },
    duplicate: {
        label: 'Duplikat',
        pill: 'bg-slate-100 text-slate-500 ring-slate-200',
        dot: 'bg-slate-300',
    },
    failed: {
        label: 'Gagal',
        pill: 'bg-red-50 text-red-700 ring-red-200',
        dot: 'bg-red-500',
    },
};

export function TaskPill({
    status,
    className,
}: {
    status: TaskStatus;
    className?: string;
}) {
    const meta = taskMeta[status];

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1',
                meta.pill,
                className,
            )}
        >
            <span className="relative flex size-1.5">
                {meta.live && (
                    <span
                        className={cn(
                            'absolute inset-0 animate-ping rounded-full opacity-70',
                            meta.dot,
                        )}
                    />
                )}
                <span
                    className={cn('relative size-1.5 rounded-full', meta.dot)}
                />
            </span>
            {meta.label}
        </span>
    );
}

const hermesTone = {
    online: {
        label: 'Hermes online',
        ring: 'ring-emerald-200 bg-emerald-50 text-emerald-700',
        dot: 'bg-emerald-500',
    },
    paused: {
        label: 'Antrean dijeda',
        ring: 'ring-amber-200 bg-amber-50 text-amber-700',
        dot: 'bg-amber-500',
    },
    offline: {
        label: 'Hermes offline',
        ring: 'ring-red-200 bg-red-50 text-red-700',
        dot: 'bg-red-500',
    },
} as const;

/** Gateway health: green when reachable, amber while the queue waits for the provider, red when the tunnel is down. */
export function HermesBadge({ hermes }: { hermes: HermesStatus }) {
    const tone = hermesTone[hermes.status];

    return (
        <span
            className={cn(
                'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1',
                tone.ring,
            )}
        >
            <span className="relative flex size-2">
                <span
                    className={cn(
                        'absolute inset-0 animate-ping rounded-full opacity-60',
                        tone.dot,
                    )}
                />
                <span
                    className={cn('relative size-2 rounded-full', tone.dot)}
                />
            </span>
            {tone.label}
        </span>
    );
}

/** Antrean | Sumber berita switcher shown on both AI pages. Keeps the query (province filter) across tabs. */
export function AiTabs({ children }: { children?: React.ReactNode }) {
    const [path, query] = usePage().url.split('?');
    const tabs = [
        { href: aiIndex.url(), label: 'Antrean', icon: 'bolt' as const },
        {
            href: aiSources.url(),
            label: 'Sumber berita',
            icon: 'sliders' as const,
        },
    ];

    return (
        <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-full bg-white p-1 ring-1 ring-slate-200">
                {tabs.map((t) => {
                    const active = path === t.href;

                    return (
                        <Link
                            key={t.href}
                            href={query ? `${t.href}?${query}` : t.href}
                            preserveScroll
                            className={cn(
                                'relative flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                                active
                                    ? 'text-white'
                                    : 'text-slate-500 hover:text-navy-900',
                            )}
                        >
                            {active && (
                                <motion.span
                                    layoutId="ai-tab"
                                    transition={{
                                        type: 'spring',
                                        stiffness: 420,
                                        damping: 34,
                                    }}
                                    className="absolute inset-0 rounded-full bg-accent"
                                />
                            )}
                            <Icon
                                name={t.icon}
                                width={16}
                                height={16}
                                className="relative"
                            />
                            <span className="relative">{t.label}</span>
                        </Link>
                    );
                })}
            </div>
            {children}
        </div>
    );
}

/** ?province= filter for the AI pages: '' = all, 'nasional' = sources without a region, otherwise a province code. */
export function ProvinceFilter({
    value,
    provinces,
}: {
    value: string;
    provinces: { code: string; name: string }[];
}) {
    return (
        <select
            value={value}
            onChange={(e) =>
                router.get(
                    window.location.pathname,
                    e.target.value ? { province: e.target.value } : {},
                    {
                        preserveState: true,
                        preserveScroll: true,
                        replace: true,
                    },
                )
            }
            aria-label="Filter provinsi"
            className="input w-auto py-2 text-sm"
        >
            <option value="">Semua provinsi</option>
            <option value="nasional">Nasional</option>
            {provinces.map((p) => (
                <option key={p.code} value={p.code}>
                    {p.name}
                </option>
            ))}
        </select>
    );
}
