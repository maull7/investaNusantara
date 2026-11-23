import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import Icon from '@/components/icons';
import { cn } from '@/lib/utils';
import { login } from '@/routes';
import { follow, unfollow } from '@/routes/regions';

/** "Ikuti" a province or kab/kota: its news then show up in "Dashboard saya". */
export default function RegionFollow({
    code,
    following,
    className,
}: {
    code: string;
    following: boolean;
    className?: string;
}) {
    const { auth } = usePage().props;
    const [on, setOn] = useState(following);
    const base = cn(
        'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium ring-1 transition active:scale-95',
        on
            ? 'bg-accent text-white ring-accent hover:bg-accent-dark'
            : 'bg-surface text-navy-900 ring-slate-200 hover:text-accent hover:ring-accent/30',
        className,
    );

    if (!auth.user) {
        return (
            <Link href={login.url()} className={base}>
                <Icon name="plus" width={16} height={16} />
                Ikuti
            </Link>
        );
    }
    // Newsroom accounts have no reader dashboard.
    if (auth.user.role !== 'customer' && auth.user.role !== 'client') {
        return null;
    }

    function toggle() {
        const next = !on;
        setOn(next);
        const options = {
            preserveScroll: true,
            only: ['following'],
            onError: () => setOn(!next),
        };
        if (next) {
            router.post(follow.url(code), {}, options);
        } else {
            router.delete(unfollow.url(code), options);
        }
    }

    return (
        <button type="button" onClick={toggle} aria-pressed={on} className={base}>
            <Icon name={on ? 'check' : 'plus'} width={16} height={16} />
            {on ? 'Diikuti' : 'Ikuti'}
        </button>
    );
}
