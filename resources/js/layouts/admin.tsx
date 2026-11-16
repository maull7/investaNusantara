import { Form, Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import Flash from '@/components/flash';
import { cn } from '@/lib/utils';
import { home, logout } from '@/routes';
import { index as articles } from '@/routes/admin/articles';
import { index as categories } from '@/routes/admin/categories';
import { index as users } from '@/routes/admin/users';

const roleLabel = {
    super_admin: 'Super Admin',
    editor: 'Editor Daerah',
    journalist: 'Wartawan',
    contributor: 'Kontributor',
};

export default function AdminLayout({
    title,
    actions,
    children,
}: {
    title: string;
    actions?: ReactNode;
    children: ReactNode;
}) {
    const { auth } = usePage().props;
    const { url } = usePage();
    const user = auth.user!;
    const links = [
        { href: articles.url(), label: 'Artikel', show: true },
        {
            href: categories.url(),
            label: 'Kategori',
            show: user.role === 'super_admin',
        },
        {
            href: users.url(),
            label: 'Pengguna',
            show: user.role === 'super_admin',
        },
    ];

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800 md:flex">
            <aside className="bg-navy-900 text-navy-100 md:w-60 md:shrink-0">
                <div className="px-5 py-4">
                    <Link
                        href={home.url()}
                        className="text-lg font-extrabold text-white"
                    >
                        Nusantara<span className="text-teal">News</span>{' '}
                        <span className="text-accent">360</span>
                    </Link>
                    <p className="text-xs">Ruang Redaksi</p>
                </div>
                <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col">
                    {links
                        .filter((l) => l.show)
                        .map((l) => (
                            <Link
                                key={l.href}
                                href={l.href}
                                className={cn(
                                    'rounded px-3 py-2 text-sm hover:bg-navy-800',
                                    url.startsWith(l.href) &&
                                        'bg-navy-800 text-white',
                                )}
                            >
                                {l.label}
                            </Link>
                        ))}
                </nav>
                <div className="hidden border-t border-navy-800 px-5 py-4 text-xs md:block">
                    <p className="font-semibold text-white">{user.name}</p>
                    <p>
                        {roleLabel[user.role]}
                        {user.region_code && ` · ${user.region_code}`}
                    </p>
                    <Form action={logout.url()} method="post" className="mt-2">
                        <button className="text-teal hover:underline">
                            Keluar
                        </button>
                    </Form>
                </div>
            </aside>
            <main className="flex-1 p-4 md:p-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-2xl font-bold text-navy-900">
                        {title}
                    </h1>
                    {actions}
                </div>
                <Flash />
                {children}
            </main>
        </div>
    );
}
