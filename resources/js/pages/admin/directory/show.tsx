import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { TaskPill, type TaskStatus } from '@/components/admin/ai';
import { EmptyState, Field } from '@/components/admin/ui';
import Icon from '@/components/icons';
import AdminLayout from '@/layouts/admin';
import { regionHref } from '@/lib/news';
import { cn } from '@/lib/utils';
import { draft as draftRoute, index } from '@/routes/admin/directory';
import { update as updateProfile } from '@/routes/admin/directory/profile';
import {
    destroy,
    feature,
    store,
    update,
} from '@/routes/admin/directory/entries';
import type {
    DirectoryEntry,
    DirectoryType,
    Fact,
    FactField,
    Region,
    RegionProfile,
} from '@/types';

type Props = {
    region: Region & { parent: Region | null };
    profile: RegionProfile | null;
    factFields: FactField[];
    entries: DirectoryEntry[];
    types: Record<DirectoryType, string>;
    eventCategories: Record<string, string>;
    draft: {
        id: number;
        status: TaskStatus;
        error: string | null;
        updated_at: string;
    } | null;
};

export default function DirectoryShow({
    region,
    profile,
    factFields,
    entries,
    types,
    eventCategories,
    draft,
}: Props) {
    const running =
        draft?.status === 'queued' ||
        draft?.status === 'running' ||
        draft?.status === 'paused';

    // While Hermes works, refresh the draft status and whatever it has written so far.
    useEffect(() => {
        if (!running) {
            return;
        }
        const t = window.setTimeout(
            () => router.reload({ only: ['draft', 'profile', 'entries'] }),
            5000,
        );

        return () => window.clearTimeout(t);
    }, [running, draft]);

    const name = region.parent ? region.name : `Provinsi ${region.name}`;

    return (
        <AdminLayout
            title={name}
            subtitle={
                <span className="inline-flex flex-wrap items-center gap-2">
                    {region.parent && <>{region.parent.name} ·</>} kode{' '}
                    {region.code}
                    <a
                        href={regionHref(region)}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-accent hover:underline"
                    >
                        Lihat di situs
                        <Icon name="external" width={12} height={12} />
                    </a>
                </span>
            }
            actions={
                <>
                    <Link
                        href={index.url({
                            query: {
                                province: region.code.slice(0, 2),
                            },
                        })}
                        className="btn-ghost"
                    >
                        <Icon name="back" width={16} height={16} />
                        Kembali
                    </Link>
                    <button
                        type="button"
                        disabled={running}
                        onClick={() =>
                            router.post(
                                draftRoute.url(region.code),
                                {},
                                { preserveScroll: true },
                            )
                        }
                        className="btn-primary"
                    >
                        <Icon name="bolt" width={16} height={16} />
                        {running ? 'Hermes menyusun…' : 'Buat draf AI'}
                    </button>
                </>
            }
        >
            <Head title={`Direktori ${region.name}`} />

            {draft && draft.status !== 'completed' && (
                <div className="mb-5 flex flex-wrap items-center gap-3 card p-4 text-sm">
                    <TaskPill status={draft.status} />
                    <span className="text-slate-600">
                        {draft.error ??
                            'Hermes sedang membuka sumber resmi (BPS, pemda, DJPK). Biasanya beberapa menit.'}
                    </span>
                </div>
            )}
            {draft?.status === 'completed' && draft.error && (
                <div className="mb-5 card p-4 text-sm text-amber-700">
                    {draft.error}
                </div>
            )}

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <ProfileForm
                    region={region}
                    profile={profile}
                    fields={factFields}
                />
                <div className="space-y-6">
                    {(Object.entries(types) as [DirectoryType, string][]).map(
                        ([key, label]) => (
                            <EntrySection
                                key={key}
                                region={region}
                                type={key}
                                label={label}
                                categories={eventCategories}
                                entries={entries.filter((e) => e.type === key)}
                            />
                        ),
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}

function VerifiedBadge({ verified }: { verified: boolean }) {
    return (
        <span
            className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-medium ring-1',
                verified
                    ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-700 ring-amber-500/30',
            )}
        >
            {verified ? 'Terverifikasi' : 'Draf'}
        </span>
    );
}

function ProfileForm({
    region,
    profile,
    fields,
}: {
    region: Region;
    profile: RegionProfile | null;
    fields: FactField[];
}) {
    const empty: Fact = { value: '', source: '', as_of: '' };
    const form = useForm({
        facts: Object.fromEntries(
            fields.map((f) => [
                f.key,
                { ...empty, ...(profile?.facts?.[f.key] ?? {}) },
            ]),
        ) as Record<string, Fact>,
        description: profile?.description ?? '',
        description_source: profile?.description_source ?? '',
        verify: false,
    });

    // Hermes may fill the profile while this page is open: take its values until the editor types.
    useEffect(() => {
        if (!form.isDirty && profile) {
            form.setDefaults({
                facts: Object.fromEntries(
                    fields.map((f) => [
                        f.key,
                        { ...empty, ...(profile.facts?.[f.key] ?? {}) },
                    ]),
                ),
                description: profile.description ?? '',
                description_source: profile.description_source ?? '',
                verify: false,
            });
            form.reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile]);

    function save(verify: boolean) {
        form.transform((d) => ({ ...d, verify }));
        form.put(updateProfile.url(region.code), {
            preserveScroll: true,
        });
    }

    const err = form.errors as Record<string, string | undefined>;
    const setFact = (key: string, field: keyof Fact, value: string) =>
        form.setData('facts', {
            ...form.data.facts,
            [key]: { ...form.data.facts[key], [field]: value },
        });

    return (
        <section className="card p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-navy-900">Profil</h2>
                {profile && <VerifiedBadge verified={!!profile.verified_at} />}
            </div>
            {profile?.verified_at && profile.verifier && (
                <p className="-mt-2 mb-4 text-xs text-slate-500">
                    Diverifikasi oleh {profile.verifier.name}. Menyimpan tanpa
                    verifikasi akan menyembunyikannya dari situs.
                </p>
            )}

            <div className="space-y-4">
                {fields.map((f) => (
                    <div
                        key={f.key}
                        className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100"
                    >
                        <p className="mb-2 text-sm font-medium text-navy-900">
                            {f.label}
                            {f.unit && (
                                <span className="ml-1 text-xs font-normal text-slate-400">
                                    ({f.unit})
                                </span>
                            )}
                        </p>
                        <div className="grid gap-2 sm:grid-cols-[1fr_6rem]">
                            <input
                                value={form.data.facts[f.key].value}
                                onChange={(e) =>
                                    setFact(f.key, 'value', e.target.value)
                                }
                                placeholder="Nilai"
                                aria-label={`${f.label}: nilai`}
                                className="input"
                            />
                            <input
                                value={form.data.facts[f.key].as_of ?? ''}
                                onChange={(e) =>
                                    setFact(f.key, 'as_of', e.target.value)
                                }
                                placeholder="Tahun"
                                aria-label={`${f.label}: tahun data`}
                                className="input"
                            />
                            <input
                                value={form.data.facts[f.key].source ?? ''}
                                onChange={(e) =>
                                    setFact(f.key, 'source', e.target.value)
                                }
                                placeholder="URL sumber (wajib jika ada nilai)"
                                aria-label={`${f.label}: sumber`}
                                className="input sm:col-span-2"
                            />
                        </div>
                        {(err[`facts.${f.key}.source`] ??
                            err[`facts.${f.key}.value`]) && (
                            <p className="mt-1 text-xs text-red-600">
                                {err[`facts.${f.key}.source`] ??
                                    err[`facts.${f.key}.value`]}
                            </p>
                        )}
                    </div>
                ))}

                <Field label="Deskripsi daerah" error={err.description}>
                    <textarea
                        value={form.data.description}
                        onChange={(e) =>
                            form.setData('description', e.target.value)
                        }
                        rows={7}
                        placeholder="2-3 paragraf profil singkat. Pisahkan paragraf dengan baris kosong."
                        className="input"
                    />
                </Field>
                <Field label="Sumber deskripsi" error={err.description_source}>
                    <input
                        value={form.data.description_source}
                        onChange={(e) =>
                            form.setData('description_source', e.target.value)
                        }
                        placeholder="https://"
                        className="input"
                    />
                </Field>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                    type="button"
                    disabled={form.processing}
                    onClick={() => save(false)}
                    className="btn-ghost"
                >
                    Simpan draf
                </button>
                <button
                    type="button"
                    disabled={form.processing}
                    onClick={() => save(true)}
                    className="btn-success"
                >
                    <Icon name="check" width={16} height={16} />
                    Simpan & verifikasi
                </button>
            </div>
        </section>
    );
}

function EntrySection({
    region,
    type,
    label,
    categories,
    entries,
}: {
    region: Region;
    type: DirectoryType;
    label: string;
    categories: Record<string, string>;
    entries: DirectoryEntry[];
}) {
    const [adding, setAdding] = useState(false);

    return (
        <section className="card p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-navy-900">
                    {label}{' '}
                    <span className="text-sm font-normal text-slate-400">
                        {entries.length}
                    </span>
                </h2>
                <button
                    type="button"
                    onClick={() => setAdding((v) => !v)}
                    className="btn-ghost px-3 py-1.5 text-xs"
                >
                    <Icon name={adding ? 'x' : 'plus'} width={14} height={14} />
                    {adding ? 'Batal' : 'Tambah'}
                </button>
            </div>
            <div className="space-y-3">
                {adding && (
                    <EntryForm
                        region={region}
                        type={type}
                        categories={categories}
                        onDone={() => setAdding(false)}
                    />
                )}
                {entries.length === 0 && !adding && (
                    <EmptyState icon="map" title={`Belum ada ${label}`}>
                        Tambah manual atau buat draf AI.
                    </EmptyState>
                )}
                {entries.map((e) => (
                    <EntryForm
                        key={e.id}
                        region={region}
                        type={type}
                        categories={categories}
                        entry={e}
                    />
                ))}
            </div>
        </section>
    );
}

function EntryForm({
    region,
    type,
    categories,
    entry,
    onDone,
}: {
    region: Region;
    type: DirectoryType;
    categories: Record<string, string>;
    entry?: DirectoryEntry;
    onDone?: () => void;
}) {
    const [open, setOpen] = useState(!entry);
    const form = useForm({
        type,
        category: entry?.category ?? (type === 'event' ? 'daerah' : ''),
        organizer: entry?.organizer ?? '',
        name: entry?.name ?? '',
        description: entry?.description ?? '',
        address: entry?.address ?? '',
        website: entry?.website ?? '',
        source_url: entry?.source_url ?? '',
        starts_on: entry?.starts_on ?? '',
        ends_on: entry?.ends_on ?? '',
        verify: false,
    });

    function save(verify: boolean) {
        form.transform((d) => ({
            ...d,
            verify,
            website: d.website || null,
            starts_on: d.starts_on || null,
            ends_on: d.ends_on || null,
            category: d.category || null,
            organizer: d.organizer || null,
        }));
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                if (entry) {
                    setOpen(false);
                } else {
                    form.reset();
                    onDone?.();
                }
            },
        };
        if (entry) {
            form.put(update.url(entry.id), options);
        } else {
            form.post(store.url(region.code), options);
        }
    }

    if (entry && !open) {
        return (
            <div className="flex items-start gap-3 rounded-2xl p-3 ring-1 ring-slate-100">
                <div className="min-w-0 flex-1">
                    <p className="font-medium text-navy-900">{entry.name}</p>
                    <p className="line-clamp-2 text-xs text-slate-500">
                        {entry.starts_on && `${entry.starts_on} · `}
                        {entry.description ?? entry.address}
                    </p>
                </div>
                {entry.featured_at ? (
                    <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        Unggulan
                    </span>
                ) : (
                    entry.featured_requested && (
                        <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs text-amber-700 ring-1 ring-amber-500/30">
                            Minta unggulan
                        </span>
                    )
                )}
                <VerifiedBadge verified={!!entry.verified_at} />
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-label={`Ubah ${entry.name}`}
                    className="grid size-8 shrink-0 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-accent/5 hover:text-accent"
                >
                    <Icon name="edit" width={15} height={15} />
                </button>
            </div>
        );
    }

    const err = form.errors;

    return (
        <div className="space-y-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <Field label="Nama" error={err.name}>
                <input
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    className="input"
                />
            </Field>
            <Field label="Deskripsi" error={err.description}>
                <textarea
                    value={form.data.description}
                    onChange={(e) =>
                        form.setData('description', e.target.value)
                    }
                    rows={2}
                    className="input"
                />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Alamat / lokasi" error={err.address}>
                    <input
                        value={form.data.address}
                        onChange={(e) =>
                            form.setData('address', e.target.value)
                        }
                        className="input"
                    />
                </Field>
                <Field label="Situs resmi" hint="opsional" error={err.website}>
                    <input
                        value={form.data.website}
                        onChange={(e) =>
                            form.setData('website', e.target.value)
                        }
                        placeholder="https://"
                        className="input"
                    />
                </Field>
            </div>
            {entry?.submitter && (
                <p className="rounded-xl bg-amber-500/10 p-3 text-xs text-amber-800 ring-1 ring-amber-500/20">
                    Diajukan oleh <b>{entry.submitter.name}</b>
                    {entry.contact && <> · kontak: {entry.contact}</>}
                    {entry.featured_requested && <> · meminta unggulan</>}
                </p>
            )}
            {type === 'event' && (
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Kategori" error={err.category}>
                        <select
                            value={form.data.category}
                            onChange={(e) =>
                                form.setData('category', e.target.value)
                            }
                            className="input"
                        >
                            {Object.entries(categories).map(([k, label]) => (
                                <option key={k} value={k}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field
                        label="Penyelenggara"
                        hint="opsional"
                        error={err.organizer}
                    >
                        <input
                            value={form.data.organizer}
                            onChange={(e) =>
                                form.setData('organizer', e.target.value)
                            }
                            className="input"
                        />
                    </Field>
                </div>
            )}
            {type === 'event' && (
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Mulai" error={err.starts_on}>
                        <input
                            type="date"
                            value={form.data.starts_on}
                            onChange={(e) =>
                                form.setData('starts_on', e.target.value)
                            }
                            className="input"
                        />
                    </Field>
                    <Field label="Selesai" hint="opsional" error={err.ends_on}>
                        <input
                            type="date"
                            value={form.data.ends_on}
                            onChange={(e) =>
                                form.setData('ends_on', e.target.value)
                            }
                            className="input"
                        />
                    </Field>
                </div>
            )}
            <Field
                label="URL sumber"
                hint={entry?.submitter ? 'opsional (pengajuan)' : 'wajib'}
                error={err.source_url}
            >
                <input
                    value={form.data.source_url}
                    onChange={(e) => form.setData('source_url', e.target.value)}
                    placeholder="https://"
                    className="input"
                />
            </Field>
            <div className="flex flex-wrap items-center justify-end gap-2">
                {entry && (
                    <>
                        <button
                            type="button"
                            onClick={() =>
                                confirm(`Hapus ${entry.name}?`) &&
                                router.delete(destroy.url(entry.id), {
                                    preserveScroll: true,
                                })
                            }
                            className="btn-danger mr-auto px-3 py-1.5 text-xs"
                        >
                            <Icon name="trash" width={14} height={14} />
                            Hapus
                        </button>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="btn-ghost px-3 py-1.5 text-xs"
                        >
                            Tutup
                        </button>
                        {type === 'event' && entry.verified_at && (
                            <button
                                type="button"
                                onClick={() =>
                                    router.post(
                                        feature.url(entry.id),
                                        {},
                                        { preserveScroll: true },
                                    )
                                }
                                className="btn-ghost px-3 py-1.5 text-xs text-amber-700"
                            >
                                <Icon name="star" width={14} height={14} />
                                {entry.featured_at
                                    ? 'Lepas unggulan'
                                    : 'Jadikan unggulan'}
                            </button>
                        )}
                    </>
                )}
                <button
                    type="button"
                    disabled={form.processing}
                    onClick={() => save(false)}
                    className="btn-ghost px-3 py-1.5 text-xs"
                >
                    Simpan draf
                </button>
                <button
                    type="button"
                    disabled={form.processing}
                    onClick={() => save(true)}
                    className="btn-success px-3 py-1.5 text-xs"
                >
                    <Icon name="check" width={14} height={14} />
                    Verifikasi
                </button>
            </div>
        </div>
    );
}
