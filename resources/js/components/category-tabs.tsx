import { Link } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export type Tab = { href: string; label: string };

// Slight overshoot so the pill "lands" on the new tab.
const pillSpring = { type: 'spring', stiffness: 380, damping: 28 } as const;
const hoverSpring = { type: 'spring', stiffness: 500, damping: 40 } as const;

/**
 * Category tabs: a red pill slides to the active tab, a soft highlight follows
 * the pointer, tabs squeeze on tap, and the active tab scrolls to the centre.
 */
export default function CategoryTabs({
    tabs,
    activeIndex,
}: {
    tabs: Tab[];
    activeIndex: number;
}) {
    const [hovered, setHovered] = useState<number | null>(null);
    const navRef = useRef<HTMLElement>(null);

    // Keep the active tab centred in the scroll strip (matters on phones).
    useEffect(() => {
        const nav = navRef.current;
        const el = nav?.querySelector<HTMLElement>('[aria-current="page"]');
        if (!nav || !el) {
            return;
        }
        const reduce = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;
        nav.scrollTo({
            left: el.offsetLeft - nav.clientWidth / 2 + el.offsetWidth / 2,
            behavior: reduce ? 'auto' : 'smooth',
        });
    }, [activeIndex]);

    return (
        <nav
            ref={navRef}
            aria-label="Kategori"
            onMouseLeave={() => setHovered(null)}
            className="mx-auto no-scrollbar flex max-w-6xl gap-1 overflow-x-auto [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-24px),transparent)] px-4 py-2"
        >
            {tabs.map((t, i) => {
                const active = i === activeIndex;

                return (
                    <motion.div
                        key={t.href}
                        whileTap={{ scale: 0.92 }}
                        transition={hoverSpring}
                        className="shrink-0"
                    >
                        <Link
                            href={t.href}
                            aria-current={active ? 'page' : undefined}
                            onMouseEnter={() => setHovered(i)}
                            onFocus={() => setHovered(i)}
                            onBlur={() => setHovered(null)}
                            className={cn(
                                'relative block rounded-full px-4 py-1.5 text-sm whitespace-nowrap transition-colors duration-200',
                                active
                                    ? 'font-medium text-white'
                                    : 'text-slate-500 hover:text-navy-900',
                            )}
                        >
                            <AnimatePresence>
                                {hovered === i && !active && (
                                    <motion.span
                                        layoutId="tab-hover"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={hoverSpring}
                                        className="absolute inset-0 rounded-full bg-accent/[0.07]"
                                    />
                                )}
                            </AnimatePresence>
                            {active && (
                                <motion.span
                                    layoutId="tab-pill"
                                    transition={pillSpring}
                                    className="absolute inset-0 rounded-full bg-accent shadow-md shadow-accent/30"
                                />
                            )}
                            <span className="relative">{t.label}</span>
                        </Link>
                    </motion.div>
                );
            })}
        </nav>
    );
}
