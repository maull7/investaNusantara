import { Link } from '@inertiajs/react';
import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';
import { home } from '@/routes';

/** NusantaraNews "N" monogram from the brand kit. Uses currentColor. */
export function LogoMark(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="12 22 104 82" fill="currentColor" aria-hidden {...props}>
            <g transform="translate(2 14)">
                <path d="M14 78 L26 18 Q28 10 37 10 L45 10 L84 48 L89 19 Q90 10 100 10 L112 10 L102 71 Q100 83 89 85 L82 85 L43 46 L37 78 Q36 88 26 88 L12 88 Z" />
                <path d="M41 58 L73 85 L61 85 L39 68 Z" opacity=".92" />
                <path d="M38 73 L54 85 L43 85 L36 81 Z" opacity=".92" />
            </g>
        </svg>
    );
}

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
            aria-label="NusantaraNews"
            className={cn('flex shrink-0 items-center gap-2', className)}
        >
            <LogoMark
                className={cn(
                    'h-7 w-auto',
                    inverted ? 'text-white' : 'text-accent',
                )}
            />
            <span
                className={cn(
                    'text-[19px] leading-none font-bold tracking-[-0.04em]',
                    inverted ? 'text-white' : 'text-navy-900',
                )}
            >
                Nusantara
                <span className={inverted ? 'text-white' : 'text-accent'}>
                    News
                </span>
            </span>
        </Link>
    );
}
