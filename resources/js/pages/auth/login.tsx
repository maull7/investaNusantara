import { Form, Head, Link, usePage } from '@inertiajs/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
    register as registerAction,
    store,
} from '@/actions/App/Http/Controllers/AuthController';
import Icon, { type IconName } from '@/components/icons';
import { LogoMark } from '@/components/logo';
import { ease } from '@/components/motion';
import Ticker from '@/components/ticker';
import ZoneClock from '@/components/zone-clock';
import { cn } from '@/lib/utils';
import { home, login, register } from '@/routes';
import type { ArticleCard, Region } from '@/types';

type Mode = 'login' | 'register';

const COPY: Record<Mode, { title: string; lead: string; tagline: string }> = {
    login: {
        title: 'Masuk redaksi',
        lead: 'Khusus wartawan, editor, dan kontributor.',
        tagline: 'satu ruang redaksi.',
    },
    register: {
        title: 'Jadi kontributor',
        lead: 'Kirim kabar dari daerahmu. Editor meninjau sebelum terbit.',
        tagline: 'satu suara warga.',
    },
};

type Props = {
    mode: Mode;
    breaking: ArticleCard[];
    stats: { cities: number; weekly: number };
};

/** Thin-thick-thin rule, like the lines under a newspaper masthead. */
function Rule({ className }: { className?: string }) {
    return (
        <div aria-hidden className={cn('space-y-0.5', className)}>
            <div className="h-px bg-navy-900" />
            <div className="h-[3px] bg-navy-900" />
        </div>
    );
}

/** Login styled as a newspaper front page: masthead, lead story, and the form as its own column. */
export default function Login({ mode: initialMode, breaking, stats }: Props) {
    const { provinces } = usePage().props.nav;
    const [mode, setMode] = useState<Mode>(initialMode);
    const copy = COPY[mode];
    const [today, setToday] = useState('');

    // Client-only so server and browser render the same markup.
    useEffect(() => {
        setToday(
            new Intl.DateTimeFormat('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'Asia/Jakarta',
            }).format(new Date()),
        );
    }, []);

    // Switch tabs in place (no visit) but keep the address shareable.
    function switchTo(next: Mode) {
        if (next === mode) {
            return;
        }
        setMode(next);
        window.history.replaceState(
            window.history.state,
            '',
            next === 'login' ? login.url() : register.url(),
        );
    }

    return (
        <div className="flex min-h-dvh flex-col bg-[#faf7f5] text-navy-900">
            <Head title={copy.title} />

            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 sm:px-8">
                {/* Masthead */}
                <header className="pt-4 sm:pt-6">
                    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 pb-2 text-[11px] font-medium tracking-[0.18em] text-slate-500 uppercase">
                        <span>Edisi Redaksi</span>
                        <span className="hidden sm:inline">{today || ' '}</span>
                        <Link
                            href={home.url()}
                            viewTransition
                            className="flex items-center gap-1 hover:text-accent"
                        >
                            <Icon name="back" width={13} height={13} />
                            Beranda
                        </Link>
                    </div>
                    <Rule />
                    <Link
                        href={home.url()}
                        viewTransition
                        aria-label="NusantaraNews 360, ke beranda"
                        className="flex items-center justify-center gap-3 py-3 sm:gap-4 sm:py-5"
                    >
                        <LogoMark className="h-8 w-auto text-accent sm:h-12" />
                        <span className="text-3xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                            Nusantara<span className="text-accent">News</span>
                        </span>
                    </Link>
                    <Rule />
                    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2 text-[11px] font-medium tracking-[0.18em] text-slate-500 uppercase">
                        <span>360 · Indonesia</span>
                        <ZoneClock className="text-[11px]" />
                    </div>
                    <div aria-hidden className="h-px bg-navy-900/20" />
                </header>

                <main className="grid flex-1 gap-8 py-6 sm:py-8 lg:grid-cols-[1fr_minmax(0,22rem)] lg:gap-0">
                    {/* The form comes first on phones: it's why people are here. */}
                    <section
                        aria-labelledby="auth-title"
                        className="lg:order-2 lg:border-l lg:border-navy-900/15 lg:pl-10"
                    >
                        <Tabs mode={mode} onChange={switchTo} />
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                                key={mode}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.2, ease }}
                            >
                                <h1
                                    id="auth-title"
                                    className="text-2xl font-semibold tracking-tight"
                                >
                                    {copy.title}
                                </h1>
                                <p className="mt-1 mb-6 text-sm text-slate-500">
                                    {copy.lead}
                                </p>
                                {mode === 'login' ? (
                                    <LoginForm />
                                ) : (
                                    <RegisterForm />
                                )}
                            </motion.div>
                        </AnimatePresence>
                        <p className="mt-6 border-t border-navy-900/10 pt-4 text-sm text-slate-500">
                            {mode === 'login' ? (
                                <>
                                    Ingin mengirim kabar dari daerahmu?{' '}
                                    <button
                                        type="button"
                                        onClick={() => switchTo('register')}
                                        className="font-semibold text-accent hover:text-accent-dark"
                                    >
                                        Daftar jadi kontributor
                                    </button>
                                </>
                            ) : (
                                <>
                                    Sudah punya akun?{' '}
                                    <button
                                        type="button"
                                        onClick={() => switchTo('login')}
                                        className="font-semibold text-accent hover:text-accent-dark"
                                    >
                                        Masuk redaksi
                                    </button>
                                </>
                            )}
                        </p>
                    </section>

                    <LeadStory
                        provinces={provinces}
                        tagline={copy.tagline}
                        mode={mode}
                        cities={stats.cities}
                        weekly={stats.weekly}
                    />
                </main>
            </div>

            {breaking.length > 0 && (
                <footer className="mx-auto w-full max-w-6xl px-4 pb-4 sm:px-8 sm:pb-6">
                    <Ticker items={breaking} label="Terkini" />
                </footer>
            )}
        </div>
    );
}

function Tabs({
    mode,
    onChange,
}: {
    mode: Mode;
    onChange: (mode: Mode) => void;
}) {
    return (
        <div
            role="tablist"
            aria-label="Pilih masuk atau daftar"
            className="mb-6 flex gap-6 border-b border-navy-900/15"
        >
            {(
                [
                    ['login', 'Masuk'],
                    ['register', 'Daftar kontributor'],
                ] as const
            ).map(([value, label]) => (
                <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={mode === value}
                    onClick={() => onChange(value)}
                    className={cn(
                        'relative -mb-px pb-2.5 text-xs font-semibold tracking-[0.18em] uppercase transition-colors',
                        mode === value
                            ? 'text-accent'
                            : 'text-slate-400 hover:text-navy-900',
                    )}
                >
                    {label}
                    {mode === value && (
                        <motion.span
                            layoutId="auth-tab"
                            transition={{ duration: 0.25, ease }}
                            className="absolute inset-x-0 bottom-0 h-0.5 bg-accent"
                        />
                    )}
                </button>
            ))}
        </div>
    );
}

/** The "front page" story beside the form: headline, photo, and a numbers box. */
function LeadStory({
    provinces,
    tagline,
    mode,
    cities,
    weekly,
}: {
    provinces: Region[];
    tagline: string;
    mode: Mode;
    cities: number;
    weekly: number;
}) {
    const fmt = new Intl.NumberFormat('id-ID');
    const numbers = [
        [provinces.length, 'provinsi'],
        [cities, 'kabupaten/kota'],
        [weekly, 'berita 7 hari terakhir'],
    ] as const;

    return (
        <article className="border-t border-navy-900/15 pt-6 lg:order-1 lg:border-t-0 lg:pt-0 lg:pr-10">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
                Ruang Redaksi
            </p>
            <h2 className="mt-2 text-3xl leading-[1.1] font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                Dari {provinces.length} provinsi,{' '}
                <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                        key={mode}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-accent"
                    >
                        {tagline}
                    </motion.span>
                </AnimatePresence>
            </h2>
            <p className="mt-3 text-xs text-slate-500">
                Oleh{' '}
                <span className="font-semibold text-navy-900">
                    Redaksi NusantaraNews
                </span>
            </p>

            <div className="mt-5 grid gap-6 sm:grid-cols-[1fr_11rem]">
                <figure>
                    <Photo provinces={provinces} />
                </figure>
                <aside className="border-t-[3px] border-navy-900 pt-3 sm:border-t-0 sm:border-l sm:border-navy-900/15 sm:pt-0 sm:pl-5">
                    <p className="text-[11px] font-semibold tracking-[0.18em] uppercase">
                        Dalam angka
                    </p>
                    <dl className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-1 sm:gap-4">
                        {numbers.map(([value, label]) => (
                            <div key={label} className="flex flex-col-reverse">
                                <dt className="text-xs text-slate-500">
                                    {label}
                                </dt>
                                <dd className="text-2xl font-semibold tracking-tight tabular-nums">
                                    {fmt.format(value)}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </aside>
            </div>

            <p className="mt-6 text-sm leading-relaxed text-slate-600 first-letter:float-left first-letter:mt-1 first-letter:mr-2 first-letter:text-5xl first-letter:leading-none first-letter:font-semibold first-letter:text-accent sm:columns-2 sm:gap-8">
                Wartawan, editor, dan kontributor warga bekerja dari satu ruang
                redaksi. Tulis kabar dari daerahmu, ajukan ke editor wilayah,
                lalu terbitkan untuk pembaca di seluruh Nusantara. Kontributor
                baru bisa langsung menulis; setiap tulisan ditinjau editor
                sebelum tayang.
            </p>
        </article>
    );
}

/** Province landmark that slowly changes, with a newspaper-style caption. */
function Photo({ provinces }: { provinces: Region[] }) {
    const reduceMotion = useReducedMotion();
    const pool = useMemo(
        () => provinces.filter((p) => p.image_url),
        [provinces],
    );
    const [current, setCurrent] = useState(() => pool[0] ?? null);

    useEffect(() => {
        if (reduceMotion || pool.length < 2) {
            return;
        }
        let cancelled = false;
        const timer = window.setInterval(() => {
            const next = pool[Math.floor(Math.random() * pool.length)];
            // Swap only once the new photo is loaded, so it never fades into blank.
            const img = new Image();
            img.onload = () => !cancelled && setCurrent(next);
            img.src = next.image_url!;
        }, 6000);

        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [pool, reduceMotion]);

    return (
        <>
            <div className="relative aspect-[16/9] overflow-hidden bg-navy-900/5">
                <AnimatePresence initial={false}>
                    {current && (
                        <motion.img
                            key={current.code}
                            src={current.image_url!}
                            alt={`Lanskap ${current.name}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1, ease }}
                            className="absolute inset-0 size-full object-cover"
                        />
                    )}
                </AnimatePresence>
            </div>
            <figcaption className="mt-1.5 text-[11px] text-slate-500">
                {current ? `${current.name}.` : 'Nusantara.'} Liputan dari pusat
                sampai pelosok daerah.
            </figcaption>
        </>
    );
}

function LoginForm() {
    return (
        <Form
            action={store.url()}
            method="post"
            errorBag="login"
            resetOnError={['password']}
            className="space-y-4"
        >
            {({ errors, processing }) => (
                <>
                    <Field label="Email" icon="mail" error={errors.email}>
                        <input
                            name="email"
                            type="email"
                            required
                            autoFocus
                            autoComplete="email"
                            placeholder="nama@nusantaranews.id"
                            className={fieldClass}
                        />
                    </Field>
                    <PasswordField
                        name="password"
                        label="Password"
                        autoComplete="current-password"
                    />
                    <label className="flex w-fit items-center gap-2 text-sm text-slate-600">
                        <input
                            name="remember"
                            type="checkbox"
                            value="1"
                            className="size-4 rounded accent-accent"
                        />
                        Ingat saya
                    </label>
                    <Submit processing={processing}>Masuk</Submit>
                </>
            )}
        </Form>
    );
}

function RegisterForm() {
    return (
        <Form
            action={registerAction.url()}
            method="post"
            errorBag="register"
            resetOnError={['password', 'password_confirmation']}
            className="space-y-4"
        >
            {({ errors, processing }) => (
                <>
                    <Field label="Nama lengkap" icon="user" error={errors.name}>
                        <input
                            name="name"
                            required
                            autoFocus
                            autoComplete="name"
                            placeholder="Nama sesuai identitas"
                            className={fieldClass}
                        />
                    </Field>
                    <Field label="Email" icon="mail" error={errors.email}>
                        <input
                            name="email"
                            type="email"
                            required
                            autoComplete="email"
                            placeholder="nama@email.com"
                            className={fieldClass}
                        />
                    </Field>
                    <PasswordField
                        name="password"
                        label="Password"
                        autoComplete="new-password"
                        error={errors.password}
                    />
                    <PasswordField
                        name="password_confirmation"
                        label="Ulangi password"
                        autoComplete="new-password"
                    />
                    <Submit processing={processing}>Buat akun</Submit>
                </>
            )}
        </Form>
    );
}

const fieldClass =
    'w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 text-sm text-navy-900 placeholder:text-slate-400 transition focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none';

function Field({
    label,
    icon,
    error,
    children,
}: {
    label: string;
    icon: IconName;
    error?: string;
    children: ReactNode;
}) {
    return (
        <label className="block text-sm font-medium text-navy-900">
            {label}
            <span className="relative mt-1.5 block font-normal">
                <Icon
                    name={icon}
                    width={18}
                    height={18}
                    className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
                />
                {children}
            </span>
            {error && (
                <span className="mt-1 block text-xs font-normal text-accent">
                    {error}
                </span>
            )}
        </label>
    );
}

function PasswordField({
    name,
    label,
    autoComplete,
    error,
}: {
    name: string;
    label: string;
    autoComplete: string;
    error?: string;
}) {
    const [visible, setVisible] = useState(false);

    return (
        <Field label={label} icon="lock" error={error}>
            <input
                name={name}
                type={visible ? 'text' : 'password'}
                required
                autoComplete={autoComplete}
                className={cn(fieldClass, 'pr-11')}
            />
            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 hover:text-accent"
                aria-label={
                    visible ? 'Sembunyikan password' : 'Tampilkan password'
                }
            >
                <Icon
                    name={visible ? 'eye-off' : 'eye'}
                    width={18}
                    height={18}
                />
            </button>
        </Field>
    );
}

function Submit({
    processing,
    children,
}: {
    processing: boolean;
    children: ReactNode;
}) {
    return (
        <button
            disabled={processing}
            className="w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-white shadow-sm shadow-accent/30 transition hover:bg-accent-dark disabled:opacity-60"
        >
            {processing ? 'Memproses…' : children}
        </button>
    );
}
