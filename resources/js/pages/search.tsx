import { Form, Head } from '@inertiajs/react';
import ArticleCard from '@/components/article-card';
import Icon from '@/components/icons';
import { Reveal, Stagger } from '@/components/motion';
import InfiniteList from '@/components/infinite-list';
import PublicLayout from '@/layouts/public';
import { search } from '@/routes';
import type { ArticleCard as Card, Paginated } from '@/types';

export default function Search({
    q,
    articles,
}: {
    q: string;
    articles: Paginated<Card> | null;
}) {
    return (
        <PublicLayout tabs={false}>
            <Head title={q ? `Cari: ${q}` : 'Cari'} />
            <Stagger className="space-y-4 sm:space-y-6">
                <Reveal>
                    <Form
                        action={search.url()}
                        method="get"
                        className="flex items-center gap-2 rounded-full bg-surface py-2 pr-2 pl-4 shadow-sm ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-accent/40 sm:gap-3 sm:py-3 sm:pr-3 sm:pl-5"
                    >
                        <Icon name="search" className="shrink-0 text-slate-400" />
                        <input
                            name="q"
                            type="search"
                            defaultValue={q}
                            autoFocus={!q}
                            placeholder="Cari berita, daerah, topik…"
                            aria-label="Cari berita"
                            className="min-w-0 flex-1 bg-transparent text-base outline-none"
                        />
                        <button className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white sm:py-1.5">
                            Cari
                        </button>
                    </Form>
                </Reveal>
                {q && (
                    <Reveal>
                        <h1 className="text-base font-semibold [overflow-wrap:anywhere] text-navy-900 sm:text-lg">
                            {articles?.total ?? 0} hasil untuk “{q}”
                        </h1>
                    </Reveal>
                )}
                {articles && articles.data.length === 0 && (
                    <Reveal className="card p-10 text-center text-slate-500">
                        Tidak ada berita yang cocok.
                    </Reveal>
                )}
                {articles && (
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
