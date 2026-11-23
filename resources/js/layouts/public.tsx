import { Form, Link, router, usePage } from '@inertiajs/react';
import {
    MotionConfig,
    motion,
    useMotionValueEvent,
    useScroll,
} from 'motion/react';
import {
    type ReactNode,
    type TouchEvent,
    useEffect,
    useRef,
    useState,
} from 'react';
import CategoryTabs from '@/components/category-tabs';
import Icon, { type IconName } from '@/components/icons';
import InstallPrompt from '@/components/install-prompt';
import Logo from '@/components/logo';
import PushFollow from '@/components/push-follow';
import { ease } from '@/components/motion';
import { INFO_LINKS } from '@/lib/info-links';
import { regionHref } from '@/lib/news';
import { cn } from '@/lib/utils';
import {
    agenda as agendaRoute,
    bookmarks,
    category,
    dashboard,
    home,
    info,
    login,
    logout,
    membership,
    regions,
    search,
    sentiment,
} from '@/routes';
import { index as adminArticles } from '@/routes/admin/articles';

/**
 * default: navbar + category tabs.
 * home:    on phones the navbar shows a greeting, a search field and the tabs.
 * article: on phones there is no top bar; the page draws a full-bleed cover.
 */
type Variant = 'default' | 'home' | 'article';

const spring = { type: 'spring', stiffness: 400, damping: 32 } as const;

// Last visited category tab. The layout remounts when the page component
// changes (home -> category), so the previous tab has to outlive it.
let lastTab = -1;

/** True when the touch started inside something that scrolls sideways itself (carousels, chip rows). */
function insideHorizontalScroller(target: EventTarget | null, stop: Element) {
    for (
        let el = target instanceof Element ? target : null;
        el && el !== stop;
        el = el.parentElement
    ) {
        const overflow = getComputedStyle(el).overflowX;
        if (
            (overflow === 'auto' || overflow === 'scroll') &&
            el.scrollWidth > el.clientWidth + 1
        ) {
            return true;
        }
    }
    return false;
}

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
    // Pelanggan read the public site only: no newsroom link for them.
    const staff = auth.user && auth.user.role !== 'customer';
    const redaksi = staff ? adminArticles.url() : login.url();
    const menu: {
        href: string;
        label: string;
        icon: IconName;
        post?: boolean;
    }[] = [
        { href: home.url(), label: 'Beranda', icon: 'home' },
        { href: regions.url(), label: 'Wilayah', icon: 'map' },
        { href: agendaRoute.url(), label: 'Agenda', icon: 'clock' },
        { href: search.url(), label: 'Cari', icon: 'search' },
        auth.user && !staff
            ? { href: logout.url(), label: 'Keluar', icon: 'user', post: true }
            : {
                  href: redaksi,
                  label: staff ? 'Redaksi' : 'Masuk',
                  icon: 'user',
              },
    ];
    const isActive = (href: string) =>
        href === '/' ? path === '/' : path.startsWith(href);
    const activeTab = tabItems.findIndex((t) => isActive(t.href));

    // Slide direction for the page content: +1 = came from a tab on the left.
    const [slide, setSlide] = useState(() => ({
        path,
        dir:
            lastTab >= 0 && activeTab >= 0 && activeTab !== lastTab
                ? Math.sign(activeTab - lastTab)
                : 0,
        from: activeTab,
    }));
    if (slide.path !== path) {
        // Same page component, new category: adjust during render (no extra paint).
        setSlide({
            path,
            dir:
                slide.from >= 0 && activeTab >= 0 && activeTab !== slide.from
                    ? Math.sign(activeTab - slide.from)
                    : 0,
            from: activeTab,
        });
    }
    useEffect(() => {
        lastTab = activeTab;
    }, [activeTab]);

    // At the top the navbar is attached full-width; once the page scrolls it
    // detaches into a floating pill that drops in from above.
    const { scrollY } = useScroll();
    const [floating, setFloating] = useState(false);
    useMotionValueEvent(scrollY, 'change', (y) =>
        // The phone home header isn't sticky (it scrolls away), so it never floats.
        setFloating(y > 24 && !(isHome && window.innerWidth < 768)),
    );

    // Phones: swipe left/right on the content to move to the next/previous category.
    const touch = useRef<{ x: number; y: number; ignore: boolean } | null>(
        null,
    );
    function onTouchStart(e: TouchEvent<HTMLElement>) {
        const t = e.touches[0];
        touch.current = {
            x: t.clientX,
            y: t.clientY,
            ignore: insideHorizontalScroller(e.target, e.currentTarget),
        };
    }
    function onTouchEnd(e: TouchEvent<HTMLElement>) {
        const start = touch.current;
        touch.current = null;
        if (!tabs || activeTab < 0 || !start || start.ignore) {
            return;
        }
        const t = e.changedTouches[0];
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 2) {
            return;
        }
        const next = tabItems[activeTab + (dx < 0 ? 1 : -1)];
        if (next) {
            router.visit(next.href);
        }
    }

    return (
        <MotionConfig reducedMotion="user">
            <div className="theme-public min-h-screen bg-nusantara pb-24 text-slate-700 md:pb-0">
                <header
                    className={cn(
                        'top-0 z-30',
                        // On the phone home screen the header scrolls away like an app feed.
                        isHome ? 'relative md:sticky' : 'sticky',
                        variant === 'article' && 'hidden md:block',
                    )}
                >
                    {/* Transforms only (no padding/height change), so the page never jumps. */}
                    <motion.div
                        animate={
                            floating
                                ? { y: [-28, 12], opacity: [0.4, 1] }
                                : { y: 0, opacity: 1 }
                        }
                        transition={
                            floating
                                ? {
                                      type: 'spring',
                                      stiffness: 300,
                                      damping: 22,
                                  }
                                : { duration: 0.35, ease }
                        }
                        className={cn(
                            'mx-auto border bg-surface/85 backdrop-blur-xl backdrop-saturate-150 transition-[width,max-width,border-radius,box-shadow,border-color,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                            floating
                                ? 'w-[calc(100%-1.5rem)] max-w-[74rem] rounded-[1.75rem] border-accent/10 bg-surface/90 shadow-[0_14px_40px_-14px_rgba(165,14,30,0.35)]'
                                : 'w-full max-w-full rounded-none border-transparent border-b-accent/10 shadow-none',
                        )}
                    >
                        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
                            {isHome && <Greeting className="md:hidden" />}
                            <Logo className={cn(isHome && 'hidden md:flex')} />

                            {/* Laptop links */}
                            <nav className="ml-2 hidden h-full shrink-0 items-stretch gap-1 md:flex lg:ml-6">
                                {[
                                    ...menu.slice(0, 3),
                                    // Desktop only: the phone bottom bar has no room for a fifth tab.
                                    {
                                        href: sentiment.url(),
                                        label: 'Sentimen',
                                        icon: 'chart' as const,
                                    },
                                ].map((i) => {
                                    const active = isActive(i.href);

                                    return (
                                        <Link
                                            key={i.href}
                                            href={i.href}
                                            viewTransition
                                            aria-label={i.label}
                                            title={i.label}
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
                                            {/* Icon only below lg, so the bar never overflows on tablets. */}
                                            <span className="hidden lg:inline">
                                                {i.label}
                                            </span>
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

                            {/* Takes the space the links leave; the search field shrinks first. */}
                            <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2.5">
                                <SearchField className="hidden max-w-72 min-w-0 flex-1 xl:flex" />
                                <Link
                                    href={search.url()}
                                    viewTransition
                                    aria-label="Cari berita"
                                    className="hidden size-10 shrink-0 place-items-center rounded-full bg-accent/5 text-navy-900 ring-1 ring-accent/10 md:grid xl:hidden"
                                >
                                    <Icon
                                        name="search"
                                        width={18}
                                        height={18}
                                    />
                                </Link>
                                <ThemeToggle />
                                {!isHome && (
                                    <Link
                                        href={search.url()}
                                        viewTransition
                                        aria-label="Cari berita"
                                        className="grid size-10 place-items-center rounded-full bg-accent/5 text-navy-900 ring-1 ring-accent/10 md:hidden"
                                    >
                                        <Icon
                                            name="search"
                                            width={18}
                                            height={18}
                                        />
                                    </Link>
                                )}
                                {isHome && (
                                    <Link
                                        // Signed-in readers have no newsroom: their avatar opens "Dashboard saya".
                                        href={
                                            auth.user && !staff
                                                ? dashboard.url()
                                                : redaksi
                                        }
                                        aria-label="Akun"
                                        className="grid size-10 place-items-center rounded-full bg-accent/5 text-accent ring-1 ring-accent/10 md:hidden"
                                    >
                                        {auth.user ? (
                                            <span className="text-sm font-semibold">
                                                {auth.user.name[0]}
                                            </span>
                                        ) : (
                                            <Icon
                                                name="user"
                                                width={18}
                                                height={18}
                                            />
                                        )}
                                    </Link>
                                )}
                                {auth.user && !staff ? (
                                    <UserMenu name={auth.user.name} />
                                ) : (
                                    <Link
                                        href={redaksi}
                                        className="hidden shrink-0 items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium whitespace-nowrap text-white shadow-sm shadow-accent/30 transition hover:bg-accent-dark md:flex"
                                    >
                                        <Icon
                                            name="user"
                                            width={16}
                                            height={16}
                                        />
                                        {staff ? 'Ruang Redaksi' : 'Masuk'}
                                    </Link>
                                )}
                            </div>
                        </div>

                        {isHome && (
                            <div className="px-4 pb-1 md:hidden">
                                <SearchField filter />
                            </div>
                        )}

                        {tabs && (
                            <CategoryTabs
                                tabs={tabItems}
                                activeIndex={activeTab}
                            />
                        )}
                    </motion.div>
                </header>

                <motion.main
                    key={path}
                    // Between category tabs the content slides in from the side it came from.
                    initial={
                        slide.dir
                            ? { opacity: 0, x: slide.dir * 56 }
                            : { opacity: 0, y: 12 }
                    }
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    transition={{ duration: 0.45, ease }}
                    onTouchStart={tabs ? onTouchStart : undefined}
                    onTouchEnd={tabs ? onTouchEnd : undefined}
                    className={cn(
                        'mx-auto max-w-6xl',
                        variant === 'article'
                            ? 'md:px-4 md:py-8'
                            : 'px-4 py-5 sm:py-8',
                    )}
                >
                    {children}
                </motion.main>

                <footer className="mt-12 hidden border-t border-accent/10 bg-surface md:block">
                    <div className="mx-auto max-w-6xl px-4 py-10 text-sm">
                        <div className="flex items-end justify-between gap-6">
                            <div>
                                <Logo />
                                <p className="mt-2 text-slate-500">
                                    Satu Indonesia, Ribuan Cerita
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-4">
                                <PushFollow className="py-1.5" />
                                <Link
                                    href={membership.url()}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 font-medium text-accent transition hover:bg-accent hover:text-white"
                                >
                                    <Icon name="star" width={14} height={14} />
                                    Langganan Media Intelligence
                                </Link>
                                <Link
                                    href={regions.url()}
                                    viewTransition
                                    className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                                >
                                    Jelajah 514 kabupaten/kota
                                    <Icon
                                        name="chevron"
                                        width={16}
                                        height={16}
                                    />
                                </Link>
                            </div>
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
                        <div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-accent/10 pt-6 text-xs text-slate-400">
                            <p>
                                © {new Date().getFullYear()} NusantaraNews ·
                                Peta wilayah: geoBoundaries (CC BY 3.0 IGO)
                            </p>
                            <InfoLinks />
                        </div>
                    </div>
                </footer>

                {/* Phones: the full footer is hidden, but the info pages stay reachable. */}
                <InstallPrompt />

                <div className="px-4 pt-6 pb-4 text-xs text-slate-400 md:hidden">
                    <PushFollow className="mb-4 text-xs" />
                    <InfoLinks />
                    <p className="mt-3">
                        © {new Date().getFullYear()} NusantaraNews
                    </p>
                </div>

                {/* App-style bottom navigation on phones */}
                <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-accent/10 bg-surface/90 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden">
                    <div className="flex justify-around">
                        {menu.map((i) => {
                            const active = isActive(i.href);

                            return (
                                <Link
                                    key={i.label}
                                    href={i.href}
                                    method={i.post ? 'post' : undefined}
                                    as={i.post ? 'button' : undefined}
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
        </MotionConfig>
    );
}

/** Name pill that opens a small dropdown with "Keluar". */
function UserMenu({ name }: { name: string }) {
    const [open, setOpen] = useState(false);
    const box = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) {
            return;
        }
        const close = (e: MouseEvent | KeyboardEvent) => {
            if (
                e instanceof KeyboardEvent
                    ? e.key === 'Escape'
                    : !box.current?.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', close);

        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', close);
        };
    }, [open]);

    return (
        <div ref={box} className="relative hidden md:block">
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full bg-accent/5 py-1.5 pr-3 pl-1.5 text-sm font-medium text-navy-900 ring-1 ring-accent/10 transition hover:bg-accent/10"
            >
                <span className="grid size-7 place-items-center rounded-full bg-accent text-xs font-semibold text-white">
                    {name[0]}
                </span>
                <span className="max-w-28 truncate">{name.split(' ')[0]}</span>
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
            {open && (
                <div
                    role="menu"
                    className="absolute right-0 mt-2 w-48 overflow-hidden rounded-2xl border border-accent/10 bg-surface p-1.5 shadow-lg shadow-accent/10"
                >
                    <p className="truncate px-3 py-1.5 text-xs text-slate-400">
                        {name}
                    </p>
                    <Link
                        href={dashboard.url()}
                        role="menuitem"
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-accent/5 hover:text-accent"
                    >
                        <Icon name="home" width={16} height={16} />
                        Dashboard saya
                    </Link>
                    <Link
                        href={membership.url()}
                        role="menuitem"
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-accent/5 hover:text-accent"
                    >
                        <Icon name="star" width={16} height={16} />
                        Langganan data
                    </Link>
                    <Link
                        href={bookmarks.url()}
                        role="menuitem"
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-accent/5 hover:text-accent"
                    >
                        <Icon name="bookmark" width={16} height={16} />
                        Berita tersimpan
                    </Link>
                    <Link
                        href={logout.url()}
                        method="post"
                        as="button"
                        role="menuitem"
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-accent/5 hover:text-accent"
                    >
                        <Icon name="logout" width={16} height={16} />
                        Keluar
                    </Link>
                </div>
            )}
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
                'flex items-center gap-2.5 rounded-full bg-accent/5 px-4 py-2.5 text-sm ring-1 ring-accent/10 transition focus-within:bg-surface focus-within:ring-2 focus-within:ring-accent/30 md:py-2',
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

/** Light/dark switch; the choice is remembered on this device (read by app.blade.php). */
function ThemeToggle() {
    const [dark, setDark] = useState(() =>
        document.documentElement.classList.contains('dark'),
    );

    function toggle() {
        const next = !dark;
        document.documentElement.classList.toggle('dark', next);
        try {
            localStorage.setItem('theme', next ? 'dark' : 'light');
        } catch {
            // Private mode: the switch still works for this visit.
        }
        setDark(next);
    }

    return (
        <button
            type="button"
            onClick={toggle}
            aria-label={dark ? 'Mode terang' : 'Mode gelap'}
            aria-pressed={dark}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/5 text-navy-900 ring-1 ring-accent/10 transition active:scale-90"
        >
            <Icon name={dark ? 'sun' : 'moon'} width={18} height={18} />
        </button>
    );
}

function InfoLinks() {
    return (
        <nav aria-label="Informasi" className="flex flex-wrap gap-x-4 gap-y-2">
            {INFO_LINKS.map((l) => (
                <Link
                    key={l.slug}
                    href={info.url(l.slug)}
                    className="transition hover:text-accent"
                >
                    {l.label}
                </Link>
            ))}
        </nav>
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
