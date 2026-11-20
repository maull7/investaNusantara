import { Form, Head, router } from '@inertiajs/react';
import { EmptyState } from '@/components/admin/ui';
import Icon from '@/components/icons';
import Pagination from '@/components/pagination';
import AdminLayout from '@/layouts/admin';
import { destroy, index, store, update } from '@/routes/admin/tags';
import type { Paginated } from '@/types';

type Row = { id: number; name: string; slug: string; articles_count: number };

export default function TagsIndex({
    tags,
    q,
}: {
    tags: Paginated<Row>;
    q: string;
}) {
    return (
        <AdminLayout
            title="Tag"
            subtitle={`${tags.total} tag · AI memakai tag ini lebih dulu, tag baru dibuat bila tidak ada yang cocok`}
        >
            <Head title="Tag" />

            <div className="mb-5 grid gap-3 sm:grid-cols-2">
                <Form
                    action={index.url()}
                    method="get"
                    className="flex items-center gap-2 card p-3"
                >
                    <Icon name="search" className="ml-1 text-slate-400" />
                    <input
                        name="q"
                        defaultValue={q}
                        placeholder="Cari tag"
                        aria-label="Cari tag"
                        className="input border-0 focus:ring-0"
                    />
                </Form>
                <Form
                    action={store.url()}
                    method="post"
                    resetOnSuccess
                    className="flex items-center gap-2 card p-3"
                >
                    {({ processing }) => (
                        <>
                            <input
                                name="name"
                                required
                                maxLength={60}
                                placeholder="Tag baru, misalnya: Pemkot Bogor"
                                aria-label="Tag baru"
                                className="input"
                            />
                            <button
                                disabled={processing}
                                className="btn-primary py-2.5"
                            >
                                <Icon name="plus" width={16} height={16} />
                                Tambah
                            </button>
                        </>
                    )}
                </Form>
            </div>

            <div className="overflow-hidden card">
                {tags.data.length === 0 && (
                    <EmptyState icon="tag" title="Belum ada tag">
                        Tag dibuat otomatis oleh AI atau ditambahkan di atas.
                    </EmptyState>
                )}
                <ul className="divide-y divide-slate-100">
                    {tags.data.map((t) => (
                        <li key={t.id}>
                            <Form
                                action={update.url(t.id)}
                                method="put"
                                options={{ preserveScroll: true }}
                                className="flex flex-wrap items-center gap-3 px-4 py-2.5 sm:px-6"
                            >
                                {({ processing }) => (
                                    <>
                                        <span className="text-slate-400">
                                            #
                                        </span>
                                        <input
                                            name="name"
                                            defaultValue={t.name}
                                            required
                                            maxLength={60}
                                            aria-label={`Nama tag ${t.name}`}
                                            title="Ganti ke nama tag lain yang sudah ada untuk menggabungkan"
                                            className="-ml-2 min-w-40 flex-1 rounded-lg bg-transparent px-2 py-1 font-medium text-navy-900 ring-accent/30 outline-none hover:ring-1 focus:ring-2"
                                        />
                                        <span className="text-xs text-slate-500 tabular-nums">
                                            {t.articles_count} artikel
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="submit"
                                                disabled={processing}
                                                aria-label="Simpan perubahan tag"
                                                title="Simpan"
                                                className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-navy-900 disabled:opacity-60"
                                            >
                                                <Icon
                                                    name="check"
                                                    width={15}
                                                    height={15}
                                                />
                                            </button>
                                            <button
                                                type="button"
                                                aria-label={`Hapus ${t.name}`}
                                                title={`Hapus tag ${t.name}`}
                                                className="inline-flex size-8 items-center justify-center rounded-lg border border-red-200 bg-red-50/50 text-red-600 transition hover:bg-red-100 hover:text-red-700"
                                                onClick={() =>
                                                    confirm(
                                                        `Hapus tag ${t.name}? Tag dilepas dari ${t.articles_count} artikel.`,
                                                    ) &&
                                                    router.delete(
                                                        destroy.url(t.id),
                                                        {
                                                            preserveScroll: true,
                                                        },
                                                    )
                                                }
                                            >
                                                <Icon
                                                    name="trash"
                                                    width={15}
                                                    height={15}
                                                />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </Form>
                        </li>
                    ))}
                </ul>
            </div>
            <p className="mt-3 text-xs text-slate-500">
                Untuk menggabungkan tag ganda, ubah namanya menjadi nama tag
                yang sudah ada.
            </p>
            <Pagination data={tags} />
        </AdminLayout>
    );
}
