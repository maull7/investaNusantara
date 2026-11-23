/*
 * NusantaraNews service worker: installable app, offline page, and breaking-news push.
 *
 * Pages are never cached (they carry the reader's session and paywalled text); only
 * fingerprinted build assets, the offline page and images are. Bump VERSION to drop old caches.
 */
const VERSION = 'v1';
const STATIC = `static-${VERSION}`;
const IMAGES = `images-${VERSION}`;
const OFFLINE = '/offline';
const MAX_IMAGES = 120;

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(STATIC)
            .then((cache) => cache.addAll([OFFLINE, '/icon-192.png', '/favicon.svg']))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => ![STATIC, IMAGES].includes(key))
                        .map((key) => caches.delete(key)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') {
        return;
    }
    const url = new URL(request.url);
    const sameOrigin = url.origin === self.location.origin;
    if (sameOrigin && /^\/(admin|horizon|api|auth|login|register|logout)(\/|$)/.test(url.pathname)) {
        return;
    }

    // Full page loads: always from the network; the offline page when there is none.
    if (request.mode === 'navigate') {
        event.respondWith(fetch(request).catch(() => caches.match(OFFLINE)));

        return;
    }

    // Vite assets have a content hash in the name, so a cached copy is always right.
    if (sameOrigin && url.pathname.startsWith('/build/')) {
        event.respondWith(
            caches.match(request).then(
                (hit) =>
                    hit ||
                    fetch(request).then((response) => {
                        if (response.ok) {
                            const copy = response.clone();
                            caches.open(STATIC).then((cache) => cache.put(request, copy));
                        }

                        return response;
                    }),
            ),
        );

        return;
    }

    // Images (covers, region photos): show the cached copy at once, refresh it in the background.
    if (request.destination === 'image') {
        event.respondWith(
            caches.open(IMAGES).then((cache) =>
                cache.match(request).then((hit) => {
                    const network = fetch(request)
                        .then((response) => {
                            if (response.ok || response.type === 'opaque') {
                                cache.put(request, response.clone()).then(() => trim(cache));
                            }

                            return response;
                        })
                        .catch(() => hit);

                    return hit || network;
                }),
            ),
        );
    }
});

async function trim(cache) {
    const keys = await cache.keys();
    await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_IMAGES)).map((key) => cache.delete(key)));
}

// Breaking news from App\Jobs\SendBreakingPush.
self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = { body: event.data ? event.data.text() : '' };
    }

    event.waitUntil(
        self.registration.showNotification(data.title || 'NusantaraNews', {
            body: data.body || '',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            image: data.image || undefined,
            tag: data.tag,
            lang: 'id',
            data: { url: data.url || '/' },
        }),
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = new URL(event.notification.data?.url || '/', self.location.origin).href;

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
            const open = windows.find((w) => w.url === target);
            if (open) {
                return open.focus();
            }

            return self.clients.openWindow(target);
        }),
    );
});
