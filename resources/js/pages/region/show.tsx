import { Head, Link, router } from '@inertiajs/react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import ArticleCard from '@/components/article-card';
import Icon from '@/components/icons';
import { Reveal, Stagger } from '@/components/motion';
import InfiniteList from '@/components/infinite-list';
import PushFollow from '@/components/push-follow';
import RegionFollow from '@/components/region-follow';
import PublicLayout, { SectionTitle } from '@/layouts/public';
import RegionAvatar from '@/components/region-avatar';
import {
    type DirectoryTab,
    DirectoryTabs,
    EntryList,
    Officials,
    ProfilePanel,
    TopicLinks,
} from '@/components/region-directory';
import { regionHref } from '@/lib/news';
import { cn } from '@/lib/utils';
import { region as regionRoute, regions } from '@/routes';
import type {
    ArticleCard as Card,
    DirectoryEntry,
    FactField,
    Paginated,
    Region,
    RegionProfile,
    Topic,
} from '@/types';

const listRows =
    'divide-y divide-accent/10 [&>*]:py-3 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0';

type Props = {
    province: Region;
    region: Region & { landmark: { name: string; url: string } | null };
    cities: Region[];
    articles: Paginated<Card>;
    directory: {
        profile: RegionProfile | null;
        factFields: FactField[];
        entries: DirectoryEntry[];
        types: Record<DirectoryEntry['type'], string>;
        topics: Topic[];
    };
    popular: Card[];
    stats: {
        total: number;
        cities_with_news: number;
        cities: {
            code: string;
            name: string;
            slug: string;
            type: string | null;
            total: number;
        }[];
        rank: number | null;
    };
    following: boolean;
};

export default function RegionShow({
    province,
    region,
    cities,
    articles,
    directory,
    popular,
    stats,
    following,
}: Props) {
    const [tab, setTab] = useState<DirectoryTab>('berita');
    const byType = (type: DirectoryEntry['type']) =>
        directory.entries.filter((e) => e.type === type);
    // Tabs without verified data stay hidden.
    const tabs = [
        { key: 'berita' as const, label: 'Berita' },
        ...(directory.profile
            ? [{ key: 'profil' as const, label: 'Profil' }]
            : []),
        ...(
            Object.entries(directory.types) as [
                DirectoryEntry['type'],
                string,
            ][]
        )
            .filter(([type]) => byType(type).length > 0)
            .map(([key, label]) => ({
                key,
                label,
                count: byType(key).length,
            })),
    ];
    // Switching region keeps this component; fall back when the new region lacks the tab.
    const current = tabs.some((t) => t.key === tab) ? tab : 'berita';
    const isCity = region.code !== province.code;
    const [first, ...list] = articles.data;
    const label = isCity
        ? region.type === 'kota'
            ? 'Kota'
            : 'Kabupaten'
        : 'Provinsi';

    return (
        <PublicLayout tabs={false}>
            <Head title={`Berita ${region.name}`} />

            <Stagger className="space-y-6">
                {/* Channel header: the region's own map as backdrop, its landmark as the icon */}
                <Reveal className="overflow-hidden card">
                    <div className="relative h-52 overflow-hidden bg-gradient-to-br from-merah-dark via-merah-dark to-merah md:h-64">
                        <motion.img
                            key={region.code}
                            src={`/maps/${region.code}.svg`}
                            alt=""
                            initial={{ opacity: 0, scale: 0.92 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                                duration: 0.9,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                            className="pointer-events-none absolute top-1/2 right-2 h-[120%] max-w-none -translate-y-1/2 [mask-image:radial-gradient(closest-side,black_88%,transparent)] select-none md:right-8 md:h-[125%]"
                        />
                        <span className="absolute inset-0 bg-gradient-to-r from-merah-dark/85 via-merah-dark/30 to-transparent" />
                        <Link
                            href={
                                isCity
                                    ? regionRoute.url({
                                          province: province.slug,
                                      })
                                    : regions.url()
                            }
                            viewTransition
                            className="absolute top-4 left-4 grid size-9 place-items-center rounded-full bg-surface/90 text-navy-900 backdrop-blur"
                            aria-label="Kembali"
                        >
                            <Icon name="back" />
                        </Link>
                        {region.landmark && (
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.6 }}
                                className="absolute bottom-4 left-5 flex items-end gap-3 md:bottom-5 md:left-8"
                            >
                                <span
                                    role="img"
                                    aria-label={region.landmark.name}
                                    className="block size-28 bg-white drop-shadow-lg md:size-36"
                                    style={{
                                        maskImage: `url(${region.landmark.url})`,
                                        WebkitMaskImage: `url(${region.landmark.url})`,
                                        maskSize: 'contain',
                                        WebkitMaskSize: 'contain',
                                        maskRepeat: 'no-repeat',
                                        WebkitMaskRepeat: 'no-repeat',
                                        maskPosition: 'center',
                                        WebkitMaskPosition: 'center',
                                    }}
                                />
                                <span className="mb-1 max-w-32 text-[11px] leading-tight text-white/75">
                                    {region.landmark.name}
                                </span>
                            </motion.div>
                        )}
                    </div>
                    <div className="px-5 pb-5 md:px-8">
                        <motion.span
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                                type: 'spring',
                                stiffness: 260,
                                damping: 16,
                                delay: 0.15,
                            }}
                            // relative + z-10: otherwise the positioned banner above paints over the avatar's top half.
                            className="relative z-10 -mt-10 block size-20 overflow-hidden rounded-full border-4 border-surface shadow-lg ring-2 ring-accent/25 md:-mt-12 md:size-24"
                        >
                            <RegionAvatar
                                region={{
                                    ...region,
                                    image_url: province.image_url,
                                }}
                                className="size-full ring-0"
                            />
                        </motion.span>
                        <h1 className="mt-3 text-2xl font-semibold text-navy-900 md:text-3xl">
                            {region.name}
                        </h1>
                        <p className="text-sm text-slate-500">
                            {label}
                            {isCity && ` · ${province.name}`} · kode{' '}
                            {region.code}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <RegionFollow
                                key={region.code}
                                code={region.code}
                                following={following}
                            />
                            {/* Notifications are per province: a city page follows its province. */}
                            <PushFollow
                                province={province.code}
                                provinceName={province.name}
                            />
                        </div>
                        <div className="mt-4 flex gap-6 text-sm">
                            <Stat value={articles.total} label="Berita" />
                            {!isCity && (
                                <Stat value={cities.length} label="Kab/Kota" />
                            )}
                        </div>
                        <Officials
                            profile={directory.profile}
                            region={region}
                        />
                    </div>
                </Reveal>

                <Reveal>
                    <CityHeat
                        stats={stats}
                        province={province}
                        currentCode={isCity ? region.code : null}
                    />
                </Reveal>

                {/* Kab/kota filter */}
                <Reveal className="flex flex-wrap items-center justify-between gap-2">
                    <label
                        htmlFor="city-filter"
                        className="text-sm font-medium text-navy-900"
                    >
                        Filter kabupaten/kota
                    </label>
                    <CityFilterDropdown
                        province={province}
                        cities={cities}
                        currentSlug={isCity ? region.slug : ''}
                    />
                </Reveal>

                <Reveal className="card p-4">
                    <TopicLinks
                        topics={directory.topics}
                        province={province}
                        region={region}
                    />
                </Reveal>

                {tabs.length > 1 && (
                    <Reveal>
                        <DirectoryTabs
                            tabs={tabs}
                            active={current}
                            onChange={setTab}
                        />
                    </Reveal>
                )}

                {current === 'profil' && directory.profile ? (
                    <ProfilePanel
                        profile={directory.profile}
                        fields={directory.factFields}
                        regionName={region.name}
                    />
                ) : current !== 'berita' ? (
                    <EntryList
                        entries={byType(current as DirectoryEntry['type'])}
                    />
                ) : articles.total === 0 ? (
                    <Reveal className="card p-10 text-center text-slate-500">
                        Belum ada berita dari {region.name}.
                    </Reveal>
                ) : (
                    <>
                        {/* Same layout as the home page: hero + trending, then the latest grid. */}
                        {first && (
                            <div className="grid gap-6 lg:grid-cols-3">
                                <Reveal className="lg:col-span-2">
                                    <ArticleCard
                                        article={first}
                                        variant="hero"
                                    />
                                </Reveal>
                                {popular.length > 0 && (
                                    <Reveal className="card p-5 md:p-6">
                                        <SectionTitle>
                                            <span className="inline-flex items-center gap-1.5">
                                                <Icon
                                                    name="flame"
                                                    className="text-accent"
                                                />
                                                Trending
                                            </span>
                                        </SectionTitle>
                                        <div className={listRows}>
                                            {popular.map((a) => (
                                                <ArticleCard
                                                    key={a.id}
                                                    article={a}
                                                />
                                            ))}
                                        </div>
                                    </Reveal>
                                )}
                            </div>
                        )}
                        <Reveal
                            className={cn(
                                'card p-5 sm:p-6',
                                !first && 'lg:col-span-3',
                            )}
                        >
                            <SectionTitle>Berita Terbaru</SectionTitle>
                            <InfiniteList
                                data="articles"
                                className={cn(
                                    'grid gap-5',
                                    !first && 'sm:grid-cols-2 lg:grid-cols-3',
                                )}
                            >
                                {list.map((a) => (
                                    <ArticleCard key={a.id} article={a} />
                                ))}
                            </InfiniteList>
                        </Reveal>
                    </>
                )}
            </Stagger>
        </PublicLayout>
    );
}

/** Heat map: one tile per kabupaten/kota, redder = more articles. */
function CityHeat({
    stats,
    province,
    currentCode,
}: {
    stats: Props['stats'];
    province: Region;
    currentCode: string | null;
}) {
    const [all, setAll] = useState(false);
    const max = Math.max(1, ...stats.cities.map((c) => c.total));
    const limit = 12;
    // Keep the viewed city visible even when the list is collapsed.
    const shown = all
        ? stats.cities
        : stats.cities.filter((c, i) => i < limit || c.code === currentCode);
    const fmt = new Intl.NumberFormat('id-ID');

    return (
        <section className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                <div>
                    <h2 className="text-lg font-semibold text-navy-900">
                        Berita per kabupaten/kota
                    </h2>
                    <p className="text-sm text-slate-500">
                        {stats.cities_with_news} dari {stats.cities.length}{' '}
                        kab/kota di {province.name} sudah punya berita ·{' '}
                        {fmt.format(stats.total)} berita
                        {currentCode &&
                            stats.rank &&
                            ` · peringkat #${stats.rank}`}
                    </p>
                </div>
                <div
                    aria-hidden
                    className="flex items-center gap-1.5 text-[11px] text-slate-400"
                >
                    sedikit
                    {[0.12, 0.3, 0.5, 0.7, 0.9].map((o) => (
                        <span
                            key={o}
                            className="size-3.5 rounded"
                            style={{ background: `rgba(165,14,30,${o})` }}
                        />
                    ))}
                    banyak
                </div>
            </div>

            <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {shown.map((c, i) => {
                    const strength = c.total / max;
                    const dark = strength > 0.45;
                    const kota = c.type === 'kota';

                    return (
                        <motion.li
                            key={c.code}
                            initial={{ opacity: 0, scale: 0.94 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                                delay: Math.min(i, 20) * 0.02,
                                duration: 0.3,
                            }}
                        >
                            <Link
                                href={regionHref({
                                    code: c.code,
                                    name: c.name,
                                    slug: c.slug,
                                    parent: province,
                                })}
                                viewTransition
                                title={`${c.name}: ${c.total} berita`}
                                style={
                                    c.total
                                        ? {
                                              background: `rgba(165,14,30,${0.1 + strength * 0.85})`,
                                          }
                                        : undefined
                                }
                                className={cn(
                                    'flex h-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 transition hover:-translate-y-0.5 hover:shadow-md',
                                    c.total
                                        ? dark
                                            ? 'text-white'
                                            : 'text-navy-900'
                                        : 'border border-dashed border-slate-200 text-slate-400',
                                    c.code === currentCode &&
                                        'ring-2 ring-accent ring-offset-2',
                                )}
                            >
                                <span className="min-w-0">
                                    <span
                                        className={cn(
                                            'block text-[10px] tracking-wide uppercase',
                                            dark
                                                ? 'text-white/70'
                                                : 'text-slate-500',
                                        )}
                                    >
                                        {kota ? 'Kota' : 'Kabupaten'}
                                    </span>
                                    <span className="block truncate text-sm leading-tight font-medium">
                                        {c.name.replace(
                                            /^(Kabupaten Administrasi|Kota Administrasi|Kabupaten|Kota)\s+/,
                                            '',
                                        )}
                                    </span>
                                </span>
                                <span className="text-xl font-semibold tabular-nums">
                                    {c.total}
                                </span>
                            </Link>
                        </motion.li>
                    );
                })}
            </ul>

            {stats.cities.length > limit && (
                <button
                    type="button"
                    onClick={() => setAll((v) => !v)}
                    className="mt-4 text-sm font-medium text-accent hover:underline"
                >
                    {all
                        ? 'Tampilkan lebih sedikit'
                        : `Tampilkan semua ${stats.cities.length} kab/kota`}
                </button>
            )}
        </section>
    );
}

function Stat({ value, label }: { value: number; label: string }) {
    return (
        <div>
            <p className="text-lg font-semibold text-navy-900">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
        </div>
    );
}

/** Theme-aware dropdown filter for regencies/cities in province page. */
function CityFilterDropdown({
    province,
    cities,
    currentSlug,
}: {
    province: Region;
    cities: Region[];
    currentSlug: string;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const root = useRef<HTMLDivElement>(null);
    const search = useRef<HTMLInputElement>(null);

    const currentCity = cities.find((c) => c.slug === currentSlug);
    const label = currentCity ? currentCity.name : `Semua ${province.name}`;

    useEffect(() => {
        if (!open) return;
        search.current?.focus();
        function close(e: MouseEvent) {
            if (!root.current?.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    function choose(slug: string) {
        setOpen(false);
        setQuery('');
        router.visit(
            regionRoute.url({
                province: province.slug,
                ...(slug && { child: slug }),
            }),
            { preserveScroll: true, viewTransition: true },
        );
    }

    const filtered = cities.filter((c) =>
        c.name.toLowerCase().includes(query.toLowerCase()),
    );

    return (
        <div ref={root} className="relative w-full sm:w-72">
            <button
                type="button"
                id="city-filter"
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-full bg-surface px-4 py-2.5 text-left text-sm text-navy-900 ring-1 ring-slate-200 transition hover:ring-merah/50 focus:ring-2 focus:ring-merah/40 focus:outline-none',
                    open && 'ring-2 ring-merah/40',
                )}
            >
                <span className="truncate font-medium">{label}</span>
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
                <div className="absolute right-0 z-30 mt-2 w-full min-w-64 rounded-2xl border border-merah/15 bg-surface p-2 shadow-xl shadow-black/10">
                    <input
                        ref={search}
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Cari kabupaten/kota…"
                        className="mb-2 w-full rounded-xl border border-slate-200 bg-surface px-3 py-2 text-sm text-navy-900 placeholder:text-slate-400 outline-none focus:border-merah focus:ring-2 focus:ring-merah/20"
                    />
                    <div
                        role="listbox"
                        className="max-h-[220px] overflow-y-auto overscroll-contain"
                    >
                        <button
                            type="button"
                            role="option"
                            aria-selected={!currentSlug}
                            onClick={() => choose('')}
                            className={cn(
                                'flex h-9 w-full items-center rounded-lg px-3 text-left text-sm text-navy-900 transition hover:bg-merah/10 hover:text-merah focus:bg-merah/10 focus:text-merah focus:outline-none',
                                !currentSlug &&
                                    'bg-merah text-white hover:bg-merah-dark hover:text-white',
                            )}
                        >
                            <span className="truncate font-semibold">Semua {province.name}</span>
                        </button>

                        {(['kabupaten', 'kota'] as const).map((type) => {
                            const group = filtered.filter((c) =>
                                type === 'kota'
                                    ? c.type === 'kota'
                                    : c.type !== 'kota',
                            );

                            return (
                                group.length > 0 && (
                                    <div key={type} className="mt-1">
                                        <p className="px-3 py-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                                            {type === 'kota' ? 'Kota' : 'Kabupaten'}
                                        </p>
                                        {group.map((c) => (
                                            <button
                                                key={c.code}
                                                type="button"
                                                role="option"
                                                aria-selected={c.slug === currentSlug}
                                                onClick={() => choose(c.slug)}
                                                className={cn(
                                                    'flex h-9 w-full items-center rounded-lg px-3 text-left text-sm text-navy-900 transition hover:bg-merah/10 hover:text-merah focus:bg-merah/10 focus:text-merah focus:outline-none',
                                                    c.slug === currentSlug &&
                                                        'bg-merah text-white hover:bg-merah-dark hover:text-white',
                                                )}
                                                title={c.name}
                                            >
                                                <span className="truncate">{c.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )
                            );
                        })}

                        {filtered.length === 0 && (
                            <p className="px-3 py-2 text-sm text-slate-400">
                                Kabupaten/kota tidak ditemukan.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
