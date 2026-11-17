import { Form, Link, router, usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useEffect, useState } from 'react';
import CommandPalette, {
    type Command,
} from '@/components/admin/command-palette';
import { Avatar, roleLabel } from '@/components/admin/ui';
import Icon, { type IconName } from '@/components/icons';
import Logo from '@/components/logo';
import { ease } from '@/components/motion';
import { cn } from '@/lib/utils';
import { home, logout } from '@/routes';
import { create, index as articles } from '@/routes/admin/articles';
import { index as aiNews, sources as aiSources } from '@/routes/admin/ai';
import { index as categories } from '@/routes/admin/categories';
import { create as createUser, index as users } from '@/routes/admin/users';

const spring = { type: 'spring', stiffness: 420, damping: 34 } as const;

export default function AdminLayout({
    title,
    subtitle,
    actions,
    children,
}: {
    title: string;
    subtitle?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
}) {
    const { auth } = usePage().props;
    const { url, component } = usePage();
    const user = auth.user!;
    const isAdmin = user.role === 'super_admin';
    const path = url.split('?')[0];

    const links: { href: string; label: string; icon: IconName }[] = [
        { href: articles.url(), label: 'Artikel', icon: 'file' },
        ...(isAdmin
            ? [
                  {
                      href: categories.url(),
                      label: 'Kategori',
                      icon: 'tag' as const,
                  },
                  {
                      href: users.url(),
                      label: 'Pengguna',
                      icon: 'users' as const,
                  },
                  {
                      href: aiNews.url(),
                      label: 'Berita AI',
                      icon: 'bolt' as const,
                  },
              ]
            : []),
    ];
    const active = links.find((l) => path.startsWith(l.href))?.href;
    const section = links.find((l) => l.href === active);
    const [searchOpen, setSearchOpen] = useState(false);

    // Ctrl/⌘ + K opens the menu search from anywhere in the admin.
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setSearchOpen((v) => !v);
            }
        }
        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const byStatus = (status: string) => articles.url({ query: { status } });
    const commands: Command[] = [
        {
            group: 'Navigasi',
            label: 'Dashboard',
            icon: 'grid',
            href: articles.url(),
            keywords: 'beranda artikel ringkasan',
        },
        ...(isAdmin
            ? [
                  {
                      group: 'Navigasi',
                      label: 'Kategori',
                      icon: 'tag' as const,
                      href: categories.url(),
                      keywords: 'rubrik',
                  },
                  {
                      group: 'Navigasi',
                      label: 'Pengguna',
                      icon: 'users' as const,
                      href: users.url(),
                      keywords: 'tim user wartawan editor',
                  },
                  {
                      group: 'Navigasi',
                      label: 'Berita AI · Antrean',
                      icon: 'bolt' as const,
                      href: aiNews.url(),
                      keywords: 'hermes ai antrean queue sinopsis',
                  },
                  {
                      group: 'Navigasi',
                      label: 'Berita AI · Sumber berita',
                      icon: 'sliders' as const,
                      href: aiSources.url(),
                      keywords: 'hermes sumber website scraping',
                  },
              ]
            : []),
        {
            group: 'Navigasi',
            label: 'Lihat situs',
            icon: 'external',
            href: home.url(),
            external: true,
            keywords: 'publik portal',
        },
        {
            group: 'Artikel',
            label: 'Tulis artikel baru',
            icon: 'plus',
            href: create.url(),
            keywords: 'buat berita',
        },
        {
            group: 'Artikel',
            label: 'Artikel draft',
            icon: 'edit',
            href: byStatus('draft'),
        },
        {
            group: 'Artikel',
            label: 'Menunggu review',
            icon: 'clock',
            href: byStatus('review'),
            keywords: 'tinjau antrean',
        },
        {
            group: 'Artikel',
            label: 'Artikel terbit',
            icon: 'check',
            href: byStatus('published'),
            keywords: 'published tayang',
        },
        {
            group: 'Artikel',
            label: 'Artikel dikembalikan',
            icon: 'x',
            href: byStatus('rejected'),
            keywords: 'ditolak revisi',
        },
        ...(isAdmin
            ? [
                  {
                      group: 'Pengguna',
                      label: 'Tambah pengguna',
                      icon: 'plus' as const,
                      href: createUser.url(),
                      keywords: 'user baru akun',
                  },
              ]
            : []),
        {
            group: 'Akun',
            label: 'Keluar',
            icon: 'logout',
            run: () => router.post(logout.url()),
            keywords: 'logout',
        },
    ];
    // Redaksi › Section › Page. On a section's index page the page title replaces the section.
    const crumbs: Crumb[] = [
        { label: 'Ruang Redaksi', href: articles.url() },
        ...(section && path !== section.href
            ? [{ label: section.label, href: section.href }]
            : []),
        { label: title },
    ];

    return (
        <div className="min-h-screen bg-nusantara text-slate-700">
            {/* Desktop: floating sidebar */}
            <aside className="fixed inset-y-4 left-4 z-30 hidden w-64 flex-col card p-4 lg:flex">
                <Logo className="px-2 pt-1" />
                <p className="mt-6 mb-2 px-3 text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                    Ruang Redaksi
                </p>
                <Link
                    href={create.url()}
                    className="btn-primary mb-4 w-full py-2.5"
                >
                    <Icon name="plus" width={18} height={18} />
                    Tulis artikel
                </Link>
                <nav className="space-y-1">
                    {links.map((l) => (
                        <Link
                            key={l.href}
                            href={l.href}
                            className={cn(
                                'relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors',
                                active === l.href
                                    ? 'text-accent'
                                    : 'text-slate-500 hover:text-navy-900',
                            )}
                        >
                            {active === l.href && (
                                <motion.span
                                    layoutId="admin-nav"
                                    transition={spring}
                                    className="absolute inset-0 rounded-2xl bg-accent/[0.07] ring-1 ring-accent/15"
                                />
                            )}
                            <Icon name={l.icon} className="relative" />
                            <span className="relative">{l.label}</span>
                        </Link>
                    ))}
                    <a
                        href={home.url()}
                        target="_blank"
                        className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:text-navy-900"
                    >
                        <Icon name="external" />
                        Lihat situs
                    </a>
                </nav>

                <div className="mt-auto rounded-2xl bg-gradient-to-br from-accent/[0.06] to-transparent p-3 ring-1 ring-accent/10">
                    <div className="flex items-center gap-3">
                        <Avatar name={user.name} />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-navy-900">
                                {user.name}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                                {roleLabel[user.role]}
                            </p>
                        </div>
                    </div>
                    <Form action={logout.url()} method="post" className="mt-3">
                        <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2 text-xs font-medium text-slate-500 ring-1 ring-slate-200 transition hover:text-accent hover:ring-accent/30">
                            <Icon name="logout" width={16} height={16} />
                            Keluar
                        </button>
                    </Form>
                </div>
            </aside>

            {/* Phones/tablets: top bar */}
            <header className="sticky top-0 z-30 flex items-center justify-between rounded-none glass border-x-0 border-t-0 px-4 py-3 lg:hidden">
                <Logo />
                <button
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    aria-label="Cari menu"
                    className="mr-2 ml-auto grid size-9 place-items-center rounded-full text-slate-500 ring-1 ring-slate-200 transition hover:text-accent"
                >
                    <Icon name="search" width={18} height={18} />
                </button>
                <Form action={logout.url()} method="post">
                    <button
                        aria-label="Keluar"
                        className="flex items-center gap-2 rounded-full p-0.5 pr-3 text-xs font-medium text-slate-500 ring-1 ring-slate-200"
                    >
                        <Avatar name={user.name} className="size-8 text-xs" />
                        <Icon name="logout" width={16} height={16} />
                    </button>
                </Form>
            </header>

            <main className="px-4 pt-5 pb-28 sm:px-6 lg:pt-4 lg:pr-8 lg:pb-12 lg:pl-[19rem]">
                <div className="mx-auto max-w-6xl">
                    {/* Desktop top bar: breadcrumb + newsroom clock */}
                    <div className="sticky top-4 z-20 mb-7 hidden min-h-[4.5rem] items-center justify-between gap-4 rounded-3xl glass py-3 pr-3 pl-4 lg:flex">
                        <Breadcrumb crumbs={crumbs} />
                        <div className="flex items-center gap-2">
                            <SearchTrigger
                                onClick={() => setSearchOpen(true)}
                            />
                            <Clock />
                            <a
                                href={home.url()}
                                target="_blank"
                                aria-label="Lihat situs"
                                title="Lihat situs"
                                className="grid size-11 place-items-center rounded-2xl bg-white/70 text-slate-500 ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:text-accent hover:ring-accent/30"
                            >
                                <Icon name="external" width={18} height={18} />
                            </a>
                            <span className="mx-1 h-8 w-px bg-slate-200" />
                            <div className="flex items-center gap-3 rounded-2xl py-1 pr-3 pl-1 transition hover:bg-white/70">
                                <span className="relative">
                                    <Avatar
                                        name={user.name}
                                        className="size-10"
                                    />
                                    <span className="absolute right-0 bottom-0 size-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                                </span>
                                <span className="hidden leading-tight xl:block">
                                    <span className="block max-w-36 truncate text-sm font-semibold text-navy-900">
                                        {user.name}
                                    </span>
                                    <span className="block text-xs text-slate-500">
                                        {roleLabel[user.role]}
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>
                    <Breadcrumb
                        crumbs={crumbs}
                        className="-mx-4 mb-4 no-scrollbar overflow-x-auto px-4 lg:hidden"
                    />

                    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <motion.span
                                key={component}
                                initial={{
                                    scale: 0.6,
                                    rotate: -12,
                                    opacity: 0,
                                }}
                                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 320,
                                    damping: 18,
                                }}
                                className="hidden size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-accent to-merah-dark text-white shadow-lg shadow-accent/30 sm:grid"
                            >
                                <Icon
                                    name={section?.icon ?? 'file'}
                                    width={22}
                                    height={22}
                                />
                            </motion.span>
                            <div>
                                <h1 className="text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">
                                    {title}
                                </h1>
                                {subtitle && (
                                    <div className="mt-0.5 text-sm text-slate-500">
                                        {subtitle}
                                    </div>
                                )}
                            </div>
                        </div>
                        {actions && (
                            <div className="flex flex-wrap gap-2">
                                {actions}
                            </div>
                        )}
                    </div>
                    {/* Re-animates only when moving to another admin page, not on filter changes. */}
                    <motion.div
                        key={component}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, ease }}
                    >
                        {children}
                    </motion.div>
                </div>
            </main>

            {/* Phones/tablets: bottom nav + floating write button */}
            <nav className="fixed inset-x-4 bottom-4 z-30 flex items-center gap-1 rounded-full glass p-1.5 lg:hidden">
                {links.map((l) => (
                    <Link
                        key={l.href}
                        href={l.href}
                        className={cn(
                            'relative flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 text-[11px] font-medium transition-colors',
                            active === l.href
                                ? 'text-accent'
                                : 'text-slate-500',
                        )}
                    >
                        {active === l.href && (
                            <motion.span
                                layoutId="admin-tab"
                                transition={spring}
                                className="absolute inset-0 rounded-full bg-accent/10"
                            />
                        )}
                        <Icon
                            name={l.icon}
                            width={20}
                            height={20}
                            className="relative"
                        />
                        <span className="relative">{l.label}</span>
                    </Link>
                ))}
                <Link
                    href={create.url()}
                    aria-label="Tulis artikel"
                    className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-white shadow-lg shadow-accent/40 transition active:scale-95"
                >
                    <Icon name="plus" width={22} height={22} />
                </Link>
            </nav>

            <Toast />
            <CommandPalette
                open={searchOpen}
                onClose={() => setSearchOpen(false)}
                commands={commands}
                onSearchArticles={(q) =>
                    router.visit(articles.url({ query: { q } }))
                }
            />
        </div>
    );
}

/** Looks like a search field; opens the command palette. */
function SearchTrigger({ onClick }: { onClick: () => void }) {
    const mac =
        typeof navigator !== 'undefined' &&
        /Mac|iPhone|iPad/.test(navigator.userAgent);

    return (
        <button
            type="button"
            onClick={onClick}
            className="group flex h-11 w-60 items-center gap-2.5 rounded-2xl bg-white/70 px-4 text-sm text-slate-400 ring-1 ring-slate-200/70 transition hover:bg-white hover:ring-accent/30 xl:w-72"
        >
            <Icon
                name="search"
                width={15}
                height={15}
                className="transition-colors group-hover:text-accent"
            />
            <span className="flex-1 text-left">Cari menu atau artikel…</span>
            <kbd className="rounded-lg bg-slate-100 px-2 py-1 font-sans text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                {mac ? '⌘' : 'Ctrl'} K
            </kbd>
        </button>
    );
}

type Crumb = { label: string; href?: string };

function Breadcrumb({
    crumbs,
    className,
}: {
    crumbs: Crumb[];
    className?: string;
}) {
    return (
        <nav aria-label="Breadcrumb" className={className}>
            <ol className="flex items-center gap-1 text-sm whitespace-nowrap">
                {crumbs.map((c, i) => {
                    const last = i === crumbs.length - 1;
                    return (
                        <motion.li
                            key={`${i}-${c.label}`}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                                delay: i * 0.06,
                                duration: 0.3,
                                ease,
                            }}
                            className="flex items-center gap-1"
                        >
                            {i > 0 && (
                                <Icon
                                    name="chevron"
                                    width={14}
                                    height={14}
                                    className="text-slate-300"
                                />
                            )}
                            {last || !c.href ? (
                                <span
                                    aria-current={last ? 'page' : undefined}
                                    className="rounded-xl bg-accent/[0.08] px-3.5 py-2 font-semibold text-accent ring-1 ring-accent/10"
                                >
                                    {c.label}
                                </span>
                            ) : (
                                <Link
                                    href={c.href}
                                    className="flex items-center gap-2 rounded-xl px-2.5 py-2 font-medium text-slate-500 transition hover:bg-white hover:text-navy-900"
                                >
                                    {i === 0 && (
                                        <span className="grid size-7 place-items-center rounded-lg bg-accent/10 text-accent">
                                            <Icon
                                                name="home"
                                                width={15}
                                                height={15}
                                            />
                                        </span>
                                    )}
                                    {c.label}
                                </Link>
                            )}
                        </motion.li>
                    );
                })}
            </ol>
        </nav>
    );
}

const dayFmt = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Jakarta',
});
const timeFmt = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
});

/** Newsroom clock: date + live time with a pulsing "on air" dot. */
function Clock() {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 15_000);

        return () => window.clearInterval(timer);
    }, []);

    return (
        <span className="flex h-11 items-center gap-3 rounded-2xl bg-white/70 px-4 ring-1 ring-slate-200/70">
            <span className="relative flex size-2.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-accent/60" />
                <span className="relative size-2.5 rounded-full bg-accent" />
            </span>
            <span className="leading-tight">
                <span className="block text-sm font-semibold text-navy-900 tabular-nums">
                    {timeFmt.format(now)}{' '}
                    <span className="text-xs font-medium text-accent">WIB</span>
                </span>
                <span className="block text-[11px] text-slate-500">
                    {dayFmt.format(now)}
                </span>
            </span>
        </span>
    );
}

/** Session flash messages as an auto-dismissing toast. */
function Toast() {
    const { flash } = usePage().props;
    const [toast, setToast] = useState<{
        id: number;
        text: string;
        error: boolean;
    } | null>(null);

    // `flash` is a new object on every visit, so the same message shown twice still re-triggers.
    useEffect(() => {
        const text = flash.error ?? flash.success;
        if (!text) {
            return;
        }
        setToast({ id: Date.now(), text, error: Boolean(flash.error) });
        const timer = window.setTimeout(() => setToast(null), 4000);

        return () => window.clearTimeout(timer);
    }, [flash]);

    return (
        <div className="pointer-events-none fixed inset-x-4 top-20 z-50 flex justify-center lg:inset-x-auto lg:top-6 lg:right-6">
            <AnimatePresence>
                {toast && (
                    <motion.div
                        key={toast.id}
                        role="status"
                        initial={{ opacity: 0, y: -16, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -12, scale: 0.96 }}
                        transition={spring}
                        className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl bg-white py-3 pr-3 pl-3.5 text-sm text-navy-900 shadow-xl ring-1 shadow-black/10 ring-black/5"
                    >
                        <span
                            className={cn(
                                'grid size-7 shrink-0 place-items-center rounded-full text-white',
                                toast.error ? 'bg-red-600' : 'bg-emerald-600',
                            )}
                        >
                            <Icon
                                name={toast.error ? 'x' : 'check'}
                                width={16}
                                height={16}
                                strokeWidth={2.4}
                            />
                        </span>
                        <span className="flex-1">{toast.text}</span>
                        <button
                            onClick={() => setToast(null)}
                            aria-label="Tutup"
                            className="rounded-full p-1 text-slate-400 hover:text-navy-900"
                        >
                            <Icon name="x" width={16} height={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
