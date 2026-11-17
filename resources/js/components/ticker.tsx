import { Link } from '@inertiajs/react';
import Icon from '@/components/icons';
import { cn } from '@/lib/utils';
import { article as articleRoute } from '@/routes';
import type { ArticleCard as Card } from '@/types';

/** Endless marquee of headlines; hover pauses it. */
export default function Ticker({
    items,
    label = 'Breaking News',
    className,
}: {
    items: Card[];
    label?: string;
    className?: string;
}) {
    const loop = [...items, ...items];

    return (
        <div
            className={cn(
                'flex items-center gap-3 overflow-hidden card rounded-2xl p-2 pr-0',
                className,
            )}
        >
            <span className="flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-white">
                <Icon name="bolt" width={14} height={14} />
                {label}
            </span>
            <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]">
                <div className="flex w-max animate-marquee items-center text-sm font-semibold whitespace-nowrap text-navy-900 hover:[animation-play-state:paused]">
                    {loop.map((a, i) => (
                        <Link
                            key={i}
                            href={articleRoute.url(a.slug)}
                            viewTransition
                            className="flex items-center gap-4 pl-4 transition-colors hover:text-accent"
                        >
                            <span className="size-1.5 rounded-full bg-accent/60" />
                            {a.title}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
