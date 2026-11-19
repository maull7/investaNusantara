import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { regionHref } from '@/lib/news';
import { cn } from '@/lib/utils';
import { cities as citiesRoute } from '@/routes/region';
import type { Region } from '@/types';

const select =
    'w-full appearance-none rounded-full bg-surface px-4 py-2.5 text-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50';

/** Province > regency/city selector that navigates to the region page. */
export default function RegionPicker({ className }: { className?: string }) {
    const { provinces } = usePage().props.nav;
    const [province, setProvince] = useState<Region | null>(null);
    const [cities, setCities] = useState<Region[]>([]);

    async function pickProvince(code: string) {
        const p = provinces.find((x) => x.code === code) ?? null;
        setProvince(p);
        setCities([]);
        if (p) {
            const res = await fetch(citiesRoute.url(p.code));
            setCities((await res.json()) as Region[]);
        }
    }

    function go(slug: string) {
        if (!province) {
            return;
        }
        const city = cities.find((c) => c.slug === slug);
        router.visit(
            regionHref(city ? { ...city, parent: province } : province),
            {
                viewTransition: true,
            },
        );
    }

    return (
        <div className={cn('grid gap-2 sm:grid-cols-2', className)}>
            <select
                aria-label="Pilih provinsi"
                className={select}
                value={province?.code ?? ''}
                onChange={(e) => void pickProvince(e.target.value)}
            >
                <option value="">Pilih provinsi…</option>
                {provinces.map((p) => (
                    <option key={p.code} value={p.code}>
                        {p.name}
                    </option>
                ))}
            </select>
            <select
                aria-label="Pilih kabupaten/kota"
                className={select}
                disabled={!province}
                value=""
                onChange={(e) => go(e.target.value)}
            >
                <option value="">
                    {province
                        ? `Pilih kab/kota di ${province.name}…`
                        : 'Kabupaten/kota…'}
                </option>
                {province && (
                    <option value="*">Semua di {province.name}</option>
                )}
                {cities.map((c) => (
                    <option key={c.code} value={c.slug}>
                        {c.name}
                    </option>
                ))}
            </select>
        </div>
    );
}
