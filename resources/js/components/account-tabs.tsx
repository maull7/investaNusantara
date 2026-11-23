import { usePage } from '@inertiajs/react';
import { roleLabel } from '@/components/admin/ui';
import CategoryTabs from '@/components/category-tabs';
import { Reveal } from '@/components/motion';
import { bookmarks, dashboard, membership } from '@/routes';

// shortcut: Langganan opens the public plans page (no tab bar there); give it its own account page when it grows.
const TABS = [
    { href: dashboard.url(), label: 'Ringkasan' },
    { href: bookmarks.url(), label: 'Tersimpan' },
    { href: membership.url(), label: 'Langganan' },
];

/** "Dashboard saya" profile header + section tabs, shown on every account page. */
export default function AccountTabs() {
    const { url, props } = usePage();
    const user = props.auth.user!;
    const path = url.split('?')[0];

    return (
        <>
            <Reveal className="card flex items-center gap-4 p-4 sm:p-6">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent text-xl font-semibold text-white shadow-sm shadow-accent/30">
                    {user.name[0]}
                </span>
                <div className="min-w-0">
                    <p className="text-sm text-slate-500">Halo,</p>
                    <p className="truncate text-xl font-semibold text-navy-900 sm:text-2xl">
                        {user.name}
                    </p>
                    <p className="truncate text-sm text-slate-500">
                        {roleLabel[user.role]}
                        {user.organization && ` · ${user.organization}`}
                    </p>
                </div>
            </Reveal>
            <CategoryTabs
                tabs={TABS}
                activeIndex={TABS.findIndex((t) => t.href === path)}
            />
        </>
    );
}
