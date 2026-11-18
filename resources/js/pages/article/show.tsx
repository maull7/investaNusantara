import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AnimatePresence,
    motion,
    useMotionValueEvent,
    useScroll,
    useSpring,
    useTransform,
} from 'motion/react';
import { useEffect, useState } from 'react';
import ArticleCard, { Cover } from '@/components/article-card';
import Icon from '@/components/icons';
import RegionAvatar from '@/components/region-avatar';
import { Reveal, Stagger, ease } from '@/components/motion';
import PublicLayout, { SectionTitle } from '@/layouts/public';
import { cn } from '@/lib/utils';
import { coverTransition, formatDate, regionHref, timeAgo } from '@/lib/news';
import { category as categoryRoute, home, login } from '@/routes';
import { review as reviewRoute } from '@/routes/article';
import type { Article, ArticleCard as Card, ArticleReview } from '@/types';

export default function ArticleShow({
    article,
    related,
    review,
}: {
    article: Article;
    related: Card[];
    review: ArticleReview | null;
}) {
    // "Ringkasan": swap our synopsis for the source's own headline and first 50 words.
    const [original, setOriginal] = useState(false);
    const [reviewOpen, setReviewOpen] = useState(false);
    // Articles without a source (written by editors) summarize themselves: own title + first 50 words.
    const fromSource = Boolean(article.source_excerpt && article.source_url);
    const summaryTitle = article.source_title ?? article.title;
    const summaryText = article.source_excerpt ?? firstWords(article.body, 50);
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

    const { auth } = usePage().props;
    const pill =
        'inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-navy-900 ring-1 ring-slate-200 transition hover:text-accent active:scale-95';
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
                <article className="min-w-0 lg:col-span-2">
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
                            <Reveal className="flex items-start gap-3">
                                <RegionAvatar
                                    region={article.region}
                                    className="size-10 ring-2 ring-accent ring-offset-2"
                                />
                                <div className="min-w-0 flex-1 leading-tight">
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
                                        {article.source_name && (
                                            <>
                                                Sumber:{' '}
                                                <span className="font-medium text-slate-600">
                                                    {article.source_name}
                                                </span>{' '}
                                                ·{' '}
                                            </>
                                        )}
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
                                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setOriginal((v) => !v)
                                            }
                                            aria-pressed={original}
                                            className={cn(
                                                pill,
                                                original &&
                                                    'bg-accent text-white ring-accent',
                                            )}
                                        >
                                            <Icon
                                                name="file"
                                                width={13}
                                                height={13}
                                            />
                                            Ringkasan
                                        </button>
                                        {auth.user ? (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setReviewOpen(true)
                                                }
                                                className={pill}
                                            >
                                                <Icon
                                                    name="star"
                                                    width={13}
                                                    height={13}
                                                />
                                                Review AI
                                            </button>
                                        ) : (
                                            <Link
                                                href={login.url()}
                                                title="Masuk untuk melihat Review AI"
                                                className={pill}
                                            >
                                                <Icon
                                                    name="lock"
                                                    width={13}
                                                    height={13}
                                                />
                                                Review AI
                                            </Link>
                                        )}
                                        {article.source_url && (
                                            <a
                                                href={article.source_url}
                                                target="_blank"
                                                rel="noopener nofollow"
                                                className={pill}
                                            >
                                                <Icon
                                                    name="external"
                                                    width={13}
                                                    height={13}
                                                />
                                                Sumber
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </Reveal>

                            <Reveal>
                                <h1 className="mt-5 text-[22px] leading-snug font-semibold text-navy-900 md:text-[34px] md:leading-tight">
                                    {original ? summaryTitle : article.title}
                                </h1>
                            </Reveal>

                            {original ? (
                                <div className="mt-5 text-[15px] leading-[1.85] text-slate-600 md:text-[17px]">
                                    <p className="text-xs font-semibold tracking-wide text-accent uppercase">
                                        {fromSource
                                            ? `Teks asli · ${article.source_name}`
                                            : 'Ringkasan'}
                                    </p>
                                    <p className="mt-2">{summaryText}</p>
                                    {fromSource ? (
                                        <a
                                            href={article.source_url!}
                                            target="_blank"
                                            rel="noopener nofollow"
                                            className="mt-3 inline-block text-sm font-semibold text-accent"
                                        >
                                            Baca selengkapnya di sumber →
                                        </a>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setOriginal(false)}
                                            className="mt-3 text-sm font-semibold text-accent"
                                        >
                                            Baca berita lengkap →
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {article.excerpt && (
                                        <Reveal>
                                            <p className="mt-4 text-[15px] leading-relaxed font-medium text-slate-700 md:text-lg">
                                                {article.excerpt}
                                            </p>
                                        </Reveal>
                                    )}

                                    {/* Plain-text body (contributor input is never rendered as HTML). */}
                                    <div className="mt-5 space-y-4 text-[15px] leading-[1.85] text-slate-600 md:text-[17px]">
                                        {article.body
                                            .split(/\n\s*\n/)
                                            .map((p, i) => (
                                                <Reveal key={i}>
                                                    <p className="whitespace-pre-line">
                                                        {p}
                                                    </p>
                                                </Reveal>
                                            ))}
                                    </div>
                                </>
                            )}

                            {article.source_url && (
                                <Reveal>
                                    <SourceCredit article={article} />
                                </Reveal>
                            )}

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
            <AnimatePresence>
                {reviewOpen && (
                    <ReviewModal
                        slug={article.slug}
                        review={review}
                        onClose={() => setReviewOpen(false)}
                    />
                )}
            </AnimatePresence>
        </PublicLayout>
    );
}

/** "Review AI" popup: starts the review the first time, then shows the saved one. */
function ReviewModal({
    slug,
    review,
    onClose,
}: {
    slug: string;
    review: ArticleReview | null;
    onClose: () => void;
}) {
    const done = review?.status === 'completed';
    const failed = review?.status === 'failed';

    // No review yet: ask for one. Then poll until Hermes is done.
    useEffect(() => {
        if (!review) {
            router.post(
                reviewRoute.url(slug),
                {},
                {
                    preserveScroll: true,
                    preserveState: true,
                    only: ['review'],
                },
            );

            return;
        }
        if (done || failed) {
            return;
        }
        const t = window.setTimeout(
            () => router.reload({ only: ['review'] }),
            3000,
        );

        return () => window.clearTimeout(t);
    }, [review, done, failed, slug]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/30 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={onClose}
        >
            <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="review-title"
                onClick={(e) => e.stopPropagation()}
                initial={{ y: 40, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 40, opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.35, ease }}
                className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-2xl sm:rounded-[28px] sm:p-6"
            >
                <div className="mb-4 flex items-center justify-between">
                    <h2
                        id="review-title"
                        className="flex items-center gap-2 text-lg font-semibold text-navy-900"
                    >
                        <Icon name="star" className="text-accent" />
                        Review AI
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Tutup"
                        className="grid size-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100"
                    >
                        <Icon name="x" width={18} height={18} />
                    </button>
                </div>

                {done ? (
                    <div className="space-y-4 text-[15px] leading-relaxed text-slate-600">
                        <ul className="space-y-2">
                            {review.points?.map((p, i) => (
                                <li key={i} className="flex gap-2">
                                    <Icon
                                        name="check"
                                        width={16}
                                        height={16}
                                        className="mt-1 shrink-0 text-accent"
                                    />
                                    {p}
                                </li>
                            ))}
                        </ul>
                        {review.body?.split(/\n\s*\n/).map((p, i) => (
                            <p key={i}>{p}</p>
                        ))}
                        <p className="border-t border-slate-100 pt-3 text-xs text-slate-400">
                            Dibuat oleh AI dari isi berita ini. Bisa keliru, cek
                            kembali ke sumber berita.
                        </p>
                    </div>
                ) : failed ? (
                    <div className="space-y-3 text-sm text-slate-600">
                        <p>Review AI gagal dibuat. Silakan coba lagi.</p>
                        <button
                            type="button"
                            onClick={() =>
                                router.post(
                                    reviewRoute.url(slug),
                                    {},
                                    {
                                        preserveScroll: true,
                                        preserveState: true,
                                        only: ['review'],
                                    },
                                )
                            }
                            className="btn-primary py-2 text-sm"
                        >
                            Coba lagi
                        </button>
                    </div>
                ) : (
                    <div
                        className="flex items-center gap-3 py-6 text-sm text-slate-500"
                        aria-live="polite"
                    >
                        <span className="size-5 animate-spin rounded-full border-2 border-accent/20 border-t-accent" />
                        AI sedang membaca berita dan menyusun review…
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}

/** Attribution for summarized articles: original title link and photo credit. */
function SourceCredit({ article }: { article: Article }) {
    let host = article.source_name ?? '';
    try {
        host = new URL(article.source_url!).host.replace(/^www\./, '');
    } catch {
        // keep the source name
    }

    return (
        <aside className="mt-8 flex gap-3 rounded-2xl bg-accent/[0.04] p-4 ring-1 ring-accent/10">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-accent ring-1 ring-accent/15">
                <Icon name="external" width={16} height={16} />
            </span>
            <div className="min-w-0 text-sm leading-relaxed text-slate-600">
                <p>
                    {article.is_ai_generated ? 'Disarikan dari ' : 'Sumber: '}
                    <a
                        href={article.source_url!}
                        target="_blank"
                        rel="noopener nofollow"
                        className="font-semibold text-navy-900 underline decoration-accent/30 underline-offset-2 hover:text-accent"
                    >
                        {host || article.source_name}
                    </a>
                </p>
                {article.cover_url && (
                    <p className="mt-0.5 text-xs text-slate-400">
                        Foto: {host || article.source_name}
                    </p>
                )}
                {article.is_ai_generated && (
                    <p className="mt-1 text-xs text-slate-400">
                        Ringkasan ini disusun dengan bantuan AI dari artikel
                        aslinya. Baca berita lengkap di situs sumber.
                    </p>
                )}
            </div>
        </aside>
    );
}

function firstWords(text: string, count: number) {
    const words = text.trim().split(/\s+/);

    return words.length > count
        ? `${words.slice(0, count).join(' ')}…`
        : words.join(' ');
}
