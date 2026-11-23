import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Icon from '@/components/icons';
import { follow, pushStatus, pushSupported, unfollow } from '@/lib/push';
import { cn } from '@/lib/utils';

type Status = 'loading' | 'off' | 'on' | 'busy' | 'denied';

/**
 * "Ikuti" button for breaking-news notifications. With a province: follow that province
 * (national breaking news always comes too). Without: national breaking news only.
 * Hidden when the browser can't do push or the server has no VAPID keys.
 */
export default function PushFollow({
    province,
    provinceName,
    className,
}: {
    province?: string;
    provinceName?: string;
    className?: string;
}) {
    const { vapidPublicKey } = usePage().props;
    const [status, setStatus] = useState<Status>('loading');
    const [supported, setSupported] = useState(false);

    useEffect(() => {
        if (!vapidPublicKey || !pushSupported()) {
            return;
        }
        setSupported(true);
        if (Notification.permission === 'denied') {
            setStatus('denied');

            return;
        }
        pushStatus()
            .then((s) =>
                setStatus(
                    s.subscribed &&
                        (!province || s.provinces.includes(province))
                        ? 'on'
                        : 'off',
                ),
            )
            .catch(() => setStatus('off'));
    }, [vapidPublicKey, province]);

    if (!supported || !vapidPublicKey) {
        return null;
    }

    async function toggle() {
        const wasOn = status === 'on';
        setStatus('busy');
        try {
            if (wasOn) {
                await unfollow(province);
                setStatus('off');
            } else {
                await follow(vapidPublicKey!, province);
                setStatus('on');
            }
        } catch {
            setStatus(
                Notification.permission === 'denied'
                    ? 'denied'
                    : wasOn
                      ? 'on'
                      : 'off',
            );
        }
    }

    const on = status === 'on';
    const label =
        status === 'denied'
            ? 'Notifikasi diblokir di browser'
            : on
              ? province
                  ? `Mengikuti ${provinceName ?? 'provinsi ini'}`
                  : 'Notifikasi aktif'
              : province
                ? `Ikuti ${provinceName ?? 'provinsi ini'}`
                : 'Aktifkan notifikasi breaking news';

    return (
        <button
            type="button"
            onClick={() => void toggle()}
            disabled={
                status === 'loading' || status === 'busy' || status === 'denied'
            }
            aria-pressed={on}
            title={
                status === 'denied'
                    ? 'Izinkan notifikasi untuk situs ini di pengaturan browser.'
                    : on
                      ? 'Klik untuk berhenti mengikuti'
                      : 'Dapat notifikasi saat ada berita breaking'
            }
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium ring-1 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60',
                on
                    ? 'bg-accent text-white ring-accent hover:bg-accent-dark'
                    : 'bg-surface text-navy-900 ring-slate-200 hover:text-accent hover:ring-accent/30',
                className,
            )}
        >
            {status === 'busy' ? (
                <span className="size-3.5 animate-spin rounded-full border-2 border-current/25 border-t-current" />
            ) : (
                <Icon name="bell" width={16} height={16} />
            )}
            {label}
        </button>
    );
}
