import { Head, Link, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import ArticleCard from '@/components/article-card';
import Icon from '@/components/icons';
import RegionAvatar from '@/components/region-avatar';
import Ticker from '@/components/ticker';
import { Reveal, Stagger, ease } from '@/components/motion';
import PublicLayout, { SectionTitle } from '@/layouts/public';
import { regionHref } from '@/lib/news';
import { cn } from '@/lib/utils';
import { regions } from '@/routes';
import type { ArticleCard as Card } from '@/types';

type Props = {
    headlines: Card[];
    breaking: Card[];
    latest: Card[];
    national: Card[];
    popular: Card[];
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
    provinceCounts,
}: Props) {
    const { auth } = usePage().props;
    const today = new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'full',
    }).format(new Date());

    return (
        <PublicLayout variant="home">
            <Head title="Berita Nasional & Daerah">
                <meta
                    name="description"
                    content="NusantaraNews: berita nasional dan daerah dari 38 provinsi dan 514 kabupaten/kota di Indonesia."
                />
            </Head>

            <Stagger className="space-y-7 md:space-y-9">
                {/* Laptop greeting (phones show it in the header) */}
                <Reveal className="hidden items-end justify-between md:flex">
                    <div>
                        <h1 className="text-2xl font-semibold text-navy-900">
                            Halo, {auth.user?.name.split(' ')[0] ?? 'Pembaca'}
                        </h1>
                        <p className="text-sm text-slate-500">
                            Kabar harian dari 38 provinsi Indonesia
                        </p>
                    </div>
                    <span className="rounded-full bg-white px-4 py-1.5 text-xs text-slate-500 ring-1 ring-accent/10">
                        {today}
                    </span>
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
                    </div>
                </div>
            </Stagger>
        </PublicLayout>
    );
}

/** Province "channels": compact photo chips, two rows, swipeable. */
function Channels({ counts }: { counts: Record<string, number> }) {
    const { provinces } = usePage().props.nav;
    const ref = useRef<HTMLDivElement>(null);

    const scroll = (dir: -1 | 1) =>
        ref.current?.scrollBy({
            left: dir * ref.current.clientWidth * 0.8,
            behavior: 'smooth',
        });

    const arrow =
        'absolute top-1/2 z-10 hidden size-8 -translate-y-1/2 place-items-center rounded-full border border-accent/15 bg-white text-accent shadow-sm transition-colors hover:bg-accent hover:text-white md:grid';

    return (
        <div>
            <SectionTitle href={regions.url()}>Kanal Provinsi</SectionTitle>
            <div className="relative">
                <button
                    type="button"
                    aria-label="Geser ke kiri"
                    onClick={() => scroll(-1)}
                    className={cn(arrow, '-left-3')}
                >
                    <Icon name="chevron" className="size-4 rotate-180" />
                </button>
                <button
                    type="button"
                    aria-label="Geser ke kanan"
                    onClick={() => scroll(1)}
                    className={cn(arrow, '-right-3')}
                >
                    <Icon name="chevron" className="size-4" />
                </button>
                <div
                    ref={ref}
                    className="-mx-4 no-scrollbar grid auto-cols-max grid-flow-col grid-rows-2 gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0 [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)] md:[mask-image:none]"
                >
                    {provinces.map((p, i) => (
                        <motion.div
                            key={p.code}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                delay: 0.05 + Math.min(i, 16) * 0.025,
                                duration: 0.4,
                                ease,
                            }}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Link
                                href={regionHref(p)}
                                viewTransition
                                className="group flex items-center gap-2 rounded-full border border-accent/15 bg-white py-1 pr-1.5 pl-1 text-[13px] text-navy-900 transition-colors hover:border-accent/30 hover:bg-accent/5"
                            >
                                <RegionAvatar region={p} className="size-7" />
                                <span className="font-medium whitespace-nowrap">
                                    {p.name}
                                </span>
                                <span className="min-w-6 rounded-full bg-accent/10 px-1.5 py-0.5 text-center text-[11px] font-medium text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                                    {counts[p.code] ?? 0}
                                </span>
                            </Link>
                        </motion.div>
                    ))}
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
