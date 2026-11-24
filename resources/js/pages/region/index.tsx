import { Head, Link, usePage } from '@inertiajs/react';
import {
    geoBounds,
    geoCentroid,
    geoEquirectangular,
    geoOrthographic,
    geoPath,
} from 'd3-geo';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import Icon from '@/components/icons';
import RegionPicker from '@/components/region-picker';
import PublicLayout from '@/layouts/public';
import { regionHref, timeAgo } from '@/lib/news';
import { cn } from '@/lib/utils';
import { cities as citiesRoute } from '@/routes/region';
import { article as articleRoute, agenda as agendaRoute } from '@/routes';
import { create as agendaCreate, show as agendaShow } from '@/routes/agenda';
import type { ArticleCard, Region } from '@/types';

type MapData = GeoJSON.FeatureCollection<
    GeoJSON.MultiPolygon,
    { code: string }
>;
type AgendaPreview = {
    id: number;
    slug: string;
    name: string;
    address: string | null;
    starts_on: string;
    ends_on: string | null;
    region: { name: string } | null;
};
type Rotation = [number, number];
type Profile = {
    capital: string | null;
    region: string | null;
    summary: string | null;
    icons: string[];
    regencies: number;
    cities: number;
    umkm: {
        name: string;
        category: string;
        description: string;
        image: {
            url: string;
            credit: string;
            license: string;
            page: string | null;
        } | null;
    }[];
};

const GLOBE = { cx: 450, cy: 265, r: 218 };
const NO_NEWS = '#dce5ed';

/** Interactive map: flat Indonesia, click a province to spin a draggable globe onto it. */
export default function RegionIndex({
    provinceCounts,
}: {
    provinceCounts: Record<string, number>;
}) {
    const { provinces } = usePage().props.nav;
    const [national, setNational] = useState<MapData | null>(null);
    const [cityMap, setCityMap] = useState<MapData | null>(null);
    const [cities, setCities] = useState<Region[]>([]);
    const [latest, setLatest] = useState<ArticleCard[]>([]);
    const [agenda, setAgenda] = useState<AgendaPreview[]>([]);
    const [previewError, setPreviewError] = useState(false);
    const [latestLoading, setLatestLoading] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [selected, setSelected] = useState<Region | null>(null);
    const [hovered, setHovered] = useState<string | null>(null);
    const [rotation, setRotation] = useState<Rotation>([-118, 2]);
    const [scale, setScale] = useState(GLOBE.r);
    const [fitScale, setFitScale] = useState(GLOBE.r);
    const [ready, setReady] = useState(false);
    const frame = useRef<number | null>(null);
    const drag = useRef<{
        x: number;
        y: number;
        from: Rotation;
        moved: boolean;
    } | null>(null);

    useEffect(() => {
        void fetch('/maps/interactive/provinces.json')
            .then((r) => r.json())
            .then(setNational);

        return () => stopSpin();
    }, []);

    useEffect(() => {
        setAgenda([]);
        setPreviewError(false);
        if (!selected) {
            setLatest([]);
            setLatestLoading(false);
            return;
        }
        const controller = new AbortController();
        setLatest([]);
        setLatestLoading(true);
        void fetch(`/api/wilayah/${selected.code}/preview`, {
            signal: controller.signal,
        })
            .then((response) =>
                response.ok ? response.json() : Promise.reject(),
            )
            .then(
                (data: { latest: ArticleCard[]; agenda: AgendaPreview[] }) => {
                    setLatest(data.latest);
                    setAgenda(data.agenda);
                },
            )
            .catch(() => {
                if (!controller.signal.aborted) setPreviewError(true);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLatestLoading(false);
            });
        return () => controller.abort();
    }, [selected]);

    // Editorial profile + UMKM for the picked province.
    useEffect(() => {
        setProfile(null);
        if (!selected) {
            return;
        }
        const controller = new AbortController();
        void fetch(`/api/wilayah/${selected.code}/profil`, {
            signal: controller.signal,
        })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then(setProfile)
            .catch(() => undefined);

        return () => controller.abort();
    }, [selected]);

    // /wilayah?provinsi=11 opens straight on that province (shareable link).
    const deepLink = useMemo(
        () => new URLSearchParams(window.location.search).get('provinsi'),
        [],
    );
    useEffect(() => {
        const province = provinces.find((p) => p.code === deepLink);
        if (national && province) {
            selectProvince(province);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [national]);

    const count = (code: string) => Number(provinceCounts[code] ?? 0);
    const maxCount = Math.max(1, ...Object.values(provinceCounts).map(Number));
    const color = (code: string) =>
        count(code)
            ? `hsl(353 72% ${72 - 39 * Math.sqrt(count(code) / maxCount)}%)`
            : NO_NEWS;

    const provinceByCode = useMemo(
        () => new Map(provinces.map((p) => [p.code, p])),
        [provinces],
    );
    const cityByCode = useMemo(
        () => new Map(cities.map((c) => [c.code, c])),
        [cities],
    );
    const flatPath = useMemo(
        () =>
            national
                ? geoPath(
                      geoEquirectangular().fitExtent(
                          [
                              [24, 50],
                              [876, 480],
                          ],
                          national,
                      ),
                  )
                : null,
        [national],
    );
    const globePath = useMemo(
        () =>
            geoPath(
                geoOrthographic()
                    .translate([GLOBE.cx, GLOBE.cy])
                    .scale(scale)
                    .rotate(rotation)
                    .clipAngle(90),
            ),
        [rotation, scale],
    );

    function stopSpin() {
        if (frame.current !== null) {
            cancelAnimationFrame(frame.current);
            frame.current = null;
        }
    }

    /** Spin the globe so the province sits at the centre, then reveal its cities. */
    function selectProvince(province: Region) {
        const feature = national?.features.find(
            (f) => f.properties.code === province.code,
        );
        if (!feature) {
            return;
        }
        stopSpin();
        setSelected(province);
        setHovered(null);
        setCityMap(null);
        setCities([]);
        setReady(false);

        const [lon, lat] = geoCentroid(feature);
        const target: Rotation = [-lon, -lat];
        // Zoom so the province fills about 80% of the frame height.
        const [[w, south], [e, north]] = geoBounds(feature);
        const span = Math.max(
            (e - w) * Math.cos((lat * Math.PI) / 180),
            north - south,
            0.5,
        );
        const zoomTo = Math.min(
            7000,
            Math.max(GLOBE.r, 420 / ((span * Math.PI) / 180)),
        );

        setFitScale(zoomTo);

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setRotation(target);
            setScale(zoomTo);
            setReady(true);
        } else {
            // Two beats: spin the globe onto the province, then zoom in.
            const SPIN = 900;
            const ZOOM = 800;
            const start = performance.now();
            const from = rotation;
            const fromScale = scale;
            // Take the short way round the globe.
            const dLon = ((((target[0] - from[0]) % 360) + 540) % 360) - 180;
            const ease = (t: number) => 1 - (1 - t) ** 3;
            const tick = (now: number) => {
                const el = now - start;
                const spin = ease(Math.min(1, el / SPIN));
                const zoom = ease(Math.min(1, Math.max(0, (el - SPIN) / ZOOM)));
                setRotation([
                    from[0] + dLon * spin,
                    from[1] + (target[1] - from[1]) * spin,
                ]);
                // Interpolate in log space: zoom feels even instead of rushing at the end.
                setScale(
                    Math.exp(
                        Math.log(fromScale) +
                            (Math.log(zoomTo) - Math.log(fromScale)) * zoom,
                    ),
                );
                if (el < SPIN + ZOOM) {
                    frame.current = requestAnimationFrame(tick);
                } else {
                    setReady(true);
                }
            };
            frame.current = requestAnimationFrame(tick);
        }

        void Promise.all([
            fetch(`/maps/interactive/${province.code}.json`),
            fetch(citiesRoute.url(province.code)),
        ])
            .then(async ([map, list]) => {
                if (map.ok) {
                    setCityMap(await map.json());
                }
                if (list.ok) {
                    setCities(await list.json());
                }
            })
            .catch(() => undefined); // the province link and the picker still work
    }

    /** Step zoom in or zoom out incrementally (buttons & wheel). */
    function zoomBy(factor: number) {
        stopSpin();
        const minScale = GLOBE.r * 0.8;
        const maxScale = 14000;
        const next = Math.max(minScale, Math.min(maxScale, scale * factor));
        setScale(next);
        setReady(true);
    }

    /** Toggle between the whole globe and the province filling the frame. */
    function toggleZoom() {
        stopSpin();
        const from = scale;
        const to = scale > GLOBE.r * 1.5 ? GLOBE.r : fitScale;
        const start = performance.now();
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / 700);
            const eased = 1 - (1 - t) ** 3;
            setScale(
                Math.exp(
                    Math.log(from) + (Math.log(to) - Math.log(from)) * eased,
                ),
            );
            if (t < 1) {
                frame.current = requestAnimationFrame(tick);
            }
        };
        frame.current = requestAnimationFrame(tick);
    }

    function reset() {
        stopSpin();
        setScale(GLOBE.r);
        setSelected(null);
        setCityMap(null);
        setCities([]);
        setReady(false);
        setHovered(null);
    }

    // Drag the globe to rotate it. The pointer is only captured once it really moves,
    // so a plain click still reaches the city underneath.
    function onPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
        if (selected) {
            stopSpin();
            drag.current = {
                x: e.clientX,
                y: e.clientY,
                from: rotation,
                moved: false,
            };
        }
    }
    function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
        const d = drag.current;
        if (!d) {
            return;
        }
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (!d.moved && Math.abs(dx) + Math.abs(dy) > 5) {
            d.moved = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            setReady(true);
        }
        if (d.moved) {
            // 1 screen pixel on the surface = 1 pixel of motion, at any zoom.
            const k =
                ((900 / e.currentTarget.getBoundingClientRect().width) * 57.3) /
                scale;
            setRotation([
                d.from[0] + dx * k,
                Math.max(-90, Math.min(90, d.from[1] - dy * k)),
            ]);
        }
    }
    function onPointerUp() {
        // Leave `moved` set until the click event has passed, then clear it.
        window.setTimeout(() => (drag.current = null), 0);
    }
    function swallowClickAfterDrag(e: React.MouseEvent) {
        if (drag.current?.moved) {
            e.preventDefault();
            e.stopPropagation();
        }
    }

    const hoveredName = selected
        ? hovered && cityByCode.get(hovered)?.name
        : hovered && provinceByCode.get(hovered)?.name;

    return (
        <PublicLayout tabs={false}>
            <Head title="Jelajah Wilayah" />
            <div className="space-y-5">
                <header>
                    <p className="text-xs font-bold tracking-[0.2em] text-merah uppercase">
                        Nusantara dalam peta
                    </p>
                    <h1 className="mt-1 text-3xl font-bold text-navy-900">
                        Jelajah Wilayah
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Pilih dari 38 provinsi dan 514 kabupaten/kota untuk
                        membaca berita setempat.
                    </p>
                </header>

                <div className="grid items-stretch gap-4 md:grid-cols-[minmax(0,1fr)_260px] lg:grid-cols-[minmax(0,1fr)_340px]">
                    <section
                        className="min-w-0 card p-3 sm:p-5"
                        aria-label="Peta interaktif Indonesia"
                    >
                        <div className="flex items-center justify-between gap-3 min-h-[40px]">
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-navy-900">
                                    {selected ? selected.name : 'Indonesia'}
                                </p>
                                <p className="truncate text-xs text-slate-500">
                                    {selected
                                        ? 'Seret untuk memutar globe, klik kabupaten/kota untuk membuka beritanya'
                                        : 'Klik provinsi pada peta'}
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                {selected ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={toggleZoom}
                                            disabled={!ready}
                                            className="btn-ghost px-3 py-1.5 text-xs whitespace-nowrap"
                                        >
                                            {scale > GLOBE.r * 1.5
                                                ? 'Lihat globe'
                                                : 'Zoom wilayah'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={reset}
                                            className="btn-ghost px-3 py-1.5 text-xs whitespace-nowrap"
                                        >
                                            <Icon
                                                name="back"
                                                width={14}
                                                height={14}
                                            />
                                            Seluruh Indonesia
                                        </button>
                                    </>
                                ) : (
                                    <div className="h-7" aria-hidden="true" />
                                )}
                            </div>
                        </div>

                        <div className="relative mt-3 overflow-hidden rounded-2xl bg-[#f1f7fa]">
                            <svg
                                viewBox="0 0 900 530"
                                role="img"
                                aria-label={
                                    selected
                                        ? `Globe berpusat di ${selected.name}`
                                        : 'Peta provinsi Indonesia'
                                }
                                className={cn(
                                    'block aspect-[900/530] w-full',
                                    selected &&
                                        'cursor-grab touch-none select-none active:cursor-grabbing',
                                )}
                                onPointerDown={onPointerDown}
                                onPointerMove={onPointerMove}
                                onPointerUp={onPointerUp}
                                onPointerCancel={onPointerUp}
                                onWheel={(e) => {
                                    if (selected) {
                                        e.preventDefault();
                                        zoomBy(e.deltaY < 0 ? 1.15 : 0.85);
                                    }
                                }}
                                onClickCapture={swallowClickAfterDrag}
                            >
                                <defs>
                                    <radialGradient
                                        id="ocean"
                                        cx="38%"
                                        cy="32%"
                                        r="75%"
                                    >
                                        <stop offset="0" stopColor="#e6f4f8" />
                                        <stop offset="1" stopColor="#9fcfe0" />
                                    </radialGradient>
                                </defs>

                                {selected ? (
                                    <>
                                        <circle
                                            cx={GLOBE.cx}
                                            cy={GLOBE.cy}
                                            r={scale}
                                            fill="url(#ocean)"
                                            stroke="#82bacd"
                                            strokeWidth="2"
                                        />
                                        {national?.features.map((f) => {
                                            const province = provinceByCode.get(
                                                f.properties.code,
                                            );
                                            const current =
                                                f.properties.code ===
                                                selected.code;

                                            return (
                                                <path
                                                    key={f.properties.code}
                                                    d={globePath(f) ?? ''}
                                                    fill={
                                                        current
                                                            ? color(
                                                                  selected.code,
                                                              )
                                                            : '#e4ebee'
                                                    }
                                                    stroke="#fff"
                                                    strokeWidth=".8"
                                                    fillRule="evenodd"
                                                    className={cn(
                                                        !current &&
                                                            'cursor-pointer hover:fill-[#cfdbe0]',
                                                    )}
                                                    onClick={() =>
                                                        !current &&
                                                        province &&
                                                        selectProvince(province)
                                                    }
                                                >
                                                    {!current && province && (
                                                        <title>
                                                            {province.name}
                                                        </title>
                                                    )}
                                                </path>
                                            );
                                        })}
                                        {ready &&
                                            cityMap?.features.map((f) => {
                                                const city = cityByCode.get(
                                                    f.properties.code,
                                                );

                                                return city ? (
                                                    <Link
                                                        key={city.code}
                                                        href={regionHref({
                                                            ...city,
                                                            parent: selected,
                                                        })}
                                                        aria-label={`Buka berita ${city.name}`}
                                                        onMouseEnter={() =>
                                                            setHovered(
                                                                city.code,
                                                            )
                                                        }
                                                        onMouseLeave={() =>
                                                            setHovered(null)
                                                        }
                                                    >
                                                        <path
                                                            d={
                                                                globePath(f) ??
                                                                ''
                                                            }
                                                            fill={color(
                                                                selected.code,
                                                            )}
                                                            stroke="#fff"
                                                            strokeWidth="1.3"
                                                            fillRule="evenodd"
                                                            className={cn(
                                                                'cursor-pointer',
                                                                hovered ===
                                                                    city.code &&
                                                                    'fill-merah',
                                                            )}
                                                        />
                                                    </Link>
                                                ) : null;
                                            })}
                                        {/* Soft shading so the sphere reads as a ball */}
                                        <circle
                                            cx={GLOBE.cx}
                                            cy={GLOBE.cy}
                                            r={scale}
                                            fill="none"
                                            stroke="#82bacd"
                                            strokeWidth="2"
                                            pointerEvents="none"
                                        />
                                    </>
                                ) : (
                                    national?.features.map((f) => {
                                        const province = provinceByCode.get(
                                            f.properties.code,
                                        );

                                        return province ? (
                                            <path
                                                key={province.code}
                                                d={flatPath?.(f) ?? ''}
                                                fill={color(province.code)}
                                                stroke="#fff"
                                                strokeWidth="1.2"
                                                fillRule="evenodd"
                                                className="cursor-pointer transition-colors hover:fill-merah"
                                                onMouseEnter={() =>
                                                    setHovered(province.code)
                                                }
                                                onMouseLeave={() =>
                                                    setHovered(null)
                                                }
                                                onClick={() =>
                                                    selectProvince(province)
                                                }
                                            />
                                        ) : null;
                                    })
                                )}
                            </svg>

                            {!national && (
                                <div className="absolute inset-0 grid place-items-center text-sm text-slate-500">
                                    Memuat peta…
                                </div>
                            )}

                            {/* Floating Zoom In & Zoom Out Controls */}
                            {selected && (
                                <div className="absolute right-3 bottom-3 z-10 flex flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white/95 shadow-md backdrop-blur-sm">
                                    <button
                                        type="button"
                                        aria-label="Perbesar peta"
                                        title="Perbesar (Zoom In)"
                                        onClick={() => zoomBy(1.3)}
                                        className="grid size-8 place-items-center text-navy-800 transition-colors hover:bg-slate-100 hover:text-accent active:bg-slate-200"
                                    >
                                        <svg
                                            className="size-4"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <line x1="12" y1="5" x2="12" y2="19" />
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                    </button>
                                    <div className="h-px w-full bg-slate-200" />
                                    <button
                                        type="button"
                                        aria-label="Perkecil peta"
                                        title="Perkecil (Zoom Out)"
                                        onClick={() => zoomBy(1 / 1.3)}
                                        className="grid size-8 place-items-center text-navy-800 transition-colors hover:bg-slate-100 hover:text-accent active:bg-slate-200"
                                    >
                                        <svg
                                            className="size-4"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                    </button>
                                </div>
                            )}

                            {hoveredName && (
                                <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/95 px-3 py-2 text-xs font-semibold text-navy-900 shadow">
                                    {hoveredName}
                                    {!selected &&
                                        hovered &&
                                        ` · ${count(hovered)} berita`}
                                </div>
                            )}
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                            <span>Sedikit berita</span>
                            <span className="h-3 w-20 rounded-full bg-gradient-to-r from-[#dce5ed] via-[#db808b] to-[#a51f35]" />
                            <span>Banyak berita</span>
                        </div>
                    </section>

                    <SidePanel
                        selected={selected}
                        cities={cities}
                        count={count}
                        hovered={hovered}
                        onHover={setHovered}
                        onPick={selectProvince}
                    />
                </div>

                {selected ? (
                    <section
                        className="space-y-4"
                        aria-label={`Informasi ${selected.name}`}
                    >
                        <div className="flex flex-wrap items-end justify-between gap-2">
                            <div>
                                <p className="text-xs font-bold tracking-wider text-merah uppercase">
                                    Sorotan daerah
                                </p>
                                <h2 className="text-2xl font-bold text-navy-900">
                                    Kenali {selected.name}
                                </h2>
                            </div>
                            <Link
                                href={regionHref(selected)}
                                className="text-sm font-semibold text-merah hover:underline"
                            >
                                Buka halaman provinsi →
                            </Link>
                        </div>
                        <div className="grid items-stretch gap-4 md:grid-cols-2">
                            <article className="flex h-full flex-col overflow-hidden card">
                                <div className="relative h-44 shrink-0 bg-merah-dark sm:h-48">
                                    {selected.image_url && (
                                        <img
                                            src={selected.image_url}
                                            alt=""
                                            className="size-full object-cover"
                                        />
                                    )}
                                    <span className="absolute inset-0 bg-gradient-to-t from-merah-dark/85 via-merah-dark/30 to-transparent" />
                                    <h3 className="absolute bottom-4 left-5 text-xl font-bold text-white">
                                        Profil {selected.name}
                                    </h3>
                                </div>
                                <div className="flex flex-1 flex-col justify-between space-y-4 p-5 text-sm text-slate-600 sm:p-6">
                                    <div className="space-y-3.5">
                                        {profile?.capital && (
                                            <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                                                Ibu kota {profile.capital} ·{' '}
                                                {profile.region}
                                            </p>
                                        )}
                                        {profile?.summary && (
                                            <p className="leading-relaxed">
                                                {profile.summary}
                                            </p>
                                        )}
                                        {profile && profile.icons.length > 0 && (
                                            <div className="space-y-1.5 pt-1">
                                                <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                                                    <span className="text-amber-500">✨</span>
                                                    Ciri Khas & Ikonik
                                                </span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {profile.icons.map((icon) => (
                                                        <span
                                                            key={icon}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-accent/15 bg-accent/[0.04] px-2.5 py-1 text-xs font-medium text-navy-900 transition-colors hover:border-accent/30 hover:bg-accent/[0.08]"
                                                        >
                                                            <span className="size-1 rounded-full bg-accent" />
                                                            {icon}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2.5 border-t border-slate-100 pt-4">
                                        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-center transition-colors hover:border-slate-300">
                                            <div className="text-lg font-bold text-navy-900 sm:text-xl">
                                                {profile?.regencies ?? '…'}
                                            </div>
                                            <div className="mt-0.5 text-[11px] font-medium text-slate-500">
                                                Kabupaten
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-center transition-colors hover:border-slate-300">
                                            <div className="text-lg font-bold text-navy-900 sm:text-xl">
                                                {profile?.cities ?? '…'}
                                            </div>
                                            <div className="mt-0.5 text-[11px] font-medium text-slate-500">
                                                Kota Otonom
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-accent/20 bg-accent/[0.04] p-3 text-center transition-colors hover:border-accent/40">
                                            <div className="text-lg font-bold text-accent sm:text-xl">
                                                {count(selected.code)}
                                            </div>
                                            <div className="mt-0.5 text-[11px] font-medium text-accent">
                                                Berita
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </article>
                            <article className="flex h-full flex-col card p-5 sm:p-6">
                                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                    <h3 className="text-lg font-bold text-navy-900">
                                        Berita terbaru
                                    </h3>
                                    <Link
                                        href={regionHref(selected)}
                                        className="text-xs font-semibold text-merah hover:underline"
                                    >
                                        Semua berita →
                                    </Link>
                                </div>
                                <div className="flex flex-1 flex-col justify-between divide-y divide-slate-100">
                                    {latest.map((story) => (
                                        <Link
                                            key={story.id}
                                            href={articleRoute.url(story.slug)}
                                            className="group flex flex-1 items-center gap-3.5 py-2.5 first:pt-2 last:pb-0"
                                        >
                                            {story.cover_url ? (
                                                <img
                                                    src={story.cover_url}
                                                    alt=""
                                                    loading="lazy"
                                                    className="size-14 shrink-0 rounded-xl object-cover transition-transform duration-200 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-400">
                                                    <Icon name="file" width={18} height={18} />
                                                </div>
                                            )}
                                            <span className="min-w-0 flex-1">
                                                <span className="line-clamp-2 text-sm leading-snug font-semibold text-navy-900 transition-colors group-hover:text-merah">
                                                    {story.title}
                                                </span>
                                                <span className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                                                    <Icon name="clock" width={12} height={12} />
                                                    {timeAgo(story.published_at)}
                                                </span>
                                            </span>
                                        </Link>
                                    ))}
                                    {!latestLoading && latest.length === 0 && (
                                        <div className="grid flex-1 place-items-center py-6 text-center text-sm text-slate-500">
                                            Belum ada berita terbaru dari wilayah ini.
                                        </div>
                                    )}
                                    {latestLoading && (
                                        <div className="grid flex-1 place-items-center py-6 text-center text-sm text-slate-500">
                                            Memuat berita…
                                        </div>
                                    )}
                                </div>
                            </article>
                            {/* Full row: a lone half-width agenda card left the other half empty. */}
                            <article className="card p-5 sm:p-6 md:col-span-2">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-lg font-bold text-navy-900">
                                            Agenda daerah
                                        </h3>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Event mendatang dan yang sedang
                                            berlangsung di {selected.name}.
                                        </p>
                                    </div>
                                    <Link
                                        href={agendaRoute.url({
                                            query: { provinsi: selected.code },
                                        })}
                                        className="text-sm font-semibold text-accent hover:underline"
                                    >
                                        Lihat semua agenda →
                                    </Link>
                                </div>
                                {latestLoading ? (
                                    <p
                                        role="status"
                                        className="mt-4 text-sm text-slate-500"
                                    >
                                        Memuat agenda…
                                    </p>
                                ) : previewError ? (
                                    <p
                                        role="status"
                                        className="mt-4 text-sm text-slate-500"
                                    >
                                        Agenda belum dapat dimuat. Buka semua
                                        agenda untuk melihat jadwal.
                                    </p>
                                ) : agenda.length ? (
                                    <ul className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                        {agenda.map((event) => (
                                            <li key={event.id}>
                                                <Link
                                                    href={agendaShow.url(
                                                        event.slug,
                                                    )}
                                                    className="group flex h-full items-start gap-4 rounded-2xl p-3 ring-1 ring-slate-200 transition hover:bg-accent/5 hover:ring-accent/30"
                                                >
                                                    <div className="min-w-14 rounded-xl bg-accent/10 p-2 text-center text-accent">
                                                        <span className="block text-xl font-bold">
                                                            {new Date(
                                                                event.starts_on,
                                                            ).getUTCDate()}
                                                        </span>
                                                        <span className="block text-xs uppercase">
                                                            {new Date(
                                                                event.starts_on,
                                                            ).toLocaleDateString(
                                                                'id-ID',
                                                                {
                                                                    month: 'short',
                                                                    timeZone:
                                                                        'UTC',
                                                                },
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-navy-900 group-hover:text-accent">
                                                            {event.name}
                                                        </p>
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {new Date(
                                                                event.starts_on,
                                                            ).toLocaleDateString(
                                                                'id-ID',
                                                                {
                                                                    day: 'numeric',
                                                                    month: 'long',
                                                                    year: 'numeric',
                                                                    timeZone:
                                                                        'UTC',
                                                                },
                                                            )}
                                                            {event.ends_on &&
                                                                ` – ${new Date(event.ends_on).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}`}
                                                        </p>
                                                        <p className="mt-1 text-sm text-slate-500">
                                                            {event.address ||
                                                                event.region
                                                                    ?.name}
                                                        </p>
                                                    </div>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="mt-4 flex flex-col items-start gap-3 rounded-2xl border border-dashed border-slate-200 p-4 sm:flex-row sm:items-center">
                                        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                                            <Icon
                                                name="calendar"
                                                width={20}
                                                height={20}
                                            />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-navy-900">
                                                Belum ada agenda mendatang di{' '}
                                                {selected.name}
                                            </p>
                                            <p className="mt-0.5 text-sm text-slate-500">
                                                Punya event di daerah ini?
                                                Ajukan agar tampil di kalender
                                                nasional.
                                            </p>
                                        </div>
                                        <Link
                                            href={agendaCreate.url()}
                                            className="btn-ghost shrink-0"
                                        >
                                            <Icon
                                                name="plus"
                                                width={16}
                                                height={16}
                                            />
                                            Ajukan event
                                        </Link>
                                    </div>
                                )}
                            </article>
                            <article className="card p-5 md:col-span-2">
                                <h3 className="text-lg font-bold text-navy-900">
                                    UMKM unggulan
                                </h3>
                                {!profile || profile.umkm.length === 0 ? (
                                    <p className="mt-2 text-sm text-slate-500">
                                        {profile
                                            ? `Profil UMKM unggulan ${selected.name} belum tersedia.`
                                            : 'Memuat…'}
                                    </p>
                                ) : (
                                    <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                                        {profile.umkm.map((u) => (
                                            <li
                                                key={u.name}
                                                className="group overflow-hidden rounded-2xl bg-surface ring-1 ring-slate-200"
                                            >
                                                <div className="relative aspect-[4/3] bg-gradient-to-br from-merah-dark to-merah">
                                                    {u.image && (
                                                        <img
                                                            src={u.image.url}
                                                            alt={u.name}
                                                            loading="lazy"
                                                            className="size-full object-cover transition duration-500 group-hover:scale-105"
                                                        />
                                                    )}
                                                    <span className="absolute top-2 left-2 rounded-full bg-surface/90 px-2 py-0.5 text-[10px] font-semibold text-accent">
                                                        {u.category}
                                                    </span>
                                                </div>
                                                <div className="p-3">
                                                    <p className="text-sm font-semibold text-navy-900">
                                                        {u.name}
                                                    </p>
                                                    <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-500">
                                                        {u.description}
                                                    </p>
                                                    {u.image && (
                                                        <p className="mt-2 truncate text-[10px] text-slate-400">
                                                            Foto:{' '}
                                                            {u.image.page ? (
                                                                <a
                                                                    href={
                                                                        u.image
                                                                            .page
                                                                    }
                                                                    target="_blank"
                                                                    rel="noopener nofollow"
                                                                    className="hover:text-accent"
                                                                >
                                                                    {
                                                                        u.image
                                                                            .credit
                                                                    }
                                                                </a>
                                                            ) : (
                                                                u.image.credit
                                                            )}{' '}
                                                            · {u.image.license}
                                                        </p>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </article>
                        </div>
                    </section>
                ) : (
                    <section className="card p-4 sm:p-5">
                        <div className="mb-3">
                            <h2 className="text-base font-semibold text-navy-900">
                                Pilih wilayah dengan cepat
                            </h2>
                            <p className="text-xs text-slate-500">
                                Pilih provinsi dan kabupaten/kota dari menu di
                                bawah.
                            </p>
                        </div>
                        <RegionPicker />
                    </section>
                )}
            </div>
        </PublicLayout>
    );
}

/** Right column: search + top provinces, or the picked province with its photo and cities. */
function SidePanel({
    selected,
    cities,
    count,
    hovered,
    onHover,
    onPick,
}: {
    selected: Region | null;
    cities: Region[];
    count: (code: string) => number;
    hovered: string | null;
    onHover: (code: string | null) => void;
    onPick: (province: Region) => void;
}) {
    const { provinces } = usePage().props.nav;
    const [query, setQuery] = useState('');
    const results = query.trim()
        ? provinces
              .filter((p) =>
                  p.name.toLowerCase().includes(query.trim().toLowerCase()),
              )
              .slice(0, 8)
        : [];
    const ranked = [...provinces]
        .sort((a, b) => count(b.code) - count(a.code))
        .slice(0, 5);
    const topCount = Math.max(1, ...ranked.map((p) => count(p.code)));

    function pick(p: Region) {
        setQuery('');
        onPick(p);
    }

    return (
        <aside className="flex min-w-0 flex-col overflow-hidden card">
            <div className="p-4 pb-0">
                <label
                    htmlFor="region-search"
                    className="text-xs font-bold tracking-wider text-slate-500 uppercase"
                >
                    Cari provinsi
                </label>
                <input
                    id="region-search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Contoh: Aceh"
                    autoComplete="off"
                    className="mt-2 input rounded-full pl-4"
                />
                {results.length > 0 && (
                    <ul className="mt-2 max-h-48 overflow-y-auto rounded-2xl border border-slate-100 p-1">
                        {results.map((p) => (
                            <li key={p.code}>
                                <button
                                    type="button"
                                    onClick={() => pick(p)}
                                    className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-accent/5 hover:text-accent"
                                >
                                    {p.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {selected ? (
                <div className="mt-4 flex flex-col">
                    <div className="relative h-36 bg-merah-dark">
                        {selected.image_url && (
                            <img
                                src={selected.image_url}
                                alt=""
                                className="size-full object-cover"
                            />
                        )}
                        <span className="absolute inset-0 bg-gradient-to-t from-merah-dark/85 via-merah-dark/20 to-transparent" />
                        <div className="absolute inset-x-4 bottom-3 text-white">
                            <h2 className="text-xl leading-tight font-bold">
                                {selected.name}
                            </h2>
                            <p className="text-xs text-white/80">
                                {count(selected.code)} berita ·{' '}
                                {cities.length || '…'} kabupaten/kota
                            </p>
                        </div>
                    </div>
                    <div className="space-y-4 p-4">
                        <Link
                            href={regionHref(selected)}
                            className="btn-primary w-full py-2.5"
                        >
                            Buka halaman {selected.name}
                            <Icon name="arrow" width={16} height={16} />
                        </Link>
                        <div>
                            <h3 className="mb-2 text-xs font-bold tracking-wider text-slate-500 uppercase">
                                Kabupaten/kota
                            </h3>
                            <ul className="max-h-72 space-y-0.5 overflow-y-auto pr-1">
                                {cities.map((city) => (
                                    <li key={city.code}>
                                        <Link
                                            href={regionHref({
                                                ...city,
                                                parent: selected,
                                            })}
                                            onMouseEnter={() =>
                                                onHover(city.code)
                                            }
                                            onMouseLeave={() => onHover(null)}
                                            className={cn(
                                                'block rounded-lg px-2.5 py-1.5 text-sm transition',
                                                hovered === city.code
                                                    ? 'bg-accent/10 text-accent'
                                                    : 'text-slate-600 hover:bg-accent/5 hover:text-accent',
                                            )}
                                        >
                                            {city.name}
                                        </Link>
                                    </li>
                                ))}
                                {cities.length === 0 && (
                                    <li className="px-2.5 py-1.5 text-sm text-slate-400">
                                        Memuat…
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-4 pt-5">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                            <h2 className="text-sm font-bold tracking-tight text-navy-900">
                                Wilayah teratas
                            </h2>
                            <p className="text-[11px] text-slate-400">
                                Berdasarkan liputan berita terbit
                            </p>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">
                            Top 5
                        </span>
                    </div>

                    <ul className="mt-2 divide-y divide-slate-100">
                        {ranked.map((p, i) => {
                            const c = count(p.code);
                            return (
                                <li key={p.code}>
                                    <button
                                        type="button"
                                        onClick={() => onPick(p)}
                                        className="group flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:text-accent"
                                    >
                                        <span className="w-4 shrink-0 text-center font-mono text-xs font-semibold text-slate-400 group-hover:text-accent">
                                            {i + 1}
                                        </span>

                                        <span className="size-9 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200/60">
                                            {p.image_url ? (
                                                <img
                                                    src={p.image_url}
                                                    alt=""
                                                    loading="lazy"
                                                    className="size-full object-cover grayscale-[20%] transition group-hover:scale-105 group-hover:grayscale-0"
                                                />
                                            ) : (
                                                <span className="grid size-full place-items-center text-[10px] text-slate-400">
                                                    {p.code}
                                                </span>
                                            )}
                                        </span>

                                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700 transition-colors group-hover:font-semibold group-hover:text-navy-900">
                                            {p.name}
                                        </span>

                                        <span className="shrink-0 text-right">
                                            <span className="font-mono text-xs font-semibold text-navy-900">
                                                {c}
                                            </span>
                                            <span className="ml-1 text-[11px] text-slate-400">
                                                berita
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </aside>
    );
}
