import { Link } from '@inertiajs/react';
import Icon from '@/components/icons';
import { cn } from '@/lib/utils';
import { home } from '@/routes';

/** Site wordmark. `inverted` is for dark/photo backgrounds. */
export default function Logo({
    className,
    inverted = false,
}: {
    className?: string;
    inverted?: boolean;
}) {
    return (
        <Link
            href={home.url()}
            viewTransition
            className={cn('flex shrink-0 items-center gap-2.5', className)}
        >
            <span
                className={cn(
                    'grid size-9 place-items-center rounded-xl shadow-sm',
                    inverted
                        ? 'bg-white text-accent shadow-black/20'
                        : 'bg-accent text-white shadow-accent/30',
                )}
            >
                <Icon name="bolt" width={18} height={18} />
            </span>
            <span className="leading-none">
                <span
                    className={cn(
                        'block text-[17px] font-semibold tracking-tight',
                        inverted ? 'text-white' : 'text-navy-900',
                    )}
                >
                    Nusantara
                    <span
                        className={inverted ? 'text-white/80' : 'text-accent'}
                    >
                        News
                    </span>
                </span>
                <span
                    className={cn(
                        'text-[10px] font-medium tracking-[0.18em]',
                        inverted ? 'text-white/70' : 'text-slate-400',
                    )}
                >
                    360 · INDONESIA
                </span>
            </span>
        </Link>
    );
}
