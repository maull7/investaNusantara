import MembershipOfferDialog from '@/components/membership-offer-dialog';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { motion } from 'motion/react';
import { type FormEvent, useEffect, useRef } from 'react';
import Icon, { type IconName } from '@/components/icons';
import { Reveal, Stagger, ease } from '@/components/motion';
import PublicLayout from '@/layouts/public';
import { cn } from '@/lib/utils';
import { login } from '@/routes';
import { apply } from '@/routes/membership';
import { insights } from '@/routes/admin';

type Plan = {
    id: number;
    slug: string;
    name: string;
    tagline: string | null;
    price: number;
    max_provinces: number | null;
    benefits: string[];
    highlighted: boolean;
};

type Props = {
    plans: Plan[];
    provinces: { code: string; name: string }[];
    application: {
        id: number;
        status: 'pending' | 'approved' | 'rejected';
        admin_note: string | null;
        months: number;
        created_at: string;
        plan: { id: number; name: string };
    } | null;
    member: {
        organization: string | null;
        ends_at: string | null;
        active: boolean;
    } | null;
    canApply: boolean;
};

const rupiah = new Intl.NumberFormat('id-ID');
const dateFmt = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' });

const FEATURES: { icon: IconName; title: string; text: string }[] = [
    {
        icon: 'flame',
        title: 'Topik paling dibaca',
        text: 'Lihat isu yang paling menarik perhatian warga di daerah Anda, setiap hari.',
    },
    {
        icon: 'arrow',
        title: 'Kata kunci yang naik',
        text: 'Tangkap isu sejak awal: kata kunci yang melonjak dibanding periode sebelumnya.',
    },
    {
        icon: 'chart',
        title: 'Sentimen per daerah',
        text: 'Nada berita positif, netral, dan negatif per provinsi hingga kabupaten/kota.',
    },
    {
        icon: 'map',
        title: 'Isu nasional berkembang',
        text: 'Isu yang menyebar lintas provinsi, lengkap dengan jumlah daerah yang terdampak.',
    },
    {
        icon: 'file',
        title: 'Rincian artikel',
        text: 'Klik topik atau daerah untuk melihat berita di baliknya beserta jumlah pembacanya.',
    },
    {
        icon: 'upload',
        title: 'Laporan siap pakai',
        text: 'Ekspor CSV untuk Excel dan cetak PDF untuk rapat pimpinan.',
    },
];

const FAQ = [
    [
        'Siapa yang cocok berlangganan?',
        'Pemerintah daerah, humas instansi, perusahaan, konsultan, dan peneliti yang perlu memantau pemberitaan dan opini publik di daerah.',
    ],
    [
        'Dari mana datanya?',
        'Dari seluruh berita NusantaraNews: berita redaksi dan ringkasan AI dari media daerah, beserta jumlah pembaca hariannya. Sentimen ditentukan AI dan diperiksa redaksi.',
    ],
    [
        'Bagaimana cara pembayaran?',
        'Setelah pengajuan dikirim, tim kami menghubungi Anda melalui WhatsApp/email untuk penawaran dan pembayaran. Akses aktif setelah pengajuan disetujui.',
    ],
    [
        'Bisa ganti atau tambah provinsi?',
        'Bisa. Ajukan lagi dengan paket dan provinsi baru; masa langganan diperpanjang dari tanggal berakhir yang sekarang.',
    ],
] as const;

/** Public "Langganan": promotion, plans with benefits, and the application form. */
export default function Membership({
    plans,
    provinces,
    application,
    member,
    canApply,
}: Props) {
    const { auth, flash } = usePage().props;
    const offerRef = useRef<HTMLDialogElement>(null);
    const offer = plans.find((p) => p.highlighted) ?? plans[0];
    const offerEligible =
        !!offer &&
        !member?.active &&
        application?.status !== 'pending' &&
        (!auth.user || canApply);

    useEffect(() => {
        if (!offerEligible) return;
        let seen = false;
        try {
            seen = sessionStorage.getItem('membership-offer-seen') === '1';
        } catch {
            /* Storage may be unavailable. */
        }
        if (seen) return;
        const timer = window.setTimeout(() => {
            offerRef.current?.showModal();
            try {
                sessionStorage.setItem('membership-offer-seen', '1');
            } catch {
                /* The offer still works without storage. */
            }
        }, 1800);
        return () => window.clearTimeout(timer);
    }, [offerEligible]);

    const formRef = useRef<HTMLDivElement>(null);
    const form = useForm({
        plan: (plans.find((p) => p.highlighted) ?? plans[0])?.id ?? 0,
        organization: member?.organization ?? '',
        contact: '',
        months: 3,
        provinces: [] as string[],
        note: '',
    });
    const plan = plans.find((p) => p.id === form.data.plan);
    const pending = application?.status === 'pending';

    function choose(p: Plan) {
        form.setData((d) => ({
            ...d,
            plan: p.id,
            provinces:
                p.max_provinces === null
                    ? []
                    : d.provinces.slice(0, p.max_provinces),
        }));
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function toggleProvince(code: string) {
        const has = form.data.provinces.includes(code);
        if (
            !has &&
            plan?.max_provinces &&
            form.data.provinces.length >= plan.max_provinces
        ) {
            return;
        }
        form.setData(
            'provinces',
            has
                ? form.data.provinces.filter((c) => c !== code)
                : [...form.data.provinces, code],
        );
    }

    function submit(e: FormEvent) {
        e.preventDefault();
        form.post(apply.url(), {
            preserveScroll: true,
            onSuccess: () => form.reset('note'),
        });
    }

    return (
        <PublicLayout tabs={false}>
            <Head title="Langganan Media Intelligence" />
            {offer && offerEligible && (
                <MembershipOfferDialog
                    offer={offer}
                    offerRef={offerRef}
                    onChoose={() => choose(offer)}
                    onCompare={() =>
                        document
                            .getElementById('paket')
                            ?.scrollIntoView({ behavior: 'smooth' })
                    }
                />
            )}
            <Stagger className="space-y-12">
                {/* Hero */}
                <Reveal className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-accent via-merah to-merah-dark p-7 text-white shadow-xl shadow-accent/20 sm:p-12">
                    <span className="absolute -top-24 -right-24 size-72 rounded-full bg-white/10" />
                    <span className="absolute -bottom-32 left-1/3 size-72 rounded-full bg-white/5" />
                    <div className="relative max-w-2xl">
                        <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide uppercase ring-1 ring-white/25">
                            <Icon name="star" width={13} height={13} />
                            Media Intelligence
                        </p>
                        <h1 className="mt-4 text-3xl leading-tight font-semibold sm:text-5xl">
                            Pahami daerah Anda lewat data berita
                        </h1>
                        <p className="mt-3 text-base text-white/85 sm:text-lg">
                            Topik yang ramai, sentimen warga, dan isu yang
                            sedang berkembang di 38 provinsi, dalam satu
                            dashboard yang mudah dibaca.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-2">
                            <a
                                href="#paket"
                                className="btn bg-white px-5 py-3 text-accent shadow-lg hover:bg-white/90"
                            >
                                Lihat paket
                            </a>
                            <button
                                type="button"
                                onClick={() =>
                                    formRef.current?.scrollIntoView({
                                        behavior: 'smooth',
                                    })
                                }
                                className="btn px-5 py-3 text-white ring-1 ring-white/40 hover:bg-white/10"
                            >
                                Ajukan langganan
                            </button>
                        </div>
                    </div>
                    <dl className="relative mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {[
                            ['38', 'provinsi'],
                            ['514', 'kabupaten/kota'],
                            ['Harian', 'data pembaca'],
                            ['AI', '+ verifikasi redaksi'],
                        ].map(([value, label]) => (
                            <div key={label}>
                                <dt className="text-2xl font-semibold">
                                    {value}
                                </dt>
                                <dd className="text-xs text-white/75">
                                    {label}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </Reveal>

                {(flash.success || member || application) && (
                    <StatusCard
                        member={member}
                        application={application}
                        flash={flash.success}
                    />
                )}

                {/* Benefits */}
                <section>
                    <Reveal>
                        <h2 className="text-2xl font-semibold text-navy-900">
                            Yang Anda dapatkan
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Semua paket memakai dashboard yang sama; bedanya
                            cakupan wilayah.
                        </p>
                    </Reveal>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {FEATURES.map((f, i) => (
                            <motion.div
                                key={f.title}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{
                                    delay: i * 0.05,
                                    duration: 0.4,
                                    ease,
                                }}
                                whileHover={{ y: -4 }}
                                className="card p-5"
                            >
                                <span className="grid size-11 place-items-center rounded-2xl bg-accent/10 text-accent">
                                    <Icon
                                        name={f.icon}
                                        width={20}
                                        height={20}
                                    />
                                </span>
                                <h3 className="mt-3 font-semibold text-navy-900">
                                    {f.title}
                                </h3>
                                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                                    {f.text}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Plans */}
                <section id="paket" className="scroll-mt-24">
                    <Reveal className="text-center">
                        <h2 className="text-2xl font-semibold text-navy-900">
                            Pilih paket
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Pilih cakupan sesuai kebutuhan. Harga per bulan;
                            pembayaran dikoordinasikan bersama tim kami.
                        </p>
                    </Reveal>
                    {offerEligible && (
                        <div className="mt-4 text-center">
                            <button
                                type="button"
                                onClick={() => offerRef.current?.showModal()}
                                className="btn-primary"
                            >
                                Lihat penawaran untuk Anda
                            </button>
                        </div>
                    )}
                    {plans.length === 0 && (
                        <p className="mt-6 rounded-2xl bg-slate-50 p-6 text-center text-slate-600">
                            Paket sedang diperbarui. Silakan kunjungi kembali
                            nanti.
                        </p>
                    )}
                    <div className="mt-8 grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {plans.map((p) => (
                            <motion.div
                                key={p.id}
                                whileHover={{ y: -6 }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 300,
                                    damping: 22,
                                }}
                                className={cn(
                                    'relative flex flex-col rounded-3xl p-6 ring-1',
                                    p.highlighted
                                        ? 'bg-[#0a1c36] text-white shadow-2xl shadow-[#0a1c36]/20 ring-[#0a1c36]'
                                        : 'bg-surface ring-slate-200',
                                )}
                            >
                                {p.highlighted && (
                                    <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold tracking-wide text-white uppercase shadow">
                                        Paling populer
                                    </span>
                                )}
                                <h3
                                    className={cn(
                                        'text-lg font-semibold',
                                        !p.highlighted && 'text-navy-900',
                                    )}
                                >
                                    {p.name}
                                </h3>
                                <p
                                    className={cn(
                                        'text-sm',
                                        p.highlighted
                                            ? 'text-white/70'
                                            : 'text-slate-500',
                                    )}
                                >
                                    {p.tagline}
                                </p>
                                <p className="mt-5">
                                    {p.price > 0 ? (
                                        <>
                                            <span className="text-sm">Rp</span>{' '}
                                            <span className="text-3xl font-semibold">
                                                {rupiah.format(p.price)}
                                            </span>
                                            <span
                                                className={cn(
                                                    'text-sm',
                                                    p.highlighted
                                                        ? 'text-white/70'
                                                        : 'text-slate-500',
                                                )}
                                            >
                                                {' '}
                                                /bulan
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-2xl font-semibold">
                                            Hubungi kami
                                        </span>
                                    )}
                                </p>
                                <p
                                    className={cn(
                                        'mt-1 text-xs',
                                        p.highlighted
                                            ? 'text-white/70'
                                            : 'text-slate-500',
                                    )}
                                >
                                    {p.max_provinces === null
                                        ? 'Seluruh Indonesia'
                                        : `Hingga ${p.max_provinces} provinsi`}
                                </p>
                                <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                                    {p.benefits.map((b) => (
                                        <li key={b} className="flex gap-2.5">
                                            <Icon
                                                name="check"
                                                width={16}
                                                height={16}
                                                strokeWidth={2.4}
                                                className={cn(
                                                    'mt-0.5 shrink-0',
                                                    p.highlighted
                                                        ? 'text-white'
                                                        : 'text-accent',
                                                )}
                                            />
                                            <span
                                                className={
                                                    p.highlighted
                                                        ? 'text-white/90'
                                                        : 'text-slate-600'
                                                }
                                            >
                                                {b}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    type="button"
                                    onClick={() => choose(p)}
                                    className={cn(
                                        'btn mt-6 w-full py-3',
                                        p.highlighted
                                            ? 'bg-accent text-white shadow-lg shadow-accent/30 hover:bg-accent-dark'
                                            : 'bg-accent/5 text-accent ring-1 ring-accent/20 hover:bg-accent hover:text-white',
                                    )}
                                >
                                    Pilih {p.name}
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Application */}
                <section ref={formRef} className="scroll-mt-24">
                    <Reveal className="mx-auto max-w-3xl card p-6 sm:p-8">
                        <h2 className="text-xl font-semibold text-navy-900">
                            Ajukan langganan
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Isi data singkat; tim kami menghubungi Anda untuk
                            penawaran dan pembayaran. Akses dashboard aktif
                            setelah disetujui.
                        </p>

                        {!auth.user ? (
                            <Link
                                href={login.url()}
                                className="btn-primary mt-5 w-full py-3"
                            >
                                <Icon name="user" width={16} height={16} />
                                Masuk atau daftar untuk mengajukan
                            </Link>
                        ) : !canApply ? (
                            <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-100">
                                Akun tim redaksi sudah memiliki akses dashboard
                                Media Intelligence.
                            </p>
                        ) : pending ? (
                            <p className="mt-5 rounded-2xl bg-amber-500/10 p-4 text-sm text-amber-800 ring-1 ring-amber-500/30">
                                Pengajuan paket {application?.plan.name} sedang
                                diproses. Kami akan segera menghubungi Anda.
                            </p>
                        ) : plans.length === 0 ? (
                            <p className="mt-5 text-sm text-slate-500">
                                Pengajuan tersedia setelah paket diaktifkan.
                            </p>
                        ) : (
                            <form onSubmit={submit} className="mt-5 space-y-5">
                                <div>
                                    <p className="text-sm font-medium text-navy-900">
                                        Paket
                                    </p>
                                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                                        {plans.map((p) => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                aria-pressed={
                                                    form.data.plan === p.id
                                                }
                                                onClick={() => choose(p)}
                                                className={cn(
                                                    'rounded-2xl p-3 text-left ring-1 transition',
                                                    form.data.plan === p.id
                                                        ? 'bg-accent/5 ring-2 ring-accent'
                                                        : 'ring-slate-200 hover:ring-accent/40',
                                                )}
                                            >
                                                <span className="block font-medium text-navy-900">
                                                    {p.name}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {p.price > 0
                                                        ? `Rp ${rupiah.format(p.price)}/bln`
                                                        : 'Hubungi kami'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                    {form.errors.plan && (
                                        <p className="mt-1 text-xs text-red-600">
                                            {form.errors.plan}
                                        </p>
                                    )}
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <label className="block text-sm font-medium text-navy-900">
                                        Organisasi / instansi
                                        <input
                                            value={form.data.organization}
                                            onChange={(e) =>
                                                form.setData(
                                                    'organization',
                                                    e.target.value,
                                                )
                                            }
                                            required
                                            placeholder="Pemkab Bekasi / PT Contoh"
                                            className="mt-1.5 input"
                                        />
                                        {form.errors.organization && (
                                            <span className="mt-1 block text-xs text-red-600">
                                                {form.errors.organization}
                                            </span>
                                        )}
                                    </label>
                                    <label className="block text-sm font-medium text-navy-900">
                                        WhatsApp / telepon
                                        <input
                                            value={form.data.contact}
                                            onChange={(e) =>
                                                form.setData(
                                                    'contact',
                                                    e.target.value,
                                                )
                                            }
                                            required
                                            inputMode="tel"
                                            placeholder="08xx-xxxx-xxxx"
                                            className="mt-1.5 input"
                                        />
                                        {form.errors.contact && (
                                            <span className="mt-1 block text-xs text-red-600">
                                                {form.errors.contact}
                                            </span>
                                        )}
                                    </label>
                                </div>

                                <div>
                                    <p className="text-sm font-medium text-navy-900">
                                        Durasi
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {[1, 3, 6, 12].map((m) => (
                                            <button
                                                key={m}
                                                type="button"
                                                aria-pressed={
                                                    form.data.months === m
                                                }
                                                onClick={() =>
                                                    form.setData('months', m)
                                                }
                                                className={cn(
                                                    'rounded-full px-4 py-2 text-sm font-medium ring-1 transition-colors',
                                                    form.data.months === m
                                                        ? 'bg-accent text-white ring-accent'
                                                        : 'bg-surface text-slate-600 ring-slate-200 hover:text-accent hover:ring-accent/30',
                                                )}
                                            >
                                                {m} bulan
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {plan && plan.max_provinces !== null && (
                                    <div>
                                        <div className="flex items-baseline justify-between">
                                            <p className="text-sm font-medium text-navy-900">
                                                Provinsi yang dipantau
                                            </p>
                                            <span className="text-xs text-slate-500">
                                                {form.data.provinces.length}/
                                                {plan.max_provinces} dipilih
                                            </span>
                                        </div>
                                        <div className="mt-2 flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
                                            {provinces.map((p) => {
                                                const on =
                                                    form.data.provinces.includes(
                                                        p.code,
                                                    );
                                                const full =
                                                    !on &&
                                                    form.data.provinces
                                                        .length >=
                                                        plan.max_provinces!;
                                                return (
                                                    <button
                                                        key={p.code}
                                                        type="button"
                                                        disabled={full}
                                                        aria-pressed={on}
                                                        onClick={() =>
                                                            toggleProvince(
                                                                p.code,
                                                            )
                                                        }
                                                        className={cn(
                                                            'rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors disabled:opacity-40',
                                                            on
                                                                ? 'bg-accent text-white ring-accent'
                                                                : 'bg-surface text-slate-600 ring-slate-200 hover:text-accent hover:ring-accent/30',
                                                        )}
                                                    >
                                                        {p.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {form.errors.provinces && (
                                            <p className="mt-1 text-xs text-red-600">
                                                {form.errors.provinces}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <label className="block text-sm font-medium text-navy-900">
                                    Catatan{' '}
                                    <span className="font-normal text-slate-400">
                                        (opsional)
                                    </span>
                                    <textarea
                                        value={form.data.note}
                                        onChange={(e) =>
                                            form.setData('note', e.target.value)
                                        }
                                        rows={3}
                                        placeholder="Kebutuhan khusus, misalnya laporan bulanan untuk rapat pimpinan"
                                        className="mt-1.5 input"
                                    />
                                </label>

                                <button
                                    disabled={form.processing}
                                    className="btn-primary w-full py-3"
                                >
                                    <Icon name="send" width={16} height={16} />
                                    {form.processing
                                        ? 'Mengirim…'
                                        : `Ajukan paket ${plan?.name ?? ''}`}
                                </button>
                            </form>
                        )}
                    </Reveal>
                </section>

                {/* FAQ */}
                <section className="mx-auto max-w-3xl">
                    <h2 className="text-xl font-semibold text-navy-900">
                        Pertanyaan umum
                    </h2>
                    <div className="mt-4 space-y-2">
                        {FAQ.map(([q, a]) => (
                            <details
                                key={q}
                                className="group card p-4 [&_summary::-webkit-details-marker]:hidden"
                            >
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-navy-900">
                                    {q}
                                    <Icon
                                        name="chevron"
                                        width={16}
                                        height={16}
                                        className="shrink-0 rotate-90 text-slate-400 transition-transform group-open:-rotate-90"
                                    />
                                </summary>
                                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                    {a}
                                </p>
                            </details>
                        ))}
                    </div>
                </section>
            </Stagger>
        </PublicLayout>
    );
}

function StatusCard({
    member,
    application,
    flash,
}: {
    member: Props['member'];
    application: Props['application'];
    flash?: string | null;
}) {
    if (member?.active) {
        return (
            <Reveal className="flex flex-wrap items-center gap-4 rounded-3xl bg-emerald-500/10 p-5 ring-1 ring-emerald-500/30">
                <span className="grid size-11 place-items-center rounded-2xl bg-emerald-600 text-white">
                    <Icon name="check" width={20} height={20} />
                </span>
                <div className="flex-1">
                    <p className="font-semibold text-navy-900">
                        {member.organization ?? 'Anda'} sudah berlangganan
                    </p>
                    <p className="text-sm text-slate-600">
                        {member.ends_at
                            ? `Aktif hingga ${dateFmt.format(new Date(member.ends_at))}.`
                            : 'Aktif tanpa batas waktu.'}{' '}
                        Ajukan lagi untuk memperpanjang atau menambah provinsi.
                    </p>
                </div>
                <a href={insights.url()} className="btn-success">
                    Buka dashboard
                    <Icon name="chevron" width={14} height={14} />
                </a>
            </Reveal>
        );
    }
    const tone =
        application?.status === 'rejected'
            ? 'bg-red-500/10 ring-red-500/30'
            : 'bg-amber-500/10 ring-amber-500/30';

    return (
        <Reveal
            className={cn(
                'rounded-3xl p-5 ring-1',
                flash ? 'bg-emerald-500/10 ring-emerald-500/30' : tone,
            )}
        >
            <p className="font-semibold text-navy-900">
                {flash ??
                    (application?.status === 'pending'
                        ? `Pengajuan paket ${application.plan.name} sedang diproses`
                        : application?.status === 'rejected'
                          ? `Pengajuan paket ${application.plan.name} belum dapat disetujui`
                          : member && !member.active
                            ? 'Langganan Anda sudah berakhir'
                            : '')}
            </p>
            {application?.admin_note && !flash && (
                <p className="mt-1 text-sm text-slate-600">
                    Catatan redaksi: {application.admin_note}
                </p>
            )}
            {member && !member.active && !flash && (
                <p className="mt-1 text-sm text-slate-600">
                    Ajukan paket di bawah untuk mengaktifkan kembali.
                </p>
            )}
        </Reveal>
    );
}
