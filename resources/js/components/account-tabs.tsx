import { Link, usePage } from '@inertiajs/react';
import { useRef } from 'react';
import { roleLabel } from '@/components/admin/ui';
import CategoryTabs from '@/components/category-tabs';
import Icon from '@/components/icons';
import { Reveal } from '@/components/motion';
import { bookmarks, dashboard, membership } from '@/routes';
import { regions as dashboardRegions } from '@/routes/dashboard';

const BENEFITS = [
    'Topik yang sedang ramai di daerah Anda',
    'Sentimen warga terhadap isu dan kebijakan',
    'Pantauan 38 provinsi dalam satu dashboard',
];

const TABS = [
    { href: dashboard.url(), label: 'Ringkasan' },
    { href: dashboardRegions.url(), label: 'Wilayah Saya' },
    { href: bookmarks.url(), label: 'Tersimpan' },
];

/** "Dashboard saya" profile header + section tabs, shown on every account page. */
export default function AccountTabs() {
    const { url, props } = usePage();
    const user = props.auth.user!;
    const path = url.split('?')[0];
    const offerRef = useRef<HTMLDialogElement>(null);

    return (
        <>
            <Reveal className="card flex items-center gap-4 p-4 sm:p-6">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent text-xl font-semibold text-white shadow-sm shadow-accent/30">
                    {user.name[0]}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-500">Halo,</p>
                    <p className="truncate text-xl font-semibold text-navy-900 sm:text-2xl">
                        {user.name}
                    </p>
                    <p className="truncate text-sm text-slate-500">
                        {roleLabel[user.role]}
                        {user.organization && ` · ${user.organization}`}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => offerRef.current?.showModal()}
                    className="btn-primary shrink-0"
                    aria-label="Langganan"
                >
                    <Icon name="star" width={16} height={16} />
                    <span className="hidden sm:inline">Langganan</span>
                </button>
            </Reveal>
            <dialog
                ref={offerRef}
                aria-labelledby="account-offer-title"
                onClick={(event) => {
                    if (event.target === event.currentTarget)
                        offerRef.current?.close();
                }}
                className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl border-0 bg-white p-0 text-navy-900 shadow-2xl backdrop:bg-navy-900/65 backdrop:backdrop-blur-sm"
            >
                <div className="relative bg-gradient-to-br from-accent via-merah to-merah-dark p-6 text-white sm:p-8">
                    <button
                        type="button"
                        aria-label="Tutup"
                        onClick={() => offerRef.current?.close()}
                        className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-white/10 text-xl hover:bg-white/20"
                    >
                        ×
                    </button>
                    <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest text-white/80 uppercase">
                        <Icon name="star" width={13} height={13} />
                        Media Intelligence
                    </p>
                    <h2
                        id="account-offer-title"
                        className="mt-3 pr-6 text-2xl font-semibold"
                    >
                        Berlangganan data daerah?
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-white/80">
                        Ubah berita menjadi wawasan untuk keputusan Anda.
                    </p>
                </div>
                <div className="p-6 sm:p-8">
                    <ul className="space-y-3">
                        {BENEFITS.map((b) => (
                            <li
                                key={b}
                                className="flex gap-2 text-sm text-slate-600"
                            >
                                <Icon
                                    name="check"
                                    width={16}
                                    height={16}
                                    className="mt-0.5 shrink-0 text-emerald-600"
                                />
                                {b}
                            </li>
                        ))}
                    </ul>
                    <Link
                        href={membership.url()}
                        onClick={() => offerRef.current?.close()}
                        className="btn-primary mt-6 w-full py-3"
                    >
                        Ya, lihat paket langganan
                    </Link>
                    <button
                        type="button"
                        onClick={() => offerRef.current?.close()}
                        className="mt-3 w-full py-2 text-sm text-slate-500 hover:text-navy-900"
                    >
                        Nanti saja
                    </button>
                </div>
            </dialog>
            <CategoryTabs
                tabs={TABS}
                activeIndex={TABS.findIndex((t) => t.href === path)}
            />
        </>
    );
}
