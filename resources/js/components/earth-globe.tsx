import { geoOrthographic } from "d3-geo";
import { useEffect, useRef, useState } from "react";

/**
 * Photo-real Earth rendered with WebGL2 behind the SVG globe.
 *
 * Every pixel is inverse-projected with the same orthographic maths d3-geo uses
 * (rotate([λ, φ]) then orthographic), so the satellite imagery lines up exactly
 * with the province/city paths drawn on top. Day uses NASA Blue Marble, night
 * uses NASA Black Marble city lights; switching cross-fades between them.
 * Zoomed in, sharp tiles are streamed for the visible area (see useStreamedMosaic).
 */

const DAY_SRC = "/maps/earth/day.jpg";
// High-resolution satellite tiles streamed in for the visible area when zoomed.
const TILE_URL = (z: number, x: number, y: number) =>
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
// NASA VIIRS Black Marble city lights (public domain), published up to zoom 8.
const LIGHTS_URL = (z: number, x: number, y: number) =>
    `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/${z}/${y}/${x}.png`;
const TILE = 256;
const MIN_TILE_Z = 6; // below this the 4096px base texture is already as sharp
const MAX_TILE_Z = 17;
const MIN_LIGHTS_Z = 5;
const MAX_LIGHTS_Z = 8;
const MAX_TILES = 48;
const NIGHT_SRC = "/maps/earth/night.jpg";

// Browsers keep decoded images; reuse them across mounts of the globe.
const images = new Map<string, Promise<HTMLImageElement>>();
function loadImage(src: string) {
    let p = images.get(src);
    if (!p) {
        p = new Promise((resolve, reject) => {
            const img = new Image();
            img.decoding = "async";
            img.crossOrigin = "anonymous"; // tiles come from another origin; WebGL needs CORS
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
        p.catch(() => images.delete(src));
        if (images.size > 400) {
            images.clear();
        }
        images.set(src, p);
    }
    return p;
}

type Mosaic = {
    z: number;
    x0: number;
    y0: number;
    cols: number;
    rows: number;
    key: string;
};

type View = {
    z: number; // zoom level whose pixels match the screen
    w: number;
    e: number;
    s: number;
    n: number;
};

/** Flat (equirectangular) map transform: x = tx + k·λ, y = ty − k·φ (radians). */
export type FlatTransform = { k: number; tx: number; ty: number };

/** The lon/lat box on screen right now, plus the tile zoom that would match it. */
function visibleBox(
    rotation: [number, number],
    scale: number,
    center: [number, number],
    view: [number, number],
    devicePxPerUnit: number,
    flat: FlatTransform | null,
): View | null {
    // Device pixels per radian of arc on the surface.
    const pxPerRad = (flat ? flat.k : scale) * devicePxPerUnit;
    const z = Math.ceil(Math.log2((pxPerRad * 2 * Math.PI) / TILE));
    if (z < Math.min(MIN_TILE_Z, MIN_LIGHTS_Z)) {
        return null;
    }
    const globe = geoOrthographic()
        .translate(center)
        .scale(scale)
        .rotate(rotation);
    const invert = (x: number, y: number): [number, number] | null => {
        if (flat) {
            const d = 180 / Math.PI;
            return [((x - flat.tx) / flat.k) * d, ((flat.ty - y) / flat.k) * d];
        }
        if (Math.hypot(x - center[0], y - center[1]) > scale) {
            return null;
        }
        return globe.invert?.([x, y]) ?? null;
    };
    let w = 180,
        e = -180,
        s = 90,
        n = -90;
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
        for (let j = 0; j <= steps; j++) {
            const x = (view[0] * i) / steps;
            const y = (view[1] * j) / steps;
            const ll = invert(x, y);
            if (!ll) {
                continue;
            }
            w = Math.min(w, ll[0]);
            e = Math.max(e, ll[0]);
            s = Math.min(s, ll[1]);
            n = Math.max(n, ll[1]);
        }
    }
    if (w > e || s > n || e - w > 180) {
        return null;
    }
    return { z, w, e, s, n };
}

/** The tile block covering `box`, at the sharpest zoom within [minZ, maxZ]. */
function tilesFor(box: View | null, minZ: number, maxZ: number): Mosaic | null {
    if (!box) {
        return null;
    }
    const { w, e, s, n } = box;
    let z = Math.min(maxZ, box.z);
    const tileX = (lon: number, k: number) =>
        Math.floor(((lon + 180) / 360) * k);
    const tileY = (lat: number, k: number) => {
        const r = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
        return Math.floor(
            ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * k,
        );
    };
    for (; z >= minZ; z--) {
        const k = 2 ** z;
        const x0 = tileX(w, k),
            x1 = tileX(e, k);
        const y0 = tileY(n, k),
            y1 = tileY(s, k);
        const cols = x1 - x0 + 1,
            rows = y1 - y0 + 1;
        if (cols * rows <= MAX_TILES) {
            return {
                z,
                x0,
                y0,
                cols,
                rows,
                key: `${z}/${x0}/${y0}/${cols}/${rows}`,
            };
        }
    }
    return null;
}

/** Fetch a block of tiles and paint them into one canvas (missing tiles stay transparent). */
async function buildMosaic(
    m: Mosaic,
    url: (z: number, x: number, y: number) => string,
) {
    const k = 2 ** m.z;
    const mosaic = document.createElement("canvas");
    mosaic.width = m.cols * TILE;
    mosaic.height = m.rows * TILE;
    const g = mosaic.getContext("2d")!;
    const jobs: Promise<void>[] = [];
    for (let i = 0; i < m.cols; i++) {
        for (let j = 0; j < m.rows; j++) {
            const x = (((m.x0 + i) % k) + k) % k;
            jobs.push(
                loadImage(url(m.z, x, m.y0 + j))
                    .then((img) => g.drawImage(img, i * TILE, j * TILE))
                    .catch(() => undefined),
            );
        }
    }
    await Promise.all(jobs);
    return mosaic;
}

/** [lon, mercatorY] of the top-left corner and the size, in radians. */
function mosaicBox(m: Mosaic) {
    const k = 2 ** m.z;
    return [
        (m.x0 / k) * 2 * Math.PI - Math.PI,
        Math.PI * (1 - (2 * m.y0) / k),
        (m.cols / k) * 2 * Math.PI,
        (m.rows / k) * 2 * Math.PI,
    ] as const;
}

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;      // canvas size in device pixels
uniform vec2 uView;     // SVG viewBox size
uniform vec2 uCenter;   // globe centre in viewBox units
uniform float uScale;   // globe radius in viewBox units
uniform vec2 uRot;      // d3 rotate [lambda, phi] in radians
uniform float uNight;   // 0 = day, 1 = night
uniform float uFlat;    // 1 = flat equirectangular map instead of a globe
uniform vec3 uFlatT;    // flat transform [k, tx, ty]
uniform sampler2D uDay;
uniform sampler2D uLights;
uniform sampler2D uDetail;  // mosaic of high-res tiles (Web Mercator)
uniform float uHasDetail;
uniform vec2 uDetailOrigin; // [lon, mercatorY] of the mosaic's top-left, radians
uniform vec2 uDetailSize;   // mosaic size in radians of lon / mercator
uniform sampler2D uLightsHi; // mosaic of NASA night-light tiles
uniform float uHasLightsHi;
uniform vec2 uLightsOrigin;
uniform vec2 uLightsSize;
out vec4 outColor;

const float PI = 3.14159265358979;

// Where (lon, lat) falls inside a Web Mercator mosaic, in 0..1 (outside = off).
vec2 mosaicUv(float lon, float lat, vec2 origin, vec2 size) {
    // Relative coordinates keep float precision at street-level zoom.
    float dl = mod(lon - origin.x + PI, 2.0 * PI) - PI;
    float my = log(tan(PI / 4.0 + clamp(lat, -1.48, 1.48) / 2.0));
    return vec2(dl, origin.y - my) / size;
}
bool inside(vec2 d) {
    return d.x >= 0.0 && d.x <= 1.0 && d.y >= 0.0 && d.y <= 1.0;
}

void main() {
    vec2 p = gl_FragCoord.xy / uRes * uView;
    p.y = uView.y - p.y;
    vec2 q;
    float zc, edge, lon, lat;
    if (uFlat > 0.5) {
        // Flat map: lit straight on, no limb.
        q = vec2(0.0);
        zc = 1.0;
        edge = 1.0;
        lon = (p.x - uFlatT.y) / uFlatT.x;
        lat = (uFlatT.z - p.y) / uFlatT.x;
        if (abs(lat) > PI / 2.0) { outColor = vec4(0.0); return; }
    } else {
        q = (p - uCenter) / uScale;
        q.y = -q.y;
        float rho2 = dot(q, q);
        float px = uView.x / uRes.x / uScale; // one pixel in unit-sphere space
        edge = 1.0 - smoothstep(1.0 - 2.0 * px, 1.0, sqrt(rho2));
        if (edge <= 0.0) { outColor = vec4(0.0); return; }

        zc = sqrt(max(0.0, 1.0 - rho2));
        // View-space point (x towards the viewer) -> undo d3's phi rotation, then lambda.
        float cp = cos(uRot.y), sp = sin(uRot.y);
        float x2 = zc * cp + q.y * sp;
        float z2 = q.y * cp - zc * sp;
        lon = atan(q.x, x2) - uRot.x;
        lat = asin(clamp(z2, -1.0, 1.0));
    }

    // Tarini's trick: pick the u that has no seam so mipmapping stays clean.
    float u = lon / (2.0 * PI) + 0.5;
    float uA = fract(u);
    float uB = fract(u + 0.5) - 0.5;
    u = fwidth(uA) <= fwidth(uB) + 1e-6 ? uA : uB;
    vec2 uv = vec2(u, 0.5 - lat / PI);

    vec3 day = texture(uDay, uv).rgb;
    float hiDay = 0.0; // how much of this pixel comes from sharp satellite tiles
    if (uHasDetail > 0.5) {
        vec2 d = mosaicUv(lon, lat, uDetailOrigin, uDetailSize);
        if (inside(d)) {
            vec4 hi = texture(uDetail, d);
            day = mix(day, hi.rgb, hi.a);
            hiDay = hi.a;
        }
    }
    vec3 lights = texture(uLights, uv).rgb;
    if (uHasLightsHi > 0.5) {
        vec2 d = mosaicUv(lon, lat, uLightsOrigin, uLightsSize);
        if (inside(d)) {
            vec4 hi = texture(uLightsHi, d);
            lights = mix(lights, hi.rgb, hi.a);
        }
    }

    vec3 n = vec3(q.x, q.y, zc);
    float rim = pow(1.0 - zc, 2.6);

    // Day: sun from the upper left, soft terminator, glint on the oceans.
    vec3 L = normalize(vec3(-0.45, 0.5, 0.78));
    float diff = max(dot(n, L), 0.0);
    float ocean = smoothstep(0.02, 0.10, day.b - max(day.r, day.g));
    float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 28.0);
    vec3 dayCol = day * (0.28 + 0.92 * diff) + vec3(1.0, 0.97, 0.9) * spec * ocean * 0.35;
    dayCol = mix(dayCol, vec3(0.55, 0.78, 1.0), rim * 0.65);

    // Night: moonlit planet with glowing city lights.
    float moon = 0.35 + 0.65 * max(dot(n, normalize(vec3(0.4, 0.45, 0.8))), 0.0);
    // Zoomed in, the moonlight is brighter so the sharp terrain still reads.
    vec3 moonTint = mix(vec3(0.05, 0.07, 0.13), vec3(0.14, 0.18, 0.3), hiDay);
    vec3 glowLo = pow(lights, vec3(1.15)) * vec3(1.25, 1.0, 0.72);
    // Night-light data is ~600 m per pixel at best. To make it street-sharp, let
    // it glow only where the daytime imagery shows built-up ground (bright,
    // grey roofs and roads), giving per-building, per-street sodium light.
    float lum = dot(day, vec3(0.299, 0.587, 0.114));
    float sat = max(day.r, max(day.g, day.b)) - min(day.r, min(day.g, day.b));
    float urban = smoothstep(0.2, 0.5, lum) * (1.0 - smoothstep(0.06, 0.22, sat));
    float lit = smoothstep(0.1, 0.55, dot(lights, vec3(0.299, 0.587, 0.114)));
    vec3 glowHi = vec3(1.0, 0.76, 0.42) * lit * (urban * 2.4 + 0.18);
    vec3 nightCol = day * moonTint * moon + mix(glowLo, glowHi, hiDay);
    nightCol = mix(nightCol, vec3(0.16, 0.32, 0.85), rim * 0.55);

    vec3 col = mix(dayCol, nightCol, uNight);
    outColor = vec4(col * edge, edge); // premultiplied alpha
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(s) ?? "shader error");
    }
    return s;
}

function upload(
    gl: WebGL2RenderingContext,
    img: HTMLImageElement,
    unit: number,
) {
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const aniso = gl.getExtension("EXT_texture_filter_anisotropic");
    if (aniso) {
        gl.texParameterf(
            gl.TEXTURE_2D,
            aniso.TEXTURE_MAX_ANISOTROPY_EXT,
            Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)),
        );
    }
}

type Gl = {
    gl: WebGL2RenderingContext;
    uniforms: Record<string, WebGLUniformLocation | null>;
};

export default function EarthGlobe({
    rotation,
    scale,
    night,
    center,
    view,
    flat = null,
    onReady,
}: {
    rotation: [number, number];
    scale: number;
    night: boolean;
    center: [number, number];
    view: [number, number];
    /** Draw a flat map with this transform instead of the globe. */
    flat?: FlatTransform | null;
    /** Fires once the imagery is on screen, so the flat fallback can step aside. */
    onReady?: (ready: boolean) => void;
}) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const ctx = useRef<Gl | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [size, setSize] = useState<[number, number]>([0, 0]);
    // Animated 0..1 day/night blend.
    const [mix, setMix] = useState(night ? 1 : 0);
    const mixRef = useRef(mix);
    // The high-res tile mosaic currently uploaded to the GPU.
    const [detail, setDetail] = useState<Mosaic | null>(null);
    // ...and the NASA night-lights mosaic (only fetched in dark mode).
    const [lightsHi, setLightsHi] = useState<Mosaic | null>(null);

    // Set up WebGL and load both textures.
    useEffect(() => {
        const el = canvas.current;
        const gl = el?.getContext("webgl2", {
            premultipliedAlpha: true,
            antialias: false,
        });
        if (!el || !gl) {
            return;
        }
        let cancelled = false;
        try {
            const prog = gl.createProgram()!;
            gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
            gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
            gl.linkProgram(prog);
            if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
                throw new Error(gl.getProgramInfoLog(prog) ?? "link error");
            }
            gl.useProgram(prog);
            const buf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.bufferData(
                gl.ARRAY_BUFFER,
                new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
                gl.STATIC_DRAW,
            );
            const loc = gl.getAttribLocation(prog, "aPos");
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
            const uniforms = Object.fromEntries(
                [
                    "uRes",
                    "uView",
                    "uCenter",
                    "uScale",
                    "uRot",
                    "uNight",
                    "uFlat",
                    "uFlatT",
                    "uDay",
                    "uLights",
                    "uDetail",
                    "uHasDetail",
                    "uDetailOrigin",
                    "uDetailSize",
                    "uLightsHi",
                    "uHasLightsHi",
                    "uLightsOrigin",
                    "uLightsSize",
                ].map((n) => [n, gl.getUniformLocation(prog, n)]),
            );
            gl.uniform1i(uniforms.uDay, 0);
            gl.uniform1i(uniforms.uLights, 1);
            gl.uniform1i(uniforms.uDetail, 2);
            gl.uniform1i(uniforms.uLightsHi, 3);
            // Units 2 and 3 hold the streamed tile mosaics.
            for (const unit of [gl.TEXTURE2, gl.TEXTURE3]) {
                gl.activeTexture(unit);
                gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
                for (const [k, v] of [
                    [gl.TEXTURE_MIN_FILTER, gl.LINEAR],
                    [gl.TEXTURE_MAG_FILTER, gl.LINEAR],
                    [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
                    [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
                ]) {
                    gl.texParameteri(gl.TEXTURE_2D, k, v);
                }
            }

            void Promise.all([loadImage(DAY_SRC), loadImage(NIGHT_SRC)])
                .then(([day, lights]) => {
                    if (cancelled || gl.isContextLost()) {
                        return;
                    }
                    upload(gl, day, 0);
                    upload(gl, lights, 1);
                    ctx.current = { gl, uniforms };
                    setLoaded(true);
                })
                .catch(() => undefined); // stay on the SVG fallback
        } catch {
            return; // no usable WebGL: the SVG ocean stays visible
        }

        return () => {
            cancelled = true;
            ctx.current = null;
            gl.getExtension("WEBGL_lose_context")?.loseContext();
        };
    }, []);

    // Match the canvas backing store to its on-screen size.
    useEffect(() => {
        const el = canvas.current;
        if (!el) {
            return;
        }
        const ro = new ResizeObserver(([entry]) => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            setSize([
                Math.round(entry.contentRect.width * dpr),
                Math.round(entry.contentRect.height * dpr),
            ]);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Cross-fade day <-> night when the site theme flips.
    useEffect(() => {
        const to = night ? 1 : 0;
        const from = mixRef.current;
        if (
            from === to ||
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
            mixRef.current = to;
            setMix(to);
            return;
        }
        const start = performance.now();
        let raf = 0;
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / 900);
            const v = from + (to - from) * (t * t * (3 - 2 * t));
            mixRef.current = v;
            setMix(v);
            if (t < 1) {
                raf = requestAnimationFrame(tick);
            }
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [night]);

    // Draw whenever the view changes.
    useEffect(() => {
        const c = ctx.current;
        const el = canvas.current;
        if (!loaded || !c || !el || !size[0] || !size[1]) {
            return;
        }
        const { gl, uniforms: u } = c;
        if (el.width !== size[0] || el.height !== size[1]) {
            el.width = size[0];
            el.height = size[1];
        }
        gl.viewport(0, 0, el.width, el.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(u.uRes, el.width, el.height);
        gl.uniform2f(u.uView, view[0], view[1]);
        gl.uniform2f(u.uCenter, center[0], center[1]);
        gl.uniform1f(u.uScale, scale);
        gl.uniform2f(
            u.uRot,
            (rotation[0] * Math.PI) / 180,
            (rotation[1] * Math.PI) / 180,
        );
        gl.uniform1f(u.uNight, mix);
        gl.uniform1f(u.uFlat, flat ? 1 : 0);
        if (flat) {
            gl.uniform3f(u.uFlatT, flat.k, flat.tx, flat.ty);
        }
        gl.uniform1f(u.uHasDetail, detail ? 1 : 0);
        if (detail) {
            const [lon, my, w, h] = mosaicBox(detail);
            gl.uniform2f(u.uDetailOrigin, lon, my);
            gl.uniform2f(u.uDetailSize, w, h);
        }
        gl.uniform1f(u.uHasLightsHi, lightsHi ? 1 : 0);
        if (lightsHi) {
            const [lon, my, w, h] = mosaicBox(lightsHi);
            gl.uniform2f(u.uLightsOrigin, lon, my);
            gl.uniform2f(u.uLightsSize, w, h);
        }
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }, [
        loaded,
        size,
        rotation,
        scale,
        mix,
        center,
        view,
        flat,
        detail,
        lightsHi,
    ]);

    // Once the view settles, stream in sharp tiles for what is on screen: daytime
    // satellite imagery always (night mode uses it too), NASA night lights in
    // dark mode. The previous mosaics stay up meanwhile; they are geo-referenced,
    // so they keep lining up while the globe moves.
    const box =
        loaded && size[0]
            ? visibleBox(rotation, scale, center, view, size[0] / view[0], flat)
            : null;
    const needDay = tilesFor(box, MIN_TILE_Z, MAX_TILE_Z);
    const needLights = night ? tilesFor(box, MIN_LIGHTS_Z, MAX_LIGHTS_Z) : null;
    useStreamedMosaic(ctx, needDay, TILE_URL, 2, detail, setDetail);
    useStreamedMosaic(ctx, needLights, LIGHTS_URL, 3, lightsHi, setLightsHi);

    useEffect(() => {
        onReady?.(loaded);
    }, [loaded, onReady]);
    useEffect(() => () => onReady?.(false), [onReady]);

    return (
        <>
            <canvas
                ref={canvas}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-500"
                style={{ opacity: loaded ? 1 : 0 }}
            />
            {detail && (
                <p className="pointer-events-none absolute bottom-1.5 left-2 z-10 text-[10px] text-white/70 drop-shadow">
                    Citra © Esri, Maxar, Earthstar Geographics
                    {lightsHi && " · Lampu malam: NASA Black Marble"}
                </p>
            )}
        </>
    );
}

/** Keep a tile mosaic on texture unit `unit` in step with what is on screen. */
function useStreamedMosaic(
    ctx: React.RefObject<Gl | null>,
    need: Mosaic | null,
    url: (z: number, x: number, y: number) => string,
    unit: number,
    current: Mosaic | null,
    setCurrent: (m: Mosaic | null) => void,
) {
    const key = need?.key ?? null;
    useEffect(() => {
        if (!need) {
            setCurrent(null);
            return;
        }
        if (need.key === current?.key) {
            return;
        }
        let stale = false;
        const timer = window.setTimeout(() => {
            void buildMosaic(need, url).then((mosaic) => {
                const c = ctx.current;
                if (stale || !c) {
                    return;
                }
                const { gl } = c;
                gl.activeTexture(gl.TEXTURE0 + unit);
                gl.texImage2D(
                    gl.TEXTURE_2D,
                    0,
                    gl.RGBA,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    mosaic,
                );
                setCurrent(need);
            });
        }, 180);
        return () => {
            stale = true;
            window.clearTimeout(timer);
        };
        // `need` is rebuilt every render; its key is what identifies it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
}
