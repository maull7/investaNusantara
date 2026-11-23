import { Head, Link } from '@inertiajs/react';
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
                <Reveal>
                    <h1 className="flex items-center gap-2 text-xl font-semibold text-navy-900 sm:text-2xl">
                        <Icon
                            name="bookmark"
                            className="text-accent"
                            fill="currentColor"
                        />
                        Berita Tersimpan
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {articles.total > 0
                            ? `${articles.total} berita untuk dibaca nanti.`
                            : 'Simpan berita dengan ikon penanda di halaman artikel.'}
                    </p>
                </Reveal>
                {articles.data.length === 0 ? (
                    <Reveal className="card p-10 text-center">
                        <p className="text-slate-500">
                            Belum ada berita yang disimpan.
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
