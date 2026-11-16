import { Head, Link } from '@inertiajs/react';
import { motion } from 'motion/react';
import ArticleCard from '@/components/article-card';
import Icon from '@/components/icons';
import { Reveal, Stagger } from '@/components/motion';
import Pagination from '@/components/pagination';
import PublicLayout, { SectionTitle } from '@/layouts/public';
import RegionAvatar from '@/components/region-avatar';
import { cn } from '@/lib/utils';
import { region as regionRoute, regions } from '@/routes';
import type { ArticleCard as Card, Paginated, Region } from '@/types';

type Props = {
    province: Region;
    region: Region;
    cities: Region[];
    articles: Paginated<Card>;
};

export default function RegionShow({
    province,
    region,
    cities,
    articles,
}: Props) {
    const isCity = region.code !== province.code;
    const [first, ...rest] = articles.current_page === 1 ? articles.data : [];
    const list = articles.current_page === 1 ? rest : articles.data;
    const label = isCity
        ? region.type === 'kota'
            ? 'Kota'
            : 'Kabupaten'
        : 'Provinsi';

    return (
        <PublicLayout tabs={false}>
            <Head title={`Berita ${region.name}`}>
                <meta
                    name="description"
                    content={`Berita terbaru dari ${region.name}${isCity ? `, ${province.name}` : ''}.`}
                />
            </Head>

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
                            className="absolute top-4 left-4 grid size-9 place-items-center rounded-full bg-white/90 text-navy-900 backdrop-blur"
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
                            className="relative z-10 -mt-10 block size-20 overflow-hidden rounded-full border-4 border-white shadow-lg ring-2 ring-accent/25 md:-mt-12 md:size-24"
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
                    </div>
                </Reveal>

                {/* City chips */}
                <Reveal>
                    <div className="-mx-4 no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1">
                        <Chip
                            href={regionRoute.url({ province: province.slug })}
                            active={!isCity}
                        >
                            Semua {province.name}
                        </Chip>
                        {cities.map((c) => (
                            <Chip
                                key={c.code}
                                href={regionRoute.url({
                                    province: province.slug,
                                    child: c.slug,
                                })}
                                active={c.code === region.code}
                            >
                                {c.name}
                            </Chip>
                        ))}
                    </div>
                </Reveal>

                {articles.total === 0 ? (
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
                            <div
                                className={cn(
                                    'grid gap-5',
                                    !first && 'sm:grid-cols-2 lg:grid-cols-3',
                                )}
                            >
                                {list.map((a) => (
                                    <ArticleCard key={a.id} article={a} />
                                ))}
                            </div>
                        </Reveal>
                    </div>
                )}
            </Stagger>
            <Pagination data={articles} />
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

function Chip({
    href,
    active,
    children,
}: {
    href: string;
    active: boolean;
    children: React.ReactNode;
}) {
    return (
        <Link
            href={href}
            viewTransition
            preserveScroll
            className={cn(
                'relative shrink-0 rounded-full px-4 py-2 text-sm whitespace-nowrap ring-1 transition',
                active
                    ? 'text-white ring-accent'
                    : 'bg-white text-slate-600 ring-slate-200 hover:text-accent',
            )}
        >
            {active && (
                <motion.span
                    layoutId="city-chip"
                    className="absolute inset-0 rounded-full bg-accent"
                />
            )}
            <span className="relative">{children}</span>
        </Link>
    );
}
