/**
 * Breaking-news web push, talking to PushSubscriptionController.
 * Every call resolves to the provinces this browser follows.
 */
export type PushState = { subscribed: boolean; provinces: string[] };

export function pushSupported(): boolean {
    return (
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    );
}

/** Laravel's CSRF cookie, sent back as a header (the X-XSRF-TOKEN convention). */
function xsrf(): string {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);

    return match ? decodeURIComponent(match[1]) : '';
}

async function call(
    method: 'POST' | 'DELETE',
    path: string,
    body: unknown,
): Promise<PushState> {
    const response = await fetch(path, {
        method,
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-XSRF-TOKEN': xsrf(),
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        throw new Error(`Push request failed (${response.status})`);
    }

    return response.json();
}

async function currentSubscription(): Promise<PushSubscription | null> {
    const registration = await navigator.serviceWorker.ready;

    return registration.pushManager.getSubscription();
}

function urlBase64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
    const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const raw = atob(padded);
    const bytes = new Uint8Array(new ArrayBuffer(raw.length));
    for (let i = 0; i < raw.length; i++) {
        bytes[i] = raw.charCodeAt(i);
    }

    return bytes;
}

export async function pushStatus(): Promise<PushState> {
    const subscription = await currentSubscription();
    if (!subscription || Notification.permission !== 'granted') {
        return { subscribed: false, provinces: [] };
    }

    return call('POST', '/api/push/status', {
        endpoint: subscription.endpoint,
    });
}

/** Asks for permission (only ever from a click), subscribes, and follows `province` if given. */
export async function follow(
    vapidPublicKey: string,
    province?: string,
): Promise<PushState> {
    if ((await Notification.requestPermission()) !== 'granted') {
        throw new Error('denied');
    }
    const registration = await navigator.serviceWorker.ready;
    const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToBytes(vapidPublicKey),
        }));

    return call('POST', '/api/push', { ...subscription.toJSON(), province });
}

/** Unfollows one province, or turns notifications off entirely without one. */
export async function unfollow(province?: string): Promise<PushState> {
    const subscription = await currentSubscription();
    if (!subscription) {
        return { subscribed: false, provinces: [] };
    }
    const state = await call('DELETE', '/api/push', {
        endpoint: subscription.endpoint,
        province,
    });
    if (!province) {
        await subscription.unsubscribe();
    }

    return state;
}
