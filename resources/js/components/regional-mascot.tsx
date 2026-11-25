import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import { CHARACTERS } from "@/lib/regional-characters";
import type { Character, Prop } from "@/lib/regional-characters";

/**
 * A little person in their province's traditional attire who pops up over the
 * hovered province: waves hello with a local greeting, idles (breathing,
 * blinking), and every few seconds holds up something the region is known for.
 *
 * Drawn on a 100×104 canvas: head centred at (50, 32), feet at y≈97.
 */

type Phase = "hi" | "idle" | "show";

const HAIR = "#2b1d16";
const OUTLINE = "#2b1d16";

export default function RegionalMascot({
    code,
    x,
    y,
}: {
    code: string;
    /** Feet position, as a percentage of the map's width / height. */
    x: number;
    y: number;
}) {
    const c = CHARACTERS[code];
    const reduce = useReducedMotion();
    const [phase, setPhase] = useState<Phase>("hi");

    // hi → idle → show → idle → show … while the province stays hovered.
    useEffect(() => {
        if (reduce) {
            return;
        }
        const timers: number[] = [];
        const at = (ms: number, p: Phase) =>
            timers.push(window.setTimeout(() => setPhase(p), ms));
        at(1700, "idle");
        let t = 2900;
        for (let i = 0; i < 6; i++) {
            at(t, "show");
            at(t + 2400, "idle");
            t += 6200;
        }
        return () => timers.forEach(window.clearTimeout);
    }, [reduce]);

    if (!c) {
        return null;
    }

    const bubble =
        phase === "hi" || reduce
            ? c.greeting
            : phase === "show"
              ? c.propLabel
              : null;

    return (
        <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute z-20"
            style={{
                left: `${x}%`,
                top: `${y}%`,
                width: "clamp(52px, 10.5%, 92px)",
                translateX: "-50%",
                translateY: "-96%",
            }}
            initial={{ opacity: 0, scale: 0.4, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 10 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
        >
            {bubble && (
                <motion.div
                    key={bubble}
                    initial={{ opacity: 0, y: 4, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className="absolute bottom-[92%] left-1/2 -translate-x-1/2 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-navy-900 shadow-md ring-1 ring-black/5 dark:bg-slate-800 dark:text-white"
                >
                    {bubble}
                </motion.div>
            )}
            <Figure c={c} phase={reduce ? "idle" : phase} still={!!reduce} />
        </motion.div>
    );
}

export function Figure({
    c,
    phase,
    still,
}: {
    c: Character;
    phase: Phase;
    still: boolean;
}) {
    const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
    const topClip = `mascot-top-${uid}`;
    const bottomClip = `mascot-bottom-${uid}`;
    const loop = (duration: number, delay = 0) =>
        still
            ? { duration: 0 }
            : { duration, delay, repeat: Infinity, ease: "easeInOut" as const };

    return (
        <svg viewBox="0 0 100 104" className="block w-full overflow-visible">
            <defs>
                <clipPath id={topClip}>
                    <rect x="35" y="47" width="30" height="26" rx="9" />
                </clipPath>
                <clipPath id={bottomClip}>
                    <path d="M37 70 L63 70 L61.5 95 L38.5 95 Z" />
                </clipPath>
            </defs>

            <ellipse
                cx="50"
                cy="99"
                rx="15"
                ry="2.6"
                fill="#000"
                opacity=".22"
            />

            {/* Gentle breathing bob */}
            <motion.g
                animate={{ y: still ? 0 : [0, -1.4, 0] }}
                transition={loop(2.4)}
            >
                <HeadBack c={c} />

                {/* Lower garment */}
                <path d="M37 70 L63 70 L61.5 95 L38.5 95 Z" fill={c.bottom} />
                <g clipPath={`url(#${bottomClip})`}>
                    <BottomPattern c={c} />
                </g>
                <ellipse cx="44" cy="96.5" rx="4.2" ry="2" fill={OUTLINE} />
                <ellipse cx="56" cy="96.5" rx="4.2" ry="2" fill={OUTLINE} />

                {/* Waving arm (viewer's left) */}
                <motion.g
                    style={{
                        transformBox: "fill-box",
                        originX: 0.5,
                        originY: 0.05,
                    }}
                    animate={{
                        rotate:
                            phase === "hi"
                                ? [0, 150, 120, 155, 120, 150, 0]
                                : 0,
                    }}
                    transition={
                        phase === "hi"
                            ? { duration: 1.6, ease: "easeInOut" }
                            : { duration: 0.4 }
                    }
                >
                    <rect
                        x="29.5"
                        y="52"
                        width="7"
                        height="17"
                        rx="3.5"
                        fill={c.top}
                    />
                    <circle cx="33" cy="70.5" r="3.6" fill={c.skin} />
                </motion.g>

                {/* Top */}
                <rect
                    x="35"
                    y="47"
                    width="30"
                    height="26"
                    rx="9"
                    fill={c.top}
                />
                <g clipPath={`url(#${topClip})`}>
                    <TopTrim c={c} />
                </g>

                {/* Head */}
                <rect x="46" y="44" width="8" height="5" fill={c.skin} />
                <circle cx="50" cy="32" r="15" fill={c.skin} />
                <path
                    d="M35.5 29 Q36 17 50 17 Q64 17 64.5 29 Q58 23 50 23.5 Q42 23 35.5 29 Z"
                    fill={HAIR}
                />
                <Face phase={phase} still={still} />
                <HeadFront c={c} />

                {/* Prop arm (viewer's right) */}
                <motion.g
                    style={{
                        transformBox: "fill-box",
                        originX: 0.5,
                        originY: 0.05,
                    }}
                    animate={{ rotate: phase === "show" ? -125 : 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                >
                    <rect
                        x="63.5"
                        y="52"
                        width="7"
                        height="17"
                        rx="3.5"
                        fill={c.top}
                    />
                    <circle cx="67" cy="70.5" r="3.6" fill={c.skin} />
                </motion.g>
                <motion.g
                    initial={false}
                    animate={{
                        opacity: phase === "show" ? 1 : 0,
                        scale: phase === "show" ? 1 : 0.3,
                        y: phase === "show" ? 0 : 10,
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 16 }}
                    style={{
                        transformBox: "fill-box",
                        originX: 0.5,
                        originY: 1,
                    }}
                >
                    <g transform="translate(83 27) scale(1.15)">
                        <PropShape prop={c.prop} c={c} />
                    </g>
                </motion.g>
            </motion.g>
        </svg>
    );
}

function Face({ phase, still }: { phase: Phase; still: boolean }) {
    return (
        <g>
            <motion.g
                style={{ transformBox: "fill-box", originY: 0.5 }}
                animate={{ scaleY: still ? 1 : [1, 1, 0.1, 1] }}
                transition={
                    still
                        ? { duration: 0 }
                        : {
                              duration: 3.6,
                              times: [0, 0.92, 0.96, 1],
                              repeat: Infinity,
                          }
                }
            >
                <ellipse cx="44.5" cy="33" rx="1.7" ry="2.1" fill={OUTLINE} />
                <ellipse cx="55.5" cy="33" rx="1.7" ry="2.1" fill={OUTLINE} />
            </motion.g>
            <circle cx="41" cy="37.5" r="2.3" fill="#ff7a7a" opacity=".3" />
            <circle cx="59" cy="37.5" r="2.3" fill="#ff7a7a" opacity=".3" />
            {phase === "hi" || phase === "show" ? (
                <path d="M46.5 38 Q50 43.5 53.5 38 Z" fill="#7a2a22" />
            ) : (
                <path
                    d="M46.5 38.5 Q50 41.5 53.5 38.5"
                    fill="none"
                    stroke="#5a2a1a"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                />
            )}
            {/* faint outline so light skin still reads on light imagery */}
            <circle
                cx="50"
                cy="32"
                r="15"
                fill="none"
                stroke="#000"
                strokeOpacity=".08"
            />
        </g>
    );
}

/** Things drawn behind the head: long hair, crowns that fan out, feathers. */
function HeadBack({ c }: { c: Character }) {
    const parts: ReactNode[] = [];
    if (c.female) {
        parts.push(
            <circle key="hair" cx="50" cy="31" r="16.5" fill={HAIR} />,
            <circle key="bun" cx="50" cy="15.5" r="6.5" fill={HAIR} />,
        );
    }
    switch (c.head) {
        case "suntiang":
            parts.push(
                <g key="suntiang">
                    <path
                        d="M26 29 A24 24 0 0 1 74 29 Z"
                        fill={c.headColor}
                        stroke="#b8871b"
                        strokeWidth=".8"
                    />
                    <path
                        d="M31 29 A19 19 0 0 1 69 29"
                        fill="none"
                        stroke="#fff3b0"
                        strokeWidth="1"
                    />
                    {[200, 220, 240, 260, 280, 300, 320, 340].map((a) => (
                        <circle
                            key={a}
                            cx={50 + 21.5 * Math.cos((a * Math.PI) / 180)}
                            cy={29 + 21.5 * Math.sin((a * Math.PI) / 180)}
                            r="1.5"
                            fill="#fff6c2"
                        />
                    ))}
                </g>,
            );
            break;
        case "blangkon-mondol":
            parts.push(
                <circle
                    key="mondol"
                    cx="63.5"
                    cy="27"
                    r="5"
                    fill={c.headColor}
                />,
            );
            break;
        case "feathers-dayak":
            [-30, -12, 12, 30].forEach((a) =>
                parts.push(
                    <g key={a} transform={`rotate(${a} 50 22)`}>
                        <ellipse
                            cx="50"
                            cy="7"
                            rx="2.8"
                            ry="11"
                            fill="#1f1d24"
                        />
                        <ellipse
                            cx="50"
                            cy="-1"
                            rx="2.8"
                            ry="4"
                            fill="#f4efe3"
                        />
                    </g>,
                ),
            );
            break;
        case "feathers-papua": {
            const colors = [c.headColor, "#f2d24a", "#e94e3c", "#f4efe3"];
            [-64, -44, -22, 0, 22, 44, 64].forEach((a, i) =>
                parts.push(
                    <ellipse
                        key={a}
                        cx="50"
                        cy="6"
                        rx="3"
                        ry="10"
                        fill={colors[i % colors.length]}
                        transform={`rotate(${a} 50 24)`}
                    />,
                ),
            );
            break;
        }
    }
    return <>{parts}</>;
}

/** Headwear drawn over the hair. */
function HeadFront({ c }: { c: Character }) {
    const h = c.headColor;
    const h2 = c.headColor2 ?? "#ffffff";
    const band = "M35 24.5 Q50 19.5 65 24.5 L65 20 Q50 15 35 20 Z";
    switch (c.head) {
        case "peci":
            return (
                <rect
                    x="36"
                    y="12.5"
                    width="28"
                    height="10.5"
                    rx="2.5"
                    fill={h}
                />
            );
        case "songkok":
            return (
                <g>
                    <rect
                        x="36"
                        y="12.5"
                        width="28"
                        height="10.5"
                        rx="2.5"
                        fill={h}
                    />
                    <path
                        d="M36 16 H64 M36 19.5 H64"
                        stroke={OUTLINE}
                        strokeWidth=".8"
                    />
                </g>
            );
        case "blangkon":
        case "blangkon-mondol":
            return (
                <g>
                    <path
                        d="M34.5 27 Q34 13.5 50 13 Q66 13.5 65.5 27 Q50 21.5 34.5 27 Z"
                        fill={h}
                    />
                    {[
                        [42, 17],
                        [50, 16],
                        [58, 17],
                        [46, 21],
                        [54, 21],
                    ].map(([x, y]) => (
                        <circle
                            key={`${x}${y}`}
                            cx={x}
                            cy={y}
                            r="1.1"
                            fill={h2}
                            opacity=".8"
                        />
                    ))}
                </g>
            );
        case "udeng":
            return (
                <g>
                    <path d={band} fill={h} />
                    <path d="M46 20 L50 9 L54 20 Z" fill={h} />
                </g>
            );
        case "iket":
            return (
                <g>
                    <path d={band} fill={h} />
                    {[40, 46, 52, 58].map((x) => (
                        <circle key={x} cx={x} cy="21" r=".9" fill={h2} />
                    ))}
                    <path d="M62 20 L71 13.5 L66.5 22.5 Z" fill={h} />
                    <path d="M63 22.5 L72 22 L65.5 25 Z" fill={h} />
                </g>
            );
        case "tanjak":
            return (
                <g>
                    <path
                        d="M35 25 Q35 15 44 13 L60 3.5 L61 15 Q65 18 65 25 Q50 20 35 25 Z"
                        fill={h}
                    />
                    <path
                        d="M35 24 Q50 19 65 24"
                        fill="none"
                        stroke={h2}
                        strokeWidth="2"
                    />
                </g>
            );
        case "meukeutop":
            return (
                <g>
                    <rect
                        x="37"
                        y="18.5"
                        width="26"
                        height="6"
                        rx="1.5"
                        fill={h}
                    />
                    <rect
                        x="39"
                        y="13"
                        width="22"
                        height="6"
                        rx="1.5"
                        fill={h2}
                    />
                    <rect
                        x="41"
                        y="7.5"
                        width="18"
                        height="6"
                        rx="1.5"
                        fill="#1f7a4a"
                    />
                    <rect
                        x="43"
                        y="3"
                        width="14"
                        height="5"
                        rx="1.5"
                        fill={h}
                    />
                    <circle cx="50" cy="2.5" r="2.2" fill={h2} />
                </g>
            );
        case "suntiang":
            return (
                <path
                    d="M35 24 Q50 18 65 24"
                    fill="none"
                    stroke={h}
                    strokeWidth="3"
                />
            );
        case "siger":
            return (
                <path
                    d="M36 24 L37.5 12 L41 19.5 L44 8.5 L47 18.5 L50 5.5 L53 18.5 L56 8.5 L59 19.5 L62.5 12 L64 24 Q50 19 36 24 Z"
                    fill={h}
                    stroke="#b8871b"
                    strokeWidth=".6"
                />
            );
        case "crown":
            return (
                <g>
                    <path
                        d="M36 24 L36 16.5 L41 20 L45 11.5 L50 18 L55 11.5 L59 20 L64 16.5 L64 24 Q50 19 36 24 Z"
                        fill={h}
                        stroke="#b8871b"
                        strokeWidth=".6"
                    />
                    <circle cx="50" cy="20.5" r="1.6" fill="#c0262d" />
                </g>
            );
        case "feathers-dayak":
        case "feathers-papua":
            return (
                <g>
                    <path d={band} fill={h} />
                    {[39, 44, 50, 56, 61].map((x) => (
                        <circle
                            key={x}
                            cx={x}
                            cy="21.2"
                            r=".9"
                            fill="#f4efe3"
                        />
                    ))}
                </g>
            );
        case "tilangga":
            return (
                <g>
                    <ellipse
                        cx="50"
                        cy="19.5"
                        rx="21"
                        ry="4.5"
                        fill={h}
                        stroke="#a7843e"
                        strokeWidth=".7"
                    />
                    <path
                        d="M39 19 Q40 9 50 8 Q60 9 61 19 Z"
                        fill={h}
                        stroke="#a7843e"
                        strokeWidth=".7"
                    />
                    <path
                        d="M48.5 8.5 Q45 0 51 -6 Q50 1 52.5 8.5 Z"
                        fill={h}
                        stroke="#a7843e"
                        strokeWidth=".7"
                    />
                    <path
                        d="M41 14 H59 M40 17 H60"
                        stroke="#a7843e"
                        strokeWidth=".5"
                    />
                </g>
            );
        case "flowers":
            return (
                <g>
                    <path
                        d="M36 23 Q50 17 64 23 L64 19.5 Q50 13.5 36 19.5 Z"
                        fill={h}
                    />
                    <path d="M47.5 15 L50 5 L52.5 15 Z" fill={h} />
                    {[
                        [40.5, 14.5],
                        [59.5, 14.5],
                    ].map(([x, y]) => (
                        <Frangipani key={x} x={x} y={y} />
                    ))}
                </g>
            );
        case "headband":
            return (
                <g>
                    <path d={band} fill={h} />
                    <path d="M63.5 21 L70.5 17.5 L69 24 Z" fill={h} />
                    <path d="M63.5 22.5 L71 26.5 L65.5 27 Z" fill={h} />
                </g>
            );
        case "bun":
            return (
                <g>
                    <path
                        d="M46 13 L42.5 7"
                        stroke={h}
                        strokeWidth="1.3"
                        strokeLinecap="round"
                    />
                    <path
                        d="M54 13 L57.5 7"
                        stroke={h}
                        strokeWidth="1.3"
                        strokeLinecap="round"
                    />
                    <circle cx="42.5" cy="7" r="1.6" fill={h} />
                    <circle cx="57.5" cy="7" r="1.6" fill={h} />
                    <Frangipani x={50} y={11.5} />
                </g>
            );
    }
}

function Frangipani({ x, y }: { x: number; y: number }) {
    return (
        <g>
            {[0, 72, 144, 216, 288].map((a) => (
                <circle
                    key={a}
                    cx={x + 2 * Math.cos((a * Math.PI) / 180)}
                    cy={y + 2 * Math.sin((a * Math.PI) / 180)}
                    r="1.7"
                    fill="#fffdf5"
                />
            ))}
            <circle cx={x} cy={y} r="1.1" fill="#f2c12e" />
        </g>
    );
}

function TopTrim({ c }: { c: Character }) {
    const t = c.trimColor;
    switch (c.trim) {
        case "collar":
            return (
                <g>
                    <path
                        d="M41.5 47 L50 58 L58.5 47"
                        fill="none"
                        stroke={t}
                        strokeWidth="2.6"
                    />
                    <path
                        d="M50 58 V73"
                        stroke={t}
                        strokeWidth="1"
                        strokeDasharray="1.2 3"
                    />
                </g>
            );
        case "sash":
            return (
                <g>
                    <path d="M37 47 L45 47 L66 73 L58 73 Z" fill={t} />
                    <path
                        d="M41 47 L62 73"
                        stroke="#fff"
                        strokeOpacity=".35"
                        strokeWidth=".8"
                    />
                </g>
            );
        case "vest":
            return (
                <g fill={t}>
                    <rect x="35" y="47" width="9.5" height="26" />
                    <rect x="55.5" y="47" width="9.5" height="26" />
                    {[52, 58, 64, 70].map((y) => (
                        <g key={y}>
                            <circle cx="39.7" cy={y} r="1" fill="#f2d24a" />
                            <circle cx="60.3" cy={y} r="1" fill="#f2d24a" />
                        </g>
                    ))}
                </g>
            );
        case "stripes":
            return (
                <g stroke={t} strokeWidth="2.2">
                    {[51, 56, 61, 66, 71].map((y) => (
                        <path key={y} d={`M35 ${y} H65`} />
                    ))}
                </g>
            );
        case "vstripes":
            return (
                <g stroke={t} strokeWidth="1.1">
                    {[38, 41.5, 45, 48.5, 52, 55.5, 59, 62.5].map((x) => (
                        <path key={x} d={`M${x} 47 V73`} />
                    ))}
                </g>
            );
        case "checks":
            return (
                <g stroke={t} strokeWidth="1.4" opacity=".85">
                    {[39, 44, 49, 54, 59, 64].map((x) => (
                        <path key={`v${x}`} d={`M${x} 47 V73`} />
                    ))}
                    {[51, 56, 61, 66, 71].map((y) => (
                        <path key={`h${y}`} d={`M35 ${y} H65`} />
                    ))}
                </g>
            );
        case "beads":
            return (
                <g
                    fill="none"
                    stroke={t}
                    strokeWidth="2.4"
                    strokeDasharray="1.6 1.4"
                >
                    <path d="M40 47.5 Q50 59 60 47.5" />
                    <path d="M38 47.5 Q50 64 62 47.5" strokeOpacity=".7" />
                </g>
            );
        default:
            return null;
    }
}

function BottomPattern({ c }: { c: Character }) {
    const p = c.patternColor;
    switch (c.pattern) {
        case "batik":
            return (
                <g fill={p} opacity=".75">
                    {[74, 80, 86, 92].flatMap((y, row) =>
                        [39, 45, 51, 57, 63].map((x) => (
                            <circle
                                key={`${x}-${y}`}
                                cx={x + (row % 2) * 3}
                                cy={y}
                                r="1.1"
                            />
                        )),
                    )}
                </g>
            );
        case "stripes":
            return (
                <g stroke={p} strokeWidth="1.6">
                    {[76, 83, 90].map((y) => (
                        <path key={y} d={`M36 ${y} H64`} />
                    ))}
                </g>
            );
        case "checks":
            return (
                <g stroke={p} strokeWidth="1.2" opacity=".85">
                    {[40, 45, 50, 55, 60].map((x) => (
                        <path key={`v${x}`} d={`M${x} 70 V95`} />
                    ))}
                    {[75, 80, 85, 90].map((y) => (
                        <path key={`h${y}`} d={`M36 ${y} H64`} />
                    ))}
                </g>
            );
        case "tenun":
            return (
                <g fill="none" stroke={p} strokeWidth="1.4">
                    <path d="M36 78 L40 75 L44 78 L48 75 L52 78 L56 75 L60 78 L64 75" />
                    <path d="M36 88 L40 85 L44 88 L48 85 L52 88 L56 85 L60 88 L64 85" />
                    <path d="M36 82 H64" strokeWidth=".8" />
                </g>
            );
        case "rumbai":
            return (
                <g stroke={p} strokeWidth="1">
                    {Array.from({ length: 14 }, (_, i) => 37.5 + i * 2).map(
                        (x) => (
                            <path key={x} d={`M${x} 71 V95`} />
                        ),
                    )}
                </g>
            );
        default:
            return null;
    }
}

/** The thing each character shows off, centred on (0, 0), roughly 24 units tall. */
function PropShape({ prop, c }: { prop: Prop; c: Character }) {
    const steel = "#d9dde3";
    const wood = "#6b4226";
    const steam = (
        <g fill="none" stroke="#cbd5e1" strokeWidth=".9" strokeLinecap="round">
            <path d="M-3 -6 Q-5 -9 -3 -12" />
            <path d="M2 -6 Q0 -9 2 -12" />
        </g>
    );
    switch (prop) {
        case "rencong":
            return (
                <g>
                    <path
                        d="M-1 -1 L9 -11 Q7 -4 1.5 1.5 Z"
                        fill={steel}
                        stroke="#8a9099"
                        strokeWidth=".5"
                    />
                    <path
                        d="M-2 7 Q-7 2 -4 -2 L-1 -1 Q-2.5 2.5 1.5 5.5 Z"
                        fill={wood}
                    />
                </g>
            );
        case "keris":
            return (
                <g>
                    <path
                        d="M-0.5 4 Q-2.5 1 -0.5 -2 Q1.5 -5 -0.5 -8 Q-2 -11 0.5 -14 L1.5 -11 Q3.5 -8 1.5 -5 Q3.5 -2 1.5 1 L1.5 4 Z"
                        fill={steel}
                        stroke="#8a9099"
                        strokeWidth=".5"
                    />
                    <ellipse cx="0.5" cy="4.5" rx="4" ry="1.3" fill="#e8b931" />
                    <path
                        d="M-1 5.5 Q-3 9 0 11.5 L2 11 Q0 8.5 2 5.5 Z"
                        fill={wood}
                    />
                </g>
            );
        case "golok":
            return (
                <g>
                    <path
                        d="M-1.5 3 L-1.5 -12 Q5 -11 4 3 Z"
                        fill={steel}
                        stroke="#8a9099"
                        strokeWidth=".5"
                    />
                    <rect
                        x="-2"
                        y="3"
                        width="5.5"
                        height="8"
                        rx="1.5"
                        fill={wood}
                    />
                </g>
            );
        case "mandau":
            return (
                <g>
                    <path
                        d="M-1.5 3 Q-2.5 -6 3 -13 Q6 -6 3.5 3 Z"
                        fill={steel}
                        stroke="#8a9099"
                        strokeWidth=".5"
                    />
                    <rect
                        x="-2"
                        y="3"
                        width="6"
                        height="7.5"
                        rx="2"
                        fill="#f4efe3"
                        stroke={wood}
                        strokeWidth=".6"
                    />
                    <path
                        d="M1 10.5 Q-2 13 -1 15 M1 10.5 Q3 13 4 15"
                        stroke="#b3202c"
                        strokeWidth="1"
                    />
                </g>
            );
        case "shield":
            return (
                <g>
                    <path
                        d="M0 -13 L7.5 -9 L7.5 9 L0 13 L-7.5 9 L-7.5 -9 Z"
                        fill="#f4efe3"
                        stroke={OUTLINE}
                        strokeWidth="1"
                    />
                    <path
                        d="M-4.5 -4 Q0 -9.5 4.5 -4 M-4.5 4 Q0 9.5 4.5 4"
                        fill="none"
                        stroke="#b3202c"
                        strokeWidth="1.6"
                    />
                    <circle cx="0" cy="0" r="2.2" fill={OUTLINE} />
                </g>
            );
        case "drum":
            return (
                <g>
                    <rect x="-8" y="-6" width="16" height="12" fill="#b3202c" />
                    <ellipse cx="0" cy="6" rx="8" ry="2.5" fill="#8a1b26" />
                    <path
                        d="M-8 -5 L-5 5 L-2 -5 L1 5 L4 -5 L7 5"
                        fill="none"
                        stroke="#f2e6c9"
                        strokeWidth=".8"
                    />
                    <ellipse
                        cx="0"
                        cy="-6"
                        rx="8"
                        ry="2.5"
                        fill="#f2e6c9"
                        stroke="#a7843e"
                        strokeWidth=".5"
                    />
                </g>
            );
        case "tifa":
            return (
                <g>
                    <path
                        d="M-4.5 -12 L4.5 -12 L2 0 L4.5 12 L-4.5 12 L-2 0 Z"
                        fill="#8a5a32"
                    />
                    <path
                        d="M-3.5 -6 H3.5 M-3.5 6 H3.5"
                        stroke="#f2d24a"
                        strokeWidth="1"
                    />
                    <ellipse cx="0" cy="-12" rx="4.5" ry="1.5" fill="#f2e6c9" />
                </g>
            );
        case "angklung":
            return (
                <g>
                    {[
                        [-7, -5, 12],
                        [-2, -10, 17],
                        [3, -7, 14],
                    ].map(([x, y, h]) => (
                        <rect
                            key={x}
                            x={x}
                            y={y}
                            width="3.6"
                            height={h}
                            rx="1.5"
                            fill="#e8cf8a"
                            stroke="#a7843e"
                            strokeWidth=".6"
                        />
                    ))}
                    <path
                        d="M-9 -11 H9 M-9 9 H9 M-9 -11 V9 M9 -11 V9"
                        stroke="#a7843e"
                        strokeWidth="1.3"
                        fill="none"
                    />
                </g>
            );
        case "wayang":
            return (
                <g>
                    <path
                        d="M0 -14 Q9.5 -4 7 6 L-7 6 Q-9.5 -4 0 -14 Z"
                        fill="#8a3b22"
                        stroke="#e8b931"
                        strokeWidth=".8"
                    />
                    <path
                        d="M0 5 V-9 M0 -3 L-4 -6 M0 -1 L4 -4 M0 2 L-4 -1"
                        stroke="#e8b931"
                        strokeWidth=".7"
                    />
                    <path d="M0 6 V14" stroke={wood} strokeWidth="1.3" />
                </g>
            );
        case "mask":
            return (
                <g>
                    <path d="M-13 0 A13 13 0 0 1 13 0 Z" fill="#2a7a5a" />
                    {[-9, -4.5, 0, 4.5, 9].map((x) => (
                        <circle
                            key={x}
                            cx={x}
                            cy={-7 + Math.abs(x) * 0.5}
                            r="1.4"
                            fill="#1f4fa0"
                            stroke="#e8b931"
                            strokeWidth=".5"
                        />
                    ))}
                    <circle cx="0" cy="3" r="7" fill="#c0262d" />
                    <circle cx="-2.7" cy="1.5" r="1.9" fill="#fff" />
                    <circle cx="2.7" cy="1.5" r="1.9" fill="#fff" />
                    <circle cx="-2.7" cy="1.5" r=".9" fill={OUTLINE} />
                    <circle cx="2.7" cy="1.5" r=".9" fill={OUTLINE} />
                    <path
                        d="M-2 6.5 L-1 8.5 L0 6.5 L1 8.5 L2 6.5"
                        fill="#fff"
                    />
                </g>
            );
        case "fan":
            return (
                <g>
                    <path
                        d="M-11 3 A11 11 0 0 1 11 3 L0 3 Z"
                        fill="#b3202c"
                        stroke="#e8b931"
                        strokeWidth=".8"
                    />
                    {[-60, -30, 0, 30, 60].map((a) => (
                        <path
                            key={a}
                            d={`M0 3 L${11 * Math.sin((a * Math.PI) / 180)} ${3 - 11 * Math.cos((a * Math.PI) / 180)}`}
                            stroke="#e8b931"
                            strokeWidth=".6"
                        />
                    ))}
                    <path d="M0 3 V9" stroke={wood} strokeWidth="1.4" />
                </g>
            );
        case "bowl":
            return (
                <g>
                    {steam}
                    <ellipse cx="0" cy="-1" rx="8.5" ry="2.8" fill="#8a4a24" />
                    <path
                        d="M-9.5 0 Q-9.5 8 0 8 Q9.5 8 9.5 0 Z"
                        fill="#f4efe3"
                        stroke="#c9b89a"
                        strokeWidth=".6"
                    />
                    <path d="M-7 3 H7" stroke="#3f7fbf" strokeWidth=".8" />
                </g>
            );
        case "cup":
            return (
                <g>
                    {steam}
                    <path
                        d="M-6 -4 L6 -4 L5 7 L-5 7 Z"
                        fill="#f4efe3"
                        stroke="#c9b89a"
                        strokeWidth=".6"
                    />
                    <path
                        d="M6 -1 Q10 0 6 4"
                        fill="none"
                        stroke="#c9b89a"
                        strokeWidth="1.2"
                    />
                    <ellipse cx="0" cy="-4" rx="6" ry="1.5" fill="#4a2c1a" />
                </g>
            );
        case "flower":
            return (
                <g>
                    {[0, 72, 144, 216, 288].map((a) => {
                        const x = 6 * Math.cos(((a - 90) * Math.PI) / 180);
                        const y = 6 * Math.sin(((a - 90) * Math.PI) / 180);
                        return (
                            <g key={a}>
                                <circle cx={x} cy={y} r="5.2" fill="#b3202c" />
                                <circle
                                    cx={x * 1.1}
                                    cy={y * 1.1}
                                    r=".9"
                                    fill="#fff"
                                    opacity=".85"
                                />
                                <circle
                                    cx={x * 0.8 + 1.5}
                                    cy={y * 0.8}
                                    r=".7"
                                    fill="#fff"
                                    opacity=".85"
                                />
                            </g>
                        );
                    })}
                    <circle cx="0" cy="0" r="4" fill="#5a1a1a" />
                </g>
            );
        case "boat":
            return (
                <g>
                    <path d="M0.5 4 V-14" stroke={wood} strokeWidth="1" />
                    <path
                        d="M1.5 -13 L11 2 L1.5 2 Z"
                        fill="#f4efe3"
                        stroke="#c9b89a"
                        strokeWidth=".5"
                    />
                    <path
                        d="M-0.5 -10 L-9 2 L-0.5 2 Z"
                        fill="#f4efe3"
                        stroke="#c9b89a"
                        strokeWidth=".5"
                    />
                    <path d="M-12 4 L12 4 L8 9 L-8 9 Z" fill="#8a5a32" />
                    <path
                        d="M-13 11 Q-9 9 -5 11 Q-1 13 3 11 Q7 9 11 11"
                        fill="none"
                        stroke="#3f9fd6"
                        strokeWidth="1.1"
                    />
                </g>
            );
        case "sasando":
            return (
                <g>
                    <path
                        d="M-11 -2 Q-11 -14 0 -14 Q11 -14 11 -2 L3 5 L-3 5 Z"
                        fill="#d9b46a"
                        stroke="#a7843e"
                        strokeWidth=".7"
                    />
                    <path
                        d="M-6 -11 L-2 3 M0 -13 V4 M6 -11 L2 3"
                        stroke="#a7843e"
                        strokeWidth=".5"
                    />
                    <rect
                        x="-2"
                        y="-8"
                        width="4"
                        height="18"
                        rx="1.5"
                        fill="#c48a4a"
                    />
                    <path
                        d="M-1 -7 V9 M0 -7 V9 M1 -7 V9"
                        stroke="#fff"
                        strokeWidth=".25"
                    />
                </g>
            );
        case "sape":
            return (
                <g>
                    <path
                        d="M-4 11 Q-6.5 1 -3 -4 L-1.5 -14 L1.5 -14 L3 -4 Q6.5 1 4 11 Z"
                        fill="#f4efe3"
                        stroke={OUTLINE}
                        strokeWidth=".8"
                    />
                    <path
                        d="M-2.5 2 Q0 -1 2.5 2 Q0 5 -2.5 2 M-2.5 7 Q0 4.5 2.5 7"
                        fill="none"
                        stroke="#b3202c"
                        strokeWidth=".9"
                    />
                    <path
                        d="M-0.6 -13 V10 M0.6 -13 V10"
                        stroke="#8a9099"
                        strokeWidth=".3"
                    />
                </g>
            );
        case "kolintang":
            return (
                <g>
                    <rect
                        x="-11.5"
                        y="0"
                        width="23"
                        height="7"
                        rx="1.2"
                        fill={wood}
                    />
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                        <rect
                            key={i}
                            x={-10.5 + i * 3.6}
                            y={-3 + i * 0.5}
                            width="2.9"
                            height={4 - i * 0.3}
                            rx=".6"
                            fill="#d9a35b"
                        />
                    ))}
                    <path
                        d="M-7 -9 L-3 -3 M7 -9 L3 -3"
                        stroke={wood}
                        strokeWidth=".9"
                    />
                    <circle cx="-7.3" cy="-9.4" r="1.4" fill="#b3202c" />
                    <circle cx="7.3" cy="-9.4" r="1.4" fill="#b3202c" />
                </g>
            );
        case "cloth":
            return (
                <g>
                    <rect
                        x="-9"
                        y="-11"
                        width="18"
                        height="20"
                        fill={c.top}
                        stroke={c.trimColor}
                        strokeWidth=".8"
                    />
                    {[-7, -2, 3].map((y) => (
                        <path
                            key={y}
                            d={`M-9 ${y} L-6 ${y - 2} L-3 ${y} L0 ${y - 2} L3 ${y} L6 ${y - 2} L9 ${y}`}
                            fill="none"
                            stroke={c.trimColor}
                            strokeWidth=".9"
                        />
                    ))}
                    <path
                        d="M-8 9 V12 M-5 9 V12 M-2 9 V12 M1 9 V12 M4 9 V12 M7 9 V12"
                        stroke={c.trimColor}
                        strokeWidth=".6"
                    />
                </g>
            );
        case "fish":
            return (
                <g>
                    <path
                        d="M-10 0 Q-2 -7.5 7 0 Q-2 7.5 -10 0 Z"
                        fill="#2ea7c9"
                    />
                    <path d="M7 0 L12.5 -5 L12.5 5 Z" fill="#2ea7c9" />
                    <path
                        d="M-4 -4.5 V4.5 M0 -4.8 V4.8"
                        stroke="#f2d24a"
                        strokeWidth="1.2"
                    />
                    <circle cx="-6.5" cy="-1" r="1" fill={OUTLINE} />
                </g>
            );
        case "noken":
            return (
                <g>
                    <path
                        d="M-6 -4 Q0 -16 6 -4"
                        fill="none"
                        stroke="#9b7a44"
                        strokeWidth="1.5"
                    />
                    <path d="M-8 -4 Q-9 10 0 11 Q9 10 8 -4 Z" fill="#c9a46a" />
                    <path
                        d="M-7 -2 L5 10 M-4 -4 L8 8 M-8 4 L0 11 M7 -2 L-5 10 M4 -4 L-8 8 M8 4 L0 11"
                        stroke="#9b7a44"
                        strokeWidth=".6"
                    />
                </g>
            );
        case "clove":
            return (
                <g>
                    <path
                        d="M0 12 V-2 M0 2 L-6 -6 M0 0 L6 -8 M0 -2 L0 -10"
                        stroke="#5a7a2a"
                        strokeWidth="1"
                        fill="none"
                    />
                    {[
                        [-6, -6],
                        [6, -8],
                        [0, -10],
                        [-3, -3],
                        [3, -4.5],
                    ].map(([x, y]) => (
                        <g key={`${x}${y}`}>
                            <rect
                                x={x - 0.7}
                                y={y}
                                width="1.4"
                                height="4"
                                fill="#9a4a24"
                            />
                            <circle cx={x} cy={y} r="1.5" fill="#c0262d" />
                        </g>
                    ))}
                </g>
            );
        case "ring":
            return (
                <g>
                    <rect
                        x="-10"
                        y="8"
                        width="20"
                        height="4"
                        rx="1"
                        fill="#f4efe3"
                    />
                    <circle
                        cx="0"
                        cy="-1"
                        r="8.5"
                        fill="none"
                        stroke="#c9a46a"
                        strokeWidth="3"
                    />
                    <circle
                        cx="0"
                        cy="-1"
                        r="8.5"
                        fill="none"
                        stroke="#9b7a44"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                    />
                </g>
            );
        case "temple":
            return (
                <g fill="#a8553a" stroke="#7a3a24" strokeWidth=".5">
                    <rect x="-10" y="4" width="20" height="6" />
                    <rect x="-7" y="-2" width="14" height="6" />
                    <rect x="-4" y="-7" width="8" height="5" />
                    <circle cx="0" cy="-9" r="2.5" />
                    <path d="M0 -11.5 V-15" />
                </g>
            );
        case "bow":
            return (
                <g>
                    <path
                        d="M-3 -12 Q8 0 -3 12"
                        fill="none"
                        stroke={wood}
                        strokeWidth="1.8"
                    />
                    <path d="M-3 -12 V12" stroke="#e8e2d4" strokeWidth=".5" />
                    <path d="M-9 0 H10" stroke="#8a5a32" strokeWidth="1" />
                    <path d="M10 0 L7 -2 L7 2 Z" fill={OUTLINE} />
                    <path
                        d="M-9 0 L-11 -2 M-9 0 L-11 2"
                        stroke="#e94e3c"
                        strokeWidth="1"
                    />
                </g>
            );
        case "bird":
            return (
                <g>
                    <path
                        d="M-3 1 Q-10 6 -12 13 M-2 2 Q-6 8 -6 14 M-4 0 Q-12 2 -14 8"
                        fill="none"
                        stroke="#f08a24"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                    <ellipse cx="0" cy="0" rx="5.5" ry="3.8" fill="#5a2a1a" />
                    <circle cx="5" cy="-2.5" r="2.8" fill="#f2c12e" />
                    <path d="M7.5 -2.5 L10 -1.5 L7.5 -0.8 Z" fill="#b0b7c3" />
                    <circle cx="5.6" cy="-3" r=".6" fill={OUTLINE} />
                </g>
            );
    }
}
