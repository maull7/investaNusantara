import { Head } from '@inertiajs/react';
import ArticleCard from '@/components/article-card';
import { Reveal, Stagger } from '@/components/motion';
import InfiniteList from '@/components/infinite-list';
import PublicLayout from '@/layouts/public';
import type { ArticleCard as Card, Category, Paginated } from '@/types';

export default function CategoryShow({
    category,
    articles,
}: {
    category: Category;
    articles: Paginated<Card>;
}) {
    const [first, ...rest] = articles.data;

    return (
        <PublicLayout>
            <Head title={category.name} />
            <Stagger className="space-y-6">
                <Reveal>
                    <h1 className="text-2xl font-semibold text-navy-900">
                        {category.name}
                    </h1>
                    <p className="text-sm text-slate-500">
                        {articles.total} berita
                    </p>
                </Reveal>
                {first && (
                    <Reveal>
                        <ArticleCard article={first} variant="hero" />
                    </Reveal>
                )}
                <InfiniteList
                    data="articles"
                    className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3"
                >
                    {rest.map((a) => (
                        <Reveal key={a.id}>
                            <ArticleCard article={a} variant="feature" />
                        </Reveal>
                    ))}
                </InfiniteList>
            </Stagger>
        </PublicLayout>
    );
}
