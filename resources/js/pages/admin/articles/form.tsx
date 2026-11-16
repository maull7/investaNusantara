import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/admin';
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
import { statusLabel } from './index';

type Props = {
    article: (Article & { region: Region | null }) | null;
    categories: Category[];
    provinces: Region[];
    can: { publish: boolean; submit: boolean; flag: boolean };
};

export default function ArticleForm({
    article,
    categories,
    provinces,
    can,
}: Props) {
    const initialProvince = article?.region_code?.slice(0, 2) ?? '';
    const [province, setProvince] = useState(initialProvince);
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

    function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        // POST with _method spoofing so file uploads work on update.
        form.transform((d) => ({ ...d, region_code: d.region_code || null }));
        form.post(article ? update.url(article.id) : store.url(), {
            forceFormData: true,
        });
    }

    const err = form.errors;

    return (
        <AdminLayout
            title={article ? 'Edit artikel' : 'Tulis artikel'}
            actions={
                <Link href={index.url()} className="btn-ghost">
                    Kembali
                </Link>
            }
        >
            <Head title={article ? 'Edit artikel' : 'Tulis artikel'} />
            <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-4 rounded-lg bg-white p-6 ring-1 ring-slate-200 lg:col-span-2">
                    <Field label="Judul" error={err.title}>
                        <input
                            value={form.data.title}
                            onChange={(e) =>
                                form.setData('title', e.target.value)
                            }
                            className="input"
                            required
                        />
                    </Field>
                    <Field label="Ringkasan" error={err.excerpt}>
                        <textarea
                            value={form.data.excerpt}
                            onChange={(e) =>
                                form.setData('excerpt', e.target.value)
                            }
                            rows={2}
                            maxLength={500}
                            className="input"
                        />
                    </Field>
                    <Field
                        label="Isi berita (pisahkan paragraf dengan baris kosong)"
                        error={err.body}
                    >
                        <textarea
                            value={form.data.body}
                            onChange={(e) =>
                                form.setData('body', e.target.value)
                            }
                            rows={18}
                            className="input font-serif"
                            required
                        />
                    </Field>
                </div>

                <div className="space-y-4">
                    <div className="space-y-4 rounded-lg bg-white p-6 ring-1 ring-slate-200">
                        {article && (
                            <p className="text-sm">
                                Status:{' '}
                                <strong>{statusLabel[article.status]}</strong>
                            </p>
                        )}
                        <Field label="Kategori" error={err.category_id}>
                            <select
                                value={form.data.category_id}
                                onChange={(e) =>
                                    form.setData(
                                        'category_id',
                                        Number(e.target.value),
                                    )
                                }
                                className="input"
                            >
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Provinsi" error={err.region_code}>
                            <select
                                value={province}
                                onChange={(e) => {
                                    setProvince(e.target.value);
                                    form.setData('region_code', e.target.value);
                                }}
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
                        </Field>
                        {province && (
                            <Field label="Kabupaten/Kota">
                                <select
                                    value={form.data.region_code}
                                    onChange={(e) =>
                                        form.setData(
                                            'region_code',
                                            e.target.value,
                                        )
                                    }
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
                            </Field>
                        )}
                        <Field label="Gambar sampul" error={err.cover}>
                            {article?.cover_url && (
                                <img
                                    src={article.cover_url}
                                    alt=""
                                    className="mb-2 rounded"
                                />
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                    form.setData(
                                        'cover',
                                        e.target.files?.[0] ?? null,
                                    )
                                }
                                className="text-sm"
                            />
                        </Field>
                        {can.flag && (
                            <div className="flex gap-4 text-sm">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={form.data.is_headline}
                                        onChange={(e) =>
                                            form.setData(
                                                'is_headline',
                                                e.target.checked,
                                            )
                                        }
                                    />{' '}
                                    Headline
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={form.data.is_breaking}
                                        onChange={(e) =>
                                            form.setData(
                                                'is_breaking',
                                                e.target.checked,
                                            )
                                        }
                                    />{' '}
                                    Breaking
                                </label>
                            </div>
                        )}
                        <button
                            disabled={form.processing}
                            className="btn-primary w-full"
                        >
                            Simpan
                        </button>
                    </div>

                    {article && (
                        <div className="flex flex-wrap gap-2">
                            {can.submit && article.status !== 'review' && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        router.post(submit.url(article.id))
                                    }
                                    className="btn-ghost flex-1"
                                >
                                    Ajukan ke editor
                                </button>
                            )}
                            {can.publish && article.status !== 'published' && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        router.post(publish.url(article.id))
                                    }
                                    className="btn-teal flex-1"
                                >
                                    Terbitkan
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() =>
                                    confirm('Hapus artikel ini?') &&
                                    router.delete(destroy.url(article.id))
                                }
                                className="btn-danger"
                            >
                                Hapus
                            </button>
                        </div>
                    )}
                </div>
            </form>
        </AdminLayout>
    );
}

function Field({
    label,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block text-sm font-medium text-slate-700">
            {label}
            <div className="mt-1 font-normal">{children}</div>
            {error && <span className="text-xs text-accent">{error}</span>}
        </label>
    );
}
