import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { EmptyState, Switch } from '@/components/admin/ui';
import Icon from '@/components/icons';
import Pagination from '@/components/pagination';
import AdminLayout from '@/layouts/admin';
import { cn } from '@/lib/utils';
import { approve, index, reject } from '@/routes/admin/memberships';
import { update as updatePlan } from '@/routes/admin/memberships/plans';
import { membership } from '@/routes';
import type { Paginated } from '@/types';

type Plan = {
    id: number;
    slug: string;
    name: string;
    tagline: string | null;
    price: number;
    max_provinces: number | null;
    benefits: string[];
    highlighted: boolean;
    active: boolean;
    sort: number;
};

type Application = {
    id: number;
    organization: string;
    contact: string;
    provinces: string[] | null;
    months: number;
    note: string | null;
    status: 'pending' | 'approved' | 'rejected';
    admin_note: string | null;
    created_at: string;
    user: {
        id: number;
        name: string;
        email: string;
        role: string;
        subscription_ends_at: string | null;
    };
    plan: { id: number; name: string; max_provinces: number | null };
};

const STATUSES = [
    ['pending', 'Menunggu'],
    ['approved', 'Disetujui'],
    ['rejected', 'Ditolak'],
    ['all', 'Semua'],
] as const;

const rupiah = new Intl.NumberFormat('id-ID');
const dateFmt = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' });

/** WhatsApp link from a free-typed Indonesian number (08xx -> 628xx). */
function waLink(contact: string) {
    const digits = contact.replace(/\D/g, '');
    const intl = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
    return digits.length >= 9 ? `https://wa.me/${intl}` : null;
}

export default function Memberships({
    status,
    counts,
    applications,
    plans,
    provinceNames,
}: {
    status: string;
    counts: Record<string, number>;
    applications: Paginated<Application>;
    plans: Plan[];
    provinceNames: Record<string, string>;
}) {
    const [tab, setTab] = useState<'applications' | 'plans'>('applications');

    return (
        <AdminLayout
            title="Langganan"
            subtitle="Pengajuan membership dari pembaca dan paket yang tampil di halaman Langganan."
            actions={
                <a
                    href={membership.url()}
                    target="_blank"
                    className="btn-ghost"
                >
                    <Icon name="external" width={16} height={16} />
                    Lihat halaman promosi
                </a>
            }
        >
            <Head title="Langganan" />

            <div className="mb-5 flex flex-wrap items-center gap-2">
                <div className="flex rounded-2xl bg-white p-1 ring-1 ring-slate-200">
                    {(
                        [
                            ['applications', 'Pengajuan'],
                            ['plans', 'Paket & benefit'],
                        ] as const
                    ).map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setTab(key)}
                            className={cn(
                                'rounded-xl px-4 py-1.5 text-sm font-medium transition-colors',
                                tab === key
                                    ? 'bg-accent text-white'
                                    : 'text-slate-500 hover:text-navy-900',
                            )}
                        >
                            {label}
                            {key === 'applications' &&
                                (counts.pending ?? 0) > 0 && (
                                    <span
                                        className={cn(
                                            'ml-1.5 rounded-full px-1.5 text-xs',
                                            tab === key
                                                ? 'bg-white/20'
                                                : 'bg-accent/10 text-accent',
                                        )}
                                    >
                                        {counts.pending}
                                    </span>
                                )}
                        </button>
                    ))}
                </div>
            </div>

            {tab === 'plans' ? (
                <div className="grid gap-5 lg:grid-cols-3">
                    {plans.map((p) => (
                        <PlanForm key={p.id} plan={p} />
                    ))}
                </div>
            ) : (
                <>
                    <div className="mb-4 flex flex-wrap gap-1.5">
                        {STATUSES.map(([key, label]) => (
                            <Link
                                key={key}
                                href={index.url({ query: { status: key } })}
                                preserveScroll
                                className={cn(
                                    'rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition-colors',
                                    status === key
                                        ? 'bg-navy-900 text-white ring-navy-900'
                                        : 'bg-white text-slate-600 ring-slate-200 hover:text-accent hover:ring-accent/30',
                                )}
                            >
                                {label}
                                {key !== 'all' && (
                                    <span className="ml-1 opacity-60">
                                        {counts[key] ?? 0}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </div>

                    {applications.data.length === 0 ? (
                        <div className="card">
                            <EmptyState
                                icon="users"
                                title="Tidak ada pengajuan"
                            >
                                Pengajuan dari halaman Langganan muncul di sini.
                            </EmptyState>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {applications.data.map((a) => (
                                <ApplicationCard
                                    key={a.id}
                                    application={a}
                                    provinceNames={provinceNames}
                                />
                            ))}
                        </div>
                    )}
                    <Pagination data={applications} />
                </>
            )}
        </AdminLayout>
    );
}

function ApplicationCard({
    application: a,
    provinceNames,
}: {
    application: Application;
    provinceNames: Record<string, string>;
}) {
    const [note, setNote] = useState('');
    const wa = waLink(a.contact);
    const tone = {
        pending: 'bg-amber-500/10 text-amber-700 ring-amber-500/30',
        approved: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/30',
        rejected: 'bg-red-500/10 text-red-700 ring-red-500/30',
    }[a.status];
    const label = {
        pending: 'Menunggu',
        approved: 'Disetujui',
        rejected: 'Ditolak',
    }[a.status];

    return (
        <div className="card p-5 transition hover:shadow-lg">
            <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-navy-900">
                            {a.organization}
                        </span>
                        <span
                            className={cn(
                                'rounded-full px-2.5 py-0.5 text-xs font-medium ring-1',
                                tone,
                            )}
                        >
                            {label}
                        </span>
                        <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                            {a.plan.name} · {a.months} bulan
                        </span>
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                        {a.user.name} · {a.user.email} · diajukan{' '}
                        {dateFmt.format(new Date(a.created_at))}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                        Wilayah:{' '}
                        {a.provinces?.length
                            ? a.provinces
                                  .map((c) => provinceNames[c] ?? c)
                                  .join(', ')
                            : 'Seluruh Indonesia'}
                    </p>
                    {a.note && (
                        <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                            “{a.note}”
                        </p>
                    )}
                    {a.admin_note && a.status !== 'pending' && (
                        <p className="mt-2 text-xs text-slate-500">
                            Catatan admin: {a.admin_note}
                        </p>
                    )}
                </div>
                {wa ? (
                    <a
                        href={wa}
                        target="_blank"
                        rel="noopener"
                        className="btn-ghost text-emerald-700"
                    >
                        <Icon name="whatsapp" width={16} height={16} />
                        {a.contact}
                    </a>
                ) : (
                    <span className="text-sm text-slate-600">{a.contact}</span>
                )}
            </div>

            {a.status === 'pending' && (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                    <input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Catatan untuk pemohon (wajib jika menolak)"
                        className="input min-w-56 flex-1"
                    />
                    <button
                        type="button"
                        onClick={() =>
                            confirm(
                                `Aktifkan paket ${a.plan.name} untuk ${a.organization} selama ${a.months} bulan?`,
                            ) &&
                            router.post(
                                approve.url(a.id),
                                { admin_note: note },
                                { preserveScroll: true },
                            )
                        }
                        className="btn-success"
                    >
                        <Icon name="check" width={16} height={16} />
                        Setujui & aktifkan
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            router.post(
                                reject.url(a.id),
                                { admin_note: note },
                                { preserveScroll: true },
                            )
                        }
                        className="btn-danger"
                    >
                        <Icon name="x" width={16} height={16} />
                        Tolak
                    </button>
                </div>
            )}
        </div>
    );
}

function PlanForm({ plan }: { plan: Plan }) {
    const form = useForm({
        name: plan.name,
        tagline: plan.tagline ?? '',
        price: plan.price,
        max_provinces:
            plan.max_provinces === null ? '' : String(plan.max_provinces),
        sort: plan.sort,
        benefits: plan.benefits.join('\n'),
        highlighted: plan.highlighted,
        active: plan.active,
    });
    const err = form.errors;

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                form.put(updatePlan.url(plan.id), { preserveScroll: true });
            }}
            className={cn(
                'space-y-3 card p-5',
                !form.data.active && 'opacity-70',
            )}
        >
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                    {plan.max_provinces === null
                        ? 'Seluruh Indonesia'
                        : `Hingga ${plan.max_provinces} provinsi`}
                </p>
                {form.recentlySuccessful && (
                    <span className="text-xs font-medium text-emerald-700">
                        Tersimpan
                    </span>
                )}
            </div>
            <label className="block text-sm font-medium text-navy-900">
                Nama paket
                <input
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    className="mt-1 input"
                />
                {err.name && (
                    <span className="mt-1 block text-xs text-red-600">
                        {err.name}
                    </span>
                )}
            </label>
            <label className="block text-sm font-medium text-navy-900">
                Untuk siapa
                <input
                    value={form.data.tagline}
                    onChange={(e) => form.setData('tagline', e.target.value)}
                    className="mt-1 input"
                />
            </label>
            <label className="block text-sm font-medium text-navy-900">
                Harga per bulan (Rp)
                <input
                    type="number"
                    min={0}
                    step={1000}
                    value={form.data.price}
                    onChange={(e) =>
                        form.setData('price', Number(e.target.value))
                    }
                    className="mt-1 input"
                />
                <span className="mt-1 block text-xs font-normal text-slate-400">
                    {form.data.price > 0
                        ? `Tampil: Rp ${rupiah.format(form.data.price)}/bulan`
                        : '0 = tampil “Hubungi kami”'}
                </span>
            </label>
            <label className="block text-sm font-medium text-navy-900">
                Cakupan provinsi
                <select
                    className="mt-1 input"
                    value={form.data.max_provinces}
                    onChange={(e) =>
                        form.setData('max_provinces', e.target.value)
                    }
                >
                    <option value="">Seluruh Indonesia</option>
                    {Array.from({ length: 38 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                            Hingga {n} provinsi
                        </option>
                    ))}
                </select>
                {err.max_provinces && (
                    <span className="text-xs text-red-600">
                        {err.max_provinces}
                    </span>
                )}
            </label>
            <label className="block text-sm font-medium text-navy-900">
                Urutan tampil
                <input
                    type="number"
                    min={0}
                    max={65535}
                    value={form.data.sort}
                    onChange={(e) =>
                        form.setData('sort', Number(e.target.value))
                    }
                    className="mt-1 input"
                />
                <span className="text-xs font-normal text-slate-400">
                    Angka terkecil tampil lebih dahulu.
                </span>
                {err.sort && (
                    <span className="block text-xs text-red-600">
                        {err.sort}
                    </span>
                )}
            </label>
            {(['tagline', 'price'] as const).map(
                (field) =>
                    err[field] && (
                        <p key={field} className="text-xs text-red-600">
                            {err[field]}
                        </p>
                    ),
            )}
            <label className="block text-sm font-medium text-navy-900">
                Benefit{' '}
                <span className="font-normal text-slate-400">
                    (satu per baris)
                </span>
                <textarea
                    value={form.data.benefits}
                    onChange={(e) => form.setData('benefits', e.target.value)}
                    rows={7}
                    className="mt-1 input"
                />
                {err.benefits && (
                    <span className="mt-1 block text-xs text-red-600">
                        {err.benefits}
                    </span>
                )}
            </label>
            <div className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-100">
                <Switch
                    label="Paling populer"
                    hint="Disorot di halaman paket dan dipilih untuk popup penawaran. Jika lebih dari satu, urutan pertama digunakan."
                    checked={form.data.highlighted}
                    onChange={(v) => form.setData('highlighted', v)}
                />
                <Switch
                    label="Aktif"
                    hint="Tampil dan bisa diajukan"
                    checked={form.data.active}
                    onChange={(v) => form.setData('active', v)}
                />
            </div>
            <button disabled={form.processing} className="btn-primary w-full">
                Simpan paket
            </button>
        </form>
    );
}
