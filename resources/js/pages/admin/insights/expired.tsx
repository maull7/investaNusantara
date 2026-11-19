import { Form, Head } from '@inertiajs/react';
import Icon from '@/components/icons';
import AdminLayout from '@/layouts/admin';
import { logout, membership } from '@/routes';

const dateFmt = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' });

/** Shown to a Klien Data whose subscription has ended, instead of the dashboard. */
export default function InsightsExpired({
    endedAt,
    organization,
}: {
    endedAt: string | null;
    organization: string | null;
}) {
    return (
        <AdminLayout title="Media Intelligence">
            <Head title="Langganan berakhir" />
            <div className="mx-auto max-w-lg card p-8 text-center">
                <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-500/10 text-amber-600">
                    <Icon name="clock" width={26} height={26} />
                </span>
                <h2 className="mt-4 text-xl font-semibold text-navy-900">
                    Langganan {organization ?? 'Anda'} sudah berakhir
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                    {endedAt &&
                        `Akses dashboard berakhir pada ${dateFmt.format(new Date(endedAt))}. `}
                    Hubungi tim NusantaraNews untuk memperpanjang langganan
                    Media Intelligence.
                </p>
                <a href={membership.url()} className="btn-primary mt-6">
                    <Icon name="star" width={16} height={16} />
                    Perpanjang langganan
                </a>
                <Form action={logout.url()} method="post" className="mt-3">
                    <button className="btn-ghost">
                        <Icon name="logout" width={16} height={16} />
                        Keluar
                    </button>
                </Form>
            </div>
        </AdminLayout>
    );
}
