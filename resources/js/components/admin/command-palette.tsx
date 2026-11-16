import { router } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import Icon, { type IconName } from '@/components/icons';
import { cn } from '@/lib/utils';

export type Command = {
    label: string;
    group: string;
    icon: IconName;
    /** Extra words that should also match, e.g. synonyms. */
    keywords?: string;
    href?: string;
    external?: boolean;
    run?: () => void;
};

const spring = { type: 'spring', stiffness: 500, damping: 36 } as const;

function normalize(s: string): string {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '');
}

/**
 * Ctrl/⌘ + K menu search. Filters the given commands; when the text matches
 * nothing it is still useful as an article title search (`onSearchArticles`).
 */
export default function CommandPalette({
    open,
    onClose,
    commands,
    onSearchArticles,
}: {
    open: boolean;
    onClose: () => void;
    commands: Command[];
    onSearchArticles: (q: string) => void;
}) {
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    const q = normalize(query.trim());
    const matches = q
        ? commands.filter((c) =>
              normalize(`${c.label} ${c.group} ${c.keywords ?? ''}`).includes(
                  q,
              ),
          )
        : commands;
    // The article search is always the last option once something is typed.
    const options: Command[] = q
        ? [
              ...matches,
              {
                  label: `Cari artikel “${query.trim()}”`,
                  group: 'Artikel',
                  icon: 'search',
                  run: () => onSearchArticles(query.trim()),
              },
          ]
        : matches;

    useEffect(() => {
        if (!open) {
            setQuery('');
            setActive(0);
        }
    }, [open]);

    // Keep the highlighted row in view while moving with the arrow keys.
    useEffect(() => {
        listRef.current
            ?.querySelector(`[data-index="${active}"]`)
            ?.scrollIntoView({ block: 'nearest' });
    }, [active]);

    function choose(c: Command) {
        onClose();
        if (c.run) {
            c.run();
        } else if (c.href && c.external) {
            window.open(c.href, '_blank');
        } else if (c.href) {
            router.visit(c.href);
        }
    }

    function onKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => (i + 1) % options.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => (i - 1 + options.length) % options.length);
        } else if (e.key === 'Enter' && options[active]) {
            e.preventDefault();
            choose(options[active]);
        } else if (e.key === 'Escape') {
            onClose();
        }
    }

    let lastGroup = '';

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-navy-900/30 backdrop-blur-sm"
                    />
                    <motion.div
                        role="dialog"
                        aria-modal
                        aria-label="Cari menu"
                        initial={{ opacity: 0, y: -12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={spring}
                        onKeyDown={onKeyDown}
                        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 shadow-merah-dark/20 ring-black/5"
                    >
                        <div className="flex items-center gap-3 border-b border-slate-100 px-5">
                            <Icon name="search" className="text-accent" />
                            <input
                                autoFocus
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    setActive(0);
                                }}
                                placeholder="Cari menu atau artikel…"
                                aria-label="Cari menu atau artikel"
                                className="flex-1 bg-transparent py-4 text-base text-navy-900 outline-none placeholder:text-slate-400"
                            />
                            <kbd className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
                                Esc
                            </kbd>
                        </div>

                        <div
                            ref={listRef}
                            role="listbox"
                            className="max-h-[50vh] overflow-y-auto p-2"
                        >
                            {options.map((c, i) => {
                                const header =
                                    c.group !== lastGroup ? c.group : null;
                                lastGroup = c.group;
                                const on = i === active;

                                return (
                                    <div key={`${c.group}-${c.label}`}>
                                        {header && (
                                            <p className="px-3 pt-3 pb-1 text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                                                {header}
                                            </p>
                                        )}
                                        <button
                                            type="button"
                                            role="option"
                                            aria-selected={on}
                                            data-index={i}
                                            onMouseMove={() => setActive(i)}
                                            onClick={() => choose(c)}
                                            className={cn(
                                                'relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors',
                                                on
                                                    ? 'text-accent'
                                                    : 'text-slate-600',
                                            )}
                                        >
                                            {on && (
                                                <motion.span
                                                    layoutId="palette-active"
                                                    transition={spring}
                                                    className="absolute inset-0 rounded-2xl bg-accent/[0.07]"
                                                />
                                            )}
                                            <span
                                                className={cn(
                                                    'relative grid size-8 place-items-center rounded-xl transition-colors',
                                                    on
                                                        ? 'bg-accent text-white'
                                                        : 'bg-slate-100 text-slate-500',
                                                )}
                                            >
                                                <Icon
                                                    name={c.icon}
                                                    width={16}
                                                    height={16}
                                                />
                                            </span>
                                            <span className="relative flex-1 font-medium">
                                                {c.label}
                                            </span>
                                            {on && (
                                                <Icon
                                                    name="arrow"
                                                    width={16}
                                                    height={16}
                                                    className="relative"
                                                />
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex items-center gap-4 border-t border-slate-100 bg-slate-50/70 px-5 py-2.5 text-[11px] text-slate-400">
                            <span>
                                <Kbd>↑</Kbd> <Kbd>↓</Kbd> pilih
                            </span>
                            <span>
                                <Kbd>Enter</Kbd> buka
                            </span>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function Kbd({ children }: { children: string }) {
    return (
        <kbd className="rounded bg-white px-1 py-0.5 font-sans text-[10px] text-slate-500 ring-1 ring-slate-200">
            {children}
        </kbd>
    );
}
