import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import Icon from '@/components/icons';
import { Reveal, Stagger } from '@/components/motion';
import { Source } from '@/components/region-directory';
import PublicLayout from '@/layouts/public';
import { regionHref } from '@/lib/news';
import { cn } from '@/lib/utils';
import { compare } from '@/routes/data';

type Row = {
    code: string;
    name: string;
    slug: string;
    level: number;
    parent: { name: string; slug: string } | null;
    value: string;
    number: number | null;
    as_of: string | null;
    source: string | null;
};

type Props = {
    fact: { key: string; label: string; unit: string | null };
    rows: Row[];
    facts: { key: string; label: string }[];
};

/** Nationwide ranking of one verified fact (UMK, IPM, ...). Sorting and filtering happen in the browser. */
export default function DataCompare({ fact, rows, facts }: Props) {
    const [level, setLevel] = useState<'kab' | 'prov'>('kab');
    const [desc, setDesc] = useState(true);
    const [q, setQ] = useState('');

    const list = rows
        .filter((r) => (level === 'prov' ? r.level === 1 : r.level === 2))
        .filter((r) =>
            `${r.name} ${r.parent?.name ?? ''}`
                .toLowerCase()
                .includes(q.toLowerCase()),
        )
        .sort((a, b) => {
            const d = (a.number ?? -Infinity) - (b.number ?? -Infinity);
            return desc ? -d : d;
        });

    return (
        <PublicLayout tabs={false}>
            <Head title={`${fact.label} Seluruh Indonesia`} />
            <Stagger className="space-y-5">
                <Reveal className="card p-5 sm:p-7">
                    <p className="text-xs font-semibold tracking-wide text-accent uppercase">
                        Pusat Data Daerah
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold text-navy-900 md:text-3xl">
                        {fact.label} seluruh Indonesia
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {rows.length} daerah dengan data terverifikasi. Setiap
                        angka mengikuti sumber dan tahun yang dicantumkan.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {facts.map((f) => (
                            <Link
                                key={f.key}
                                href={compare.url(f.key)}
                                className={cn(
                                    'rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors',
                                    f.key === fact.key
                                        ? 'bg-accent text-white ring-accent'
                                        : 'bg-surface text-slate-600 ring-slate-200 hover:bg-accent/5 hover:text-accent hover:ring-accent/30',
                                )}
                            >
                                {f.label}
                            </Link>
                        ))}
                    </div>
                </Reveal>

                <Reveal className="flex flex-wrap items-center gap-2 card p-3">
                    <div className="flex rounded-full bg-slate-100 p-1 text-sm">
                        {(
                            [
                                ['kab', 'Kabupaten/Kota'],
                                ['prov', 'Provinsi'],
                            ] as const
                        ).map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setLevel(key)}
                                className={cn(
                                    'rounded-full px-3 py-1.5 font-medium transition-colors',
                                    level === key
                                        ? 'bg-surface text-accent shadow-sm'
                                        : 'text-slate-500 hover:text-navy-900',
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Cari daerah"
                        aria-label="Cari daerah"
                        className="input max-w-xs flex-1"
                    />
                    <button
                        type="button"
                        onClick={() => setDesc((v) => !v)}
                        className="btn-ghost ml-auto"
                    >
                        <Icon
                            name="chevron"
                            width={14}
                            height={14}
                            className={desc ? 'rotate-90' : '-rotate-90'}
                        />
                        {desc ? 'Tertinggi dulu' : 'Terendah dulu'}
                    </button>
                </Reveal>

                <Reveal className="overflow-x-auto card">
                    {list.length === 0 ? (
                        <p className="p-10 text-center text-sm text-slate-500">
                            Belum ada data {fact.label} yang terverifikasi untuk
                            pilihan ini.
                        </p>
                    ) : (
                        <table className="w-full min-w-[36rem] text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                                    <th className="w-12 px-4 py-3 font-medium">
                                        #
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Daerah
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium">
                                        {fact.label}
                                        {fact.unit && ` (${fact.unit})`}
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Sumber
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {list.map((r, i) => (
                                    <tr
                                        key={r.code}
                                        className="transition-colors hover:bg-accent/[0.03]"
                                    >
                                        <td className="px-4 py-3 text-slate-400 tabular-nums">
                                            {i + 1}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link
                                                href={regionHref({
                                                    code: r.code,
                                                    name: r.name,
                                                    slug: r.slug,
                                                    parent: r.parent
                                                        ? {
                                                              code: '',
                                                              ...r.parent,
                                                          }
                                                        : null,
                                                })}
                                                className="font-medium text-navy-900 hover:text-accent"
                                            >
                                                {r.name}
                                            </Link>
                                            {r.parent && (
                                                <span className="block text-xs text-slate-500">
                                                    {r.parent.name}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-navy-900 tabular-nums">
                                            {r.value}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Source
                                                url={r.source}
                                                asOf={r.as_of}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </Reveal>
            </Stagger>
        </PublicLayout>
    );
}
