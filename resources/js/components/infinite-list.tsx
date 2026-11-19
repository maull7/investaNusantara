import { InfiniteScroll } from '@inertiajs/react';
import type { ReactNode } from 'react';

/** Loads the next page of an `Inertia::scroll()` prop when the reader nears the end of the list. */
export default function InfiniteList({
    data,
    className,
    children,
}: {
    data: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <InfiniteScroll
            data={data}
            onlyNext
            buffer={600}
            className={className}
            loading={
                <div className="col-span-full flex justify-center py-6">
                    <span
                        role="status"
                        aria-label="Memuat berita"
                        className="size-6 animate-spin rounded-full border-2 border-accent/20 border-t-accent"
                    />
                </div>
            }
        >
            {children}
        </InfiniteScroll>
    );
}
