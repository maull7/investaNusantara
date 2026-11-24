import { Head, Link, router, useForm } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import {
    type FormEvent,
    type ReactNode,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import { StatusPill, Switch } from '@/components/admin/ui';
import Icon from '@/components/icons';
import AdminLayout from '@/layouts/admin';
import { cn } from '@/lib/utils';
import {
    destroy,
    index,
    publish,
    store,
    submit,
    update,
} from '@/routes/admin/articles';
import { cities as citiesRoute } from '@/routes/region';
import type { Article, Category, Region } from '@/types';

type Props = {
    article: (Article & { region: Region | null }) | null;
    categories: Category[];
    provinces: Region[];
    can: { publish: boolean; submit: boolean; flag: boolean };
};

const FORM_ID = 'article-form';

export default function ArticleForm({
    article,
    categories,
    provinces,
    can,
}: Props) {
    const [province, setProvince] = useState(
        article?.region_code?.slice(0, 2) ?? '',
    );
    const [cities, setCities] = useState<Region[]>([]);
    const [seoOpen, setSeoOpen] = useState(
        Boolean(
            article?.seo_title ||
                article?.meta_description ||
                article?.social_post,
        ),
    );

    const form = useForm({
        title: article?.title ?? '',
        excerpt: article?.excerpt ?? '',
        body: article?.body ?? '',
        category_id: article?.category_id ?? categories[0]?.id ?? '',
        region_code: article?.region_code ?? '',
        is_headline: article?.is_headline ?? false,
        is_breaking: article?.is_breaking ?? false,
        cover: null as File | null,
        tags: article?.tags?.map((t) => t.name).join(', ') ?? '',
        seo_title: article?.seo_title ?? '',
        meta_description: article?.meta_description ?? '',
        social_post: article?.social_post ?? '',
        sentiment: article?.sentiment ?? '',
        _method: article ? 'put' : 'post',
    });

    useEffect(() => {
        if (!province) {
            setCities([]);
            return;
        }
        let live = true;
        void fetch(citiesRoute.url(province))
            .then((r) => r.json() as Promise<Region[]>)
            .then((data) => live && setCities(data));
        return () => {
            live = false;
        };
    }, [province]);

    function onSubmit(e: FormEvent) {
        e.preventDefault();
        // POST with _method spoofing so file uploads work on update.
        form.transform((d) => ({ ...d, region_code: d.region_code || null }));
        form.post(article ? update.url(article.id) : store.url(), {
            forceFormData: true,
            preserveScroll: true,
        });
    }

    const err = form.errors;
    const words = form.data.body.trim()
        ? form.data.body.trim().split(/\s+/).length
        : 0;
    const readMinutes = Math.max(1, Math.round(words / 200));
    const title = article ? 'Edit artikel' : 'Tulis artikel';

    return (
        <AdminLayout
            title={title}
            subtitle={
                article ? (
                    <StatusPill status={article.status} />
                ) : (
                    'Artikel baru disimpan sebagai draft.'
                )
            }
            actions={
                <div className="flex items-center gap-2">
                    <Link href={index.url()} className="btn-ghost">
                        <Icon name="back" width={16} height={16} />
                        Kembali
                    </Link>
                    <button
                        form={FORM_ID}
                        disabled={form.processing}
                        className="btn-primary min-w-28 shadow-sm"
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.span
                                key={
                                    form.processing
                                        ? 'saving'
                                        : form.recentlySuccessful
                                          ? 'saved'
                                          : 'idle'
                                }
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.15 }}
                                className="inline-flex items-center gap-1.5"
                            >
                                {form.processing ? (
                                    <>
                                        <svg
                                            className="size-4 animate-spin text-white"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            />
                                        </svg>
                                        Menyimpan…
                                    </>
                                ) : form.recentlySuccessful ? (
                                    <>
                                        <Icon
                                            name="check"
                                            width={16}
                                            height={16}
                                        />
                                        Tersimpan
                                    </>
                                ) : (
                                    <>
                                        <Icon
                                            name="check"
                                            width={16}
                                            height={16}
                                        />
                                        Simpan
                                    </>
                                )}
                            </motion.span>
                        </AnimatePresence>
                    </button>
                </div>
            }
        >
            <Head title={title} />
            <form
                id={FORM_ID}
                onSubmit={onSubmit}
                className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
            >
                {/* Writing area */}
                <div className="card space-y-6 p-6 sm:p-8">
                    {/* Header stats bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 text-xs text-slate-500">
                        <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                                <span>{words.toLocaleString('id-ID')}</span> kata
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                                <Icon name="clock" width={13} height={13} className="text-accent" />
                                {readMinutes} menit baca
                            </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                            Editor Berita Nusantara
                        </span>
                    </div>

                    {/* Judul Berita */}
                    <div>
                        <AutoTextarea
                            value={form.data.title}
                            onChange={(v) => form.setData('title', v)}
                            placeholder="Judul Berita yang Menarik..."
                            aria-label="Judul"
                            required
                            className="text-2xl leading-snug font-bold text-navy-900 placeholder:text-slate-300 sm:text-3xl"
                        />
                        <Error message={err.title} />
                    </div>

                    {/* Ringkasan Berita (Excerpt / Lead) */}
                    <div className="rounded-2xl border border-accent/15 bg-slate-50/60 p-4 transition focus-within:border-accent focus-within:bg-white">
                        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                            <span className="flex items-center gap-1.5 text-navy-900">
                                <Icon name="bolt" width={14} height={14} className="text-accent" />
                                Ringkasan / Lead Berita
                            </span>
                            <span
                                className={cn(
                                    'tabular-nums text-[11px]',
                                    form.data.excerpt.length > 450
                                        ? 'font-bold text-amber-600'
                                        : 'text-slate-400',
                                )}
                            >
                                {form.data.excerpt.length}/500
                            </span>
                        </div>
                        <AutoTextarea
                            value={form.data.excerpt}
                            onChange={(v) => form.setData('excerpt', v)}
                            placeholder="Tulis ringkasan 1-2 kalimat pengantar yang tampil di kartu berita dan pratinjau..."
                            aria-label="Ringkasan"
                            maxLength={500}
                            minRows={2}
                            className="text-sm leading-relaxed text-slate-700 placeholder:text-slate-400"
                        />
                        <Error message={err.excerpt} />
                    </div>

                    {/* Isi Berita */}
                    <div>
                        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                            <span className="flex items-center gap-1.5 text-navy-900">
                                <Icon name="file" width={14} height={14} className="text-accent" />
                                Isi Lengkap Artikel
                            </span>
                            <span className="text-[11px] text-slate-400">
                                Pisahkan paragraf dengan baris kosong
                            </span>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/10">
                            <AutoTextarea
                                value={form.data.body}
                                onChange={(v) => form.setData('body', v)}
                                placeholder="Mulai menulis isi berita di sini..."
                                aria-label="Isi berita"
                                required
                                minRows={16}
                                className="font-serif text-[17px] leading-8 text-slate-800 placeholder:text-slate-300"
                            />
                        </div>
                        <Error message={err.body} />
                    </div>
                </div>

                {/* Side panel */}
                <div className="space-y-5 lg:sticky lg:top-6">
                    {/* 1. Sumber AI / Asal Berita jika ada */}
                    {article?.source_url && (
                        <Panel title="Sumber Berita" icon="link">
                            <a
                                href={article.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="block text-sm font-semibold text-navy-900 hover:text-accent"
                            >
                                {article.source_name ?? article.source_url}
                            </a>
                            <p className="mt-1 truncate text-xs text-slate-400">
                                {article.source_url}
                            </p>
                        </Panel>
                    )}

                    {/* 2. Gambar Sampul */}
                    <Panel title="Gambar Sampul" icon="image">
                        <CoverInput
                            current={article?.cover_url ?? null}
                            file={form.data.cover}
                            onChange={(f) => form.setData('cover', f)}
                        />
                        <Error message={err.cover} />
                    </Panel>

                    {/* 3. Kategori Berita */}
                    <Panel title="Kategori" icon="tag" overflow>
                        <CustomSelect
                            label="Kategori"
                            placeholder="Pilih kategori..."
                            searchPlaceholder="Cari kategori..."
                            value={String(form.data.category_id)}
                            options={categories.map((c) => {
                                const icons: Record<string, string> = {
                                    nasional: '🌐',
                                    politik: '🏛️',
                                    ekonomi: '📈',
                                    hukum: '⚖️',
                                    pendidikan: '🎓',
                                    budaya: '🎭',
                                    pariwisata: '🏖️',
                                    umkm: '🛍️',
                                    olahraga: '⚽',
                                };
                                const prefix = icons[c.slug] ? `${icons[c.slug]} ` : '';
                                return {
                                    value: String(c.id),
                                    label: `${prefix}${c.name}`,
                                };
                            })}
                            onChange={(val) =>
                                form.setData('category_id', Number(val) || val)
                            }
                        />
                        <Error message={err.category_id} />
                    </Panel>

                    {/* 4. Wilayah Liputan */}
                    <Panel title="Wilayah Liputan" icon="map" overflow>
                        <div className="space-y-3">
                            <div>
                                <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
                                    <span>Provinsi</span>
                                    {province && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setProvince('');
                                                form.setData('region_code', '');
                                            }}
                                            className="text-[11px] font-normal text-slate-400 hover:text-accent"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </label>
                                <CustomSelect
                                    label="Provinsi"
                                    placeholder="🌐 Nasional (tanpa wilayah khusus)"
                                    searchPlaceholder="Cari provinsi..."
                                    value={province}
                                    options={[
                                        {
                                            value: '',
                                            label: '🌐 Nasional (tanpa wilayah khusus)',
                                        },
                                        ...provinces.map((p) => ({
                                            value: p.code,
                                            label: p.name,
                                        })),
                                    ]}
                                    onChange={(val) => {
                                        setProvince(val);
                                        form.setData('region_code', val);
                                    }}
                                />
                            </div>
                            {province && (
                                <div className="rounded-xl border border-accent/20 bg-accent/[0.02] p-3">
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                        Kabupaten / Kota
                                    </label>
                                    <CustomSelect
                                        label="Kabupaten / Kota"
                                        placeholder="📍 Seluruh wilayah provinsi"
                                        searchPlaceholder="Cari kabupaten / kota..."
                                        value={form.data.region_code}
                                        options={[
                                            {
                                                value: province,
                                                label: '📍 Seluruh wilayah provinsi',
                                            },
                                            ...cities.map((c) => ({
                                                value: c.code,
                                                label: c.name,
                                            })),
                                        ]}
                                        onChange={(val) =>
                                            form.setData('region_code', val)
                                        }
                                    />
                                </div>
                            )}
                        </div>
                        <Error message={err.region_code} />
                    </Panel>

                    {/* 5. Tag & Sentimen Media Intelligence */}
                    <Panel title="Tag & Sentimen" icon="sliders">
                        <div className="space-y-3.5">
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                    Tag / Topik Terkait
                                </label>
                                <input
                                    value={form.data.tags}
                                    onChange={(e) =>
                                        form.setData('tags', e.target.value)
                                    }
                                    placeholder="Contoh: Investasi, UMKM, APBD"
                                    aria-label="Tag, pisahkan dengan koma"
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-navy-900 shadow-2xs placeholder:text-slate-400 transition focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-none"
                                />
                                <p className="mt-1 text-[11px] text-slate-400">
                                    Pisahkan dengan koma untuk multi tag.
                                </p>
                                <Error message={err.tags} />
                            </div>

                            <div className="border-t border-slate-100 pt-3.5">
                                <label className="mb-2 block text-xs font-semibold text-slate-700">
                                    Sentimen Berita
                                </label>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {[
                                        {
                                            key: 'positif',
                                            label: 'Positif',
                                            bg: 'border-blue-500 bg-blue-50 text-blue-700 font-semibold',
                                            dot: 'bg-blue-600',
                                        },
                                        {
                                            key: 'netral',
                                            label: 'Netral',
                                            bg: 'border-slate-400 bg-slate-100 text-slate-700 font-semibold',
                                            dot: 'bg-slate-400',
                                        },
                                        {
                                            key: 'negatif',
                                            label: 'Negatif',
                                            bg: 'border-red-500 bg-red-50 text-red-700 font-semibold',
                                            dot: 'bg-red-600',
                                        },
                                    ].map((s) => {
                                        const on = form.data.sentiment === s.key;
                                        return (
                                            <button
                                                key={s.key}
                                                type="button"
                                                onClick={() =>
                                                    form.setData(
                                                        'sentiment',
                                                        on ? '' : s.key,
                                                    )
                                                }
                                                className={cn(
                                                    'inline-flex items-center justify-center gap-1.5 rounded-xl border py-2 px-2 text-xs transition-all duration-200',
                                                    on
                                                        ? s.bg + ' shadow-2xs'
                                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        'size-1.5 rounded-full',
                                                        s.dot,
                                                    )}
                                                />
                                                <span>{s.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="mt-1.5 text-[11px] text-slate-400">
                                    {form.data.sentiment
                                        ? `Sentimen terpilih: ${form.data.sentiment}. Klik ulang untuk reset.`
                                        : 'Dipakai di dashboard Media Intelligence.'}
                                </p>
                                <Error message={err.sentiment} />
                            </div>
                        </div>
                    </Panel>

                    {/* 6. Sorotan Beranda & Ticker (Hanya yang berizin flag) */}
                    {can.flag && (
                        <Panel title="Distribusi & Sorotan" icon="flame" flush>
                            <div className="divide-y divide-slate-100">
                                <Switch
                                    label="Headline Beranda"
                                    hint="Tampil di banner slider utama beranda"
                                    checked={form.data.is_headline}
                                    onChange={(v) => form.setData('is_headline', v)}
                                />
                                <Switch
                                    label="Breaking News"
                                    hint="Tampil di ticker berita terkini"
                                    checked={form.data.is_breaking}
                                    onChange={(v) => form.setData('is_breaking', v)}
                                />
                            </div>
                        </Panel>
                    )}

                    {/* 7. Optimasi SEO & Sosial (Bisa dibuka/tutup agar hemat ruang) */}
                    <div className="card overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setSeoOpen(!seoOpen)}
                            className="flex w-full items-center justify-between p-4 text-left transition hover:bg-slate-50/80"
                        >
                            <div className="flex items-center gap-2">
                                <span className="grid size-6 place-items-center rounded-lg bg-accent/10 text-accent">
                                    <Icon name="search" width={13} height={13} />
                                </span>
                                <h3 className="text-xs font-semibold tracking-wider text-navy-900 uppercase">
                                    SEO & Media Sosial
                                </h3>
                            </div>
                            <span className="text-xs text-slate-400">
                                {seoOpen ? 'Tutup' : 'Buka'}
                            </span>
                        </button>
                        <AnimatePresence initial={false}>
                            {seoOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden border-t border-slate-100 p-4 pt-3"
                                >
                                    <div className="space-y-3">
                                        <SeoField
                                            label="Judul SEO"
                                            max={70}
                                            value={form.data.seo_title}
                                            onChange={(v) =>
                                                form.setData('seo_title', v)
                                            }
                                            error={err.seo_title}
                                        />
                                        <SeoField
                                            label="Meta description"
                                            max={160}
                                            rows={2}
                                            value={form.data.meta_description}
                                            onChange={(v) =>
                                                form.setData(
                                                    'meta_description',
                                                    v,
                                                )
                                            }
                                            error={err.meta_description}
                                        />
                                        <SeoField
                                            label="Teks media sosial"
                                            max={1000}
                                            rows={3}
                                            value={form.data.social_post}
                                            onChange={(v) =>
                                                form.setData('social_post', v)
                                            }
                                            error={err.social_post}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* 8. Alur Kerja / Tindakan Redaksi */}
                    {article && (
                        <Panel title="Tindakan Redaksi" icon="sliders">
                            <div className="space-y-2">
                                {can.submit && article.status !== 'review' && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.post(submit.url(article.id))
                                        }
                                        className="btn-ghost w-full justify-center"
                                    >
                                        <Icon
                                            name="send"
                                            width={15}
                                            height={15}
                                        />
                                        Ajukan ke editor
                                    </button>
                                )}
                                {can.publish &&
                                    article.status !== 'published' && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                router.post(
                                                    publish.url(article.id),
                                                )
                                            }
                                            className="btn-success w-full justify-center"
                                        >
                                            <Icon
                                                name="check"
                                                width={15}
                                                height={15}
                                            />
                                            Terbitkan sekarang
                                        </button>
                                    )}
                                <button
                                    type="button"
                                    onClick={() =>
                                        confirm('Hapus artikel ini?') &&
                                        router.delete(destroy.url(article.id))
                                    }
                                    className="btn-danger w-full justify-center"
                                >
                                    <Icon name="trash" width={15} height={15} />
                                    Hapus artikel
                                </button>
                            </div>
                        </Panel>
                    )}
                </div>
            </form>
        </AdminLayout>
    );
}

function Panel({
    title,
    icon,
    flush = false,
    overflow = false,
    children,
}: {
    title: string;
    icon?: string;
    flush?: boolean;
    overflow?: boolean;
    children: ReactNode;
}) {
    return (
        <section
            className={cn(
                'card',
                !overflow && 'overflow-hidden',
                flush ? 'p-0' : 'p-4',
            )}
        >
            <div
                className={cn(
                    'flex items-center gap-2',
                    flush ? 'px-4 pt-3.5 pb-2' : 'mb-3',
                )}
            >
                {icon && (
                    <span className="grid size-6 place-items-center rounded-lg bg-accent/10 text-accent">
                        <Icon name={icon as any} width={13} height={13} />
                    </span>
                )}
                <h3 className="text-xs font-semibold tracking-wider text-navy-900 uppercase">
                    {title}
                </h3>
            </div>
            {children}
        </section>
    );
}

function SeoField({
    label,
    max,
    rows,
    value,
    onChange,
    error,
}: {
    label: string;
    max: number;
    rows?: number;
    value: string;
    onChange: (v: string) => void;
    error?: string;
}) {
    const Tag = rows ? 'textarea' : 'input';

    return (
        <label className="block text-xs font-medium text-slate-500">
            <span className="flex justify-between">
                {label}
                <span className="tabular-nums text-slate-400">
                    {value.length}/{max}
                </span>
            </span>
            <Tag
                value={value}
                rows={rows}
                maxLength={max}
                placeholder="Kosong = memakai bawaan artikel"
                onChange={(e) => onChange(e.target.value)}
                className="mt-1 input text-xs"
            />
            <Error message={error} />
        </label>
    );
}

function Error({ message }: { message?: string }) {
    return message ? (
        <p className="mt-1 text-xs text-red-600">{message}</p>
    ) : null;
}

/** Borderless textarea that grows with its content, like a document editor. */
function AutoTextarea({
    value,
    onChange,
    minRows = 1,
    className,
    ...props
}: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> & {
    value: string;
    onChange: (value: string) => void;
    minRows?: number;
}) {
    const ref = useRef<HTMLTextAreaElement>(null);

    // Grow to fit the text (CSS field-sizing isn't supported everywhere yet).
    useLayoutEffect(() => {
        const el = ref.current;
        if (el) {
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
        }
    }, [value]);

    return (
        <textarea
            {...props}
            ref={ref}
            value={value}
            rows={minRows}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
                'w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-slate-300',
                className,
            )}
        />
    );
}

/** Drop zone with an instant local preview of the picked image. */
function CoverInput({
    current,
    file,
    onChange,
}: {
    current: string | null;
    file: File | null;
    onChange: (file: File | null) => void;
}) {
    const [dragging, setDragging] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);

    useEffect(() => {
        if (!file) {
            setPreview(null);
            return;
        }
        const url = URL.createObjectURL(file);
        setPreview(url);

        return () => URL.revokeObjectURL(url);
    }, [file]);

    const shown = preview ?? current;

    return (
        <div className="relative">
            <label
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    const dropped = e.dataTransfer.files[0];
                    if (dropped?.type.startsWith('image/')) {
                        onChange(dropped);
                    }
                }}
                className={cn(
                    'group relative block aspect-[16/10] cursor-pointer overflow-hidden rounded-2xl ring-1 transition',
                    dragging
                        ? 'bg-accent/10 ring-2 ring-accent'
                        : 'bg-slate-50 ring-slate-200 hover:ring-accent/40',
                )}
            >
                <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => onChange(e.target.files?.[0] ?? null)}
                />
                <AnimatePresence mode="wait" initial={false}>
                    {shown ? (
                        <motion.img
                            key={shown}
                            src={shown}
                            alt=""
                            initial={{ opacity: 0, scale: 1.05 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.35 }}
                            className="size-full object-cover"
                        />
                    ) : (
                        <motion.span
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center text-xs text-slate-500"
                        >
                            <span className="grid size-9 place-items-center rounded-full bg-white text-accent shadow-sm ring-1 ring-slate-200 transition group-hover:scale-110">
                                <Icon name="upload" width={16} height={16} />
                            </span>
                            <span className="font-medium text-navy-900">
                                Tarik gambar ke sini
                            </span>
                            <span className="text-[11px] text-slate-400">
                                atau klik untuk memilih · maks 2 MB
                            </span>
                        </motion.span>
                    )}
                </AnimatePresence>
                {shown && (
                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gradient-to-t from-black/70 via-black/30 to-transparent py-2.5 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                        <Icon name="image" width={14} height={14} />
                        Ganti gambar
                    </span>
                )}
            </label>
            {file && (
                <button
                    type="button"
                    aria-label="Batalkan gambar baru"
                    title="Batalkan gambar baru"
                    onClick={(e) => {
                        e.stopPropagation();
                        onChange(null);
                    }}
                    className="absolute top-2.5 right-2.5 z-10 grid size-7 place-items-center rounded-full bg-black/60 text-white shadow-md backdrop-blur-xs transition hover:bg-red-600 hover:scale-110 active:scale-95"
                >
                    <Icon name="x" width={14} height={14} />
                </button>
            )}
        </div>
    );
}

/** Custom searchable select dropdown with branded highlight and scroll */
function CustomSelect({
    value,
    options,
    placeholder = 'Pilih salah satu...',
    searchPlaceholder = 'Cari...',
    label,
    onChange,
}: {
    value: string;
    options: { value: string; label: string }[];
    placeholder?: string;
    searchPlaceholder?: string;
    label: string;
    onChange: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find((o) => o.value === value);

    useEffect(() => {
        if (!open) {
            setQuery('');
            return;
        }
        inputRef.current?.focus();

        const handleOutside = (e: MouseEvent | KeyboardEvent) => {
            if (
                e instanceof KeyboardEvent
                    ? e.key === 'Escape'
                    : !ref.current?.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        document.addEventListener('keydown', handleOutside);

        return () => {
            document.removeEventListener('mousedown', handleOutside);
            document.removeEventListener('keydown', handleOutside);
        };
    }, [open]);

    const filtered = query.trim()
        ? options.filter((o) =>
              o.label.toLowerCase().includes(query.toLowerCase()),
          )
        : options;

    return (
        <div ref={ref} className="relative w-full">
            <button
                type="button"
                aria-label={label}
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen(!open)}
                className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-left text-xs font-medium text-navy-900 shadow-2xs transition focus:outline-none',
                    open
                        ? 'border-accent ring-2 ring-accent/15'
                        : 'border-slate-200 hover:border-accent/40',
                )}
            >
                <span className="truncate">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <Icon
                    name="chevron-down"
                    width={14}
                    height={14}
                    className={cn(
                        'shrink-0 text-slate-400 transition-transform duration-200',
                        open && 'rotate-180 text-accent',
                    )}
                />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-30 mt-1 max-h-64 w-full overflow-hidden rounded-xl border border-accent/15 bg-white shadow-xl shadow-accent/10"
                    >
                        {options.length > 8 && (
                            <div className="border-b border-slate-100 p-2">
                                <div className="relative">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={query}
                                        onChange={(e) =>
                                            setQuery(e.target.value)
                                        }
                                        placeholder={searchPlaceholder}
                                        className="w-full rounded-lg bg-slate-50 py-1.5 pr-2.5 pl-7 text-xs text-navy-900 placeholder:text-slate-400 focus:bg-white focus:ring-1 focus:ring-accent focus:outline-none"
                                    />
                                    <Icon
                                        name="search"
                                        width={12}
                                        height={12}
                                        className="absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-400"
                                    />
                                </div>
                            </div>
                        )}
                        <ul
                            role="listbox"
                            className="no-scrollbar max-h-48 overflow-y-auto p-1.5"
                        >
                            {filtered.length === 0 ? (
                                <li className="p-2.5 text-center text-xs text-slate-400">
                                    Tidak ditemukan
                                </li>
                            ) : (
                                filtered.map((o) => {
                                    const active = o.value === value;
                                    return (
                                        <li
                                            key={o.value}
                                            role="option"
                                            aria-selected={active}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onChange(o.value);
                                                    setOpen(false);
                                                }}
                                                className={cn(
                                                    'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors',
                                                    active
                                                        ? 'bg-accent font-semibold text-white'
                                                        : 'text-slate-700 hover:bg-accent/[0.06] hover:text-navy-900',
                                                )}
                                            >
                                                <span className="truncate">
                                                    {o.label}
                                                </span>
                                                {active && (
                                                    <Icon
                                                        name="check"
                                                        width={12}
                                                        height={12}
                                                        className="shrink-0 text-white"
                                                    />
                                                )}
                                            </button>
                                        </li>
                                    );
                                })
                            )}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
