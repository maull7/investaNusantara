import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';

/** Strip Laravel's HTML entities from labels like "&laquo; Previous". */
function label(raw: string): string {
    return raw
        .replace('&laquo;', '‹')
        .replace('&raquo;', '›')
        .replace('Previous', 'Sebelumnya')
        .replace('Next', 'Berikutnya');
}

export default function Pagination({ data }: { data: Paginated<unknown> }) {
    if (data.last_page <= 1) {
        return null;
    }

    return (
        <nav className="mt-8 flex flex-wrap gap-1.5" aria-label="Halaman">
            {data.links.map((link, i) =>
                link.url ? (
                    <Link
                        key={i}
                        href={link.url}
                        className={cn(
                            'rounded-full px-3.5 py-1.5 text-sm transition',
                            link.active
                                ? 'bg-accent text-white shadow'
                                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-accent-soft hover:text-accent',
                        )}
                    >
                        {label(link.label)}
                    </Link>
                ) : (
                    <span
                        key={i}
                        className="rounded-full px-3.5 py-1.5 text-sm text-slate-300"
                    >
                        {label(link.label)}
                    </span>
                ),
            )}
        </nav>
    );
}
