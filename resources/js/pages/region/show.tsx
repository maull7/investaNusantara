import { Head, Link, router } from '@inertiajs/react';
import { motion } from 'motion/react';
import { useState } from 'react';
import ArticleCard from '@/components/article-card';
import Icon from '@/components/icons';
import { Reveal, Stagger } from '@/components/motion';
import InfiniteList from '@/components/infinite-list';
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

type Props = {
    province: Region;
    region: Region;
    cities: Region[];
    articles: Paginated<Card>;
    directory: {
        profile: RegionProfile | null;
        factFields: FactField[];
        entries: DirectoryEntry[];
        types: Record<DirectoryEntry['type'], string>;
        topics: Topic[];
    };
};

export default function RegionShow({
    province,
    region,
    cities,
    articles,
    directory,
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
                {/* Channel header */}
                <Reveal className="overflow-hidden card">
                    <div className="relative h-36 bg-merah-dark md:h-52">
                        {province.image_url && (
                            <motion.img
                                src={province.image_url}
                                alt=""
                                initial={{ scale: 1.15 }}
                                animate={{ scale: 1 }}
                                transition={{
                                    duration: 1.2,
                                    ease: [0.22, 1, 0.36, 1],
                                }}
                                className="h-full w-full object-cover"
                            />
                        )}
                        <span className="absolute inset-0 bg-gradient-to-t from-merah-dark/55 via-merah/10 to-transparent" />
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

                {/* Kab/kota filter */}
                <Reveal className="flex flex-col gap-2 card p-4 sm:flex-row sm:items-center">
                    <label
                        htmlFor="city-filter"
                        className="text-sm font-medium text-navy-900"
                    >
                        Filter kabupaten/kota
                    </label>
                    <select
                        id="city-filter"
                        value={isCity ? region.slug : ''}
                        onChange={(e) =>
                            router.visit(
                                regionRoute.url({
                                    province: province.slug,
                                    ...(e.target.value && {
                                        child: e.target.value,
                                    }),
                                }),
                                { preserveScroll: true, viewTransition: true },
                            )
                        }
                        className="input sm:ml-auto sm:w-72"
                    >
                        <option value="">Semua {province.name}</option>
                        {(['kabupaten', 'kota'] as const).map((type) => {
                            const group = cities.filter((c) =>
                                type === 'kota'
                                    ? c.type === 'kota'
                                    : c.type !== 'kota',
                            );

                            return (
                                group.length > 0 && (
                                    <optgroup
                                        key={type}
                                        label={
                                            type === 'kota'
                                                ? 'Kota'
                                                : 'Kabupaten'
                                        }
                                    >
                                        {group.map((c) => (
                                            <option key={c.code} value={c.slug}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                )
                            );
                        })}
                    </select>
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
                    <div className="grid gap-6 lg:grid-cols-3">
                        {first && (
                            <Reveal className="lg:col-span-2">
                                <ArticleCard article={first} variant="hero" />
                            </Reveal>
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
                    </div>
                )}
            </Stagger>
        </PublicLayout>
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
