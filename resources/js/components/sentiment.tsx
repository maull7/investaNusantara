import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { sentiment as sentimentRoute } from '@/routes';

export type Sentiment = 'positif' | 'netral' | 'negatif';

// Diverging pair (validated with the dataviz checker): red = negative pole,
// blue = positive pole, gray midpoint. Labels always accompany the color.
export const SENTIMENTS: {
    key: Sentiment;
    label: string;
    color: string;
    hint: string;
}[] = [
    {
        key: 'negatif',
        label: 'Negatif',
        color: '#e0453a',
        hint: 'bencana, kriminal, konflik',
    },
    {
        key: 'netral',
        label: 'Netral',
        color: '#d6d4cf',
        hint: 'informasi dan pengumuman',
    },
    {
        key: 'positif',
        label: 'Positif',
        color: '#2a78d6',
        hint: 'prestasi, pembangunan',
    },
];

const byKey = Object.fromEntries(SENTIMENTS.map((s) => [s.key, s]));

/** "● Positif" pill linking to the public sentiment page filtered by that tone. */
export function SentimentBadge({
    value,
    className,
}: {
    value: Sentiment | null | undefined;
    className?: string;
}) {
    const s = value ? byKey[value] : null;
    if (!s) {
        return null;
    }

    return (
        <Link
            href={sentimentRoute.url({ query: { nada: s.key } })}
            title={`Nada berita: ${s.label} (${s.hint}). Ditentukan AI/redaksi.`}
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200 transition-colors hover:text-accent hover:ring-accent/30',
                className,
            )}
        >
            <span
                className="size-2 rounded-full"
                style={{ backgroundColor: s.color }}
            />
            {s.label}
        </Link>
    );
}

/** 100% stacked bar of tone counts, 2px gaps between segments. */
export function SentimentBar({
    counts,
    className,
}: {
    counts: Record<Sentiment, number>;
    className?: string;
}) {
    const total = counts.positif + counts.netral + counts.negatif;
    if (!total) {
        return null;
    }

    return (
        <div className={cn('flex h-2.5 gap-[2px] overflow-hidden', className)}>
            {SENTIMENTS.map(
                (s) =>
                    counts[s.key] > 0 && (
                        <span
                            key={s.key}
                            title={`${s.label}: ${counts[s.key]}`}
                            className="h-full first:rounded-l-full last:rounded-r-full"
                            style={{
                                width: `${(counts[s.key] / total) * 100}%`,
                                backgroundColor: s.color,
                            }}
                        />
                    ),
            )}
        </div>
    );
}
