import { Form, Link, usePage } from '@inertiajs/react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import Icon, { type IconName } from '@/components/icons';
import { ease } from '@/components/motion';
import { regionHref } from '@/lib/news';
import { cn } from '@/lib/utils';
import { category, home, login, regions, search } from '@/routes';
import { index as adminArticles } from '@/routes/admin/articles';

/**
 * default: navbar + category tabs.
 * home:    on phones the navbar shows a greeting, a search field and the tabs.
 * article: on phones there is no top bar; the page draws a full-bleed cover.
 */
type Variant = 'default' | 'home' | 'article';

const spring = { type: 'spring', stiffness: 400, damping: 32 } as const;

export default function PublicLayout({
    children,
    tabs = true,
    variant = 'default',
}: {
    children: ReactNode;
    tabs?: boolean;
    variant?: Variant;
}) {
    const { nav, auth } = usePage().props;
    const { url } = usePage();
    const path = url.split('?')[0];
    const isHome = variant === 'home';

    const tabItems = [
        { href: home.url(), label: 'Semua' },
        ...nav.categories.map((c) => ({
            href: category.url(c.slug),
            label: c.name,
        })),
    ];
    const redaksi = auth.user ? adminArticles.url() : login.url();
    const menu: { href: string; label: string; icon: IconName }[] = [
        { href: home.url(), label: 'Beranda', icon: 'home' },
        { href: regions.url(), label: 'Wilayah', icon: 'map' },
        { href: search.url(), label: 'Cari', icon: 'search' },
        { href: redaksi, label: 'Redaksi', icon: 'user' },
    ];
    const isActive = (href: string) =>
        href === '/' ? path === '/' : path.startsWith(href);

    return (
        <div className="min-h-screen bg-nusantara pb-24 text-slate-700 md:pb-0">
            <header
                className={cn(
                    'top-0 z-30 border-b border-accent/10 bg-white/85 backdrop-blur-xl backdrop-saturate-150',
                    // On the phone home screen the header scrolls away like an app feed.
                    isHome ? 'relative md:sticky' : 'sticky',
                    variant === 'article' && 'hidden md:block',
                )}
            >
                <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
                    {isHome && <Greeting className="md:hidden" />}
                    <Logo className={cn(isHome && 'hidden md:flex')} />

                    {/* Laptop links */}
                    <nav className="ml-6 hidden h-full items-stretch gap-1 md:flex">
                        {menu.slice(0, 2).map((i) => {
                            const active = isActive(i.href);

                            return (
                                <Link
                                    key={i.href}
                                    href={i.href}
                                    viewTransition
                                    className={cn(
                                        'relative flex items-center gap-2 px-3 text-sm transition',
                                        active
                                            ? 'font-medium text-accent'
                                            : 'text-slate-500 hover:text-navy-900',
                                    )}
                                >
                                    <Icon
                                        name={i.icon}
                                        width={18}
                                        height={18}
                                    />
                                    {i.label}
                                    {active && (
                                        <motion.span
                                            layoutId="nav-line"
                                            transition={spring}
                                            className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent"
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="ml-auto flex items-center gap-2.5">
                        <SearchField className="hidden w-64 md:flex lg:w-72" />
                        {!isHome && (
                            <Link
                                href={search.url()}
                                viewTransition
                                aria-label="Cari berita"
                                className="grid size-10 place-items-center rounded-full bg-accent/5 text-navy-900 ring-1 ring-accent/10 md:hidden"
                            >
                                <Icon name="search" width={18} height={18} />
                            </Link>
                        )}
                        {isHome && (
                            <Link
                                href={redaksi}
                                aria-label="Akun"
                                className="grid size-10 place-items-center rounded-full bg-accent/5 text-accent ring-1 ring-accent/10 md:hidden"
                            >
                                {auth.user ? (
                                    <span className="text-sm font-semibold">
                                        {auth.user.name[0]}
                                    </span>
                                ) : (
                                    <Icon name="user" width={18} height={18} />
                                )}
                            </Link>
                        )}
                        <Link
                            href={redaksi}
                            className="hidden items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm shadow-accent/30 transition hover:bg-accent-dark md:flex"
                        >
                            <Icon name="user" width={16} height={16} />
                            {auth.user ? 'Ruang Redaksi' : 'Masuk'}
                        </Link>
                    </div>
                </div>

                {isHome && (
                    <div className="px-4 pb-1 md:hidden">
                        <SearchField filter />
                    </div>
                )}

                {tabs && (
                    <nav className="mx-auto no-scrollbar flex max-w-6xl gap-5 overflow-x-auto [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)] px-4">
                        {tabItems.map((t) => {
                            const active = isActive(t.href);

                            return (
                                <Link
                                    key={t.href}
                                    href={t.href}
                                    viewTransition
                                    className={cn(
                                        'relative shrink-0 py-3 text-sm whitespace-nowrap transition',
                                        active
                                            ? 'font-medium text-accent'
                                            : 'text-slate-400 hover:text-navy-900',
                                    )}
                                >
                                    {t.label}
                                    {active && (
                                        <motion.span
                                            layoutId="tab-line"
                                            transition={spring}
                                            className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent"
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                )}
            </header>

            <motion.main
                key={path}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease }}
                className={cn(
                    'mx-auto max-w-6xl',
                    variant === 'article'
                        ? 'md:px-4 md:py-8'
                        : 'px-4 py-5 sm:py-8',
                )}
            >
                {children}
            </motion.main>

            <footer className="mt-12 hidden border-t border-accent/10 bg-white md:block">
                <div className="mx-auto max-w-6xl px-4 py-10 text-sm">
                    <div className="flex items-end justify-between gap-6">
                        <div>
                            <Logo />
                            <p className="mt-2 text-slate-500">
                                Satu Indonesia, Ribuan Cerita
                            </p>
                        </div>
                        <Link
                            href={regions.url()}
                            viewTransition
                            className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                        >
                            Jelajah 514 kabupaten/kota
                            <Icon name="chevron" width={16} height={16} />
                        </Link>
                    </div>
                    <div className="mt-8 grid grid-cols-3 gap-x-4 gap-y-2 lg:grid-cols-6">
                        {nav.provinces.map((p) => (
                            <Link
                                key={p.code}
                                href={regionHref(p)}
                                viewTransition
                                className="text-slate-500 transition hover:text-accent"
                            >
                                {p.name}
                            </Link>
                        ))}
                    </div>
                    <p className="mt-8 border-t border-accent/10 pt-6 text-xs text-slate-400">
                        © {new Date().getFullYear()} NusantaraNews 360
                    </p>
                </div>
            </footer>

            {/* App-style bottom navigation on phones */}
            <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-accent/10 bg-white/90 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden">
                <div className="flex justify-around">
                    {menu.map((i) => {
                        const active = isActive(i.href);

                        return (
                            <Link
                                key={i.label}
                                href={i.href}
                                viewTransition
                                className={cn(
                                    'relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] transition',
                                    active
                                        ? 'font-medium text-accent'
                                        : 'text-slate-400',
                                )}
                            >
                                <motion.span
                                    animate={{
                                        scale: active ? 1.05 : 1,
                                        backgroundColor: active
                                            ? 'rgba(165, 14, 30, 0.1)'
                                            : 'rgba(165, 14, 30, 0)',
                                    }}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 400,
                                        damping: 20,
                                    }}
                                    className="rounded-full px-4 py-1"
                                >
                                    <Icon
                                        name={i.icon}
                                        width={22}
                                        height={22}
                                    />
                                </motion.span>
                                {i.label}
                                {active && (
                                    <motion.span
                                        layoutId="bottom-line"
                                        transition={spring}
                                        className="absolute -top-1.5 h-[3px] w-8 rounded-full bg-accent"
                                    />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}

function SearchField({
    className,
    filter,
}: {
    className?: string;
    filter?: boolean;
}) {
    return (
        <Form
            action={search.url()}
            method="get"
            className={cn(
                'flex items-center gap-2.5 rounded-full bg-accent/5 px-4 py-2.5 text-sm ring-1 ring-accent/10 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-accent/30 md:py-2',
                className,
            )}
        >
            <Icon
                name="search"
                className="shrink-0 text-slate-400"
                width={18}
                height={18}
            />
            <input
                name="q"
                type="search"
                placeholder="Cari berita"
                aria-label="Cari berita"
                className="min-w-0 flex-1 bg-transparent placeholder:text-slate-400 focus:outline-none"
            />
            {filter && (
                <Link
                    href={regions.url()}
                    viewTransition
                    aria-label="Filter wilayah"
                    className="text-slate-500"
                >
                    <Icon name="sliders" width={18} height={18} />
                </Link>
            )}
        </Form>
    );
}

function Greeting({ className }: { className?: string }) {
    const { auth } = usePage().props;

    return (
        <div className={cn('leading-tight', className)}>
            <p className="text-base font-semibold text-navy-900">
                Halo, {auth.user?.name.split(' ')[0] ?? 'Pembaca'}
            </p>
            <p className="text-xs text-slate-400">
                Kabar harian dari seluruh Nusantara
            </p>
        </div>
    );
}

function Logo({ className }: { className?: string }) {
    return (
        <Link
            href={home.url()}
            viewTransition
            className={cn('flex shrink-0 items-center gap-2.5', className)}
        >
            <span className="grid size-9 place-items-center rounded-xl bg-accent text-white shadow-sm shadow-accent/30">
                <Icon name="bolt" width={18} height={18} />
            </span>
            <span className="leading-none">
                <span className="block text-[17px] font-semibold tracking-tight text-navy-900">
                    Nusantara<span className="text-accent">News</span>
                </span>
                <span className="text-[10px] font-medium tracking-[0.18em] text-slate-400">
                    360 · INDONESIA
                </span>
            </span>
        </Link>
    );
}

export function SectionTitle({
    children,
    href,
}: {
    children: ReactNode;
    href?: string;
}) {
    return (
        <div className="mb-3 flex items-center justify-between sm:mb-4">
            <h2 className="text-lg font-semibold text-navy-900">{children}</h2>
            {href && (
                <Link
                    href={href}
                    viewTransition
                    className="text-sm font-medium text-accent hover:underline"
                >
                    Lihat semua
                </Link>
            )}
        </div>
    );
}
