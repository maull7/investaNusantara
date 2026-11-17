import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { type ReactNode, useEffect } from 'react';
import Icon, { type IconName } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { ArticleStatus, Role } from '@/types';

export const roleLabel: Record<Role, string> = {
    super_admin: 'Super Admin',
    sub_admin: 'Sub Admin',
    editor: 'Editor Daerah',
    journalist: 'Wartawan',
    contributor: 'Kontributor',
};

export const roleTone: Record<Role, string> = {
    super_admin: 'bg-accent/10 text-accent ring-accent/20',
    sub_admin: 'bg-navy-50 text-navy-700 ring-navy-100',
    editor: 'bg-violet-50 text-violet-700 ring-violet-200',
    journalist: 'bg-sky-50 text-sky-700 ring-sky-200',
    contributor: 'bg-amber-50 text-amber-700 ring-amber-200',
};

export const statusMeta: Record<
    ArticleStatus,
    { label: string; dot: string; pill: string }
> = {
    draft: {
        label: 'Draft',
        dot: 'bg-slate-400',
        pill: 'bg-slate-100 text-slate-600 ring-slate-200',
    },
    review: {
        label: 'Menunggu review',
        dot: 'bg-amber-500',
        pill: 'bg-amber-50 text-amber-700 ring-amber-200',
    },
    published: {
        label: 'Terbit',
        dot: 'bg-emerald-500',
        pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    },
    rejected: {
        label: 'Dikembalikan',
        dot: 'bg-red-500',
        pill: 'bg-red-50 text-red-700 ring-red-200',
    },
};

export function StatusPill({
    status,
    className,
}: {
    status: ArticleStatus;
    className?: string;
}) {
    const meta = statusMeta[status];

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1',
                meta.pill,
                className,
            )}
        >
            <span className={cn('size-1.5 rounded-full', meta.dot)} />
            {meta.label}
        </span>
    );
}

export function RoleBadge({ role }: { role: Role }) {
    return (
        <span
            className={cn(
                'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1',
                roleTone[role],
            )}
        >
            {roleLabel[role]}
        </span>
    );
}

/** Initials avatar; the hue is derived from the name so each person keeps a stable color. */
export function Avatar({
    name,
    className,
}: {
    name: string;
    className?: string;
}) {
    const initials = name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();
    let hue = 0;
    for (let i = 0; i < name.length; i++) {
        hue = (hue + name.charCodeAt(i)) % 360;
    }

    return (
        <span
            aria-hidden
            className={cn(
                'grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white',
                className,
            )}
            style={{
                background: `linear-gradient(135deg, hsl(${hue} 55% 45%), hsl(${(hue + 40) % 360} 60% 35%))`,
            }}
        >
            {initials}
        </span>
    );
}

export function Switch({
    checked,
    onChange,
    label,
    hint,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    hint?: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-accent/5"
        >
            <span>
                <span className="block text-sm font-medium text-navy-900">
                    {label}
                </span>
                {hint && (
                    <span className="block text-xs text-slate-500">{hint}</span>
                )}
            </span>
            <span
                className={cn(
                    'flex h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors',
                    checked
                        ? 'justify-end bg-accent'
                        : 'justify-start bg-slate-200',
                )}
            >
                <motion.span
                    layout
                    transition={{ type: 'spring', stiffness: 600, damping: 34 }}
                    className="size-5 rounded-full bg-white shadow"
                />
            </span>
        </button>
    );
}

export function EmptyState({
    icon,
    title,
    children,
}: {
    icon: IconName;
    title: string;
    children?: ReactNode;
}) {
    return (
        <div className="flex flex-col items-center px-6 py-14 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-accent/10 text-accent">
                <Icon name={icon} width={26} height={26} />
            </span>
            <p className="mt-4 font-semibold text-navy-900">{title}</p>
            {children && (
                <div className="mt-1 max-w-sm text-sm text-slate-500">
                    {children}
                </div>
            )}
        </div>
    );
}

export function Field({
    label,
    hint,
    error,
    children,
    className,
}: {
    label: string;
    hint?: ReactNode;
    error?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <label className={cn('block', className)}>
            <span className="flex items-baseline justify-between gap-2 text-sm font-medium text-navy-900">
                {label}
                {hint && (
                    <span className="text-xs font-normal text-slate-400">
                        {hint}
                    </span>
                )}
            </span>
            <span className="mt-1.5 block">{children}</span>
            {error && (
                <span className="mt-1 block text-xs text-red-600">{error}</span>
            )}
        </label>
    );
}

const numberFmt = new Intl.NumberFormat('id-ID');

/** Number that counts up to its value (and re-animates when the value changes). */
export function CountUp({ value }: { value: number }) {
    const count = useMotionValue(0);
    const text = useTransform(count, (v) => numberFmt.format(Math.round(v)));

    useEffect(() => {
        const controls = animate(count, value, {
            duration: 1,
            ease: [0.22, 1, 0.36, 1],
        });

        return () => controls.stop();
    }, [count, value]);

    return <motion.span>{text}</motion.span>;
}
