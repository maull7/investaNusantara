import { Head, Link, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import ArticleCard from '@/components/article-card';
import Icon from '@/components/icons';
import MembershipPromo from '@/components/membership-promo';
import RegionAvatar from '@/components/region-avatar';
import Ticker from '@/components/ticker';
import { Reveal, Stagger, ease } from '@/components/motion';
import PublicLayout, { SectionTitle } from '@/layouts/public';
import { regionHref } from '@/lib/news';
import { cn } from '@/lib/utils';
import {
    type Sentiment,
    SentimentBar,
    SENTIMENTS,
} from '@/components/sentiment';
import {
    agenda as agendaRoute,
    regions,
    sentiment as sentimentRoute,
} from '@/routes';
import { show as eventShow } from '@/routes/agenda';
import type { ArticleCard as Card, DirectoryEntry } from '@/types';

type Props = {
    headlines: Card[];
    breaking: Card[];
    latest: Card[];
    national: Card[];
    popular: Card[];
    agenda: DirectoryEntry[];
    sentiment: Partial<Record<Sentiment, number>>;
    provinceCounts: Record<string, number>;
};

const listRows =
    'divide-y divide-accent/10 [&>*]:py-3 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0';

/**
 * Phone: greeting header, province channels, swipeable "Berita Utama", latest list.
 * Laptop: greeting row, ticker, channels, headline slider + trending, latest grid + national.
 */
export default function Home({
    headlines,
    breaking,
    latest,
    national,
    popular,
    agenda,
    sentiment,
    provinceCounts,
}: Props) {
    const { auth } = usePage().props;
    const today = new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'full',
    }).format(new Date());

    // Time-based greeting
    const hour = new Date().getHours();
    const timeGreeting =
        hour >= 4 && hour < 11
            ? 'Selamat Pagi'
            : hour >= 11 && hour < 15
              ? 'Selamat Siang'
              : hour >= 15 && hour < 18
                ? 'Selamat Sore'
                : 'Selamat Malam';

    return (
        <PublicLayout variant="home">
            <Head title="Berita Nasional & Daerah" />

            <Stagger className="space-y-7 md:space-y-9">
                {/* Laptop greeting: Editorial Hero Card */}
                <Reveal className="hidden md:block">
                    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white via-surface to-accent/[0.04] p-5 shadow-xs transition-all duration-300 hover:border-accent/25 hover:shadow-sm">
                        {/* Subtle decorative background pattern */}
                        <div className="pointer-events-none absolute -right-6 -bottom-8 size-36 rounded-full bg-accent/5 blur-2xl" />
                        <div className="pointer-events-none absolute top-0 left-0 h-full w-1.5 bg-gradient-to-b from-accent to-accent/60" />

                        <div className="flex items-center justify-between pl-2">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl font-bold tracking-tight text-navy-900 sm:text-2xl">
                                        {timeGreeting},{' '}
                                        <span className="text-accent">
                                            {auth.user?.name.split(' ')[0] ?? 'Pembaca'}
                                        </span>
                                    </h1>
                                </div>
                                <p className="mt-1 text-sm text-slate-500">
                                    Kabar harian, analisis investasi, dan perkembangan dari 38 provinsi Indonesia
                                </p>
                            </div>

                            {/* Date Badge */}
                            <div className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-4 py-2 text-xs font-medium text-slate-600 shadow-2xs backdrop-blur-sm">
                                <Icon name="calendar" className="size-4 text-accent" />
                                <span>{today}</span>
                            </div>
                        </div>
                    </div>
                </Reveal>

                {breaking.length > 0 && (
                    <Reveal>
                        <Ticker items={breaking} />
                    </Reveal>
                )}

                {/* Phone: trending list first, like the reference app */}
                <Reveal className="md:hidden">
                    <SectionTitle>Trending</SectionTitle>
                    <div className={listRows}>
                        {popular.slice(0, 3).map((a) => (
                            <ArticleCard key={a.id} article={a} />
                        ))}
                    </div>
                </Reveal>

                <Reveal>
                    <Channels counts={provinceCounts} />
                </Reveal>

                {/* Phone: swipeable headline cards */}
                <Reveal className="md:hidden">
                    <SectionTitle href={regions.url()}>
                        Berita Utama
                    </SectionTitle>
                    <Swiper items={headlines} />
                </Reveal>

                {/* Laptop: headline slider + trending */}
                <div className="hidden gap-6 md:grid lg:grid-cols-3">
                    <Reveal className="lg:col-span-2">
                        <HeroCarousel items={headlines} />
                    </Reveal>
                    <Reveal className="card p-6">
                        <SectionTitle>
                            <span className="inline-flex items-center gap-1.5">
                                <Icon name="flame" className="text-accent" />
                                Trending
                            </span>
                        </SectionTitle>
                        <div className={listRows}>
                            {popular.map((a) => (
                                <ArticleCard key={a.id} article={a} />
                            ))}
                        </div>
                    </Reveal>
                </div>

                <div className="grid gap-7 md:gap-6 lg:grid-cols-3">
                    <Reveal className="md:card md:p-6 lg:col-span-2">
                        <SectionTitle>Berita Terbaru</SectionTitle>
                        <div className="divide-y divide-accent/10 md:grid md:grid-cols-2 md:gap-x-6 md:gap-y-5 md:divide-y-0 [&>*]:py-3 md:[&>*]:py-0 [&>*:first-child]:pt-0">
                            {latest.map((a) => (
                                <ArticleCard key={a.id} article={a} />
                            ))}
                        </div>
                    </Reveal>
                    <div className="space-y-7 md:space-y-6">
                        <Reveal className="card p-5 md:p-6">
                            <SectionTitle>Nasional</SectionTitle>
                            <div className={listRows}>
                                {national.map((a) => (
                                    <ArticleCard key={a.id} article={a} />
                                ))}
                            </div>
                        </Reveal>
                        <Reveal>
                            <MembershipPromo />
                        </Reveal>
                        {Object.values(sentiment).some(Boolean) && (
                            <Reveal className="card p-5 md:p-6">
                                <SectionTitle href={sentimentRoute.url()}>
                                    Sentimen 30 hari
                                </SectionTitle>
                                <SentimentBar
                                    counts={{
                                        positif: sentiment.positif ?? 0,
                                        netral: sentiment.netral ?? 0,
                                        negatif: sentiment.negatif ?? 0,
                                    }}
                                />
                                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                                    {SENTIMENTS.map((s) => (
                                        <Link
                                            key={s.key}
                                            href={sentimentRoute.url({
                                                query: { nada: s.key },
                                            })}
                                            className="inline-flex items-center gap-1.5 hover:text-accent"
                                        >
                                            <span
                                                className="size-2 rounded-full"
                                                style={{
                                                    backgroundColor: s.color,
                                                }}
                                            />
                                            {s.label}{' '}
                                            <b className="text-navy-900">
                                                {sentiment[s.key] ?? 0}
                                            </b>
                                        </Link>
                                    ))}
                                </div>
                            </Reveal>
                        )}
                        <Reveal className="card p-5 md:p-6">
                            <SectionTitle href={agendaRoute.url()}>
                                Agenda
                            </SectionTitle>
                            {agenda.length === 0 ? (
                                <p className="text-sm text-slate-500">
                                    Belum ada event mendatang.{' '}
                                    <Link
                                        href={agendaRoute.url()}
                                        className="font-medium text-accent hover:underline"
                                    >
                                        Lihat kalender
                                    </Link>
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {agenda.map((e) => (
                                        <Link
                                            key={e.id}
                                            href={eventShow.url(e.slug!)}
                                            className="group flex items-center gap-3"
                                        >
                                            <span className="grid w-12 shrink-0 place-items-center rounded-xl bg-accent/10 py-1.5 text-accent">
                                                <span className="text-lg leading-none font-bold">
                                                    {new Date(
                                                        e.starts_on!,
                                                    ).getDate()}
                                                </span>
                                                <span className="text-[10px] font-medium uppercase">
                                                    {new Intl.DateTimeFormat(
                                                        'id-ID',
                                                        { month: 'short' },
                                                    ).format(
                                                        new Date(e.starts_on!),
                                                    )}
                                                </span>
                                            </span>
                                            <span className="min-w-0">
                                                <span className="line-clamp-2 text-sm font-medium text-navy-900 group-hover:text-accent">
                                                    {e.name}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {e.featured_at &&
                                                        'Unggulan · '}
                                                    {e.region?.name}
                                                </span>
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </Reveal>
                    </div>
                </div>
            </Stagger>
        </PublicLayout>
    );
}

/** Province "channels": modern interactive mini-cards with smooth carousel and rich details. */
function Channels({ counts }: { counts: Record<string, number> }) {
    const { provinces } = usePage().props.nav;
    const ref = useRef<HTMLDivElement>(null);

    const scroll = (dir: -1 | 1) =>
        ref.current?.scrollBy({
            left: dir * (ref.current.clientWidth * 0.75),
            behavior: 'smooth',
        });

    const arrow =
        'absolute top-1/2 z-10 hidden size-9 -translate-y-1/2 place-items-center rounded-full border border-slate-200/80 bg-white/95 text-navy-800 shadow-md backdrop-blur-sm transition-all hover:bg-accent hover:border-accent hover:text-white hover:scale-105 active:scale-95 md:grid';

    return (
        <div className="relative">
            <SectionTitle href={regions.url()}>Kanal Provinsi</SectionTitle>
            <div className="relative group/channels">
                <button
                    type="button"
                    aria-label="Geser ke kiri"
                    onClick={() => scroll(-1)}
                    className={cn(arrow, '-left-4')}
                >
                    <Icon name="chevron" className="size-4 rotate-180" />
                </button>
                <button
                    type="button"
                    aria-label="Geser ke kanan"
                    onClick={() => scroll(1)}
                    className={cn(arrow, '-right-4')}
                >
                    <Icon name="chevron" className="size-4" />
                </button>
                <div
                    ref={ref}
                    className="-mx-4 no-scrollbar grid auto-cols-[165px] sm:auto-cols-[185px] grid-flow-col grid-rows-2 gap-2.5 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0 scroll-smooth [mask-image:linear-gradient(to_right,black_calc(100%-32px),transparent)] md:[mask-image:none]"
                >
                    {provinces.map((p, i) => {
                        const count = counts[p.code] ?? 0;
                        return (
                            <motion.div
                                key={p.code}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    delay: 0.04 + Math.min(i, 16) * 0.02,
                                    duration: 0.35,
                                    ease,
                                }}
                                whileHover={{ y: -3 }}
                                whileTap={{ scale: 0.97 }}
                                className="h-full"
                            >
                                <Link
                                    href={regionHref(p)}
                                    viewTransition
                                    className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs transition-all duration-300 hover:border-accent/40 hover:shadow-md hover:bg-gradient-to-b hover:from-white hover:to-accent/[0.02]"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="relative shrink-0">
                                            <RegionAvatar
                                                region={p}
                                                className="size-9 rounded-xl shadow-xs ring-1 ring-black/5 object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                            {count > 0 && (
                                                <span className="absolute -top-1 -right-1 size-2 rounded-full bg-accent ring-2 ring-white" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs font-semibold text-navy-900 group-hover:text-accent transition-colors">
                                                {p.name}
                                            </p>
                                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                                                <span className="font-bold text-accent">
                                                    {count}
                                                </span>{' '}
                                                berita
                                            </span>
                                        </div>
                                    </div>

                                    {/* Subtle bottom indicator on hover */}
                                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

/** Snap-scrolling cards with an animated position indicator (phones). */
function Swiper({ items }: { items: Card[] }) {
    const ref = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(0);

    function onScroll() {
        const el = ref.current;
        if (!el || !el.firstElementChild) {
            return;
        }
        const step = (el.firstElementChild as HTMLElement).offsetWidth + 16;
        setActive(Math.round(el.scrollLeft / step));
    }

    return (
        <>
            <div
                ref={ref}
                onScroll={onScroll}
                className="-mx-4 no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4"
            >
                {items.map((a, i) => (
                    <motion.div
                        key={a.id}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                            delay: 0.2 + i * 0.08,
                            duration: 0.5,
                            ease,
                        }}
                        className="w-[84%] shrink-0 snap-start"
                    >
                        <ArticleCard article={a} variant="feature" />
                    </motion.div>
                ))}
            </div>
            <div className="mt-3 flex justify-center gap-1.5">
                {items.map((a, i) => (
                    <span
                        key={a.id}
                        className="relative h-1.5 w-1.5 rounded-full bg-accent/20"
                    >
                        {i === active && (
                            <motion.span
                                layoutId="swiper-dot"
                                className="absolute -inset-x-1.5 inset-y-0 rounded-full bg-accent"
                            />
                        )}
                    </span>
                ))}
            </div>
        </>
    );
}

function HeroCarousel({ items }: { items: Card[] }) {
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        if (paused || items.length < 2) {
            return;
        }
        const t = setInterval(
            () => setIndex((i) => (i + 1) % items.length),
            6000,
        );
        return () => clearInterval(t);
    }, [paused, items.length]);

    if (items.length === 0) {
        return null;
    }

    const current = items[index];

    return (
        <div
            className="relative h-full min-h-96 lg:min-h-[28rem]"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                    key={current.id}
                    initial={{ opacity: 0, x: 60 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -60 }}
                    transition={{ duration: 0.55, ease }}
                    className="absolute inset-0"
                >
                    <ArticleCard article={current} variant="hero" />
                </motion.div>
            </AnimatePresence>
            <div className="absolute top-5 right-5 flex gap-1.5">
                {items.map((a, i) => (
                    <button
                        key={a.id}
                        onClick={() => setIndex(i)}
                        aria-label={`Headline ${i + 1}`}
                        className={cn(
                            'h-1.5 rounded-full transition-all duration-300',
                            i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/50',
                        )}
                    />
                ))}
            </div>
        </div>
    );
}
