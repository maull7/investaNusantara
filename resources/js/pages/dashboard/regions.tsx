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
    'flex shrink-0 items-center gap-2 rounded-full py-1 text-sm font-medium whitespace-nowrap ring-1 transition';
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
    const scope = active
        ? 'wilayah ini'
        : `${regions.length} wilayah yang Anda ikuti`;

    return (
        <PublicLayout tabs={false}>
            <Head title="Berita Wilayah Saya" />
            <Stagger className="space-y-4 sm:space-y-6">
                <AccountTabs />
                <Reveal>
                    <h1 className="flex items-center gap-2 text-xl font-semibold text-navy-900 sm:text-2xl">
                        <Icon name="map" className="text-accent" />
                        Berita Wilayah Saya
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {regions.length === 0
                            ? 'Ikuti provinsi atau kabupaten/kota untuk melihat beritanya di sini.'
                            : `${articles.total} berita dari ${scope}.`}
                    </p>
                </Reveal>

                {regions.length === 0 ? (
                    <Reveal className="card p-10 text-center">
                        <p className="text-slate-500">
                            Belum ada wilayah yang diikuti.
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
                        <Reveal className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
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
