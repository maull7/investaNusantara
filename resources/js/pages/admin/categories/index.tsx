import { Form, Head, router } from '@inertiajs/react';
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
    return (
        <AdminLayout title="Kategori">
            <Head title="Kategori" />
            <Form
                action={store.url()}
                method="post"
                resetOnSuccess
                className="mb-6 flex flex-wrap gap-2"
            >
                {({ errors }) => (
                    <>
                        <input
                            name="name"
                            placeholder="Nama kategori baru"
                            required
                            className="input max-w-xs"
                        />
                        <input
                            name="sort"
                            type="number"
                            min={0}
                            defaultValue={categories.length}
                            className="input w-24"
                            aria-label="Urutan"
                        />
                        <button className="btn-primary">Tambah</button>
                        {(errors.name ?? errors.slug) && (
                            <p className="w-full text-xs text-accent">
                                {errors.name ?? errors.slug}
                            </p>
                        )}
                    </>
                )}
            </Form>
            <div className="divide-y divide-slate-100 rounded-lg bg-white ring-1 ring-slate-200">
                {categories.map((c) => (
                    <Form
                        key={c.id}
                        action={update.url(c.id)}
                        method="put"
                        className="flex flex-wrap items-center gap-2 px-4 py-3"
                    >
                        <input
                            name="name"
                            defaultValue={c.name}
                            required
                            className="input max-w-xs"
                        />
                        <input
                            name="sort"
                            type="number"
                            min={0}
                            defaultValue={c.sort}
                            className="input w-24"
                            aria-label="Urutan"
                        />
                        <span className="text-xs text-slate-500">
                            {c.articles_count} artikel
                        </span>
                        <div className="ml-auto flex gap-2">
                            <button className="btn-ghost">Simpan</button>
                            <button
                                type="button"
                                className="btn-danger"
                                onClick={() =>
                                    confirm(`Hapus kategori ${c.name}?`) &&
                                    router.delete(destroy.url(c.id))
                                }
                            >
                                Hapus
                            </button>
                        </div>
                    </Form>
                ))}
            </div>
        </AdminLayout>
    );
}
