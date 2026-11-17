import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const ZONES = [
    ['WIB', 'Asia/Jakarta'],
    ['WITA', 'Asia/Makassar'],
    ['WIT', 'Asia/Jayapura'],
] as const;

/** Live clock for Indonesia's three time zones. */
export default function ZoneClock({ className }: { className?: string }) {
    // null on first render so server and client markup match.
    const [now, setNow] = useState<Date | null>(null);

    useEffect(() => {
        setNow(new Date());
        const timer = window.setInterval(() => setNow(new Date()), 15_000);

        return () => window.clearInterval(timer);
    }, []);

    return (
        <div
            className={cn(
                'flex items-center gap-3 text-xs tabular-nums sm:gap-5',
                className,
            )}
        >
            {ZONES.map(([label, timeZone]) => (
                <span key={label} className="flex items-baseline gap-1.5">
                    <span className="font-medium tracking-[0.18em] text-slate-400">
                        {label}
                    </span>
                    <span className="font-semibold text-navy-900">
                        {now
                            ? new Intl.DateTimeFormat('id-ID', {
                                  timeZone,
                                  hour: '2-digit',
                                  minute: '2-digit',
                              }).format(now)
                            : '--.--'}
                    </span>
                </span>
            ))}
        </div>
    );
}
