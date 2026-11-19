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
                <>
                    <Link href={index.url()} className="btn-ghost">
                        <Icon name="back" width={16} height={16} />
                        Kembali
                    </Link>
                    <button
                        form={FORM_ID}
                        disabled={form.processing}
                        className="btn-primary min-w-28"
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
                                    'Menyimpan…'
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
                                    'Simpan'
                                )}
                            </motion.span>
                        </AnimatePresence>
                    </button>
                </>
            }
        >
            <Head title={title} />
            <form
                id={FORM_ID}
                onSubmit={onSubmit}
                className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
            >
                {/* Writing area */}
                <div className="card p-5 sm:p-8">
                    <AutoTextarea
                        value={form.data.title}
                        onChange={(v) => form.setData('title', v)}
                        placeholder="Judul berita"
                        aria-label="Judul"
                        required
                        className="text-2xl leading-snug font-semibold text-navy-900 sm:text-3xl"
                    />
                    <Error message={err.title} />

                    <AutoTextarea
                        value={form.data.excerpt}
                        onChange={(v) => form.setData('excerpt', v)}
                        placeholder="Ringkasan singkat yang tampil di kartu berita…"
                        aria-label="Ringkasan"
                        maxLength={500}
                        className="mt-4 text-base text-slate-600"
                    />
                    <div className="flex justify-between">
                        <Error message={err.excerpt} />
                        <span
                            className={cn(
                                'ml-auto text-xs tabular-nums',
                                form.data.excerpt.length > 450
                                    ? 'text-amber-600'
                                    : 'text-slate-400',
                            )}
                        >
                            {form.data.excerpt.length}/500
                        </span>
                    </div>

                    <div className="my-5 h-px bg-gradient-to-r from-accent/20 via-slate-200 to-transparent" />

                    <AutoTextarea
                        value={form.data.body}
                        onChange={(v) => form.setData('body', v)}
                        placeholder="Tulis isi berita di sini. Pisahkan paragraf dengan satu baris kosong."
                        aria-label="Isi berita"
                        required
                        minRows={16}
                        className="font-serif text-[17px] leading-8 text-slate-800"
                    />
                    <Error message={err.body} />

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">
                            {words.toLocaleString('id-ID')} kata
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                            <Icon name="clock" width={12} height={12} />
                            {Math.max(1, Math.round(words / 200))} menit baca
                        </span>
                    </div>
                </div>

                {/* Side panel */}
                <div className="space-y-4 lg:sticky lg:top-6">
                    {article?.source_url && (
                        <Panel
                            title={
                                article.is_ai_generated
                                    ? 'Sinopsis AI dari'
                                    : 'Sumber'
                            }
                        >
                            <a
                                href={article.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="block text-sm font-medium break-all text-navy-900 hover:text-accent"
                            >
                                {article.source_name ?? article.source_url}
                            </a>
                            <p className="mt-1 text-xs break-all text-slate-400">
                                {article.source_url}
                            </p>
                        </Panel>
                    )}
                    <Panel title="Gambar sampul">
                        <CoverInput
                            current={article?.cover_url ?? null}
                            file={form.data.cover}
                            onChange={(f) => form.setData('cover', f)}
                        />
                        <Error message={err.cover} />
                    </Panel>

                    <Panel title="Kategori">
                        <div className="flex flex-wrap gap-1.5">
                            {categories.map((c) => {
                                const on = form.data.category_id === c.id;
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() =>
                                            form.setData('category_id', c.id)
                                        }
                                        className={cn(
                                            'relative rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors',
                                            on
                                                ? 'text-white ring-accent'
                                                : 'bg-white text-slate-600 ring-slate-200 hover:text-accent hover:ring-accent/30',
                                        )}
                                    >
                                        {on && (
                                            <motion.span
                                                layoutId="category-chip"
                                                transition={{
                                                    type: 'spring',
                                                    stiffness: 500,
                                                    damping: 36,
                                                }}
                                                className="absolute inset-0 rounded-full bg-accent"
                                            />
                                        )}
                                        <span className="relative">
                                            {c.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <Error message={err.category_id} />
                    </Panel>

                    <Panel title="Wilayah">
                        <div className="space-y-2">
                            <select
                                value={province}
                                onChange={(e) => {
                                    setProvince(e.target.value);
                                    form.setData('region_code', e.target.value);
                                }}
                                aria-label="Provinsi"
                                className="input"
                            >
                                <option value="">
                                    Nasional (tanpa wilayah)
                                </option>
                                {provinces.map((p) => (
                                    <option key={p.code} value={p.code}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                            <AnimatePresence initial={false}>
                                {province && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="-m-1 overflow-hidden p-1"
                                    >
                                        <select
                                            value={form.data.region_code}
                                            onChange={(e) =>
                                                form.setData(
                                                    'region_code',
                                                    e.target.value,
                                                )
                                            }
                                            aria-label="Kabupaten/kota"
                                            className="input"
                                        >
                                            <option value={province}>
                                                Seluruh provinsi
                                            </option>
                                            {cities.map((c) => (
                                                <option
                                                    key={c.code}
                                                    value={c.code}
                                                >
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <Error message={err.region_code} />
                    </Panel>

                    <Panel title="Tag">
                        <input
                            value={form.data.tags}
                            onChange={(e) =>
                                form.setData('tags', e.target.value)
                            }
                            placeholder="Pemkot Bogor, Banjir, UMKM"
                            aria-label="Tag, pisahkan dengan koma"
                            className="input"
                        />
                        <p className="mt-1.5 text-xs text-slate-400">
                            Pisahkan dengan koma. Tag yang sudah ada dipakai
                            ulang.
                        </p>
                        <Error message={err.tags} />
                    </Panel>

                    <Panel title="Sentimen">
                        <select
                            value={form.data.sentiment}
                            onChange={(e) =>
                                form.setData('sentiment', e.target.value)
                            }
                            aria-label="Sentimen berita"
                            className="input"
                        >
                            <option value="">Belum ditentukan</option>
                            <option value="positif">Positif</option>
                            <option value="netral">Netral</option>
                            <option value="negatif">Negatif</option>
                        </select>
                        <p className="mt-1.5 text-xs text-slate-400">
                            Dipakai di dashboard Media Intelligence. Berita AI
                            terisi otomatis.
                        </p>
                        <Error message={err.sentiment} />
                    </Panel>

                    <Panel title="SEO & media sosial">
                        <div className="space-y-3">
                            <SeoField
                                label="Judul SEO"
                                max={70}
                                value={form.data.seo_title}
                                onChange={(v) => form.setData('seo_title', v)}
                                error={err.seo_title}
                            />
                            <SeoField
                                label="Meta description"
                                max={160}
                                rows={3}
                                value={form.data.meta_description}
                                onChange={(v) =>
                                    form.setData('meta_description', v)
                                }
                                error={err.meta_description}
                            />
                            <SeoField
                                label="Teks media sosial"
                                max={1000}
                                rows={4}
                                value={form.data.social_post}
                                onChange={(v) => form.setData('social_post', v)}
                                error={err.social_post}
                            />
                        </div>
                    </Panel>

                    {can.flag && (
                        <Panel title="Sorotan" flush>
                            <Switch
                                label="Headline"
                                hint="Tampil di slider utama beranda"
                                checked={form.data.is_headline}
                                onChange={(v) => form.setData('is_headline', v)}
                            />
                            <Switch
                                label="Breaking news"
                                hint="Masuk ticker berita terkini"
                                checked={form.data.is_breaking}
                                onChange={(v) => form.setData('is_breaking', v)}
                            />
                        </Panel>
                    )}

                    {article && (
                        <Panel title="Alur kerja">
                            <div className="space-y-2">
                                {can.submit && article.status !== 'review' && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.post(submit.url(article.id))
                                        }
                                        className="btn-ghost w-full"
                                    >
                                        <Icon
                                            name="send"
                                            width={16}
                                            height={16}
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
                                            className="btn-success w-full"
                                        >
                                            <Icon
                                                name="check"
                                                width={16}
                                                height={16}
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
                                    className="btn-danger w-full"
                                >
                                    <Icon name="trash" width={16} height={16} />
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
    flush = false,
    children,
}: {
    title: string;
    flush?: boolean;
    children: ReactNode;
}) {
    return (
        <section className={cn('card', flush ? 'p-2' : 'p-4')}>
            <h3
                className={cn(
                    'mb-3 text-xs font-semibold tracking-[0.12em] text-slate-400 uppercase',
                    flush && 'mb-1 px-3 pt-2',
                )}
            >
                {title}
            </h3>
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
                <span className="tabular-nums">
                    {value.length}/{max}
                </span>
            </span>
            <Tag
                value={value}
                rows={rows}
                maxLength={max}
                placeholder="Kosong = memakai judul/ringkasan"
                onChange={(e) => onChange(e.target.value)}
                className="mt-1 input"
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
        <div>
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
                            className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-xs text-slate-500"
                        >
                            <span className="grid size-10 place-items-center rounded-full bg-white text-accent shadow-sm ring-1 ring-slate-200 transition group-hover:scale-110">
                                <Icon name="upload" width={18} height={18} />
                            </span>
                            Tarik gambar ke sini
                            <span className="text-slate-400">
                                atau klik untuk memilih · maks 2 MB
                            </span>
                        </motion.span>
                    )}
                </AnimatePresence>
                {shown && (
                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gradient-to-t from-black/60 to-transparent py-3 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                        <Icon name="image" width={14} height={14} />
                        Ganti gambar
                    </span>
                )}
            </label>
            {file && (
                <button
                    type="button"
                    onClick={() => onChange(null)}
                    className="mt-2 text-xs text-slate-500 hover:text-accent"
                >
                    Batalkan gambar baru
                </button>
            )}
        </div>
    );
}
