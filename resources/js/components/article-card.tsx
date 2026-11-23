import { Link } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { LogoMark } from '@/components/logo';
import RegionAvatar from '@/components/region-avatar';
import { coverTransition, timeAgo } from '@/lib/news';
import { cn } from '@/lib/utils';
import { article as articleRoute } from '@/routes';
import type { ArticleCard as Card } from '@/types';

type Variant = 'list' | 'feature' | 'hero';

/**
 * News card. Clicking marks this card's cover with a view-transition name so the
 * browser morphs it into the cover on the article page (shared element).
 */
export default function ArticleCard({
    article,
    variant = 'list',
    className,
}: {
    article: Card;
    variant?: Variant;
    className?: string;
}) {
    const [opening, setOpening] = useState(false);
    const href = articleRoute.url(article.slug);
    const coverStyle = opening
        ? { viewTransitionName: coverTransition(article.id) }
        : undefined;

    const link = (children: React.ReactNode, cls: string) => (
        <Link
            href={href}
            viewTransition
            onClick={() => setOpening(true)}
            className={cls}
        >
            {children}
        </Link>
    );

    if (variant === 'hero') {
        return (
            <motion.article
                whileHover={{ scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className={cn(
                    'group relative h-full min-h-80 overflow-hidden rounded-[28px] bg-merah-dark shadow-[0_20px_40px_-20px_rgba(107,7,18,0.5)]',
                    className,
                )}
            >
                {link(
                    <>
                        <Cover
                            article={article}
                            style={coverStyle}
                            className="absolute inset-0 h-full transition duration-700 group-hover:scale-105"
                        />
                        <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-merah-dark/20 to-transparent" />
                        <div className="relative flex h-full min-h-80 flex-col justify-end p-5 text-white sm:p-7">
                            <Chips article={article} />
                            <h3 className="mt-3 line-clamp-3 text-xl leading-snug font-semibold sm:text-2xl md:text-[28px] md:leading-tight">
                                {article.title}
                            </h3>
                            <Source article={article} light className="mt-4" />
                        </div>
                    </>,
                    'block h-full',
                )}
            </motion.article>
        );
    }

    if (variant === 'feature') {
        return (
            <motion.article
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className={cn('group h-full', className)}
            >
                {link(
                    <>
                        <div className="relative overflow-hidden rounded-[20px] shadow-[0_12px_28px_-14px_rgba(107,7,18,0.5)]">
                            <Cover
                                article={article}
                                style={coverStyle}
                                className="aspect-[16/10] transition duration-500 group-hover:scale-105"
                            />
                            <div className="absolute top-3 left-3">
                                <Chips article={article} />
                            </div>
                        </div>
                        <h3 className="mt-3 line-clamp-2 min-h-[2.6rem] text-[15px] leading-snug font-semibold text-navy-900 transition-colors group-hover:text-accent">
                            {article.title}
                        </h3>
                        <Source article={article} className="mt-2" />
                    </>,
                    'flex h-full flex-col',
                )}
            </motion.article>
        );
    }

    return (
        <motion.article
            whileHover={{ x: 4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className={cn('group', className)}
        >
            {link(
                <div className="flex items-center gap-3.5">
                    <div className="size-20 shrink-0 overflow-hidden rounded-2xl shadow-sm sm:size-[88px]">
                        <Cover
                            article={article}
                            style={coverStyle}
                            className="h-full transition duration-500 group-hover:scale-110"
                        />
                    </div>
                    <div className="min-w-0 flex-1">
                        <Source article={article} />
                        <h3 className="mt-1 line-clamp-2 text-sm leading-snug font-semibold text-navy-900 transition-colors group-hover:text-accent">
                            {article.title}
                        </h3>
                        <p className="mt-1 text-[11px]">
                            <span className="font-medium text-accent">
                                {article.category.name}
                            </span>
                            {article.is_breaking && (
                                <span className="text-slate-400">
                                    {' '}
                                    · Breaking
                                </span>
                            )}
                            {article.is_ai_generated && (
                                <span
                                    className="text-slate-400"
                                    title="Disusun dengan bantuan AI, dikurasi redaksi"
                                >
                                    {' '}
                                    · AI
                                </span>
                            )}
                        </p>
                    </div>
                </div>,
                'block',
            )}
        </motion.article>
    );
}

/**
 * Cover image. Covers can be hotlinked from the source site, so on a slow
 * connection a shimmering skeleton holds the space and the photo fades in once
 * loaded; a broken link falls back to the brand gradient.
 */
export function Cover({
    article,
    className,
    style,
}: {
    article: Pick<Card, 'cover_url' | 'title'> & {
        region?: Card['region'];
        category?: Card['category'];
    };
    className?: string;
    style?: React.CSSProperties;
}) {
    const [state, setState] = useState<{
        src: string | null;
        status: 'loading' | 'loaded' | 'error';
    }>({ src: article.cover_url, status: 'loading' });
    const src = article.cover_url;
    // A new src (the same component on another page) starts loading again.
    const status = state.src === src ? state.status : 'loading';
    const set = (next: 'loaded' | 'error') => setState({ src, status: next });

    if (!src || status === 'error') {
        return (
            <CoverPlaceholder
                article={article}
                style={style}
                className={className}
            />
        );
    }

    return (
        <div
            style={style}
            className={cn(
                'relative w-full overflow-hidden bg-slate-100',
                className,
            )}
        >
            <AnimatePresence>
                {status === 'loading' && <Skeleton key="skeleton" />}
            </AnimatePresence>
            <motion.img
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
                // Many news sites block hotlinks that send a Referer.
                referrerPolicy="no-referrer"
                ref={(img) => {
                    // Already in the browser cache: onLoad may have fired before React attached.
                    if (
                        img?.complete &&
                        img.naturalWidth > 0 &&
                        status === 'loading'
                    ) {
                        set('loaded');
                    }
                }}
                onLoad={() => set('loaded')}
                onError={() => set('error')}
                initial={false}
                animate={
                    status === 'loaded'
                        ? { opacity: 1, scale: 1, filter: 'blur(0px)' }
                        : { opacity: 0, scale: 1.04, filter: 'blur(8px)' }
                }
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 h-full w-full object-cover"
            />
        </div>
    );
}

/** Batik kawung tile: four petals around a dot, drawn in white for the red backdrop. */
const kawung = `url("data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><g fill="none" stroke="white" stroke-width="1.2"><ellipse cx="22" cy="11" rx="6" ry="10"/><ellipse cx="22" cy="33" rx="6" ry="10"/><ellipse cx="11" cy="22" rx="10" ry="6"/><ellipse cx="33" cy="22" rx="10" ry="6"/></g><circle cx="22" cy="22" r="2" fill="white"/><circle cx="0" cy="0" r="2" fill="white"/><circle cx="44" cy="0" r="2" fill="white"/><circle cx="0" cy="44" r="2" fill="white"/><circle cx="44" cy="44" r="2" fill="white"/></svg>',
)}")`;

/**
 * Branded cover for articles without a photo: deep red with a batik kawung
 * texture, a slowly drifting glow and the NusantaraNews mark. On larger cards it
 * also names the category and region, so it reads as a designed cover, not a gap.
 */
export function CoverPlaceholder({
    article,
    className,
    style,
}: {
    article: { region?: Card['region']; category?: Card['category'] };
    className?: string;
    style?: React.CSSProperties;
}) {
    const region = article.region?.name ?? 'Nasional';

    return (
        <div
            style={style}
            className={cn(
                '@container relative w-full overflow-hidden bg-gradient-to-br from-[#b3121f] via-merah to-merah-dark',
                className,
            )}
        >
            <span
                aria-hidden
                className="absolute inset-0 opacity-[0.09]"
                style={{ backgroundImage: kawung, backgroundSize: '44px 44px' }}
            />
            <motion.span
                aria-hidden
                className="absolute -inset-1/2 bg-[radial-gradient(closest-side,rgba(255,255,255,0.22),transparent)]"
                animate={{
                    x: ['-12%', '14%', '-12%'],
                    y: ['-10%', '8%', '-10%'],
                }}
                transition={{
                    duration: 14,
                    ease: 'easeInOut',
                    repeat: Infinity,
                }}
            />
            <LogoMark
                aria-hidden
                className="absolute -right-[12%] -bottom-[18%] h-[85%] w-auto rotate-[-8deg] text-white/[0.07]"
            />
            <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/25 to-transparent" />

            <div className="relative flex h-full flex-col items-center justify-center gap-2 p-3 text-center text-white">
                <LogoMark className="h-[clamp(18px,22cqw,44px)] w-auto drop-shadow-[0_4px_12px_rgba(0,0,0,0.25)]" />
                <div className="hidden flex-col items-center gap-1 @[160px]:flex">
                    {article.category && (
                        <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.14em] uppercase ring-1 ring-white/25 backdrop-blur-sm">
                            {article.category.name}
                        </span>
                    )}
                    <span className="line-clamp-1 text-[11px] font-medium text-white/80">
                        NusantaraNews · {region}
                    </span>
                </div>
            </div>
        </div>
    );
}

/** Shimmer sweep driven by motion; sits under the image until it has loaded. */
export function Skeleton({ className }: { className?: string }) {
    return (
        <motion.span
            aria-hidden
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            className={cn(
                'absolute inset-0 overflow-hidden bg-slate-200/80',
                className,
            )}
        >
            <motion.span
                className="absolute inset-y-0 -left-full w-full bg-gradient-to-r from-transparent via-white/60 to-transparent"
                animate={{ x: ['0%', '200%'] }}
                transition={{
                    duration: 1.3,
                    ease: 'easeInOut',
                    repeat: Infinity,
                }}
            />
        </motion.span>
    );
}

/** Source line: region "channel" avatar + name + relative time. */
export function Source({
    article,
    light,
    className,
}: {
    article: Card;
    light?: boolean;
    className?: string;
}) {
    const name = article.region?.name ?? 'Nasional';

    return (
        <div
            className={cn(
                'flex min-w-0 items-center gap-1.5 text-[11px]',
                className,
            )}
        >
            <RegionAvatar region={article.region} className="size-[18px]" />
            <span
                className={cn(
                    'truncate font-medium',
                    light ? 'text-white' : 'text-navy-900',
                )}
            >
                {name}
            </span>
            <span
                className={cn(
                    'shrink-0',
                    light ? 'text-slate-300' : 'text-slate-400',
                )}
            >
                · {timeAgo(article.published_at)}
            </span>
        </div>
    );
}

function Chips({ article }: { article: Card }) {
    return (
        <div className="flex gap-1.5">
            {article.is_breaking && (
                <span className="rounded-full bg-accent/70 px-2.5 py-1 text-[10px] font-medium tracking-wide text-white uppercase backdrop-blur-md">
                    Breaking
                </span>
            )}
            <span className="rounded-full bg-surface/90 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-navy-900 uppercase backdrop-blur">
                {article.category.name}
            </span>
            {article.is_ai_generated && (
                <span
                    className="rounded-full bg-navy-900/70 px-2.5 py-1 text-[10px] font-medium tracking-wide text-white uppercase backdrop-blur-md"
                    title="Disusun dengan bantuan AI, dikurasi redaksi"
                >
                    AI
                </span>
            )}
        </div>
    );
}
