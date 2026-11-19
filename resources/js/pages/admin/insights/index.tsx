import { Head, router } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useEffect, useState } from 'react';
import {
    DateRangePicker,
    type RangeValue,
    rangeLabel,
    ReadsChart,
    SentimentDiverging,
} from '@/components/admin/insights-charts';
import { CountUp, EmptyState } from '@/components/admin/ui';
import Icon from '@/components/icons';
import AdminLayout from '@/layouts/admin';
import {
    type Sentiment,
    SentimentBar,
    SENTIMENTS as SENTIMENT,
} from '@/components/sentiment';
import { cn } from '@/lib/utils';
import { insights } from '@/routes/admin';
import { exportMethod } from '@/routes/admin/insights';
import { article as articleShow, tag as tagPage } from '@/routes';
import { ease } from '@/components/motion';

type Props = {
    filters: {
        periode: number | null;
        dari: string;
        sampai: string;
        provinsi: string | null;
    };
    days: number;
    previous: { dari: string; sampai: string };
    periods: number[];
    today: string;
    provinces: { code: string; name: string }[];
    scope: string;
    kpi: {
        views: number;
        views_prev: number;
        published: number;
        published_prev: number;
        regions: number;
        sentiment: Record<Sentiment, number>;
    };
    daily: { date: string; views: number }[];
    dailyPrevious: { date: string; views: number }[];
    topics: { name: string; slug: string; views: number; articles: number }[];
    regions: { code: string; name: string; articles: number; views: number }[];
    rising: {
        name: string;
        slug: string;
        now: number;
        before: number;
        growth: number | null;
    }[];
    sentimentByRegion: ({
        code: string;
        name: string;
        total: number;
    } & Record<Sentiment, number>)[];
    issues: {
        name: string;
        slug: string;
        articles: number;
        provinces: number;
        provinces_before: number;
    }[];
    nationwide: boolean;
    client: { organization: string | null; ends_at: string | null } | null;
    detail?: Detail | null;
};

type Detail = {
    kind: 'tag' | 'region';
    key: string;
    title: string;
    views: number;
    canDrill: boolean;
    articles: {
        id: number;
        title: string;
        slug: string;
        sentiment: Sentiment | null;
        region: string | null;
        published_at: string | null;
        views: number;
    }[];
};

type Selection = { kind: 'tag' | 'region'; key: string; title: string };

const num = new Intl.NumberFormat('id-ID');

/** Clickable list row: hover wash, keyboard focus ring, chevron hint. */
const rowButton =
    'group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none';

function RowChevron() {
    return (
        <Icon
            name="chevron"
            width={14}
            height={14}
            className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
        />
    );
}

function delta(now: number, before: number) {
    if (!before) {
        return now ? 'baru' : null;
    }
    const pct = Math.round(((now - before) / before) * 100);
    return `${pct > 0 ? '+' : ''}${pct}%`;
}

/** Media Intelligence: topics, regions, rising keywords, sentiment, national issues. */
export default function Insights(props: Props) {
    const { filters, periods, provinces, scope, kpi } = props;
    // Every filter scopes the whole page; while it reloads the old charts stay, faded.
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        const off = [
            // Partial reloads (the detail panel) must not fade the whole page.
            router.on(
                'start',
                (e) => !e.detail.visit.only.length && setLoading(true),
            ),
            router.on('finish', () => setLoading(false)),
        ];
        return () => off.forEach((f) => f());
    }, []);
    const range: RangeValue = filters.periode
        ? { periode: filters.periode }
        : { dari: filters.dari, sampai: filters.sampai };
    const go = (query: { range?: RangeValue; provinsi?: string | null }) =>
        router.get(
            insights.url(),
            Object.fromEntries(
                Object.entries({
                    ...(query.range ?? range),
                    provinsi:
                        'provinsi' in query ? query.provinsi : filters.provinsi,
                }).filter(([, v]) => v),
            ),
            { preserveState: true, preserveScroll: true, replace: true },
        );
    // Click a topic, keyword, issue or region: a side panel lists the articles behind it.
    const [selected, setSelected] = useState<Selection | null>(null);
    function open(sel: Selection) {
        setSelected(sel);
        router.reload({
            only: ['detail'],
            data: sel.kind === 'tag' ? { tag: sel.key } : { wilayah: sel.key },
        });
    }
    const query = Object.fromEntries(
        Object.entries({ ...range, provinsi: filters.provinsi }).filter(
            ([, v]) => v,
        ),
    );
    const sentimentTotal =
        kpi.sentiment.positif + kpi.sentiment.netral + kpi.sentiment.negatif;

    return (
        <AdminLayout
            title="Media Intelligence"
            subtitle={
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {props.client && (
                        <span className="rounded-full bg-teal/10 px-2.5 py-0.5 text-xs font-medium text-teal-dark ring-1 ring-teal/30">
                            {props.client.organization ?? 'Klien Data'}
                            {props.client.ends_at &&
                                ` · langganan s.d. ${rangeLabel(props.client.ends_at, props.client.ends_at)}`}
                        </span>
                    )}
                    {rangeLabel(filters.dari, filters.sampai)} ({props.days}{' '}
                    hari) dibanding{' '}
                    {rangeLabel(props.previous.dari, props.previous.sampai)}
                </span>
            }
            actions={
                <div className="flex gap-2 print:hidden">
                    <a href={exportMethod.url({ query })} className="btn-ghost">
                        <Icon
                            name="upload"
                            width={16}
                            height={16}
                            className="rotate-180"
                        />
                        Ekspor CSV
                    </a>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="btn-ghost"
                    >
                        <Icon name="file" width={16} height={16} />
                        Cetak / PDF
                    </button>
                </div>
            }
        >
            <Head title="Media Intelligence" />

            <div className="mb-5 flex flex-wrap items-center gap-2 print:hidden">
                <DateRangePicker
                    periode={filters.periode}
                    dari={filters.dari}
                    sampai={filters.sampai}
                    presets={periods}
                    today={props.today}
                    onChange={(value) => go({ range: value })}
                />
                <select
                    value={filters.provinsi ?? ''}
                    onChange={(e) => go({ provinsi: e.target.value || null })}
                    aria-label="Provinsi"
                    className="input h-11 w-auto"
                >
                    {props.nationwide && (
                        <option value="">Seluruh Indonesia</option>
                    )}
                    {provinces.map((p) => (
                        <option key={p.code} value={p.code}>
                            {p.name}
                        </option>
                    ))}
                </select>
            </div>

            <div
                aria-busy={loading}
                className={cn(
                    'transition-opacity duration-200',
                    loading && 'pointer-events-none opacity-50',
                )}
            >
                <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Kpi
                        label="Pembaca"
                        value={kpi.views}
                        change={delta(kpi.views, kpi.views_prev)}
                    />
                    <Kpi
                        label="Artikel terbit"
                        value={kpi.published}
                        change={delta(kpi.published, kpi.published_prev)}
                    />
                    <Kpi label="Daerah aktif" value={kpi.regions} />
                    <div className="card p-4">
                        <p className="text-xs text-slate-500">
                            Sentimen berita
                        </p>
                        {sentimentTotal === 0 ? (
                            <p className="mt-2 text-sm text-slate-400">
                                Belum ada data
                            </p>
                        ) : (
                            <>
                                <SentimentBar
                                    counts={kpi.sentiment}
                                    className="mt-3"
                                />
                                <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-slate-600">
                                    {SENTIMENT.map((s) => (
                                        <span key={s.key}>
                                            {s.label}{' '}
                                            <b className="text-navy-900">
                                                {Math.round(
                                                    (kpi.sentiment[s.key] /
                                                        sentimentTotal) *
                                                        100,
                                                )}
                                                %
                                            </b>
                                        </span>
                                    ))}
                                </p>
                            </>
                        )}
                    </div>
                </div>

                <Panel title="Pembaca per hari" className="mb-5">
                    {props.daily.some((d) => d.views) ||
                    props.dailyPrevious.some((d) => d.views) ? (
                        <ReadsChart
                            current={props.daily}
                            previous={props.dailyPrevious}
                            currentLabel={`Periode ini · ${rangeLabel(filters.dari, filters.sampai)}`}
                            previousLabel={`Periode lalu · ${rangeLabel(props.previous.dari, props.previous.sampai)}`}
                        />
                    ) : (
                        <Empty>
                            Belum ada pembaca tercatat pada periode ini.
                        </Empty>
                    )}
                </Panel>

                <div className="grid gap-5 lg:grid-cols-2">
                    <Panel
                        title="Topik paling banyak dibaca"
                        hint="tag × pembaca"
                    >
                        <Bars
                            onSelect={(row) =>
                                open({
                                    kind: 'tag',
                                    key: row.key,
                                    title: row.label,
                                })
                            }
                            rows={props.topics.map((t) => ({
                                key: t.slug,
                                label: `#${t.name}`,
                                value: t.views,
                                note: `${t.articles} artikel dibaca`,
                            }))}
                            empty="Belum ada artikel bertag yang dibaca pada periode ini."
                        />
                    </Panel>
                    <Panel title="Daerah paling aktif" hint={scope}>
                        <Bars
                            onSelect={(row) =>
                                open({
                                    kind: 'region',
                                    key: row.key,
                                    title: row.label,
                                })
                            }
                            rows={props.regions.map((r) => ({
                                key: r.code,
                                label: r.name,
                                value: r.articles,
                                note: `${num.format(r.views)} pembaca`,
                            }))}
                            unit="artikel"
                            empty="Belum ada artikel daerah pada periode ini."
                        />
                    </Panel>

                    <Panel
                        title="Kata kunci yang sedang naik"
                        hint="dibanding periode lalu"
                    >
                        {props.rising.length === 0 ? (
                            <Empty>Belum ada kata kunci yang naik.</Empty>
                        ) : (
                            <ol className="-mx-2 divide-y divide-slate-100">
                                {props.rising.map((r, i) => (
                                    <li key={r.slug}>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                open({
                                                    kind: 'tag',
                                                    key: r.slug,
                                                    title: `#${r.name}`,
                                                })
                                            }
                                            className={rowButton}
                                        >
                                            <span className="w-5 text-xs text-slate-400 tabular-nums">
                                                {i + 1}
                                            </span>
                                            <span className="min-w-0 flex-1 truncate font-medium text-navy-900">
                                                #{r.name}
                                            </span>
                                            <span className="text-xs text-slate-500 tabular-nums">
                                                {r.before} → {r.now} artikel
                                            </span>
                                            <span className="inline-flex min-w-16 items-center justify-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                                <Icon
                                                    name="arrow"
                                                    width={12}
                                                    height={12}
                                                    className="-rotate-45"
                                                />
                                                {r.growth === null
                                                    ? 'Baru'
                                                    : `+${r.growth}%`}
                                            </span>
                                            <RowChevron />
                                        </button>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </Panel>
                    <Panel
                        title="Isu nasional yang berkembang"
                        hint="muncul di ≥ 3 provinsi"
                    >
                        {filters.provinsi ? (
                            <Empty>
                                Isu nasional dihitung lintas provinsi. Pilih
                                “Seluruh Indonesia”.
                            </Empty>
                        ) : props.issues.length === 0 ? (
                            <Empty>
                                Belum ada isu yang menyebar lintas provinsi.
                            </Empty>
                        ) : (
                            <ul className="-mx-2 divide-y divide-slate-100">
                                {props.issues.map((s) => (
                                    <li key={s.slug}>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                open({
                                                    kind: 'tag',
                                                    key: s.slug,
                                                    title: `#${s.name}`,
                                                })
                                            }
                                            className={rowButton}
                                        >
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate font-medium text-navy-900">
                                                    #{s.name}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {s.articles} artikel
                                                </span>
                                            </span>
                                            <span className="text-right text-xs text-slate-600">
                                                <b className="text-sm text-navy-900">
                                                    {s.provinces}
                                                </b>{' '}
                                                provinsi
                                                {s.provinces >
                                                    s.provinces_before && (
                                                    <span className="block font-semibold text-emerald-700">
                                                        +
                                                        {s.provinces -
                                                            s.provinces_before}{' '}
                                                        dari periode lalu
                                                    </span>
                                                )}
                                            </span>
                                            <RowChevron />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                </div>

                <Panel
                    title="Sentimen berita per daerah"
                    hint={scope}
                    className="mt-5"
                >
                    {props.sentimentByRegion.length === 0 ? (
                        <EmptyState
                            icon="activity"
                            title="Belum ada data sentimen"
                        >
                            Sentimen diisi otomatis oleh AI untuk berita baru,
                            atau oleh editor di form artikel.
                        </EmptyState>
                    ) : (
                        <SentimentDiverging
                            rows={props.sentimentByRegion}
                            onSelect={(r) =>
                                open({
                                    kind: 'region',
                                    key: r.code,
                                    title: r.name,
                                })
                            }
                        />
                    )}
                </Panel>
            </div>
            <DetailPanel
                selected={selected}
                detail={props.detail ?? null}
                onClose={() => setSelected(null)}
                onDrill={(code) => {
                    setSelected(null);
                    go({ provinsi: code });
                }}
            />
        </AdminLayout>
    );
}

/** Side panel with the articles behind a clicked topic or region. */
function DetailPanel({
    selected,
    detail,
    onClose,
    onDrill,
}: {
    selected: Selection | null;
    detail: Detail | null;
    onClose: () => void;
    onDrill: (code: string) => void;
}) {
    const ready = detail && selected && detail.key === selected.key;
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <AnimatePresence>
            {selected && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-[2px] print:hidden"
                >
                    <motion.aside
                        role="dialog"
                        aria-modal="true"
                        aria-label={selected.title}
                        onClick={(e) => e.stopPropagation()}
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ duration: 0.3, ease }}
                        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
                    >
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold tracking-wide text-accent uppercase">
                                    {selected.kind === 'tag'
                                        ? 'Topik'
                                        : 'Daerah'}
                                </p>
                                <h2 className="truncate text-lg font-semibold text-navy-900">
                                    {selected.title}
                                </h2>
                                {ready && (
                                    <p className="text-xs text-slate-500">
                                        {num.format(detail.views)} pembaca pada
                                        periode ini
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Tutup"
                                className="grid size-9 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-accent/10 hover:text-accent"
                            >
                                <Icon name="x" width={18} height={18} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5">
                            {!ready ? (
                                <div className="flex items-center gap-3 py-8 text-sm text-slate-500">
                                    <span className="size-5 animate-spin rounded-full border-2 border-accent/20 border-t-accent" />
                                    Memuat artikel…
                                </div>
                            ) : detail.articles.length === 0 ? (
                                <Empty>
                                    Belum ada artikel pada periode ini.
                                </Empty>
                            ) : (
                                <ol className="space-y-2">
                                    {detail.articles.map((a, i) => (
                                        <li key={a.id}>
                                            <a
                                                href={articleShow.url(a.slug)}
                                                target="_blank"
                                                className="group flex gap-3 rounded-xl p-3 ring-1 ring-slate-100 transition hover:bg-slate-50 hover:ring-accent/20"
                                            >
                                                <span className="w-5 pt-0.5 text-xs text-slate-400 tabular-nums">
                                                    {i + 1}
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="line-clamp-2 text-sm font-medium text-navy-900 group-hover:text-accent">
                                                        {a.title}
                                                    </span>
                                                    <span className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                                                        {a.region && (
                                                            <span>
                                                                {a.region}
                                                            </span>
                                                        )}
                                                        {a.sentiment && (
                                                            <span className="inline-flex items-center gap-1">
                                                                <span
                                                                    className="size-2 rounded-full"
                                                                    style={{
                                                                        backgroundColor:
                                                                            SENTIMENT.find(
                                                                                (
                                                                                    s,
                                                                                ) =>
                                                                                    s.key ===
                                                                                    a.sentiment,
                                                                            )
                                                                                ?.color,
                                                                    }}
                                                                />
                                                                {a.sentiment}
                                                            </span>
                                                        )}
                                                    </span>
                                                </span>
                                                <span className="shrink-0 text-right text-xs text-slate-500 tabular-nums">
                                                    <b className="block text-sm text-navy-900">
                                                        {num.format(a.views)}
                                                    </b>
                                                    pembaca
                                                </span>
                                            </a>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>

                        {ready && (
                            <div className="flex flex-wrap gap-2 border-t border-slate-100 p-4">
                                {detail.canDrill && (
                                    <button
                                        type="button"
                                        onClick={() => onDrill(detail.key)}
                                        className="btn-primary flex-1"
                                    >
                                        <Icon
                                            name="map"
                                            width={16}
                                            height={16}
                                        />
                                        Rinci per kabupaten/kota
                                    </button>
                                )}
                                {detail.kind === 'tag' && (
                                    <a
                                        href={tagPage.url(detail.key)}
                                        target="_blank"
                                        className="btn-ghost flex-1"
                                    >
                                        <Icon
                                            name="external"
                                            width={16}
                                            height={16}
                                        />
                                        Halaman topik
                                    </a>
                                )}
                            </div>
                        )}
                    </motion.aside>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function Kpi({
    label,
    value,
    change,
}: {
    label: string;
    value: number;
    change?: string | null;
}) {
    const down = change?.startsWith('-');

    return (
        <div className="card p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-navy-900 tabular-nums">
                <CountUp value={value} />
            </p>
            {change && (
                <p
                    className={cn(
                        'mt-0.5 text-xs font-medium',
                        down ? 'text-red-600' : 'text-emerald-700',
                    )}
                >
                    {change} vs periode lalu
                </p>
            )}
        </div>
    );
}

function Panel({
    title,
    hint,
    className,
    children,
}: {
    title: string;
    hint?: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <section className={cn('card p-5 sm:p-6', className)}>
            <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="font-semibold text-navy-900">{title}</h2>
                {hint && <span className="text-xs text-slate-400">{hint}</span>}
            </div>
            {children}
        </section>
    );
}

function Empty({ children }: { children: ReactNode }) {
    return (
        <p className="py-6 text-center text-sm text-slate-400">{children}</p>
    );
}

/** Horizontal bars, one hue (magnitude). Values are labeled, so no axis is needed. */
type BarRow = { key: string; label: string; value: number; note?: string };

function Bars({
    rows,
    unit,
    empty,
    onSelect,
}: {
    rows: BarRow[];
    unit?: string;
    empty: string;
    onSelect?: (row: BarRow) => void;
}) {
    if (rows.length === 0) {
        return <Empty>{empty}</Empty>;
    }
    const max = Math.max(1, ...rows.map((r) => r.value));

    return (
        <ul className="-mx-2 space-y-0.5">
            {rows.map((r) => (
                <li key={r.key}>
                    <button
                        type="button"
                        onClick={() => onSelect?.(r)}
                        className="group block w-full rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
                    >
                        <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                            <span className="truncate font-medium text-navy-900 group-hover:text-accent">
                                {r.label}
                            </span>
                            <span className="shrink-0 text-xs text-slate-500 tabular-nums">
                                <b className="text-navy-900">
                                    {num.format(r.value)}
                                </b>
                                {unit && ` ${unit}`}
                                {r.note && ` · ${r.note}`}
                            </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                            <div
                                className="h-full rounded-full bg-accent"
                                style={{ width: `${(r.value / max) * 100}%` }}
                            />
                        </div>
                    </button>
                </li>
            ))}
        </ul>
    );
}
