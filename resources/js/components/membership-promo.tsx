import { Link } from '@inertiajs/react';
import Icon from '@/components/icons';
import { cn } from '@/lib/utils';
import { membership } from '@/routes';

/** Small promotion box pointing to the "Langganan" page. */
export default function MembershipPromo({
    className,
    title = 'Media Intelligence untuk pemda & perusahaan',
    text = 'Pantau topik, sentimen, dan isu yang berkembang di daerah Anda dalam satu dashboard.',
}: {
    className?: string;
    title?: string;
    text?: string;
}) {
    return (
        <Link
            href={membership.url()}
            className={cn(
                'group relative block overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a1c36] to-[#163563] p-5 text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl md:p-6',
                className,
            )}
        >
            <span className="absolute -top-10 -right-10 size-32 rounded-full bg-white/10 transition-transform group-hover:scale-110" />
            <span className="relative inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase">
                <Icon name="star" width={12} height={12} />
                Langganan
            </span>
            <p className="relative mt-3 font-semibold">{title}</p>
            <p className="relative mt-1 text-sm text-white/75">{text}</p>
            <span className="relative mt-4 inline-flex items-center gap-1 text-sm font-semibold">
                Lihat paket & benefit
                <Icon
                    name="chevron"
                    width={14}
                    height={14}
                    className="transition-transform group-hover:translate-x-1"
                />
            </span>
        </Link>
    );
}
