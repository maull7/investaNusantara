import { Head, Link } from '@inertiajs/react';
import ArticleCard from '@/components/article-card';
import Icon from '@/components/icons';
import { Reveal, Stagger } from '@/components/motion';
import {
    EntryList,
    FactCards,
    TopicLinks,
} from '@/components/region-directory';
import PublicLayout, { SectionTitle } from '@/layouts/public';
import { regionHref } from '@/lib/news';
import { compare } from '@/routes/data';
import type {
    ArticleCard as Card,
    DirectoryEntry,
    FactField,
    Region,
    Topic,
} from '@/types';

type Props = {
    topic: Topic;
    province: Region;
    region: Region;
    facts: (FactField & {
        value: string;
        source: string | null;
        as_of: string | null;
    })[];
    entries: DirectoryEntry[];
    types: Record<string, string>;
    articles: Card[];
    topics: Topic[];
    comparable: string[];
};

/** "Investasi Kabupaten Bekasi": verified facts, listed places, and related news. */
export default function RegionTopic({
    topic,
    province,
    region,
    facts,
    entries,
    types,
    articles,
    topics,
    comparable,
}: Props) {
    const isCity = region.code !== province.code;
    const regionLink = regionHref(
        isCity ? { ...region, parent: province } : province,
    );
    const empty = facts.length === 0 && entries.length === 0;
    // Only facts this region has; the rest would link to a ranking it is not in.
    const ranked = facts.filter((f) => comparable.includes(f.key));

    return (
        <PublicLayout tabs={false}>
            <Head title={`${topic.label} ${region.name}`} />
            <Stagger className="space-y-6">
                <Reveal className="card p-5 sm:p-7">
                    <nav className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
                        <Link
                            href={regionHref(province)}
                            className="hover:text-accent"
                        >
                            {province.name}
                        </Link>
                        {isCity && (
                            <>
                                <Icon name="chevron" width={12} height={12} />
                                <Link
                                    href={regionLink}
                                    className="hover:text-accent"
                                >
                                    {region.name}
                                </Link>
                            </>
                        )}
                        <Icon name="chevron" width={12} height={12} />
                        <span className="text-accent">{topic.label}</span>
                    </nav>
                    <h1 className="mt-2 text-2xl font-semibold text-navy-900 md:text-3xl">
                        {topic.label} {region.name}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Data dan informasi {topic.label.toLowerCase()}{' '}
                        {region.name}, diverifikasi redaksi dengan sumber resmi.
                    </p>
                    <div className="mt-4">
                        <TopicLinks
                            topics={topics}
                            province={province}
                            region={region}
                            active={topic.key}
                        />
                    </div>
                </Reveal>

                {empty && (
                    <Reveal className="card p-10 text-center text-sm text-slate-500">
                        Data {topic.label.toLowerCase()} {region.name} sedang
                        disusun redaksi.{' '}
                        <Link
                            href={regionLink}
                            className="font-semibold text-accent hover:underline"
                        >
                            Lihat berita {region.name} →
                        </Link>
                    </Reveal>
                )}

                {facts.length > 0 && (
                    <section>
                        <SectionTitle>Angka utama</SectionTitle>
                        <FactCards facts={facts} />
                        {ranked.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                {ranked.map((f) => (
                                    <Link
                                        key={f.key}
                                        href={compare.url(f.key)}
                                        className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                                    >
                                        Bandingkan {f.label} se-Indonesia
                                        <Icon
                                            name="chevron"
                                            width={12}
                                            height={12}
                                        />
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {Object.entries(types).map(([type, label]) => {
                    const list = entries.filter((e) => e.type === type);

                    return (
                        list.length > 0 && (
                            <section key={type}>
                                <SectionTitle>{label}</SectionTitle>
                                <EntryList entries={list} />
                            </section>
                        )
                    );
                })}

                {articles.length > 0 && (
                    <Reveal className="card p-5 sm:p-6">
                        <SectionTitle href={regionLink}>
                            {`Berita ${region.name}`}
                        </SectionTitle>
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {articles.map((a) => (
                                <ArticleCard key={a.id} article={a} />
                            ))}
                        </div>
                    </Reveal>
                )}
            </Stagger>
        </PublicLayout>
    );
}
