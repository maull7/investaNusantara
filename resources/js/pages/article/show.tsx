import MembershipOfferDialog, {
    type OfferPlan,
} from '@/components/membership-offer-dialog';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AnimatePresence,
    motion,
    useMotionValueEvent,
    useScroll,
    useSpring,
    useTransform,
} from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import ArticleCard, { Cover } from '@/components/article-card';
import Icon from '@/components/icons';
import RegionAvatar from '@/components/region-avatar';
import { SentimentBadge } from '@/components/sentiment';
import { Reveal, Stagger, ease } from '@/components/motion';
import PublicLayout, { SectionTitle } from '@/layouts/public';
import { cn } from '@/lib/utils';
import { coverTransition, formatDate, regionHref, timeAgo } from '@/lib/news';
import {
    category as categoryRoute,
    home,
    login,
    membership,
    register,
    tag as tagRoute,
} from '@/routes';
import { review as reviewRoute } from '@/routes/article';
import { destroy as unsaveRoute, store as saveRoute } from '@/routes/bookmarks';
import type { Article, ArticleCard as Card, ArticleReview } from '@/types';

export default function ArticleShow({
    article,
    related,
    nearby,
    review,
    membershipOffer,
    bookmarked,
}: {
    membershipOffer: OfferPlan | null;
    bookmarked: boolean;
    article: Article;
    related: Card[];
    nearby: Card[];
    review: ArticleReview | null;
}) {
    const offerRef = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        if (!membershipOffer) return;
        const timer = window.setInterval(() => {
            // Wait until another article dialog is closed before showing the offer.
            if (!document.querySelector('dialog[open], [role="dialog"]')) {
                offerRef.current?.showModal();
                window.clearInterval(timer);
            }
        }, 2500);
        return () => {
            window.clearInterval(timer);
            offerRef.current?.close();
        };
    }, [article.slug, membershipOffer?.id]);

    // "Ringkasan": swap our synopsis for the source's own headline and first 50 words.
    const { auth } = usePage().props;
    // Guests only get the summary (server sends just the first 50 words as `body`).
    const locked = !auth.user;
    const [toggled, setOriginal] = useState(false);
    const original = locked || toggled;
    // Guests must log in or sign up before they can open the source site.
    const [gateOpen, setGateOpen] = useState(false);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    // Set on first open; the review then keeps running and polling even after the modal closes.
    const [reviewStarted, setReviewStarted] = useState(false);
    const reviewPending =
        review?.status !== 'completed' && review?.status !== 'failed';
    // Button badge while the modal is closed: working, ready or failed.
    const reviewBadge = !reviewStarted
        ? null
        : reviewPending
          ? 'working'
          : review?.status === 'completed'
            ? 'ready'
            : 'failed';

    // No review yet: ask for one. Then poll until Hermes is done.
    useEffect(() => {
        if (!reviewStarted || !reviewPending) {
            return;
        }
        if (!review) {
            router.post(
                reviewRoute.url(article.slug),
                {},
                {
                    preserveScroll: true,
                    preserveState: true,
                    only: ['review'],
                },
            );

            return;
        }
        const t = window.setTimeout(
            () => router.reload({ only: ['review'] }),
            3000,
        );

        return () => window.clearTimeout(t);
    }, [reviewStarted, reviewPending, review, article.slug]);
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

    // Chips under the byline. Each state has its own hover so text never blends into the background.
    const pill =
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors active:scale-95';
    const neutral = cn(
        pill,
        'bg-surface text-slate-600 ring-slate-200 hover:bg-accent/5 hover:text-accent hover:ring-accent/30',
    );
    const reviewTone =
        reviewBadge === 'ready'
            ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 hover:bg-emerald-600 hover:text-white hover:ring-emerald-600'
            : reviewBadge === 'failed'
              ? 'bg-red-500/10 text-red-600 ring-red-500/30 hover:bg-red-600 hover:text-white hover:ring-red-600'
              : 'bg-accent/5 text-accent ring-accent/20 hover:bg-accent hover:text-white hover:ring-accent';
    const roundBtn =
        'grid size-10 place-items-center rounded-full border border-surface/60 bg-surface/70 text-navy-900 shadow-sm backdrop-blur-xl transition active:scale-90 md:hover:scale-105';

    return (
        <PublicLayout tabs={false} variant="article">
            {/* Description/OG/JSON-LD come from the server (app.blade.php) for crawlers. */}
            <Head title={article.title} />
            {membershipOffer && (
                <MembershipOfferDialog
                    offer={membershipOffer}
                    offerRef={offerRef}
                    onChoose={() => router.visit(`${membership.url()}#paket`)}
                    onCompare={() => router.visit(`${membership.url()}#paket`)}
                />
            )}

            <AnimatePresence>
                {shareOpen && (
                    <ShareDialog
                        article={article}
                        onClose={() => setShareOpen(false)}
                    />
                )}
            </AnimatePresence>

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
                        <BookmarkButton
                            slug={article.slug}
                            saved={bookmarked}
                            signedIn={Boolean(auth.user)}
                            className={roundBtn}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Phone: WhatsApp is how most news travels here, so keep it one tap away while reading. */}
            <AnimatePresence>
                {compact && (
                    <motion.button
                        type="button"
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.6, opacity: 0 }}
                        transition={{ duration: 0.25, ease }}
                        onClick={() => shareToWhatsApp(article)}
                        aria-label="Bagikan ke WhatsApp"
                        className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 grid size-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/40 active:scale-90 md:hidden"
                    >
                        <Icon name="whatsapp" width={26} height={26} />
                    </motion.button>
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
                            <div className="flex gap-2">
                                <BookmarkButton
                                    slug={article.slug}
                                    saved={bookmarked}
                                    signedIn={Boolean(auth.user)}
                                    className={roundBtn}
                                />
                                <button
                                    onClick={() => setShareOpen(true)}
                                    aria-label="Bagikan"
                                    className={roundBtn}
                                >
                                    <Icon name="share" width={18} height={18} />
                                </button>
                            </div>
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
                        className="relative -mt-7 rounded-t-[28px] bg-surface px-5 pt-6 pb-6 md:mx-6 md:-mt-12 md:card md:rounded-[28px] md:p-8"
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
                                        {!locked && (
                                            <>{minutes} menit baca · </>
                                        )}
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
                                    <SentimentBadge
                                        value={article.sentiment}
                                        className="mt-2"
                                    />
                                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setShareOpen(true)}
                                            className={neutral}
                                        >
                                            <Icon
                                                name="share"
                                                width={13}
                                                height={13}
                                            />
                                            Bagikan
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                !locked &&
                                                setOriginal((v) => !v)
                                            }
                                            aria-pressed={original}
                                            className={
                                                original
                                                    ? cn(
                                                          pill,
                                                          'bg-accent text-white ring-accent hover:bg-accent-dark hover:ring-accent-dark',
                                                      )
                                                    : neutral
                                            }
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
                                                onClick={() => {
                                                    setReviewOpen(true);
                                                    setReviewStarted(true);
                                                }}
                                                className={cn(pill, reviewTone)}
                                                aria-live="polite"
                                            >
                                                {reviewBadge === 'working' ? (
                                                    <span className="size-3 animate-spin rounded-full border-2 border-current/25 border-t-current" />
                                                ) : (
                                                    <Icon
                                                        name="star"
                                                        width={13}
                                                        height={13}
                                                    />
                                                )}
                                                {reviewBadge === 'working'
                                                    ? 'Menyusun review…'
                                                    : reviewBadge === 'ready'
                                                      ? 'Review AI siap'
                                                      : reviewBadge === 'failed'
                                                        ? 'Review gagal'
                                                        : 'Review AI'}
                                                {reviewBadge === 'ready' &&
                                                    !reviewOpen && (
                                                        <span className="size-1.5 rounded-full bg-current" />
                                                    )}
                                            </button>
                                        ) : (
                                            <Link
                                                href={login.url()}
                                                title="Masuk untuk melihat Review AI"
                                                className={cn(pill, reviewTone)}
                                            >
                                                <Icon
                                                    name="lock"
                                                    width={13}
                                                    height={13}
                                                />
                                                Review AI
                                            </Link>
                                        )}
                                        {/* Button Lihat Sumber Asli */}
                                        {(() => {
                                            const targetUrl =
                                                article.source_url ||
                                                `https://www.google.com/search?q=${encodeURIComponent(
                                                    `${article.title} ${article.region?.name ?? ''} ${article.source_name ?? ''}`.trim(),
                                                )}`;

                                            return locked ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setGateOpen(true)
                                                    }
                                                    className={neutral}
                                                >
                                                    <Icon
                                                        name="external"
                                                        width={13}
                                                        height={13}
                                                    />
                                                    Lihat Sumber Asli
                                                </button>
                                            ) : (
                                                <a
                                                    href={targetUrl}
                                                    target="_blank"
                                                    rel="noopener nofollow"
                                                    className={neutral}
                                                >
                                                    <Icon
                                                        name="external"
                                                        width={13}
                                                        height={13}
                                                    />
                                                    Lihat Sumber Asli
                                                </a>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </Reveal>

                            <Reveal>
                                <h1 className="mt-5 text-[22px] leading-snug font-semibold text-navy-900 md:text-[34px] md:leading-tight">
                                    {original ? summaryTitle : article.title}
                                </h1>
                            </Reveal>

                            {article.is_ai_generated && (
                                <p className="mt-3 inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-xl bg-navy-50 px-3 py-2 text-xs text-navy-800 ring-1 ring-navy-100">
                                    <Icon name="star" width={13} height={13} />
                                    <span className="font-semibold">
                                        Disusun dengan bantuan AI
                                    </span>
                                    <span>
                                        · dikurasi redaksi
                                        {article.editor
                                            ? ` (${article.editor.name})`
                                            : ''}
                                    </span>
                                    {article.source_name && (
                                        <span>
                                            · berdasarkan{' '}
                                            <span className="font-medium">
                                                {article.source_name}
                                            </span>
                                        </span>
                                    )}
                                </p>
                            )}

                            {original ? (
                                <div className="mt-5 rounded-2xl bg-accent/[0.04] p-4 text-[15px] leading-[1.85] text-slate-600 ring-1 ring-accent/10 md:p-5 md:text-[17px]">
                                    <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-accent uppercase">
                                        <Icon
                                            name="file"
                                            width={13}
                                            height={13}
                                        />
                                        {fromSource
                                            ? `Teks asli · ${article.source_name}`
                                            : 'Ringkasan'}
                                    </p>
                                    <p className="mt-2">{summaryText}</p>
                                    {locked ? (
                                        <Link
                                            href={login.url()}
                                            className="mt-4 flex items-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-accent/30 transition-colors hover:bg-accent-dark"
                                        >
                                            <Icon
                                                name="lock"
                                                width={15}
                                                height={15}
                                            />
                                            Masuk untuk membaca berita lengkap →
                                        </Link>
                                    ) : fromSource ? (
                                        <a
                                            href={article.source_url!}
                                            target="_blank"
                                            rel="noopener nofollow"
                                            className="mt-3 inline-block text-sm font-semibold text-accent underline-offset-4 transition-colors hover:text-accent-dark hover:underline"
                                        >
                                            Baca selengkapnya di sumber →
                                        </a>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setOriginal(false)}
                                            className="mt-3 text-sm font-semibold text-accent underline-offset-4 transition-colors hover:text-accent-dark hover:underline"
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
                                    <div className="paywalled-content mt-5 space-y-4 text-[15px] leading-[1.85] text-slate-600 md:text-[17px]">
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
                                    <SourceCredit
                                        article={article}
                                        onGuest={
                                            locked
                                                ? () => setGateOpen(true)
                                                : undefined
                                        }
                                    />
                                </Reveal>
                            )}

                            {article.tags && article.tags.length > 0 && (
                                <Reveal className="mt-6 flex flex-wrap gap-1.5">
                                    {article.tags.map((t) => (
                                        <Link
                                            key={t.id}
                                            href={tagRoute.url(t.slug!)}
                                            viewTransition
                                            className={neutral}
                                        >
                                            #{t.name}
                                        </Link>
                                    ))}
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

                <aside className="bg-surface px-5 pb-8 md:bg-transparent md:px-0 md:pb-0 lg:sticky lg:top-28 lg:self-start">
                    <Reveal className="md:card md:p-6">
                        <SectionTitle>Berita Terkait</SectionTitle>
                        <div className="divide-y divide-accent/10 [&>*]:py-3 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
                            {related.map((a) => (
                                <ArticleCard key={a.id} article={a} />
                            ))}
                        </div>
                    </Reveal>
                    {nearby.length > 0 && (
                        <Reveal className="mt-6 md:card md:p-6">
                            <SectionTitle
                                href={
                                    article.region?.parent
                                        ? regionHref(article.region.parent)
                                        : undefined
                                }
                            >
                                {`Sekitar ${article.region?.parent?.name ?? ''}`}
                            </SectionTitle>
                            <div className="divide-y divide-accent/10 [&>*]:py-3 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
                                {nearby.map((a) => (
                                    <ArticleCard key={a.id} article={a} />
                                ))}
                            </div>
                        </Reveal>
                    )}
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
                {gateOpen && <LoginGate onClose={() => setGateOpen(false)} />}
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
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
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
                className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-surface p-5 shadow-2xl sm:rounded-[28px] sm:p-6"
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
                        className="grid size-9 place-items-center rounded-full text-slate-400 transition-colors hover:bg-accent/10 hover:text-accent"
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
                        <span className="size-5 shrink-0 animate-spin rounded-full border-2 border-accent/20 border-t-accent" />
                        <div className="space-y-1">
                            <p className="font-medium text-navy-900">
                                AI sedang membaca berita dan menyusun review…
                            </p>
                            <p className="text-xs text-slate-400">
                                Biasanya butuh 1–2 menit. Jendela ini boleh
                                ditutup, proses tetap berjalan. Tombol Review AI
                                akan berubah hijau saat review siap.
                            </p>
                        </div>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}

/** Attribution for summarized articles: original title link and photo credit. */
function SourceCredit({
    article,
    onGuest,
}: {
    article: Article;
    onGuest?: () => void;
}) {
    let host = article.source_name ?? '';
    try {
        host = new URL(article.source_url!).host.replace(/^www\./, '');
    } catch {
        // keep the source name
    }

    return (
        <aside className="mt-8 flex gap-3 rounded-2xl bg-accent/[0.04] p-4 ring-1 ring-accent/10">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-accent ring-1 ring-accent/15">
                <Icon name="external" width={16} height={16} />
            </span>
            <div className="min-w-0 text-sm leading-relaxed text-slate-600">
                <p>
                    {article.is_ai_generated ? 'Disarikan dari ' : 'Sumber: '}
                    {onGuest ? (
                        <button
                            type="button"
                            onClick={onGuest}
                            className="font-semibold text-navy-900 underline decoration-accent/30 underline-offset-2 hover:text-accent"
                        >
                            {host || article.source_name}
                        </button>
                    ) : (
                        <a
                            href={article.source_url!}
                            target="_blank"
                            rel="noopener nofollow"
                            className="font-semibold text-navy-900 underline decoration-accent/30 underline-offset-2 hover:text-accent"
                        >
                            {host || article.source_name}
                        </a>
                    )}
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

/** Shown to guests who try to open the source site. */
function LoginGate({ onClose }: { onClose: () => void }) {
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
            className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/40 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={onClose}
        >
            <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="gate-title"
                onClick={(e) => e.stopPropagation()}
                initial={{ y: 40, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 40, opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3, ease }}
                className="w-full max-w-sm rounded-t-[28px] bg-surface p-6 text-center shadow-2xl sm:rounded-[28px]"
            >
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent/10 text-accent">
                    <Icon name="lock" width={22} height={22} />
                </span>
                <h2
                    id="gate-title"
                    className="mt-4 text-lg font-semibold text-navy-900"
                >
                    Masuk untuk melihat sumber
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">
                    Login atau daftar akun gratis dulu untuk membuka berita
                    langsung di situs sumbernya.
                </p>
                <div className="mt-5 grid gap-2">
                    <Link href={login.url()} className="btn-primary py-2.5">
                        Masuk
                    </Link>
                    <Link href={register.url()} className="btn-ghost py-2.5">
                        Daftar akun baru
                    </Link>
                    <button
                        type="button"
                        onClick={onClose}
                        className="mt-1 text-xs text-slate-400 hover:text-accent"
                    >
                        Nanti saja
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

/** Pop-up dialog to pick share destination with article preview. */
function ShareDialog({
    article,
    onClose,
}: {
    article: Article;
    onClose: () => void;
}) {
    const [copied, setCopied] = useState<'link' | 'text' | null>(null);
    const url = typeof window !== 'undefined' ? window.location.href : '';

    // Create a clean, engaging share message without raw asterisks or broken emojis
    const regionName = article.region?.name;
    const categoryName = article.category?.name;
    const meta = [regionName, categoryName].filter(Boolean).join(' | ');
    const summary = article.excerpt || article.source_excerpt || firstWords(article.body, 25);

    const shareMessage = [
        article.title,
        meta ? `[${meta}]` : null,
        summary ? `\n"${summary}"` : null,
        `\nBaca selengkapnya di Investa Nusantara:`,
        url,
    ]
        .filter((line) => line !== null)
        .join('\n');

    const enc = encodeURIComponent;

    async function copy(value: string, what: 'link' | 'text') {
        await navigator.clipboard.writeText(value).catch(() => undefined);
        setCopied(what);
        window.setTimeout(() => setCopied(null), 2000);
    }

    async function shareInstagram() {
        if (navigator.share && matchMedia('(pointer: coarse)').matches) {
            await navigator
                .share({ title: article.title, text: shareMessage, url })
                .catch(() => undefined);
        } else {
            await copy(shareMessage, 'text');
        }
    }

    const channels = [
        {
            name: 'WhatsApp',
            icon: 'whatsapp' as const,
            href: `https://wa.me/?text=${enc(shareMessage)}`,
            bg: 'bg-[#25D366] text-white hover:bg-[#20bd5a]',
            ring: 'ring-[#25D366]/30',
        },
        {
            name: 'X (Twitter)',
            icon: 'x-logo' as const,
            href: `https://x.com/intent/post?text=${enc(`${article.title}${regionName ? ` (${regionName})` : ''}`.slice(0, 200))}&url=${enc(url)}`,
            bg: 'bg-black text-white hover:bg-neutral-800',
            ring: 'ring-black/20',
        },
        {
            name: 'Facebook',
            icon: 'facebook' as const,
            href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
            bg: 'bg-[#1877F2] text-white hover:bg-[#156cdb]',
            ring: 'ring-[#1877F2]/30',
        },
        {
            name: 'Instagram',
            icon: 'instagram' as const,
            action: shareInstagram,
            bg: 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white hover:opacity-90',
            ring: 'ring-[#DD2A7B]/30',
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 grid place-items-center bg-navy-950/65 p-4 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 16 }}
                transition={{ type: 'spring', damping: 24, stiffness: 260 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md overflow-hidden rounded-3xl bg-surface shadow-2xl ring-1 ring-black/10"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-5 pt-5 pb-3">
                    <div>
                        <h2 className="text-base font-bold text-navy-900">
                            Bagikan Berita
                        </h2>
                        <p className="text-xs text-slate-400">
                            Sebarkan kabar baik dan informasi terkini
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Tutup"
                        className="grid size-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                        <span className="text-xl leading-none">&times;</span>
                    </button>
                </div>

                <div className="p-5">
                    {/* Article Mini Card Preview */}
                    <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/75 p-3">
                        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-slate-200">
                            {article.image_url ? (
                                <img
                                    src={article.image_url}
                                    alt=""
                                    className="size-full object-cover"
                                />
                            ) : (
                                <Cover
                                    article={article}
                                    className="size-full object-cover"
                                />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            {article.category && (
                                <span className="text-[11px] font-semibold text-accent uppercase">
                                    {article.category.name}
                                </span>
                            )}
                            <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-navy-900">
                                {article.title}
                            </h3>
                            <p className="mt-1 line-clamp-1 text-[11px] text-slate-400">
                                {article.region?.name ? `${article.region.name} · ` : ''}
                                {timeAgo(article.published_at)}
                            </p>
                        </div>
                    </div>

                    {/* Social Media Share Circular/Pill Options */}
                    <div className="mt-5">
                        <p className="mb-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                            Kirim ke media sosial
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                            {channels.map((ch) =>
                                ch.href ? (
                                    <a
                                        key={ch.name}
                                        href={ch.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={onClose}
                                        className="group flex flex-col items-center gap-1.5"
                                    >
                                        <div
                                            className={cn(
                                                'grid size-12 place-items-center rounded-2xl shadow-sm transition active:scale-90 group-hover:scale-105',
                                                ch.bg,
                                            )}
                                        >
                                            <Icon name={ch.icon} width={22} height={22} />
                                        </div>
                                        <span className="text-[11px] font-medium text-slate-600 transition group-hover:text-navy-900">
                                            {ch.name}
                                        </span>
                                    </a>
                                ) : (
                                    <button
                                        key={ch.name}
                                        type="button"
                                        onClick={() => ch.action?.()}
                                        className="group flex flex-col items-center gap-1.5"
                                    >
                                        <div
                                            className={cn(
                                                'grid size-12 place-items-center rounded-2xl shadow-sm transition active:scale-90 group-hover:scale-105',
                                                ch.bg,
                                            )}
                                        >
                                            <Icon name={ch.icon} width={22} height={22} />
                                        </div>
                                        <span className="text-[11px] font-medium text-slate-600 transition group-hover:text-navy-900">
                                            {copied === 'text' ? 'Disalin' : ch.name}
                                        </span>
                                    </button>
                                ),
                            )}
                        </div>
                    </div>

                    {/* Copy Link Input Bar */}
                    <div className="mt-5">
                        <p className="mb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                            Atau salin tautan
                        </p>
                        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/90 p-1.5 pl-3">
                            <span className="line-clamp-1 flex-1 text-xs text-slate-500">
                                {url}
                            </span>
                            <button
                                type="button"
                                onClick={() => void copy(url, 'link')}
                                className={cn(
                                    'inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold shadow-xs transition active:scale-95',
                                    copied === 'link'
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-accent text-white hover:bg-accent-dark',
                                )}
                            >
                                <Icon
                                    name={copied === 'link' ? 'check' : 'link'}
                                    width={14}
                                    height={14}
                                />
                                <span>{copied === 'link' ? 'Tersalin' : 'Salin'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

/** Opens WhatsApp with the post text and link. Reads the URL on click, so it is safe to render on the server. */
function shareToWhatsApp(article: Article) {
    const regionName = article.region?.name;
    const categoryName = article.category?.name;
    const meta = [regionName, categoryName].filter(Boolean).join(' | ');
    const summary = article.excerpt || article.source_excerpt || firstWords(article.body, 25);
    const url = window.location.href;

    const message = [
        article.title,
        meta ? `[${meta}]` : null,
        summary ? `\n"${summary}"` : null,
        `\nBaca selengkapnya di Investa Nusantara:`,
        url,
    ]
        .filter((line) => line !== null)
        .join('\n');

    window.open(
        `https://wa.me/?text=${encodeURIComponent(message)}`,
        '_blank',
        'noopener',
    );
}

/** "Simpan berita": toggles at once, then syncs with the server. Guests are sent to log in. */
function BookmarkButton({
    slug,
    saved,
    signedIn,
    className,
}: {
    slug: string;
    saved: boolean;
    signedIn: boolean;
    className?: string;
}) {
    const [on, setOn] = useState(saved);
    useEffect(() => setOn(saved), [saved]);
    const label = on ? 'Hapus dari tersimpan' : 'Simpan berita';

    if (!signedIn) {
        return (
            <Link
                href={login.url()}
                aria-label="Masuk untuk menyimpan berita"
                title="Masuk untuk menyimpan berita"
                className={className}
            >
                <Icon name="bookmark" width={18} height={18} />
            </Link>
        );
    }

    function toggle() {
        const next = !on;
        setOn(next);
        const options = {
            preserveScroll: true,
            only: ['bookmarked'],
            onError: () => setOn(!next),
        };
        if (next) {
            router.post(saveRoute.url(slug), {}, options);
        } else {
            router.delete(unsaveRoute.url(slug), options);
        }
    }

    return (
        <button
            type="button"
            onClick={toggle}
            aria-label={label}
            aria-pressed={on}
            title={label}
            className={cn(className, on && 'text-accent')}
        >
            <Icon
                name="bookmark"
                width={18}
                height={18}
                fill={on ? 'currentColor' : 'none'}
            />
        </button>
    );
}

function firstWords(text: string, count: number) {
    const words = text.trim().split(/\s+/);

    return words.length > count
        ? `${words.slice(0, count).join(' ')}…`
        : words.join(' ');
}


