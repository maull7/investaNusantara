import { Head, Link } from '@inertiajs/react';
import AccountTabs from '@/components/account-tabs';
import ArticleCard from '@/components/article-card';
import Icon from '@/components/icons';
import { Reveal, Stagger } from '@/components/motion';
import InfiniteList from '@/components/infinite-list';
import PublicLayout from '@/layouts/public';
import { home } from '@/routes';
import type { ArticleCard as Card, Paginated } from '@/types';

export default function Bookmarks({ articles }: { articles: Paginated<Card> }) {
    return (
        <PublicLayout tabs={false}>
            <Head title="Berita Tersimpan" />
            <Stagger className="space-y-4 sm:space-y-6">
                <AccountTabs />
                {articles.data.length > 0 && (
                    <Reveal className="card flex items-center gap-3 p-4 sm:p-5">
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent/5 text-accent">
                            <Icon
                                name="bookmark"
                                width={20}
                                height={20}
                                fill="currentColor"
                            />
                        </span>
                        <div className="min-w-0 flex-1">
                            <h1 className="truncate text-lg font-semibold text-navy-900 sm:text-xl">
                                Berita Tersimpan
                            </h1>
                            <p className="truncate text-sm text-slate-500">
                                {articles.total} berita untuk dibaca nanti
                            </p>
                        </div>
                        <Link
                            href={home.url()}
                            className="btn-ghost shrink-0"
                            aria-label="Jelajahi berita"
                        >
                            <Icon name="search" width={16} height={16} />
                            <span className="hidden sm:inline">
                                Jelajahi berita
                            </span>
                        </Link>
                    </Reveal>
                )}
                {articles.data.length === 0 ? (
                    <Reveal className="card p-10 text-center">
                        <Icon
                            name="bookmark"
                            width={28}
                            height={28}
                            className="mx-auto text-slate-300"
                        />
                        <h1 className="mt-3 text-lg font-semibold text-navy-900">
                            Berita Tersimpan
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Simpan berita dengan ikon penanda di halaman
                            artikel untuk dibaca nanti.
                        </p>
                        <Link
                            href={home.url()}
                            className="btn-primary mt-4 inline-flex px-5 py-2.5"
                        >
                            Jelajahi berita
                        </Link>
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
            </Stagger>
        </PublicLayout>
    );
}
