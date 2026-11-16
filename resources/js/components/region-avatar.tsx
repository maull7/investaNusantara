import { cn } from '@/lib/utils';
import type { Region } from '@/types';

/**
 * Round "channel logo" for a region: the province landmark photo.
 * National news (no region) gets a red-white mark instead.
 */
export default function RegionAvatar({
    region,
    className,
}: {
    region: Region | null;
    className?: string;
}) {
    const image = region?.image_url ?? region?.parent?.image_url;

    if (!region || !image) {
        return (
            <span
                aria-hidden
                className={cn(
                    'block shrink-0 overflow-hidden rounded-full ring-1 ring-accent/20',
                    className,
                )}
                style={{
                    background:
                        'linear-gradient(180deg, #a50e1e 50%, #ffffff 50%)',
                }}
            />
        );
    }

    return (
        <img
            src={image}
            alt=""
            loading="lazy"
            className={cn(
                'shrink-0 rounded-full object-cover ring-1 ring-accent/10',
                className,
            )}
        />
    );
}
