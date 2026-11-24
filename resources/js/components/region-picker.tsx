import { router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { regionHref } from '@/lib/news';
import { cn } from '@/lib/utils';
import { cities as citiesRoute } from '@/routes/region';
import type { Region } from '@/types';

type Item = { value: string; label: string };

function PickerMenu({
    label,
    value,
    items,
    disabled = false,
    onSelect,
}: {
    label: string;
    value: string;
    items: Item[];
    disabled?: boolean;
    onSelect: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const root = useRef<HTMLDivElement>(null);
    const search = useRef<HTMLInputElement>(null);
    const shown = items.filter((item) =>
        item.label
            .toLocaleLowerCase('id')
            .includes(query.toLocaleLowerCase('id')),
    );
    const selected = items.find((item) => item.value === value);

    useEffect(() => {
        if (!open) return;
        search.current?.focus();
        function close(event: MouseEvent) {
            if (!root.current?.contains(event.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    function choose(next: string) {
        onSelect(next);
        setOpen(false);
        setQuery('');
    }

    return (
        <div ref={root} className="relative min-w-0">
            <button
                type="button"
                aria-label={label}
                aria-expanded={open}
                aria-haspopup="listbox"
                disabled={disabled}
                onClick={() => setOpen((current) => !current)}
                className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-full bg-surface px-4 py-2.5 text-left text-sm text-navy-900 ring-1 ring-slate-200 transition hover:ring-merah/50 focus:ring-2 focus:ring-merah/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                    open && 'ring-2 ring-merah/40',
                )}
            >
                <span className="truncate">{selected?.label ?? label}</span>
                <span
                    aria-hidden="true"
                    className={cn(
                        'shrink-0 text-merah transition-transform',
                        open && 'rotate-180',
                    )}
                >
                    ⌄
                </span>
            </button>
            {open && (
                <div className="absolute z-30 mt-2 w-full min-w-56 rounded-2xl border border-merah/15 bg-surface p-2 shadow-xl shadow-black/10">
                    <input
                        ref={search}
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Escape') setOpen(false);
                            if (event.key === 'Enter' && shown.length === 1)
                                choose(shown[0].value);
                            if (event.key === 'ArrowDown') {
                                event.preventDefault();
                                root.current
                                    ?.querySelector<HTMLElement>(
                                        '[role="option"]',
                                    )
                                    ?.focus();
                            }
                        }}
                        aria-label={`Cari ${label.toLowerCase()}`}
                        placeholder="Cari wilayah…"
                        className="mb-2 w-full rounded-xl border border-slate-200 bg-surface px-3 py-2 text-sm text-navy-900 placeholder:text-slate-400 outline-none focus:border-merah focus:ring-2 focus:ring-merah/20"
                    />
                    <div
                        role="listbox"
                        aria-label={label}
                        className="max-h-[180px] overflow-y-auto overscroll-contain"
                    >
                        {shown.map((item) => (
                            <button
                                key={item.value}
                                type="button"
                                role="option"
                                aria-selected={item.value === value}
                                onClick={() => choose(item.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Escape') {
                                        setOpen(false);
                                        root.current
                                            ?.querySelector<HTMLElement>(
                                                '[aria-haspopup="listbox"]',
                                            )
                                            ?.focus();
                                    }
                                    if (
                                        event.key === 'ArrowDown' ||
                                        event.key === 'ArrowUp'
                                    ) {
                                        event.preventDefault();
                                        const options = Array.from(
                                            root.current?.querySelectorAll<HTMLElement>(
                                                '[role="option"]',
                                            ) ?? [],
                                        );
                                        const index = options.indexOf(
                                            event.currentTarget,
                                        );
                                        options[
                                            index +
                                                (event.key === 'ArrowDown'
                                                    ? 1
                                                    : -1)
                                        ]?.focus();
                                    }
                                }}
                                className={cn(
                                    'flex h-9 w-full items-center rounded-lg px-3 text-left text-sm text-navy-900 transition hover:bg-merah/10 hover:text-merah focus:bg-merah/10 focus:text-merah focus:outline-none',
                                    item.value === value &&
                                        'bg-merah text-white hover:bg-merah-dark hover:text-white',
                                )}
                                title={item.label}
                            >
                                <span className="truncate">{item.label}</span>
                            </button>
                        ))}
                        {shown.length === 0 && (
                            <p className="px-3 py-2 text-sm text-slate-500">
                                Wilayah tidak ditemukan.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/** Province > regency/city selector that navigates to the region page. */
export default function RegionPicker({ className }: { className?: string }) {
    const { provinces } = usePage().props.nav;
    const [province, setProvince] = useState<Region | null>(null);
    const [cities, setCities] = useState<Region[]>([]);

    async function pickProvince(code: string) {
        const next = provinces.find((item) => item.code === code) ?? null;
        setProvince(next);
        setCities([]);
        if (next) {
            const response = await fetch(citiesRoute.url(next.code));
            setCities((await response.json()) as Region[]);
        }
    }

    function go(slug: string) {
        if (!province) return;
        const city = cities.find((item) => item.slug === slug);
        router.visit(
            regionHref(city ? { ...city, parent: province } : province),
            { viewTransition: true },
        );
    }

    return (
        <div className={cn('grid gap-2 sm:grid-cols-2', className)}>
            <PickerMenu
                label="Pilih provinsi"
                value={province?.code ?? ''}
                items={provinces.map((item) => ({
                    value: item.code,
                    label: item.name,
                }))}
                onSelect={(code) => void pickProvince(code)}
            />
            <PickerMenu
                label={
                    province
                        ? `Pilih kabupaten/kota di ${province.name}`
                        : 'Kabupaten/kota'
                }
                value=""
                disabled={!province}
                items={
                    province
                        ? [
                              {
                                  value: '*',
                                  label: `Semua di ${province.name}`,
                              },
                              ...cities.map((item) => ({
                                  value: item.slug,
                                  label: item.name,
                              })),
                          ]
                        : []
                }
                onSelect={go}
            />
        </div>
    );
}
