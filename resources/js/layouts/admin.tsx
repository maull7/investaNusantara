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
import type { Permission } from '@/types';
import { create, index as articles } from '@/routes/admin/articles';
import { index as activity } from '@/routes/admin/activity';
import { index as aiNews, sources as aiSources } from '@/routes/admin/ai';
import { index as categories } from '@/routes/admin/categories';
import {
    agenda as agendaQueue,
    index as directory,
} from '@/routes/admin/directory';
import { insights } from '@/routes/admin';
import { index as memberships } from '@/routes/admin/memberships';
import { index as tags } from '@/routes/admin/tags';
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
    // Areas this user may open (Super Admin: all; Sub Admin: what was granted).
    const can = (area: Permission) => user.access.includes(area);
    const path = url.split('?')[0];

    // Sidebar groups; a group without any area this user may open is hidden.
    // Klien Data only subscribe to Media Intelligence: no newsroom menus at all.
    const client = user.role === 'client';
    const allGroups: NavGroup[] = client
        ? [
              {
                  label: user.organization ?? 'Klien Data',
                  links: [
                      {
                          href: insights.url(),
                          label: 'Media Intelligence',
                          icon: 'chart',
                      },
                  ],
              },
          ]
        : [
              {
                  label: 'Konten',
                  links: [
                      { href: articles.url(), label: 'Artikel', icon: 'file' },
                      ...(can('categories')
                          ? [
                                {
                                    href: categories.url(),
                                    label: 'Kategori',
                                    icon: 'tag' as const,
                                },
                                {
                                    href: tags.url(),
                                    label: 'Tag',
                                    icon: 'hash' as const,
                                },
                            ]
                          : []),
                  ],
              },
              {
                  label: 'Daerah',
                  links: can('directory')
                      ? [
                            {
                                href: directory.url(),
                                label: 'Direktori',
                                icon: 'map',
                            },
                            {
                                href: agendaQueue.url(),
                                label: 'Agenda',
                                icon: 'clock',
                            },
                        ]
                      : [],
              },
              {
                  label: 'Analitik',
                  links: can('insights')
                      ? [
                            {
                                href: insights.url(),
                                label: 'Media Intelligence',
                                icon: 'chart',
                            },
                        ]
                      : [],
              },
              {
                  label: 'Bisnis',
                  links: can('memberships')
                      ? [
                            {
                                href: memberships.url(),
                                label: 'Langganan',
                                icon: 'star',
                            },
                        ]
                      : [],
              },
              {
                  label: 'Otomasi',
                  links: can('ai')
                      ? [
                            {
                                href: aiNews.url(),
                                label: 'Berita AI',
                                icon: 'bolt',
                            },
                        ]
                      : [],
              },
              {
                  label: 'Tim',
                  links: [
                      ...(can('users')
                          ? [
                                {
                                    href: users.url(),
                                    label: 'Pengguna',
                                    icon: 'users' as const,
                                },
                            ]
                          : []),
                      ...(can('activity')
                          ? [
                                {
                                    href: activity.url(),
                                    label: 'Log Aktivitas',
                                    icon: 'activity' as const,
                                },
                            ]
                          : []),
                  ],
              },
          ];
    const groups = allGroups.filter((g) => g.links.length > 0);
    const links = groups.flatMap((g) => g.links);
    // Longest match wins: /admin/direktori/agenda is "Agenda", not "Direktori".
    const active = links
        .filter((l) => path.startsWith(l.href))
        .sort((a, b) => b.href.length - a.href.length)[0]?.href;
    const section = links.find((l) => l.href === active);
    const [searchOpen, setSearchOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

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
    const logoutCommand: Command = {
        group: 'Akun',
        label: 'Keluar',
        icon: 'logout',
        run: () => router.post(logout.url()),
        keywords: 'logout',
    };
    const commands: Command[] = client
        ? [
              {
                  group: 'Navigasi',
                  label: 'Media Intelligence',
                  icon: 'chart',
                  href: insights.url(),
                  keywords: 'dashboard analitik',
              },
              logoutCommand,
          ]
        : [
              {
                  group: 'Navigasi',
                  label: 'Dashboard',
                  icon: 'grid',
                  href: articles.url(),
                  keywords: 'beranda artikel ringkasan',
              },
              ...(can('categories')
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
                            label: 'Tag',
                            icon: 'hash' as const,
                            href: tags.url(),
                            keywords: 'label topik',
                        },
                    ]
                  : []),
              ...(can('directory')
                  ? [
                        {
                            group: 'Navigasi',
                            label: 'Direktori daerah',
                            icon: 'map' as const,
                            href: directory.url(),
                            keywords: 'profil wisata umkm event apbd pejabat',
                        },
                    ]
                  : []),
              ...(can('users')
                  ? [
                        {
                            group: 'Navigasi',
                            label: 'Pengguna',
                            icon: 'users' as const,
                            href: users.url(),
                            keywords: 'tim user wartawan editor sub admin',
                        },
                    ]
                  : []),
              ...(can('activity')
                  ? [
                        {
                            group: 'Navigasi',
                            label: 'Log Aktivitas',
                            icon: 'activity' as const,
                            href: activity.url(),
                            keywords: 'riwayat audit log jejak',
                        },
                    ]
                  : []),
              ...(can('ai')
                  ? [
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
              ...(can('users')
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
    const crumbs: Crumb[] = client
        ? [{ label: title }]
        : [
              { label: 'Ruang Redaksi', href: articles.url() },
              ...(section && path !== section.href
                  ? [{ label: section.label, href: section.href }]
                  : []),
              { label: title },
          ];

    return (
        <div className="min-h-screen bg-nusantara text-slate-700">
            {/* Desktop: floating sidebar */}
            <aside className="fixed inset-y-4 left-4 z-30 hidden w-64 flex-col card p-4 lg:flex print:hidden">
                <Logo className="px-2 pt-1" />
                {!client && (
                    <Link
                        href={create.url()}
                        className="btn-primary mt-6 w-full py-2.5"
                    >
                        <Icon name="plus" width={18} height={18} />
                        Tulis artikel
                    </Link>
                )}
                <nav className="mt-5 flex-1 space-y-5 overflow-y-auto">
                    {groups.map((g) => (
                        <div key={g.label}>
                            <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                                {g.label}
                            </p>
                            <div className="space-y-0.5">
                                {g.links.map((l) => (
                                    <NavLink
                                        key={l.href}
                                        link={l}
                                        active={active === l.href}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>
            </aside>

            {/* Phones/tablets: top bar */}
            <header className="sticky top-0 z-30 flex items-center justify-between rounded-none glass border-x-0 border-t-0 px-4 py-3 lg:hidden print:hidden">
                <Logo />
                <button
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    aria-label="Cari menu"
                    className="mr-2 ml-auto grid size-9 place-items-center rounded-full text-slate-500 ring-1 ring-slate-200 transition hover:text-accent"
                >
                    <Icon name="search" width={18} height={18} />
                </button>
                <button
                    type="button"
                    onClick={() => setMenuOpen(true)}
                    aria-label="Akun dan menu"
                    className="rounded-full p-0.5 ring-1 ring-slate-200 transition hover:ring-accent/30"
                >
                    <Avatar name={user.name} className="size-8 text-xs" />
                </button>
            </header>

            <main className="px-4 pt-5 pb-28 sm:px-6 lg:pt-4 lg:pr-8 lg:pb-12 lg:pl-[19rem] print:p-0">
                <div className="mx-auto max-w-6xl">
                    {/* Desktop top bar: breadcrumb + newsroom clock */}
                    <div className="sticky top-4 z-20 mb-7 hidden min-h-[4.5rem] items-center justify-between gap-4 rounded-3xl glass py-3 pr-3 pl-4 lg:flex print:hidden">
                        <Breadcrumb crumbs={crumbs} className="min-w-0" />
                        <div className="flex shrink-0 items-center gap-2">
                            <SearchTrigger
                                onClick={() => setSearchOpen(true)}
                            />
                            <Clock />
                            <span className="mx-1 h-8 w-px bg-slate-200" />
                            <UserMenu
                                name={user.name}
                                role={roleLabel[user.role]}
                            />
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
            <nav className="fixed inset-x-4 bottom-4 z-30 flex items-center gap-1 rounded-full glass p-1.5 lg:hidden print:hidden">
                {links.slice(0, 3).map((l) => (
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
                <button
                    type="button"
                    onClick={() => setMenuOpen(true)}
                    className={cn(
                        'relative flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 text-[11px] font-medium transition-colors',
                        links.slice(3).some((l) => l.href === active)
                            ? 'text-accent'
                            : 'text-slate-500',
                    )}
                >
                    <Icon name="menu" width={20} height={20} />
                    Menu
                </button>
                {!client && (
                    <Link
                        href={create.url()}
                        aria-label="Tulis artikel"
                        className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-white shadow-lg shadow-accent/40 transition active:scale-95"
                    >
                        <Icon name="plus" width={22} height={22} />
                    </Link>
                )}
            </nav>

            <MenuSheet
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                groups={groups}
                active={active}
                name={user.name}
                role={roleLabel[user.role]}
            />
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

type NavItem = { href: string; label: string; icon: IconName };
type NavGroup = { label: string; links: NavItem[] };

function NavLink({
    link,
    active,
    onClick,
}: {
    link: NavItem;
    active: boolean;
    onClick?: () => void;
}) {
    return (
        <Link
            href={link.href}
            onClick={onClick}
            className={cn(
                'relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                    ? 'text-accent'
                    : 'text-slate-500 hover:bg-accent/5 hover:text-navy-900',
            )}
        >
            {active && (
                <motion.span
                    layoutId="admin-nav"
                    transition={spring}
                    className="absolute inset-0 rounded-2xl bg-accent/[0.07] ring-1 ring-accent/15"
                />
            )}
            <Icon
                name={link.icon}
                width={18}
                height={18}
                className="relative"
            />
            <span className="relative">{link.label}</span>
        </Link>
    );
}

function LogoutButton() {
    return (
        <Form action={logout.url()} method="post">
            <button
                aria-label="Keluar"
                title="Keluar"
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
                <Icon name="logout" width={18} height={18} />
                Keluar
            </button>
        </Form>
    );
}

/** Desktop top bar: avatar opens a small account menu. */
function UserMenu({ name, role }: { name: string; role: string }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-haspopup="menu"
                className="flex items-center gap-3 rounded-2xl py-1 pr-2 pl-1 transition hover:bg-white/70"
            >
                <span className="relative">
                    <Avatar name={name} className="size-10" />
                    <span className="absolute right-0 bottom-0 size-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                </span>
                <span className="hidden text-left leading-tight 2xl:block">
                    <span className="block max-w-36 truncate text-sm font-semibold text-navy-900">
                        {name}
                    </span>
                    <span className="block text-xs text-slate-500">{role}</span>
                </span>
                <Icon
                    name="chevron"
                    width={14}
                    height={14}
                    className={cn(
                        'text-slate-400 transition-transform',
                        open ? '-rotate-90' : 'rotate-90',
                    )}
                />
            </button>
            <AnimatePresence>
                {open && (
                    <>
                        <button
                            type="button"
                            aria-label="Tutup menu"
                            className="fixed inset-0 z-40 cursor-default"
                            onClick={() => setOpen(false)}
                        />
                        <motion.div
                            role="menu"
                            initial={{ opacity: 0, y: -6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.97 }}
                            transition={{ duration: 0.18, ease }}
                            className="absolute right-0 z-50 mt-2 w-60 origin-top-right rounded-2xl bg-white p-1.5 shadow-xl ring-1 shadow-black/10 ring-black/5"
                        >
                            <div className="px-3 py-2.5">
                                <p className="truncate text-sm font-semibold text-navy-900">
                                    {name}
                                </p>
                                <p className="text-xs text-slate-500">{role}</p>
                            </div>
                            <div className="my-1 h-px bg-slate-100" />
                            <a
                                href={home.url()}
                                target="_blank"
                                role="menuitem"
                                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-accent/5 hover:text-accent"
                            >
                                <Icon name="external" width={18} height={18} />
                                Lihat situs
                            </a>
                            <LogoutButton />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

/** Phones/tablets: full menu and account as a bottom sheet. */
function MenuSheet({
    open,
    onClose,
    groups,
    active,
    name,
    role,
}: {
    open: boolean;
    onClose: () => void;
    groups: NavGroup[];
    active?: string;
    name: string;
    role: string;
}) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-sm lg:hidden"
                >
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Menu"
                        onClick={(e) => e.stopPropagation()}
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ duration: 0.3, ease }}
                        className="max-h-[85vh] w-full overflow-y-auto rounded-t-[28px] bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
                    >
                        <span className="mx-auto mb-4 block h-1 w-10 rounded-full bg-slate-200" />
                        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                            <Avatar name={name} className="size-10" />
                            <div className="min-w-0 flex-1 leading-tight">
                                <p className="truncate text-sm font-semibold text-navy-900">
                                    {name}
                                </p>
                                <p className="text-xs text-slate-500">{role}</p>
                            </div>
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
                            {groups.map((g) => (
                                <div key={g.label}>
                                    <p className="mb-1 px-3 text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                                        {g.label}
                                    </p>
                                    {g.links.map((l) => (
                                        <NavLink
                                            key={l.href}
                                            link={l}
                                            active={active === l.href}
                                            onClick={onClose}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 space-y-1 border-t border-slate-100 pt-3">
                            <a
                                href={home.url()}
                                target="_blank"
                                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-accent/5 hover:text-accent"
                            >
                                <Icon name="external" width={18} height={18} />
                                Lihat situs
                            </a>
                            <LogoutButton />
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
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
            className="group flex h-11 w-52 items-center gap-2.5 rounded-2xl bg-white/70 px-4 text-sm whitespace-nowrap text-slate-400 ring-1 ring-slate-200/70 transition hover:bg-white hover:ring-accent/30 xl:w-64 2xl:w-72"
        >
            <Icon
                name="search"
                width={15}
                height={15}
                className="transition-colors group-hover:text-accent"
            />
            <span className="min-w-0 flex-1 truncate text-left">
                Cari menu atau artikel…
            </span>
            <kbd className="hidden rounded-lg bg-slate-100 px-2 py-1 font-sans text-[11px] font-medium text-slate-500 ring-1 ring-slate-200 xl:inline">
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
            <ol className="flex min-w-0 items-center gap-1 text-sm whitespace-nowrap">
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
                            className={cn(
                                'flex items-center gap-1',
                                // Only the current page may shrink (it truncates).
                                last ? 'min-w-0' : 'shrink-0',
                            )}
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
                                    title={c.label}
                                    className="block min-w-0 truncate rounded-xl bg-accent/[0.08] px-3.5 py-2 font-semibold text-accent ring-1 ring-accent/10"
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
                                    <span
                                        className={cn(
                                            i === 0 &&
                                                'sr-only 2xl:not-sr-only',
                                        )}
                                    >
                                        {c.label}
                                    </span>
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
        <span className="flex h-11 items-center gap-3 rounded-2xl bg-white/70 px-4 whitespace-nowrap ring-1 ring-slate-200/70">
            <span className="relative flex size-2.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-accent/60" />
                <span className="relative size-2.5 rounded-full bg-accent" />
            </span>
            <span className="leading-tight">
                <span className="block text-sm font-semibold text-navy-900 tabular-nums">
                    {timeFmt.format(now)}{' '}
                    <span className="text-xs font-medium text-accent">WIB</span>
                </span>
                <span className="hidden text-[11px] text-slate-500 2xl:block">
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
