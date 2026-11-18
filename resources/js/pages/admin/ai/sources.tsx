import { Head, router, useForm } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { type FormEvent, useEffect, useState } from 'react';
import { AiTabs, ProvinceFilter, TaskPill } from '@/components/admin/ai';
import { EmptyState, Field, Switch } from '@/components/admin/ui';
import Icon from '@/components/icons';
import { ease } from '@/components/motion';
import Pagination from '@/components/pagination';
import AdminLayout from '@/layouts/admin';
import { timeAgo } from '@/lib/news';
import { cn } from '@/lib/utils';
import {
    destroy,
    fetch as fetchSource,
    store,
    update,
} from '@/routes/admin/ai/sources';
import { cities as citiesRoute } from '@/routes/region';
import type { Category, Paginated, Region } from '@/types';

type Source = {
    id: number;
    name: string;
    url: string;
    feed_url: string | null;
    region_code: string | null;
    category_id: number | null;
    instruction: string | null;
    max_articles: number;
    fetch_interval_minutes: number | null;
    auto_publish: boolean;
    active: boolean;
    last_fetched_at: string | null;
    last_success_at: string | null;
    last_error: string | null;
    active_fetches: number;
    region: { code: string; name: string } | null;
    category: { id: number; name: string } | null;
};

type Props = {
    sources: Paginated<Source>;
    counts: Record<
        string,
        Partial<Record<'published' | 'review' | 'failed' | 'duplicate', number>>
    >;
    categories: Category[];
    provinces: Region[];
    province: string;
};

const intervals = [
    { value: '', label: 'Manual saja' },
    { value: '30', label: 'Tiap 30 menit' },
    { value: '60', label: 'Tiap 1 jam' },
    { value: '180', label: 'Tiap 3 jam' },
    { value: '360', label: 'Tiap 6 jam' },
    { value: '720', label: 'Tiap 12 jam' },
    { value: '1440', label: 'Sehari sekali' },
];

export default function AiSources({
    sources,
    counts,
    categories,
    provinces,
    province,
}: Props) {
    // null = closed, 'new' = create, otherwise the source being edited.
    const [editing, setEditing] = useState<Source | 'new' | null>(null);

    return (
        <AdminLayout
            title="Sumber berita"
            subtitle="Situs yang dibuka Hermes untuk mencari berita terbaru."
            actions={
                <button
                    type="button"
                    onClick={() => setEditing('new')}
                    className="btn-primary py-2 text-sm"
                >
                    <Icon name="plus" width={16} height={16} />
                    Tambah sumber
                </button>
            }
        >
            <Head title="Sumber berita" />
            <AiTabs>
                <ProvinceFilter value={province} provinces={provinces} />
            </AiTabs>

            {sources.data.length === 0 && province ? (
                <div className="card">
                    <EmptyState icon="sliders" title="Tidak ada sumber">
                        Belum ada sumber berita untuk wilayah ini.
                    </EmptyState>
                </div>
            ) : sources.data.length === 0 ? (
                <div className="card">
                    <EmptyState icon="sliders" title="Belum ada sumber berita">
                        Tambahkan situs seperti jamberita.com. Hermes akan
                        membuka situs itu, mengambil berita terbaru, lalu
                        menulis sinopsis dengan sumber yang dicantumkan.
                    </EmptyState>
                </div>
            ) : (
                <div className="grid gap-3 md:grid-cols-2">
                    {sources.data.map((s, i) => (
                        <SourceCard
                            key={s.id}
                            source={s}
                            counts={counts[s.id] ?? {}}
                            index={i}
                            onEdit={() => setEditing(s)}
                        />
                    ))}
                </div>
            )}

            <Pagination data={sources} />

            <AnimatePresence>
                {editing && (
                    <SourceForm
                        key={editing === 'new' ? 'new' : editing.id}
                        source={editing === 'new' ? null : editing}
                        categories={categories}
                        provinces={provinces}
                        onClose={() => setEditing(null)}
                    />
                )}
            </AnimatePresence>
        </AdminLayout>
    );
}

function SourceCard({
    source: s,
    counts,
    index,
    onEdit,
}: {
    source: Source;
    counts: Props['counts'][string];
    index: number;
    onEdit: () => void;
}) {
    const host = (() => {
        try {
            return new URL(s.url).host.replace(/^www\./, '');
        } catch {
            return s.url;
        }
    })();
    const interval = intervals.find(
        (o) => o.value === String(s.fetch_interval_minutes ?? ''),
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.45, ease }}
            className={cn(
                'flex flex-col card p-4 sm:p-5',
                !s.active && 'opacity-60',
            )}
        >
            <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent">
                    <Icon name="bolt" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-navy-900">
                        {s.name}
                    </p>
                    <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-xs text-slate-400 hover:text-accent"
                    >
                        {host}
                    </a>
                </div>
                {s.active_fetches > 0 && <TaskPill status="running" />}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-medium">
                <Chip>{s.region?.name ?? 'Nasional'}</Chip>
                <Chip>{s.category?.name ?? 'Kategori dipilih AI'}</Chip>
                <Chip>
                    {interval?.label ??
                        `Tiap ${s.fetch_interval_minutes} menit`}
                </Chip>
                <Chip>Maks {s.max_articles} berita</Chip>
                <Chip tone={s.feed_url ? 'green' : undefined}>
                    {s.feed_url ? 'Lewat RSS/sitemap' : 'Lewat Hermes'}
                </Chip>
                <Chip tone={s.auto_publish ? 'green' : 'violet'}>
                    {s.auto_publish ? 'Terbit otomatis' : 'Selalu review'}
                </Chip>
                {!s.active && <Chip tone="red">Nonaktif</Chip>}
            </div>

            <p className="mt-3 text-xs text-slate-500">
                {s.last_fetched_at
                    ? `Terakhir diambil ${timeAgo(s.last_fetched_at)}`
                    : 'Belum pernah diambil'}{' '}
                · {counts.published ?? 0} terbit · {counts.review ?? 0} review ·{' '}
                {counts.failed ?? 0} gagal
            </p>
            {s.last_error && (
                <p className="mt-1 text-xs text-red-600">{s.last_error}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-1.5 pt-1 sm:mt-auto">
                <button
                    type="button"
                    disabled={!s.active || s.active_fetches > 0}
                    onClick={() => router.post(fetchSource.url(s.id))}
                    className="btn-primary px-3 py-1.5 text-xs"
                >
                    <Icon name="bolt" width={14} height={14} />
                    Ambil sekarang
                </button>
                <button
                    type="button"
                    onClick={onEdit}
                    className="btn-ghost px-3 py-1.5 text-xs"
                >
                    <Icon name="edit" width={14} height={14} />
                    Ubah
                </button>
                <button
                    type="button"
                    aria-label={`Hapus ${s.name}`}
                    onClick={() =>
                        confirm(
                            `Hapus sumber ${s.name}? Artikel yang sudah dibuat tetap ada.`,
                        ) &&
                        router.delete(destroy.url(s.id), {
                            preserveScroll: true,
                        })
                    }
                    className="btn-danger ml-auto px-2.5 py-1.5 text-xs"
                >
                    <Icon name="trash" width={14} height={14} />
                </button>
            </div>
        </motion.div>
    );
}

function Chip({
    children,
    tone,
}: {
    children: React.ReactNode;
    tone?: 'green' | 'violet' | 'red';
}) {
    return (
        <span
            className={cn(
                'rounded-full px-2 py-0.5 ring-1',
                tone === 'green' &&
                    'bg-emerald-50 text-emerald-700 ring-emerald-200',
                tone === 'violet' &&
                    'bg-violet-50 text-violet-700 ring-violet-200',
                tone === 'red' && 'bg-red-50 text-red-700 ring-red-200',
                !tone && 'bg-slate-50 text-slate-600 ring-slate-200',
            )}
        >
            {children}
        </span>
    );
}

function SourceForm({
    source,
    categories,
    provinces,
    onClose,
}: {
    source: Source | null;
    categories: Category[];
    provinces: Region[];
    onClose: () => void;
}) {
    const form = useForm({
        name: source?.name ?? '',
        url: source?.url ?? 'https://',
        feed_url: source?.feed_url ?? '',
        region_code: source?.region_code ?? '',
        category_id: source?.category_id ? String(source.category_id) : '',
        instruction: source?.instruction ?? '',
        max_articles: source?.max_articles ?? 5,
        fetch_interval_minutes: source?.fetch_interval_minutes
            ? String(source.fetch_interval_minutes)
            : '',
        auto_publish: source?.auto_publish ?? true,
        active: source?.active ?? true,
    });
    const [province, setProvince] = useState(
        source?.region_code?.slice(0, 2) ?? '',
    );
    const [cities, setCities] = useState<Region[]>([]);

    useEffect(() => {
        if (!province) {
            return;
        }
        let cancelled = false;
        void fetch(citiesRoute.url(province))
            .then((r) => r.json())
            .then((rows: Region[]) => !cancelled && setCities(rows));

        return () => {
            cancelled = true;
        };
    }, [province]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    function submit(e: FormEvent) {
        e.preventDefault();
        form.transform((d) => ({
            ...d,
            region_code: d.region_code || null,
            category_id: d.category_id || null,
            fetch_interval_minutes: d.fetch_interval_minutes || null,
            instruction: d.instruction || null,
            feed_url: d.feed_url || null,
        }));
        const options = { preserveScroll: true, onSuccess: onClose };
        if (source) {
            form.put(update.url(source.id), options);
        } else {
            form.post(store.url(), options);
        }
    }

    const err = form.errors;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/30 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={onClose}
        >
            <motion.form
                onSubmit={submit}
                onClick={(e) => e.stopPropagation()}
                initial={{ y: 40, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 40, opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.35, ease }}
                className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-2xl sm:rounded-[28px] sm:p-6"
            >
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-navy-900">
                        {source ? `Ubah ${source.name}` : 'Sumber berita baru'}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Tutup"
                        className="grid size-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100"
                    >
                        <Icon name="x" width={18} height={18} />
                    </button>
                </div>

                <div className="space-y-4">
                    <Field label="Nama" error={err.name}>
                        <input
                            value={form.data.name}
                            onChange={(e) =>
                                form.setData('name', e.target.value)
                            }
                            placeholder="Jambi Berita"
                            required
                            className="input"
                        />
                    </Field>
                    <Field
                        label="Alamat situs"
                        hint="halaman daftar berita terbaru"
                        error={err.url}
                    >
                        <input
                            type="url"
                            value={form.data.url}
                            onChange={(e) =>
                                form.setData('url', e.target.value)
                            }
                            placeholder="https://jamberita.com"
                            required
                            className="input"
                        />
                    </Field>
                    <Field
                        label="Alamat RSS / sitemap"
                        hint="opsional, dicari otomatis"
                        error={err.feed_url}
                    >
                        <input
                            type="url"
                            value={form.data.feed_url}
                            onChange={(e) =>
                                form.setData('feed_url', e.target.value)
                            }
                            placeholder="https://situs.com/rss"
                            className="input"
                        />
                    </Field>

                    <Field
                        label="Wilayah"
                        hint="Hermes bisa mempersempit ke kab/kota"
                        error={err.region_code}
                    >
                        <div className="grid gap-2 sm:grid-cols-2">
                            <select
                                value={province}
                                onChange={(e) => {
                                    setProvince(e.target.value);
                                    setCities([]);
                                    form.setData('region_code', e.target.value);
                                }}
                                aria-label="Provinsi"
                                className="input"
                            >
                                <option value="">Nasional</option>
                                {provinces.map((p) => (
                                    <option key={p.code} value={p.code}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={form.data.region_code}
                                onChange={(e) =>
                                    form.setData('region_code', e.target.value)
                                }
                                disabled={!province}
                                aria-label="Kabupaten/kota"
                                className="input"
                            >
                                <option value={province}>
                                    Seluruh provinsi
                                </option>
                                {cities.map((c) => (
                                    <option key={c.code} value={c.code}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Kategori" error={err.category_id}>
                            <select
                                value={form.data.category_id}
                                onChange={(e) =>
                                    form.setData('category_id', e.target.value)
                                }
                                className="input"
                            >
                                <option value="">Dipilih AI</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field
                            label="Jadwal"
                            error={err.fetch_interval_minutes}
                        >
                            <select
                                value={form.data.fetch_interval_minutes}
                                onChange={(e) =>
                                    form.setData(
                                        'fetch_interval_minutes',
                                        e.target.value,
                                    )
                                }
                                className="input"
                            >
                                {intervals.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    </div>

                    <Field
                        label="Berita per pengambilan"
                        hint={`${form.data.max_articles} berita`}
                        error={err.max_articles}
                    >
                        <input
                            type="range"
                            min={1}
                            max={20}
                            value={form.data.max_articles}
                            onChange={(e) =>
                                form.setData(
                                    'max_articles',
                                    Number(e.target.value),
                                )
                            }
                            className="w-full accent-[var(--color-accent)]"
                        />
                    </Field>

                    <Field
                        label="Instruksi khusus"
                        hint="opsional"
                        error={err.instruction}
                    >
                        <textarea
                            value={form.data.instruction}
                            onChange={(e) =>
                                form.setData('instruction', e.target.value)
                            }
                            rows={2}
                            placeholder="Misal: ambil hanya rubrik Daerah dan Ekonomi."
                            className="input resize-none"
                        />
                    </Field>

                    <div className="-mx-3 space-y-1">
                        <Switch
                            checked={form.data.auto_publish}
                            onChange={(v) => form.setData('auto_publish', v)}
                            label="Terbit otomatis"
                            hint="Sinopsis yang lolos pemeriksaan langsung terbit. Yang meragukan tetap masuk review."
                        />
                        <Switch
                            checked={form.data.active}
                            onChange={(v) => form.setData('active', v)}
                            label="Aktif"
                            hint="Sumber nonaktif tidak diambil, termasuk oleh jadwal."
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-ghost py-2"
                    >
                        Batal
                    </button>
                    <button
                        disabled={form.processing}
                        className="btn-primary py-2"
                    >
                        <Icon name="check" width={16} height={16} />
                        Simpan
                    </button>
                </div>
            </motion.form>
        </motion.div>
    );
}
