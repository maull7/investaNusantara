import { Head, Link } from '@inertiajs/react';
import { Reveal, Stagger } from '@/components/motion';
import PublicLayout from '@/layouts/public';
import { INFO_LINKS } from '@/lib/info-links';
import { formatDate } from '@/lib/news';
import { cn } from '@/lib/utils';
import { info } from '@/routes';

type Section = { heading: string; body: string[] };

/** Footer pages (Tentang, Redaksi, …). Content comes from App\Support\InfoPages. */
export default function Info({
    slug,
    title,
    updated,
    sections,
}: {
    slug: string;
    title: string;
    updated: string;
    sections: Section[];
}) {
    return (
        <PublicLayout tabs={false}>
            <Head title={title} />
            <div className="grid gap-6 md:grid-cols-[13rem_1fr] md:gap-10">
                <nav
                    aria-label="Informasi"
                    className="-mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-col md:px-0"
                >
                    {INFO_LINKS.map((l) => (
                        <Link
                            key={l.slug}
                            href={info.url(l.slug)}
                            className={cn(
                                'shrink-0 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition md:rounded-xl',
                                l.slug === slug
                                    ? 'bg-accent text-white'
                                    : 'bg-surface text-slate-600 ring-1 ring-slate-200 hover:text-accent md:ring-0',
                            )}
                        >
                            {l.label}
                        </Link>
                    ))}
                </nav>

                <Stagger className="min-w-0 card p-5 sm:p-8">
                    <Reveal>
                        <h1 className="text-2xl font-semibold text-navy-900 sm:text-3xl">
                            {title}
                        </h1>
                        <p className="mt-1 text-xs text-slate-400">
                            Diperbarui {formatDate(updated)}
                        </p>
                    </Reveal>
                    {sections.map((s) => (
                        <Reveal key={s.heading} className="mt-7">
                            <h2 className="text-lg font-semibold text-navy-900">
                                {s.heading}
                            </h2>
                            <Body lines={s.body} />
                        </Reveal>
                    ))}
                </Stagger>
            </div>
        </PublicLayout>
    );
}

/** Paragraphs, with runs of "- " lines grouped into one list. */
function Body({ lines }: { lines: string[] }) {
    const blocks: (string | string[])[] = [];
    for (const line of lines) {
        const last = blocks.at(-1);
        if (line.startsWith('- ')) {
            if (Array.isArray(last)) {
                last.push(line.slice(2));
            } else {
                blocks.push([line.slice(2)]);
            }
        } else {
            blocks.push(line);
        }
    }

    return (
        <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-slate-600">
            {blocks.map((b, i) =>
                Array.isArray(b) ? (
                    <ul key={i} className="list-disc space-y-1.5 pl-5">
                        {b.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                ) : (
                    <p key={i}>{b}</p>
                ),
            )}
        </div>
    );
}
