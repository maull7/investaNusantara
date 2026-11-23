import { Head, Link } from '@inertiajs/react';
import AccountTabs from '@/components/account-tabs';
import ArticleCard from '@/components/article-card';
import Icon from '@/components/icons';
import InfiniteList from '@/components/infinite-list';
import { Reveal, Stagger } from '@/components/motion';
import RegionAvatar from '@/components/region-avatar';
import PublicLayout from '@/layouts/public';
import { cn } from '@/lib/utils';
import { regions as regionsRoute } from '@/routes';
import { regions as feedRoute } from '@/routes/dashboard';
import type { ArticleCard as Card, Paginated, Region } from '@/types';

const chip =
    'flex shrink-0 snap-start items-center gap-2 rounded-full py-1 text-sm font-medium whitespace-nowrap ring-1 transition';
const tone = (on: boolean) =>
    on
        ? 'bg-accent text-white ring-accent'
        : 'bg-surface text-navy-900 ring-slate-200 hover:text-accent hover:ring-accent/30';

export default function DashboardRegions({
    regions,
    active,
    articles,
}: {
    regions: Region[];
    active: string | null;
    articles: Paginated<Card>;
}) {
    const current = regions.find((r) => r.code === active);

    return (
        <PublicLayout tabs={false}>
            <Head title="Berita Wilayah Saya" />
            <Stagger className="space-y-4 sm:space-y-6">
                <AccountTabs />
                {regions.length === 0 ? (
                    <Reveal className="card p-10 text-center">
                        <Icon
                            name="map"
                            width={28}
                            height={28}
                            className="mx-auto text-slate-300"
                        />
                        <h1 className="mt-3 text-lg font-semibold text-navy-900">
                            Berita Wilayah Saya
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Ikuti provinsi atau kabupaten/kota untuk melihat
                            beritanya di sini.
                        </p>
                        <Link
                            href={regionsRoute.url()}
                            className="btn-primary mt-4 inline-flex px-5 py-2.5"
                        >
                            Pilih wilayah
                        </Link>
                    </Reveal>
                ) : (
                    <>
                        <Reveal className="card overflow-hidden">
                            <div className="flex items-center gap-3 p-4 sm:p-5">
                                {current ? (
                                    <RegionAvatar
                                        region={current}
                                        className="size-11 shrink-0"
                                    />
                                ) : (
                                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent/5 text-accent">
                                        <Icon name="map" width={20} height={20} />
                                    </span>
                                )}
                                <div className="min-w-0 flex-1">
                                    <h1 className="truncate text-lg font-semibold text-navy-900 sm:text-xl">
                                        {current
                                            ? `Berita ${current.name}`
                                            : 'Berita Wilayah Saya'}
                                    </h1>
                                    <p className="truncate text-sm text-slate-500">
                                        {articles.total} berita
                                        {current
                                            ? current.parent
                                                ? ` · ${current.parent.name}`
                                                : ' · termasuk kab/kota'
                                            : ` dari ${regions.length} wilayah`}
                                    </p>
                                </div>
                                <Link
                                    href={regionsRoute.url()}
                                    className="btn-ghost shrink-0"
                                    aria-label="Tambah wilayah"
                                >
                                    <Icon name="plus" width={16} height={16} />
                                    <span className="hidden sm:inline">
                                        Tambah wilayah
                                    </span>
                                </Link>
                            </div>
                            <div className="flex snap-x gap-2 overflow-x-auto border-t border-slate-100 px-4 py-3 sm:px-5">
                                <Link
                                    href={feedRoute.url()}
                                    preserveScroll
                                    className={cn(chip, 'px-3.5', tone(!active))}
                                >
                                    Semua
                                </Link>
                                {regions.map((r) => (
                                    <Link
                                        key={r.code}
                                        href={feedRoute.url({
                                            query: { wilayah: r.code },
                                        })}
                                        preserveScroll
                                        className={cn(
                                            chip,
                                            'pr-3.5 pl-1',
                                            tone(active === r.code),
                                        )}
                                    >
                                        <RegionAvatar
                                            region={r}
                                            className="size-6"
                                        />
                                        {r.name}
                                    </Link>
                                ))}
                            </div>
                        </Reveal>

                        {articles.data.length === 0 ? (
                            <Reveal className="card p-10 text-center text-slate-500">
                                Belum ada berita dari wilayah ini.
                            </Reveal>
                        ) : (
                            <InfiniteList
                                data="articles"
                                className="grid gap-3 sm:gap-5 md:grid-cols-2 [&>*]:min-w-0"
                            >
                                {articles.data.map((a) => (
                                    <Reveal key={a.id} className="card p-3">
                                        <ArticleCard article={a} />
                                    </Reveal>
                                ))}
                            </InfiniteList>
                        )}
                    </>
                )}
            </Stagger>
        </PublicLayout>
    );
}
