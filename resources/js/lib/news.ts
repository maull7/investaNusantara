import { region as regionRoute } from '@/routes';
import type { Region } from '@/types';

export function regionHref(r: Region): string {
    return r.parent
        ? regionRoute.url({ province: r.parent.slug, child: r.slug })
        : regionRoute.url({ province: r.slug });
}

const dateFmt = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

export function formatDate(iso: string | null): string {
    return iso ? dateFmt.format(new Date(iso)) : '-';
}

const rtf = new Intl.RelativeTimeFormat('id-ID', { numeric: 'auto' });

export function timeAgo(iso: string | null): string {
    if (!iso) {
        return '';
    }
    const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
    if (Math.abs(minutes) < 60) {
        return rtf.format(minutes, 'minute');
    }
    if (Math.abs(minutes) < 1440) {
        return rtf.format(Math.round(minutes / 60), 'hour');
    }
    return rtf.format(Math.round(minutes / 1440), 'day');
}

/** Shared-element name so the cover morphs from card to article page. */
export function coverTransition(id: number): string {
    return `cover-${id}`;
}
