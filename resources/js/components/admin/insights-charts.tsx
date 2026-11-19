import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from '@/components/icons';
import { ease } from '@/components/motion';
import { type Sentiment, SENTIMENTS } from '@/components/sentiment';
import { cn } from '@/lib/utils';

const num = new Intl.NumberFormat('id-ID');
const compact = new Intl.NumberFormat('id-ID', {
    notation: 'compact',
    maximumFractionDigits: 1,
});
const dayFmt = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
});
const fullFmt = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

// Validated with the dataviz checker: brand red passes band, chroma and 3:1 contrast on white.
// The previous period is de-emphasis gray (emphasis pattern: one hue + gray).
const CURRENT = '#a50e1e';
const PREVIOUS = '#b4b2ab';
const GRID = '#eceae6';

/** Parse "YYYY-MM-DD" as a local date (new Date("…") would read it as UTC). */
export function day(iso: string) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
}

export function rangeLabel(from: string, to: string) {
    return from === to
        ? fullFmt.format(day(from))
        : `${dayFmt.format(day(from))} – ${fullFmt.format(day(to))}`;
}

/* ------------------------------------------------------------------ */
/* Date range picker: presets as rows, custom calendar range below.    */
/* ------------------------------------------------------------------ */

export type RangeValue =
    | { periode: number; dari?: never; sampai?: never }
    | { periode?: never; dari: string; sampai: string };

export function DateRangePicker({
    periode,
    dari,
    sampai,
    presets,
    today,
    onChange,
}: {
    periode: number | null;
    dari: string;
    sampai: string;
    presets: number[];
    today: string;
    onChange: (value: RangeValue) => void;
}) {
    const [open, setOpen] = useState(false);
    const [from, setFrom] = useState(dari);
    const [to, setTo] = useState(sampai);
    const monthStart = `${today.slice(0, 8)}01`;
    const isThisMonth = !periode && dari === monthStart && sampai === today;

    useEffect(() => {
        setFrom(dari);
        setTo(sampai);
    }, [dari, sampai]);

    const rows: { label: string; active: boolean; value: RangeValue }[] = [
        ...presets.map((p) => ({
            label: `${p} hari terakhir`,
            active: periode === p,
            value: { periode: p } as RangeValue,
        })),
        {
            label: 'Bulan ini',
            active: isThisMonth,
            value: { dari: monthStart, sampai: today },
        },
    ];
    const label = periode
        ? `${periode} hari terakhir`
        : isThisMonth
          ? 'Bulan ini'
          : rangeLabel(dari, sampai);

    function pick(value: RangeValue) {
        setOpen(false);
        onChange(value);
    }

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="dialog"
                aria-expanded={open}
                className="flex h-11 items-center gap-2.5 rounded-2xl bg-white px-4 text-sm font-medium text-navy-900 ring-1 ring-slate-200 transition hover:ring-accent/30"
            >
                <Icon
                    name="clock"
                    width={16}
                    height={16}
                    className="text-accent"
                />
                {label}
                <span className="text-xs font-normal text-slate-400">
                    {periode || isThisMonth ? rangeLabel(dari, sampai) : ''}
                </span>
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
            <AnimatePresence>
                {open && (
                    <>
                        <button
                            type="button"
                            aria-label="Tutup"
                            className="fixed inset-0 z-40 cursor-default"
                            onClick={() => setOpen(false)}
                        />
                        <motion.div
                            role="dialog"
                            aria-label="Pilih rentang tanggal"
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.16, ease }}
                            className="absolute left-0 z-50 mt-2 w-72 rounded-2xl bg-white p-1.5 shadow-xl ring-1 shadow-black/10 ring-black/5"
                        >
                            {rows.map((r) => (
                                <button
                                    key={r.label}
                                    type="button"
                                    onClick={() => pick(r.value)}
                                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-navy-900 transition-colors hover:bg-slate-50"
                                >
                                    <span
                                        className={cn(
                                            r.active && 'font-semibold',
                                        )}
                                    >
                                        {r.label}
                                    </span>
                                    {r.active && (
                                        <Icon
                                            name="check"
                                            width={16}
                                            height={16}
                                            strokeWidth={2.6}
                                            className="text-accent"
                                        />
                                    )}
                                </button>
                            ))}
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    pick({ dari: from, sampai: to });
                                }}
                                className="mt-1.5 border-t border-slate-100 px-3 pt-3 pb-2"
                            >
                                <p className="mb-2 text-xs font-medium text-slate-500">
                                    Rentang kustom
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    <label className="text-[11px] text-slate-500">
                                        Dari
                                        <input
                                            type="date"
                                            value={from}
                                            max={to || today}
                                            onChange={(e) =>
                                                setFrom(e.target.value)
                                            }
                                            required
                                            className="input mt-1 px-2 py-1.5 text-xs"
                                        />
                                    </label>
                                    <label className="text-[11px] text-slate-500">
                                        Sampai
                                        <input
                                            type="date"
                                            value={to}
                                            min={from}
                                            max={today}
                                            onChange={(e) =>
                                                setTo(e.target.value)
                                            }
                                            required
                                            className="input mt-1 px-2 py-1.5 text-xs"
                                        />
                                    </label>
                                </div>
                                <button className="btn-primary mt-3 w-full py-2 text-xs">
                                    Terapkan
                                </button>
                                <p className="mt-2 text-[11px] text-slate-400">
                                    Maksimal 1 tahun. Dibandingkan dengan
                                    periode sepanjang yang sama sebelumnya.
                                </p>
                            </form>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Line chart: this period vs the period before, crosshair tooltip.    */
/* ------------------------------------------------------------------ */

function useWidth<T extends HTMLElement>() {
    const ref = useRef<T>(null);
    const [width, setWidth] = useState(0);
    useLayoutEffect(() => {
        if (!ref.current) {
            return;
        }
        const ro = new ResizeObserver(([entry]) =>
            setWidth(entry.contentRect.width),
        );
        ro.observe(ref.current);

        return () => ro.disconnect();
    }, []);

    return [ref, width] as const;
}

/** Round axis maximum and step: 1, 2 or 5 × 10ⁿ, about four gridlines. */
function niceScale(max: number) {
    if (max <= 0) {
        return { top: 4, step: 1 };
    }
    const raw = max / 4;
    const pow = 10 ** Math.floor(Math.log10(raw));
    const step = ([1, 2, 5, 10].find((m) => m * pow >= raw) ?? 10) * pow;

    return { top: Math.ceil(max / step) * step, step };
}

export function ReadsChart({
    current,
    previous,
    currentLabel,
    previousLabel,
}: {
    current: { date: string; views: number }[];
    previous: { date: string; views: number }[];
    currentLabel: string;
    previousLabel: string;
}) {
    const [ref, width] = useWidth<HTMLDivElement>();
    const [hover, setHover] = useState<number | null>(null);
    const [table, setTable] = useState(false);

    const height = 240;
    const pad = { top: 16, right: 56, bottom: 28, left: 48 };
    const w = Math.max(0, width - pad.left - pad.right);
    const h = height - pad.top - pad.bottom;
    const n = current.length;
    const max = Math.max(
        ...current.map((d) => d.views),
        ...previous.map((d) => d.views),
    );
    const { top, step } = niceScale(max);
    const x = (i: number) => pad.left + (n <= 1 ? w / 2 : (i / (n - 1)) * w);
    const y = (v: number) => pad.top + h - (v / top) * h;
    const path = (rows: { views: number }[]) =>
        rows.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.views)}`).join('');
    const area = `${path(current)}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`;
    const ticks = Array.from(
        { length: Math.round(top / step) + 1 },
        (_, i) => i * step,
    );
    // About one date label per 90px, always including the first and last day.
    const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(w / 90))));
    const xLabels = current
        .map((d, i) => i)
        .filter((i) => i % every === 0 || i === n - 1)
        .filter((i, k, all) => i === n - 1 || all[k + 1] - i >= every);
    const last = current[n - 1];
    const fmtTick = (v: number) =>
        top >= 10_000 ? compact.format(v) : num.format(v);
    const hovered = hover !== null ? current[hover] : null;

    function onMove(e: React.MouseEvent<SVGRectElement>) {
        const box = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - box.left) / box.width;
        setHover(Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1)))));
    }

    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
                <span className="inline-flex items-center gap-2">
                    <span
                        className="h-0.5 w-4 rounded-full"
                        style={{ background: CURRENT }}
                    />
                    {currentLabel}
                </span>
                <span className="inline-flex items-center gap-2">
                    <span
                        className="h-0.5 w-4 rounded-full"
                        style={{ background: PREVIOUS }}
                    />
                    {previousLabel}
                </span>
                <button
                    type="button"
                    onClick={() => setTable((v) => !v)}
                    className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-slate-500 ring-1 ring-slate-200 transition-colors hover:text-accent hover:ring-accent/30"
                >
                    <Icon
                        name={table ? 'chart' : 'grid'}
                        width={13}
                        height={13}
                    />
                    {table ? 'Grafik' : 'Tabel'}
                </button>
            </div>

            {table ? (
                <div className="max-h-72 overflow-y-auto rounded-xl ring-1 ring-slate-100">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white text-left text-xs text-slate-500">
                            <tr>
                                <th className="px-3 py-2 font-medium">
                                    Tanggal
                                </th>
                                <th className="px-3 py-2 text-right font-medium">
                                    Pembaca
                                </th>
                                <th className="px-3 py-2 text-right font-medium">
                                    Periode lalu
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 tabular-nums">
                            {current.map((d, i) => (
                                <tr key={d.date}>
                                    <td className="px-3 py-1.5 text-slate-600">
                                        {fullFmt.format(day(d.date))}
                                    </td>
                                    <td className="px-3 py-1.5 text-right font-medium text-navy-900">
                                        {num.format(d.views)}
                                    </td>
                                    <td className="px-3 py-1.5 text-right text-slate-500">
                                        {num.format(previous[i]?.views ?? 0)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div ref={ref} className="relative">
                    {width > 0 && (
                        <svg
                            width={width}
                            height={height}
                            role="img"
                            aria-label={`Pembaca per hari, ${currentLabel}. Puncak ${num.format(max)}.`}
                        >
                            {ticks.map((t) => (
                                <g key={t}>
                                    <line
                                        x1={pad.left}
                                        x2={pad.left + w}
                                        y1={y(t)}
                                        y2={y(t)}
                                        stroke={GRID}
                                        strokeWidth={1}
                                    />
                                    <text
                                        x={pad.left - 8}
                                        y={y(t)}
                                        dy="0.32em"
                                        textAnchor="end"
                                        className="fill-slate-400 text-[11px] tabular-nums"
                                    >
                                        {fmtTick(t)}
                                    </text>
                                </g>
                            ))}
                            {xLabels.map((i) => (
                                <text
                                    key={i}
                                    x={x(i)}
                                    y={height - 8}
                                    textAnchor={
                                        i === 0
                                            ? 'start'
                                            : i === n - 1
                                              ? 'end'
                                              : 'middle'
                                    }
                                    className="fill-slate-400 text-[11px]"
                                >
                                    {dayFmt.format(day(current[i].date))}
                                </text>
                            ))}

                            <path d={area} fill={CURRENT} fillOpacity={0.1} />
                            <path
                                d={path(previous)}
                                fill="none"
                                stroke={PREVIOUS}
                                strokeWidth={2}
                                strokeLinejoin="round"
                                strokeLinecap="round"
                            />
                            <path
                                d={path(current)}
                                fill="none"
                                stroke={CURRENT}
                                strokeWidth={2}
                                strokeLinejoin="round"
                                strokeLinecap="round"
                            />

                            {/* End marker + value: the one direct label. */}
                            {last && hover === null && (
                                <>
                                    <circle
                                        cx={x(n - 1)}
                                        cy={y(last.views)}
                                        r={4}
                                        fill={CURRENT}
                                        stroke="#fff"
                                        strokeWidth={2}
                                    />
                                    <text
                                        x={x(n - 1) + 8}
                                        y={y(last.views)}
                                        dy="0.32em"
                                        className="fill-navy-900 text-[11px] font-semibold tabular-nums"
                                    >
                                        {compact.format(last.views)}
                                    </text>
                                </>
                            )}

                            {hover !== null && (
                                <>
                                    <line
                                        x1={x(hover)}
                                        x2={x(hover)}
                                        y1={pad.top}
                                        y2={pad.top + h}
                                        stroke="#94a3b8"
                                        strokeWidth={1}
                                    />
                                    {previous[hover] && (
                                        <circle
                                            cx={x(hover)}
                                            cy={y(previous[hover].views)}
                                            r={4}
                                            fill={PREVIOUS}
                                            stroke="#fff"
                                            strokeWidth={2}
                                        />
                                    )}
                                    <circle
                                        cx={x(hover)}
                                        cy={y(current[hover].views)}
                                        r={4.5}
                                        fill={CURRENT}
                                        stroke="#fff"
                                        strokeWidth={2}
                                    />
                                </>
                            )}

                            {/* Hit area larger than the marks. */}
                            <rect
                                x={pad.left}
                                y={pad.top}
                                width={w}
                                height={h}
                                fill="transparent"
                                onMouseMove={onMove}
                                onMouseLeave={() => setHover(null)}
                            />
                        </svg>
                    )}

                    {hovered && hover !== null && (
                        <div
                            className="pointer-events-none absolute top-2 z-10 min-w-44 rounded-xl bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-black/5"
                            style={{
                                left: Math.min(
                                    Math.max(x(hover) + 12, 0),
                                    width - 190,
                                ),
                            }}
                        >
                            <p className="font-medium text-navy-900">
                                {fullFmt.format(day(hovered.date))}
                            </p>
                            <p className="mt-1 flex items-center justify-between gap-3 text-slate-600">
                                <span className="inline-flex items-center gap-1.5">
                                    <span
                                        className="size-2 rounded-full"
                                        style={{ background: CURRENT }}
                                    />
                                    Pembaca
                                </span>
                                <b className="text-navy-900 tabular-nums">
                                    {num.format(hovered.views)}
                                </b>
                            </p>
                            {previous[hover] && (
                                <p className="mt-0.5 flex items-center justify-between gap-3 text-slate-500">
                                    <span className="inline-flex items-center gap-1.5">
                                        <span
                                            className="size-2 rounded-full"
                                            style={{ background: PREVIOUS }}
                                        />
                                        {dayFmt.format(
                                            day(previous[hover].date),
                                        )}
                                    </span>
                                    <span className="tabular-nums">
                                        {num.format(previous[hover].views)}
                                    </span>
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Sentiment: diverging stacked bars centered on neutral.              */
/* ------------------------------------------------------------------ */

type ToneRow = { code: string; name: string; total: number } & Record<
    Sentiment,
    number
>;

export function SentimentDiverging({
    rows,
    onSelect,
}: {
    rows: ToneRow[];
    onSelect?: (row: ToneRow) => void;
}) {
    const [hover, setHover] = useState<string | null>(null);
    const color = Object.fromEntries(SENTIMENTS.map((s) => [s.key, s.color]));
    // Shares per row; the widest side across all rows fills half the track.
    const shares = rows.map((r) => ({
        ...r,
        neg: r.negatif / r.total,
        net: r.netral / r.total,
        pos: r.positif / r.total,
    }));
    const side = Math.max(
        0.0001,
        ...shares.map((r) => Math.max(r.neg + r.net / 2, r.pos + r.net / 2)),
    );
    const pct = (share: number) => `${(share / side) * 50}%`;

    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                {SENTIMENTS.map((s) => (
                    <span
                        key={s.key}
                        className="inline-flex items-center gap-1.5"
                    >
                        <span
                            className="size-2.5 rounded-[3px]"
                            style={{ backgroundColor: s.color }}
                        />
                        {s.label}
                    </span>
                ))}
                <span className="ml-auto text-slate-400">
                    ← lebih negatif · lebih positif →
                </span>
            </div>
            <ul className="space-y-1">
                {shares.map((r) => (
                    <li key={r.code}>
                        <button
                            type="button"
                            onClick={() => onSelect?.(r)}
                            onMouseEnter={() => setHover(r.code)}
                            onMouseLeave={() => setHover(null)}
                            onFocus={() => setHover(r.code)}
                            onBlur={() => setHover(null)}
                            className={cn(
                                'grid w-full text-left focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none items-center gap-x-4 gap-y-1 rounded-lg px-2 py-1.5 transition-colors sm:grid-cols-[10rem_1fr_9rem]',
                                hover === r.code && 'bg-slate-50',
                            )}
                        >
                            <span className="truncate text-sm font-medium text-navy-900">
                                {r.name}
                            </span>
                            <div className="relative flex h-3 items-center">
                                <span className="absolute inset-y-[-3px] left-1/2 w-px bg-slate-300" />
                                <div className="flex h-full w-1/2 justify-end gap-[2px] pr-px">
                                    {r.negatif > 0 && (
                                        <span
                                            className="h-full rounded-l-[4px]"
                                            style={{
                                                width: pct(r.neg),
                                                backgroundColor: color.negatif,
                                            }}
                                        />
                                    )}
                                    {r.netral > 0 && (
                                        <span
                                            className={cn(
                                                'h-full',
                                                r.negatif === 0 &&
                                                    'rounded-l-[4px]',
                                            )}
                                            style={{
                                                width: pct(r.net / 2),
                                                backgroundColor: color.netral,
                                            }}
                                        />
                                    )}
                                </div>
                                <div className="flex h-full w-1/2 gap-[2px] pl-px">
                                    {r.netral > 0 && (
                                        <span
                                            className={cn(
                                                'h-full',
                                                r.positif === 0 &&
                                                    'rounded-r-[4px]',
                                            )}
                                            style={{
                                                width: pct(r.net / 2),
                                                backgroundColor: color.netral,
                                            }}
                                        />
                                    )}
                                    {r.positif > 0 && (
                                        <span
                                            className="h-full rounded-r-[4px]"
                                            style={{
                                                width: pct(r.pos),
                                                backgroundColor: color.positif,
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                            <span className="text-xs text-slate-500 tabular-nums sm:text-right">
                                {hover === r.code ? (
                                    <>
                                        {Math.round(r.neg * 100)}% ·{' '}
                                        {Math.round(r.net * 100)}% ·{' '}
                                        {Math.round(r.pos * 100)}%
                                    </>
                                ) : (
                                    <>
                                        {r.negatif} · {r.netral} · {r.positif}{' '}
                                        <span className="text-slate-400">
                                            dari
                                        </span>{' '}
                                        <b className="text-navy-900">
                                            {r.total}
                                        </b>
                                    </>
                                )}
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
            <p className="mt-2 text-[11px] text-slate-400">
                Angka: negatif · netral · positif. Arahkan kursor untuk melihat
                persentase.
            </p>
        </div>
    );
}
