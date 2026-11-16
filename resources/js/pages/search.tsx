import { Form, Head } from '@inertiajs/react';
import ArticleCard from '@/components/article-card';
import Icon from '@/components/icons';
import { Reveal, Stagger } from '@/components/motion';
import Pagination from '@/components/pagination';
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
            <Stagger className="space-y-6">
                <Reveal>
                    <Form
                        action={search.url()}
                        method="get"
                        className="flex items-center gap-3 rounded-full bg-white px-5 py-3 shadow-sm ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-accent/40"
                    >
                        <Icon name="search" className="text-slate-400" />
                        <input
                            name="q"
                            type="search"
                            defaultValue={q}
                            autoFocus={!q}
                            placeholder="Cari berita, daerah, topik…"
                            aria-label="Cari berita"
                            className="flex-1 bg-transparent outline-none"
                        />
                        <button className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white">
                            Cari
                        </button>
                    </Form>
                </Reveal>
                {q && (
                    <Reveal>
                        <h1 className="text-lg font-semibold text-navy-900">
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
                    <div className="grid gap-5 md:grid-cols-2">
                        {articles.data.map((a) => (
                            <Reveal key={a.id} className="card p-3">
                                <ArticleCard article={a} />
                            </Reveal>
                        ))}
                    </div>
                )}
            </Stagger>
            {articles && <Pagination data={articles} />}
        </PublicLayout>
    );
}
