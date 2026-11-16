import { Head, Link } from '@inertiajs/react';
import {
    AnimatePresence,
    motion,
    useMotionValueEvent,
    useScroll,
    useSpring,
    useTransform,
} from 'motion/react';
import { useState } from 'react';
import ArticleCard, { Cover } from '@/components/article-card';
import Icon from '@/components/icons';
import RegionAvatar from '@/components/region-avatar';
import { Reveal, Stagger, ease } from '@/components/motion';
import PublicLayout, { SectionTitle } from '@/layouts/public';
import { coverTransition, formatDate, regionHref, timeAgo } from '@/lib/news';
import { category as categoryRoute, home } from '@/routes';
import type { Article, ArticleCard as Card } from '@/types';

export default function ArticleShow({
    article,
    related,
}: {
    article: Article;
    related: Card[];
}) {
    const { scrollY, scrollYProgress } = useScroll();
    const progress = useSpring(scrollYProgress, {
        stiffness: 120,
        damping: 25,
    });
    // Parallax: cover drifts and zooms slightly as the sheet slides over it.
    const coverY = useTransform(scrollY, [0, 400], [0, 120]);
    const coverScale = useTransform(scrollY, [0, 400], [1, 1.12]);
    const [compact, setCompact] = useState(false);
    useMotionValueEvent(scrollY, 'change', (y) => setCompact(y > 340));

    const source = article.region?.name ?? 'Nasional';
    const sourceLabel = article.region?.parent
        ? `${source}, ${article.region.parent.name}`
        : source;
    const minutes = Math.max(
        1,
        Math.round(article.body.split(/\s+/).length / 200),
    );

    function back(e: React.MouseEvent) {
        if (window.history.length > 1) {
            e.preventDefault();
            window.history.back();
        }
    }

    async function share() {
        const data = { title: article.title, url: window.location.href };
        if (navigator.share) {
            await navigator.share(data).catch(() => undefined);
        } else {
            await navigator.clipboard.writeText(data.url);
        }
    }

    const roundBtn =
        'grid size-10 place-items-center rounded-full border border-white/60 bg-white/70 text-navy-900 shadow-sm backdrop-blur-xl transition active:scale-90 md:hover:scale-105';

    return (
        <PublicLayout tabs={false} variant="article">
            <Head title={article.title}>
                <meta
                    name="description"
                    content={article.excerpt ?? article.title}
                />
                <meta property="og:title" content={article.title} />
                {article.cover_url && (
                    <meta property="og:image" content={article.cover_url} />
                )}
            </Head>

            {/* Reading progress */}
            <motion.div
                style={{ scaleX: progress }}
                className="fixed inset-x-0 top-0 z-50 h-[3px] origin-left bg-accent"
            />

            {/* Phone: compact glass bar once the cover scrolls away */}
            <AnimatePresence>
                {compact && (
                    <motion.div
                        initial={{ y: -70, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -70, opacity: 0 }}
                        transition={{ duration: 0.35, ease }}
                        className="fixed inset-x-3 top-3 z-40 flex items-center gap-3 rounded-full glass p-1.5 pr-4 md:hidden"
                    >
                        <Link
                            href={home.url()}
                            onClick={back}
                            aria-label="Kembali"
                            className={roundBtn}
                        >
                            <Icon name="back" />
                        </Link>
                        <p className="line-clamp-1 flex-1 text-sm font-medium text-navy-900">
                            {article.title}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid md:gap-8 lg:grid-cols-3">
                <article className="lg:col-span-2">
                    {/* Cover: full-bleed on phones, rounded on laptop */}
                    <div className="relative h-[58vh] max-h-[520px] overflow-hidden md:h-auto md:rounded-[28px] md:shadow-[0_20px_40px_-20px_rgba(107,7,18,0.5)]">
                        <motion.div
                            style={{ y: coverY, scale: coverScale }}
                            className="h-full md:transform-none!"
                        >
                            <Cover
                                article={article}
                                style={{
                                    viewTransitionName: coverTransition(
                                        article.id,
                                    ),
                                }}
                                className="h-full md:aspect-[16/9] md:h-auto"
                            />
                        </motion.div>
                        <span className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/35 to-transparent md:hidden" />
                        <motion.div
                            initial={{ opacity: 0, y: -12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.4, ease }}
                            className="absolute inset-x-4 top-[max(1rem,env(safe-area-inset-top))] flex justify-between"
                        >
                            <Link
                                href={home.url()}
                                onClick={back}
                                aria-label="Kembali"
                                className={roundBtn}
                            >
                                <Icon name="back" />
                            </Link>
                            <button
                                onClick={() => void share()}
                                aria-label="Bagikan"
                                className={roundBtn}
                            >
                                <Icon name="share" width={18} height={18} />
                            </button>
                        </motion.div>
                    </div>

                    {/* Content sheet slides up over the cover */}
                    <motion.div
                        initial={{ y: 60, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{
                            type: 'spring',
                            stiffness: 140,
                            damping: 20,
                            delay: 0.1,
                        }}
                        className="relative -mt-7 rounded-t-[28px] bg-white px-5 pt-6 pb-6 md:mx-6 md:-mt-12 md:card md:rounded-[28px] md:p-8"
                    >
                        <span className="mx-auto mb-5 block h-1 w-10 rounded-full bg-slate-200 md:hidden" />
                        <Stagger>
                            <Reveal className="flex items-center gap-3">
                                <RegionAvatar
                                    region={article.region}
                                    className="size-10 ring-2 ring-accent ring-offset-2"
                                />
                                <div className="min-w-0 leading-tight">
                                    {article.region ? (
                                        <Link
                                            href={regionHref(article.region)}
                                            viewTransition
                                            className="block truncate text-sm font-semibold text-navy-900 hover:text-accent"
                                        >
                                            {sourceLabel}
                                        </Link>
                                    ) : (
                                        <span className="text-sm font-semibold text-navy-900">
                                            {source}
                                        </span>
                                    )}
                                    <p className="mt-0.5 text-xs text-slate-400">
                                        {timeAgo(article.published_at)} ·{' '}
                                        {minutes} menit baca ·{' '}
                                        <Link
                                            href={categoryRoute.url(
                                                article.category.slug,
                                            )}
                                            viewTransition
                                            className="font-medium text-accent"
                                        >
                                            {article.category.name}
                                        </Link>
                                    </p>
                                </div>
                            </Reveal>

                            <Reveal>
                                <h1 className="mt-5 text-[22px] leading-snug font-semibold text-navy-900 md:text-[34px] md:leading-tight">
                                    {article.title}
                                </h1>
                            </Reveal>

                            {article.excerpt && (
                                <Reveal>
                                    <p className="mt-4 text-[15px] leading-relaxed font-medium text-slate-700 md:text-lg">
                                        {article.excerpt}
                                    </p>
                                </Reveal>
                            )}

                            {/* Plain-text body (contributor input is never rendered as HTML). */}
                            <div className="mt-5 space-y-4 text-[15px] leading-[1.85] text-slate-600 md:text-[17px]">
                                {article.body.split(/\n\s*\n/).map((p, i) => (
                                    <Reveal key={i}>
                                        <p className="whitespace-pre-line">
                                            {p}
                                        </p>
                                    </Reveal>
                                ))}
                            </div>

                            <Reveal className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-accent/15 pt-5 text-xs text-slate-400">
                                <span>
                                    {article.author && (
                                        <>
                                            Oleh{' '}
                                            <span className="font-medium text-slate-600">
                                                {article.author.name}
                                            </span>{' '}
                                            ·{' '}
                                        </>
                                    )}
                                    {formatDate(article.published_at)}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <Icon name="eye" width={14} height={14} />
                                    {article.views} kali dibaca
                                </span>
                            </Reveal>
                        </Stagger>
                    </motion.div>
                </article>

                <aside className="bg-white px-5 pb-8 md:bg-transparent md:px-0 md:pb-0 lg:sticky lg:top-28 lg:self-start">
                    <Reveal className="md:card md:p-6">
                        <SectionTitle>Berita Terkait</SectionTitle>
                        <div className="divide-y divide-accent/10 [&>*]:py-3 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
                            {related.map((a) => (
                                <ArticleCard key={a.id} article={a} />
                            ))}
                        </div>
                    </Reveal>
                </aside>
            </div>
        </PublicLayout>
    );
}
