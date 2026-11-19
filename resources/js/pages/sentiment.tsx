import { Head, router } from '@inertiajs/react';
import ArticleCard from '@/components/article-card';
import Pagination from '@/components/pagination';
import MembershipPromo from '@/components/membership-promo';
import { Reveal, Stagger } from '@/components/motion';
import {
    type Sentiment,
    SentimentBadge,
    SentimentBar,
    SENTIMENTS,
} from '@/components/sentiment';
import PublicLayout, { SectionTitle } from '@/layouts/public';
import { cn } from '@/lib/utils';
import { sentiment } from '@/routes';
import type { ArticleCard as Card, Paginated } from '@/types';

type Props = {
    tone: Sentiment | null;
    province: { code: string; name: string } | null;
    provinces: { code: string; name: string }[];
    totals: Record<Sentiment, number>;
    regions: ({ code: string; name: string; total: number } & Record<
        Sentiment,
        number
    >)[];
    articles: Paginated<Card & { sentiment?: Sentiment | null }>;
};

/** Public "Sentimen berita": the tone of news per region, and the articles behind it. */
export default function SentimentPage({
    tone,
    province,
    provinces,
    totals,
    regions,
    articles,
}: Props) {
    const total = totals.positif + totals.netral + totals.negatif;
    const go = (query: { nada?: string | null; provinsi?: string | null }) =>
        router.get(
            sentiment.url(),
            Object.fromEntries(
                Object.entries({
                    nada: tone,
                    provinsi: province?.code,
                    ...query,
                }).filter(([, v]) => v),
            ),
            { preserveScroll: true, preserveState: true, replace: true },
        );
    const scope = province ? province.name : 'Indonesia';

    return (
        <PublicLayout tabs={false}>
            <Head title="Sentimen berita" />
            <Stagger className="space-y-6">
                <Reveal className="card p-5 sm:p-7">
                    <p className="text-xs font-semibold tracking-wide text-accent uppercase">
                        Sentimen berita
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold text-navy-900 md:text-3xl">
                        Nada berita {scope}, 30 hari terakhir
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Setiap berita diberi nada positif, netral, atau negatif
                        oleh AI dan diperiksa redaksi. Ini menggambarkan isi
                        berita, bukan penilaian terhadap daerahnya.
                    </p>

                    {total > 0 && (
                        <>
                            <SentimentBar
                                counts={totals}
                                className="mt-5 h-3"
                            />
                            <div className="mt-3 grid grid-cols-3 gap-2">
                                {SENTIMENTS.map((s) => (
                                    <div key={s.key}>
                                        <p className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <span
                                                className="size-2 rounded-full"
                                                style={{
                                                    backgroundColor: s.color,
                                                }}
                                            />
                                            {s.label}
                                        </p>
                                        <p className="text-xl font-semibold text-navy-900 tabular-nums">
                                            {Math.round(
                                                (totals[s.key] / total) * 100,
                                            )}
                                            %
                                        </p>
                                        <p className="text-[11px] text-slate-400">
                                            {totals[s.key]} berita · {s.hint}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </Reveal>

                <Reveal className="flex flex-wrap items-center gap-2 card p-3">
                    <div className="flex flex-wrap gap-1.5">
                        {[{ key: null, label: 'Semua' }, ...SENTIMENTS].map(
                            (s) => (
                                <button
                                    key={s.label}
                                    type="button"
                                    onClick={() => go({ nada: s.key })}
                                    className={cn(
                                        'rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition-colors',
                                        tone === s.key
                                            ? 'bg-accent text-white ring-accent'
                                            : 'bg-surface text-slate-600 ring-slate-200 hover:bg-accent/5 hover:text-accent hover:ring-accent/30',
                                    )}
                                >
                                    {s.label}
                                </button>
                            ),
                        )}
                    </div>
                    <select
                        value={province?.code ?? ''}
                        onChange={(e) =>
                            go({ provinsi: e.target.value || null })
                        }
                        aria-label="Provinsi"
                        className="input w-auto sm:ml-auto"
                    >
                        <option value="">Seluruh Indonesia</option>
                        {provinces.map((p) => (
                            <option key={p.code} value={p.code}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                </Reveal>

                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                    <div className="space-y-6">
                        <Reveal className="card p-5 sm:p-6">
                            <SectionTitle>
                                {province
                                    ? 'Per kabupaten/kota'
                                    : 'Per provinsi'}
                            </SectionTitle>
                            {regions.length === 0 ? (
                                <p className="py-6 text-center text-sm text-slate-400">
                                    Belum ada data sentimen.
                                </p>
                            ) : (
                                <ul className="space-y-3">
                                    {regions.map((r) => (
                                        <li key={r.code}>
                                            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                                                <span className="truncate font-medium text-navy-900">
                                                    {r.name}
                                                </span>
                                                <span className="shrink-0 text-[11px] text-slate-500 tabular-nums">
                                                    {r.negatif} neg · {r.netral}{' '}
                                                    net · {r.positif} pos
                                                </span>
                                            </div>
                                            <SentimentBar counts={r} />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Reveal>
                        <Reveal>
                            <MembershipPromo
                                title="Butuh analisis sentimen lebih dalam?"
                                text="Dashboard per kabupaten/kota, kata kunci yang naik, isu nasional, dan laporan siap cetak."
                            />
                        </Reveal>
                    </div>

                    <section>
                        <SectionTitle>
                            {tone ? `Berita bernada ${tone}` : 'Berita terbaru'}
                        </SectionTitle>
                        {articles.data.length === 0 ? (
                            <div className="card p-10 text-center text-sm text-slate-500">
                                Belum ada berita untuk pilihan ini.
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {articles.data.map((a) => (
                                    <Reveal key={a.id} className="card p-3">
                                        <SentimentBadge
                                            value={a.sentiment}
                                            className="mb-2"
                                        />
                                        <ArticleCard article={a} />
                                    </Reveal>
                                ))}
                            </div>
                        )}
                        <Pagination data={articles} />
                    </section>
                </div>
            </Stagger>
        </PublicLayout>
    );
}
