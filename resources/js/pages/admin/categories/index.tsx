import { Form, Head, router } from '@inertiajs/react';
import { motion } from 'motion/react';
import { EmptyState } from '@/components/admin/ui';
import Icon from '@/components/icons';
import { ease } from '@/components/motion';
import AdminLayout from '@/layouts/admin';
import { destroy, store, update } from '@/routes/admin/categories';

type Row = {
    id: number;
    name: string;
    slug: string;
    sort: number;
    articles_count: number;
};

export default function CategoriesIndex({ categories }: { categories: Row[] }) {
    const max = Math.max(1, ...categories.map((c) => c.articles_count));

    return (
        <AdminLayout
            title="Kategori"
            subtitle={`${categories.length} kategori · urutan menentukan posisi di menu situs`}
        >
            <Head title="Kategori" />

            <Form
                action={store.url()}
                method="post"
                resetOnSuccess
                className="mb-5 flex flex-wrap items-end gap-3 card p-4 sm:p-5"
            >
                {({ errors, processing }) => (
                    <>
                        <span className="hidden size-11 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent sm:grid">
                            <Icon name="tag" />
                        </span>
                        <label className="min-w-48 flex-1 text-sm font-medium text-navy-900">
                            Kategori baru
                            <input
                                name="name"
                                placeholder="Misalnya: Teknologi"
                                required
                                className="mt-1.5 input"
                            />
                        </label>
                        <label className="w-24 text-sm font-medium text-navy-900">
                            Urutan
                            <input
                                name="sort"
                                type="number"
                                min={0}
                                defaultValue={categories.length}
                                className="mt-1.5 input"
                            />
                        </label>
                        <button
                            disabled={processing}
                            className="btn-primary py-2.5"
                        >
                            <Icon name="plus" width={16} height={16} />
                            Tambah
                        </button>
                        {(errors.name ?? errors.slug) && (
                            <p className="w-full text-xs text-red-600">
                                {errors.name ?? errors.slug}
                            </p>
                        )}
                    </>
                )}
            </Form>

            <div className="overflow-hidden card">
                {categories.length === 0 && (
                    <EmptyState icon="tag" title="Belum ada kategori">
                        Tambahkan kategori pertama di atas.
                    </EmptyState>
                )}
                <ul className="divide-y divide-slate-100">
                    {categories.map((c, i) => (
                        <motion.li
                            key={c.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                delay: i * 0.04,
                                duration: 0.4,
                                ease,
                            }}
                        >
                            <Form
                                action={update.url(c.id)}
                                method="put"
                                className="group flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/[0.025] sm:px-6"
                            >
                                {({ processing, recentlySuccessful }) => (
                                    <>
                                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-500 tabular-nums">
                                            {c.sort}
                                        </span>
                                        <div className="min-w-40 flex-1">
                                            <input
                                                name="name"
                                                defaultValue={c.name}
                                                required
                                                aria-label="Nama kategori"
                                                className="-ml-2 w-full rounded-lg bg-transparent px-2 py-1 font-medium text-navy-900 ring-accent/30 transition outline-none hover:bg-white hover:ring-1 focus:bg-white focus:ring-2"
                                            />
                                            <div className="mt-1 flex items-center gap-2">
                                                <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{
                                                            width: `${(c.articles_count / max) * 100}%`,
                                                        }}
                                                        transition={{
                                                            delay:
                                                                0.2 + i * 0.04,
                                                            duration: 0.8,
                                                            ease,
                                                        }}
                                                        className="h-full rounded-full bg-gradient-to-r from-accent to-merah-dark"
                                                    />
                                                </div>
                                                <span className="text-xs text-slate-500">
                                                    {c.articles_count} artikel
                                                </span>
                                            </div>
                                        </div>
                                        <label className="flex items-center gap-2 text-xs text-slate-500">
                                            Urutan
                                            <input
                                                name="sort"
                                                type="number"
                                                min={0}
                                                defaultValue={c.sort}
                                                className="input w-20 py-1.5"
                                            />
                                        </label>
                                        <div className="flex gap-1.5">
                                            <button
                                                disabled={processing}
                                                className="btn-ghost px-3 py-1.5 text-xs"
                                            >
                                                <Icon
                                                    name="check"
                                                    width={14}
                                                    height={14}
                                                />
                                                {recentlySuccessful
                                                    ? 'Tersimpan'
                                                    : 'Simpan'}
                                            </button>
                                            <button
                                                type="button"
                                                aria-label={`Hapus ${c.name}`}
                                                className="btn-danger px-2.5 py-1.5 text-xs"
                                                onClick={() =>
                                                    confirm(
                                                        `Hapus kategori ${c.name}?`,
                                                    ) &&
                                                    router.delete(
                                                        destroy.url(c.id),
                                                        {
                                                            preserveScroll: true,
                                                        },
                                                    )
                                                }
                                            >
                                                <Icon
                                                    name="trash"
                                                    width={14}
                                                    height={14}
                                                />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </Form>
                        </motion.li>
                    ))}
                </ul>
            </div>
        </AdminLayout>
    );
}
