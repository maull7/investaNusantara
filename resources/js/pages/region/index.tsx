import { Head, Link, usePage } from '@inertiajs/react';
import { motion } from 'motion/react';
import { Reveal, Stagger } from '@/components/motion';
import RegionPicker from '@/components/region-picker';
import PublicLayout from '@/layouts/public';
import { regionHref } from '@/lib/news';

export default function RegionIndex() {
    const { provinces } = usePage().props.nav;

    return (
        <PublicLayout tabs={false}>
            <Head title="Jelajah Wilayah" />
            <Stagger className="space-y-6">
                <Reveal>
                    <h1 className="text-2xl font-semibold text-navy-900">
                        Jelajah Wilayah
                    </h1>
                    <p className="text-sm text-slate-500">
                        38 provinsi · 514 kabupaten/kota. Pilih daerah untuk
                        membaca beritanya.
                    </p>
                </Reveal>
                <Reveal className="card p-4">
                    <RegionPicker />
                </Reveal>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {provinces.map((p, i) => (
                        <motion.div
                            key={p.code}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                delay: 0.1 + i * 0.02,
                                duration: 0.4,
                            }}
                            whileHover={{ y: -4 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            <Link
                                href={regionHref(p)}
                                viewTransition
                                className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-merah-dark shadow-[0_10px_24px_-12px_rgba(107,7,18,0.6)]"
                            >
                                {p.image_url && (
                                    <img
                                        src={p.image_url}
                                        alt=""
                                        loading="lazy"
                                        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-110"
                                    />
                                )}
                                <span className="absolute inset-0 bg-gradient-to-t from-merah-dark/65 via-merah/10 to-transparent" />
                                <span className="absolute inset-x-3 bottom-3 text-sm leading-tight font-semibold text-white">
                                    {p.name}
                                </span>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </Stagger>
        </PublicLayout>
    );
}
