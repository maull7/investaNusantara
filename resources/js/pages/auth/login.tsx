import { Form, Head, Link, usePage } from '@inertiajs/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
    register as registerAction,
    store,
} from '@/actions/App/Http/Controllers/AuthController';
import Icon, { type IconName } from '@/components/icons';
import Logo from '@/components/logo';
import { ease } from '@/components/motion';
import { cn } from '@/lib/utils';
import { home, login, register } from '@/routes';
import type { Region } from '@/types';

type Mode = 'login' | 'register';

const COPY: Record<Mode, { title: string; lead: string; tagline: string }> = {
    login: {
        title: 'Masuk redaksi',
        lead: 'Khusus wartawan, editor, dan kontributor.',
        tagline: 'satu ruang redaksi.',
    },
    register: {
        title: 'Jadi kontributor',
        lead: 'Kirim kabar dari daerahmu. Editor akan meninjau sebelum terbit.',
        tagline: 'satu suara warga.',
    },
};

export default function Login({ mode: initialMode }: { mode: Mode }) {
    const { provinces } = usePage().props.nav;
    const [mode, setMode] = useState<Mode>(initialMode);
    const copy = COPY[mode];

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
        <div className="min-h-screen bg-[#faf7f5] lg:grid lg:grid-cols-[1.1fr_1fr]">
            <Head title={copy.title} />

            {/* Photo panel: short banner on phones, full height on desktop. */}
            <aside className="relative h-56 overflow-hidden bg-merah-dark sm:h-64 lg:sticky lg:top-0 lg:h-screen">
                <Mosaic provinces={provinces} />
                <span className="absolute inset-0 bg-gradient-to-t from-merah-dark via-merah-dark/80 to-merah/60" />

                <div className="relative flex h-full flex-col justify-between p-6 text-white sm:p-8 lg:p-12">
                    <Logo inverted />
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.6, ease }}
                    >
                        <h2 className="text-2xl leading-tight font-semibold sm:text-3xl lg:text-4xl">
                            Dari {provinces.length} provinsi,
                            <br />
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.span
                                    key={mode}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -12 }}
                                    transition={{ duration: 0.3, ease }}
                                    className="inline-block"
                                >
                                    {copy.tagline}
                                </motion.span>
                            </AnimatePresence>
                        </h2>
                        <p className="mt-2 hidden max-w-sm text-sm text-white/80 sm:block">
                            Tulis, sunting, dan terbitkan kabar dari seluruh
                            Nusantara.
                        </p>
                        <div className="mt-5 hidden gap-1.5 lg:flex">
                            {(['login', 'register'] as const).map((m) => (
                                <motion.span
                                    key={m}
                                    animate={{
                                        width: m === mode ? 32 : 12,
                                        opacity: m === mode ? 1 : 0.4,
                                    }}
                                    transition={{ duration: 0.4, ease }}
                                    className="h-1 rounded-full bg-white"
                                />
                            ))}
                        </div>
                    </motion.div>
                </div>
            </aside>

            <main className="flex items-start justify-center px-4 py-8 sm:py-12 lg:items-center">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease }}
                    className="-mt-16 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 shadow-merah-dark/10 ring-accent/10 sm:p-8 lg:mt-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:ring-0"
                >
                    <Tabs mode={mode} onChange={switchTo} />

                    <AutoHeight>
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                                key={mode}
                                initial={{
                                    opacity: 0,
                                    x: mode === 'register' ? 24 : -24,
                                }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{
                                    opacity: 0,
                                    x: mode === 'register' ? -24 : 24,
                                }}
                                transition={{ duration: 0.25, ease }}
                            >
                                <h1 className="text-2xl font-semibold text-navy-900">
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
                    </AutoHeight>

                    <Link
                        href={home.url()}
                        viewTransition
                        className="mt-6 flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-accent"
                    >
                        <Icon name="back" width={16} height={16} />
                        Kembali ke beranda
                    </Link>
                </motion.div>
            </main>
        </div>
    );
}

const TILES = 9;

/** 3x3 landmark grid where one random tile at a time cross-fades to another province. */
function Mosaic({ provinces }: { provinces: Region[] }) {
    const reduceMotion = useReducedMotion();
    const [tiles, setTiles] = useState(() =>
        provinces
            .filter((p) => p.image_url)
            .sort(() => Math.random() - 0.5)
            .slice(0, TILES),
    );
    const shown = useRef(tiles);

    useEffect(() => {
        shown.current = tiles;
    }, [tiles]);

    useEffect(() => {
        const pool = provinces.filter((p) => p.image_url);
        if (reduceMotion || pool.length <= TILES) {
            return;
        }
        let timer: number;
        let cancelled = false;

        function swapOne() {
            const codes = new Set(shown.current.map((t) => t.code));
            const spare = pool.filter((p) => !codes.has(p.code));
            const next = spare[Math.floor(Math.random() * spare.length)];
            const slot = Math.floor(Math.random() * TILES);
            // Swap only once the new photo is loaded, so a tile never fades into blank.
            const img = new Image();
            img.onload = () => {
                if (!cancelled) {
                    setTiles((latest) =>
                        latest.map((t, i) => (i === slot ? next : t)),
                    );
                }
            };
            img.src = next.image_url!;
            // Irregular rhythm so the grid feels alive rather than mechanical.
            timer = window.setTimeout(swapOne, 1400 + Math.random() * 1800);
        }

        timer = window.setTimeout(swapOne, 2000);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [provinces, reduceMotion]);

    return (
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0.5">
            {tiles.map((p, i) => (
                <div key={i} className="relative overflow-hidden bg-merah-dark">
                    <AnimatePresence initial={false}>
                        <motion.img
                            key={p.code}
                            src={p.image_url!}
                            alt=""
                            initial={{ opacity: 0, scale: 1.12 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.1, ease }}
                            className="absolute inset-0 size-full object-cover"
                        />
                    </AnimatePresence>
                </div>
            ))}
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
            className="mb-6 grid grid-cols-2 rounded-xl bg-accent/5 p-1 ring-1 ring-accent/10"
        >
            {(
                [
                    ['login', 'Masuk'],
                    ['register', 'Daftar'],
                ] as const
            ).map(([value, label]) => (
                <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={mode === value}
                    onClick={() => onChange(value)}
                    className={cn(
                        'relative rounded-lg py-2 text-sm font-medium transition-colors',
                        mode === value
                            ? 'text-white'
                            : 'text-slate-500 hover:text-accent',
                    )}
                >
                    {mode === value && (
                        <motion.span
                            layoutId="auth-tab"
                            transition={{
                                type: 'spring',
                                stiffness: 420,
                                damping: 34,
                            }}
                            className="absolute inset-0 rounded-lg bg-accent shadow-sm shadow-accent/30"
                        />
                    )}
                    <span className="relative">{label}</span>
                </button>
            ))}
        </div>
    );
}

/** Animates its own height to fit the content, so swapping forms doesn't jump. */
function AutoHeight({ children }: { children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState<number | 'auto'>('auto');

    useEffect(() => {
        const el = ref.current;
        if (!el) {
            return;
        }
        const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
        observer.observe(el);

        return () => observer.disconnect();
    }, []);

    return (
        <motion.div
            animate={{ height }}
            transition={{ duration: 0.3, ease }}
            // Negative margin + padding keeps focus rings from being clipped.
            className="-m-1 overflow-hidden"
        >
            <div ref={ref} className="p-1">
                {children}
            </div>
        </motion.div>
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
