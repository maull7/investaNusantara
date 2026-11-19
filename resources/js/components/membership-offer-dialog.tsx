import type { RefObject } from 'react';
import Icon from '@/components/icons';

export type OfferPlan = {
    id: number;
    name: string;
    tagline: string | null;
    price: number;
    benefits: string[];
};
const rupiah = new Intl.NumberFormat('id-ID');

export default function MembershipOfferDialog({
    offer,
    offerRef,
    onChoose,
    onCompare,
}: {
    offer: OfferPlan;
    offerRef: RefObject<HTMLDialogElement | null>;
    onChoose: () => void;
    onCompare: () => void;
}) {
    return (
        <dialog
            ref={offerRef}
            aria-labelledby="offer-title"
            aria-describedby="offer-description"
            onClick={(event) => {
                if (event.target === event.currentTarget)
                    offerRef.current?.close();
            }}
            className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl border-0 bg-white p-0 text-navy-900 shadow-2xl backdrop:bg-navy-900/65 backdrop:backdrop-blur-sm"
        >
            <div className="relative bg-navy-900 p-6 text-white sm:p-8">
                <button
                    type="button"
                    aria-label="Tutup penawaran"
                    onClick={() => offerRef.current?.close()}
                    className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-white/10 text-xl hover:bg-white/20"
                >
                    ×
                </button>
                <p className="text-xs font-semibold tracking-widest text-white/70 uppercase">
                    Pilihan untuk Anda
                </p>
                <h2
                    id="offer-title"
                    className="mt-3 pr-5 text-2xl font-semibold"
                >
                    Kenali isu daerah lebih cepat
                </h2>
                <p
                    id="offer-description"
                    className="mt-2 text-sm leading-relaxed text-white/75"
                >
                    Ubah berita menjadi wawasan untuk keputusan Anda. Mulai
                    dengan paket {offer.name}.
                </p>
            </div>
            <div className="p-6 sm:p-8">
                <p className="font-semibold">{offer.name}</p>
                <p className="mt-1 text-sm text-slate-500">{offer.tagline}</p>
                <p className="mt-4 text-3xl font-semibold">
                    {offer.price > 0
                        ? `Rp ${rupiah.format(offer.price)}`
                        : 'Penawaran khusus'}
                    {offer.price > 0 && (
                        <span className="text-sm font-normal text-slate-500">
                            {' '}
                            / bulan
                        </span>
                    )}
                </p>
                <ul className="mt-5 space-y-3">
                    {offer.benefits.slice(0, 3).map((benefit, i) => (
                        <li
                            key={i}
                            className="flex gap-2 text-sm text-slate-600"
                        >
                            <Icon
                                name="check"
                                width={16}
                                height={16}
                                className="mt-0.5 shrink-0 text-emerald-600"
                            />
                            {benefit}
                        </li>
                    ))}
                </ul>
                <button
                    type="button"
                    className="btn-primary mt-6 w-full py-3"
                    onClick={() => {
                        offerRef.current?.close();
                        onChoose();
                    }}
                >
                    Saya tertarik, pilih {offer.name}
                </button>
                <button
                    type="button"
                    className="mt-3 w-full py-2 text-sm text-slate-500 hover:text-navy-900"
                    onClick={() => {
                        offerRef.current?.close();
                        onCompare();
                    }}
                >
                    Bandingkan semua paket
                </button>
                <p className="mt-3 text-center text-xs text-slate-400">
                    Pengajuan tanpa pembayaran langsung. Tim kami akan
                    menghubungi Anda.
                </p>
            </div>
        </dialog>
    );
}
