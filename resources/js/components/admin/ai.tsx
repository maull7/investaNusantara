import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import Icon from '@/components/icons';
import { cn } from '@/lib/utils';
import { index as aiIndex, sources as aiSources } from '@/routes/admin/ai';
import { cities as citiesRoute } from '@/routes/region';

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
    status: 'online' | 'offline' | 'paused' | 'disabled';
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
    disabled: {
        label: 'Token Hermes nonaktif',
        ring: 'ring-slate-200 bg-slate-50 text-slate-700',
        dot: 'bg-slate-400',
    },
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
    city,
    extraQuery = {},
}: {
    value: string;
    provinces: { code: string; name: string }[];
    /** Pass (even as '') to also show the kabupaten/kota filter. */
    city?: string;
    extraQuery?: Record<string, string>;
}) {
    const [cities, setCities] = useState<{ code: string; name: string }[]>([]);
    const hasCity = city !== undefined;
    const real = value !== '' && value !== 'nasional';

    useEffect(() => {
        if (!hasCity || !real) {
            setCities([]);

            return;
        }
        let cancelled = false;
        void fetch(citiesRoute.url(value))
            .then((r) => r.json())
            .then((rows) => !cancelled && setCities(rows));

        return () => {
            cancelled = true;
        };
    }, [hasCity, real, value]);

    const go = (query: Record<string, string>) =>
        router.get(
            window.location.pathname,
            { ...extraQuery, ...query },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );

    return (
        <div className="flex flex-wrap gap-2">
            <FilterSelect
                value={value}
                label="Filter provinsi"
                onChange={(v) => go(v ? { province: v } : {})}
                options={[
                    { value: '', label: 'Semua provinsi' },
                    { value: 'nasional', label: 'Nasional' },
                    ...provinces.map((p) => ({
                        value: p.code,
                        label: p.name,
                    })),
                ]}
            />
            {hasCity && (
                <FilterSelect
                    value={city}
                    label="Filter kabupaten/kota"
                    disabled={!real}
                    onChange={(v) =>
                        go({ province: value, ...(v && { city: v }) })
                    }
                    options={[
                        { value: '', label: 'Semua kabupaten/kota' },
                        ...cities.map((c) => ({
                            value: c.code,
                            label: c.name,
                        })),
                    ]}
                />
            )}
        </div>
    );
}

/** Pill dropdown matching the tabs; a custom list so the selected row is red, not the browser's blue. */
export function FilterSelect({
    value,
    options,
    label,
    disabled,
    onChange,
}: {
    value: string;
    options: { value: string; label: string }[];
    label: string;
    disabled?: boolean;
    onChange: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const box = useRef<HTMLDivElement>(null);
    const current = options.find((o) => o.value === value) ?? options[0];

    useEffect(() => {
        if (!open) {
            return;
        }
        const close = (e: MouseEvent | KeyboardEvent) => {
            if (
                e instanceof KeyboardEvent
                    ? e.key === 'Escape'
                    : !box.current?.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', close);

        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', close);
        };
    }, [open]);

    return (
        <div ref={box} className="relative">
            <button
                type="button"
                aria-label={label}
                aria-haspopup="listbox"
                aria-expanded={open}
                disabled={disabled}
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full bg-white py-2 pr-3 pl-4 text-sm font-medium text-slate-600 ring-1 ring-slate-200 transition hover:text-accent hover:ring-accent/30 focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
            >
                {current.label}
                <Icon
                    name="chevron"
                    width={14}
                    height={14}
                    className={cn(
                        'text-slate-400 transition-transform',
                        open ? '-rotate-90' : 'rotate-90',
                    )}
                />
            </button>
            {open && (
                <ul
                    role="listbox"
                    aria-label={label}
                    className="absolute left-0 z-20 mt-2 max-h-72 w-max min-w-full overflow-y-auto rounded-2xl border border-accent/10 bg-white p-1.5 shadow-lg shadow-accent/10"
                >
                    {options.map((o) => (
                        <li
                            key={o.value}
                            role="option"
                            aria-selected={o.value === value}
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    setOpen(false);
                                    onChange(o.value);
                                }}
                                className={cn(
                                    'block w-full rounded-xl px-3 py-1.5 text-left text-sm transition-colors',
                                    o.value === value
                                        ? 'bg-accent/10 font-medium text-accent'
                                        : 'text-slate-600 hover:bg-accent/5 hover:text-accent',
                                )}
                            >
                                {o.label}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
