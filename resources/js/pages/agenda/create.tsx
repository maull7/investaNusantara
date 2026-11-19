import { Head, Link, useForm } from '@inertiajs/react';
import { type FormEvent, useEffect, useState } from 'react';
import { Field } from '@/components/admin/ui';
import Icon from '@/components/icons';
import { Reveal } from '@/components/motion';
import PublicLayout from '@/layouts/public';
import { agenda } from '@/routes';
import { store } from '@/routes/agenda';
import { cities as citiesRoute } from '@/routes/region';
import type { Region } from '@/types';

/** Organizer form. The event waits for the newsroom before it appears anywhere. */
export default function AgendaCreate({
    provinces,
    categories,
}: {
    provinces: Region[];
    categories: Record<string, string>;
}) {
    const [province, setProvince] = useState('');
    const [cities, setCities] = useState<Region[]>([]);
    const form = useForm({
        name: '',
        category: 'daerah',
        region_code: '',
        description: '',
        address: '',
        organizer: '',
        contact: '',
        website: '',
        starts_on: '',
        ends_on: '',
        featured_requested: false,
    });

    useEffect(() => {
        if (!province) {
            setCities([]);
            return;
        }
        let live = true;
        void fetch(citiesRoute.url(province))
            .then((r) => r.json() as Promise<Region[]>)
            .then((rows) => live && setCities(rows));

        return () => {
            live = false;
        };
    }, [province]);

    function submit(e: FormEvent) {
        e.preventDefault();
        form.transform((d) => ({
            ...d,
            website: d.website || null,
            ends_on: d.ends_on || null,
        }));
        form.post(store.url());
    }

    const err = form.errors;

    return (
        <PublicLayout tabs={false}>
            <Head title="Ajukan event" />
            <Reveal className="mx-auto max-w-2xl">
                <Link
                    href={agenda.url()}
                    className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-accent"
                >
                    <Icon name="back" width={16} height={16} />
                    Agenda nasional
                </Link>
                <form
                    onSubmit={submit}
                    className="mt-3 space-y-4 card p-6 sm:p-8"
                >
                    <div>
                        <h1 className="text-2xl font-semibold text-navy-900">
                            Ajukan event
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Event tampil di agenda nasional setelah diperiksa
                            redaksi. Kontak penyelenggara hanya untuk redaksi
                            dan tidak ditampilkan.
                        </p>
                    </div>

                    <Field label="Nama event" error={err.name}>
                        <input
                            value={form.data.name}
                            onChange={(e) =>
                                form.setData('name', e.target.value)
                            }
                            required
                            maxLength={200}
                            className="input"
                        />
                    </Field>
                    <Field label="Kategori" error={err.category}>
                        <select
                            value={form.data.category}
                            onChange={(e) =>
                                form.setData('category', e.target.value)
                            }
                            className="input"
                        >
                            {Object.entries(categories).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Provinsi">
                            <select
                                value={province}
                                onChange={(e) => {
                                    setProvince(e.target.value);
                                    form.setData('region_code', e.target.value);
                                }}
                                required
                                className="input"
                            >
                                <option value="">Pilih provinsi</option>
                                {provinces.map((p) => (
                                    <option key={p.code} value={p.code}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field
                            label="Kabupaten/kota"
                            hint="opsional"
                            error={err.region_code}
                        >
                            <select
                                value={
                                    form.data.region_code === province
                                        ? ''
                                        : form.data.region_code
                                }
                                onChange={(e) =>
                                    form.setData(
                                        'region_code',
                                        e.target.value || province,
                                    )
                                }
                                disabled={!province}
                                className="input"
                            >
                                <option value="">Seluruh provinsi</option>
                                {cities.map((c) => (
                                    <option key={c.code} value={c.code}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Tanggal mulai" error={err.starts_on}>
                            <input
                                type="date"
                                value={form.data.starts_on}
                                onChange={(e) =>
                                    form.setData('starts_on', e.target.value)
                                }
                                required
                                className="input"
                            />
                        </Field>
                        <Field
                            label="Tanggal selesai"
                            hint="opsional"
                            error={err.ends_on}
                        >
                            <input
                                type="date"
                                value={form.data.ends_on}
                                min={form.data.starts_on}
                                onChange={(e) =>
                                    form.setData('ends_on', e.target.value)
                                }
                                className="input"
                            />
                        </Field>
                    </div>
                    <Field label="Lokasi / alamat" error={err.address}>
                        <input
                            value={form.data.address}
                            onChange={(e) =>
                                form.setData('address', e.target.value)
                            }
                            required
                            maxLength={250}
                            className="input"
                        />
                    </Field>
                    <Field label="Deskripsi" error={err.description}>
                        <textarea
                            value={form.data.description}
                            onChange={(e) =>
                                form.setData('description', e.target.value)
                            }
                            required
                            rows={4}
                            maxLength={1000}
                            className="input"
                        />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Penyelenggara" error={err.organizer}>
                            <input
                                value={form.data.organizer}
                                onChange={(e) =>
                                    form.setData('organizer', e.target.value)
                                }
                                required
                                maxLength={200}
                                className="input"
                            />
                        </Field>
                        <Field
                            label="Kontak (WA/email)"
                            hint="untuk redaksi"
                            error={err.contact}
                        >
                            <input
                                value={form.data.contact}
                                onChange={(e) =>
                                    form.setData('contact', e.target.value)
                                }
                                required
                                maxLength={200}
                                className="input"
                            />
                        </Field>
                    </div>
                    <Field
                        label="Situs / pendaftaran"
                        hint="opsional"
                        error={err.website}
                    >
                        <input
                            type="url"
                            value={form.data.website}
                            onChange={(e) =>
                                form.setData('website', e.target.value)
                            }
                            placeholder="https://"
                            className="input"
                        />
                    </Field>
                    <label className="flex items-start gap-3 rounded-2xl bg-amber-500/10 p-4 text-sm ring-1 ring-amber-500/30">
                        <input
                            type="checkbox"
                            checked={form.data.featured_requested}
                            onChange={(e) =>
                                form.setData(
                                    'featured_requested',
                                    e.target.checked,
                                )
                            }
                            className="mt-0.5 size-4 accent-amber-600"
                        />
                        <span>
                            <span className="font-medium text-navy-900">
                                Ajukan sebagai event unggulan
                            </span>
                            <span className="block text-xs text-slate-500">
                                Tampil di atas agenda dan beranda. Redaksi akan
                                menghubungi Anda sebelum menyetujui.
                            </span>
                        </span>
                    </label>
                    <button
                        disabled={form.processing}
                        className="btn-primary w-full py-3"
                    >
                        <Icon name="send" width={16} height={16} />
                        {form.processing
                            ? 'Mengirim…'
                            : 'Kirim untuk diperiksa'}
                    </button>
                </form>
            </Reveal>
        </PublicLayout>
    );
}
