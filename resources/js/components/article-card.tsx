import { Link } from '@inertiajs/react';
import { motion } from 'motion/react';
import { useState } from 'react';
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
                        </p>
                    </div>
                </div>,
                'block',
            )}
        </motion.article>
    );
}

export function Cover({
    article,
    className,
    style,
}: {
    article: Pick<Card, 'cover_url' | 'title'>;
    className?: string;
    style?: React.CSSProperties;
}) {
    return article.cover_url ? (
        <img
            src={article.cover_url}
            alt=""
            loading="lazy"
            style={style}
            className={cn('w-full object-cover', className)}
        />
    ) : (
        <div
            style={style}
            className={cn(
                'w-full bg-gradient-to-br from-merah via-[#8a0a18] to-merah-dark',
                className,
            )}
        />
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
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-navy-900 uppercase backdrop-blur">
                {article.category.name}
            </span>
        </div>
    );
}
