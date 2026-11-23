import { useEffect, useRef } from 'react';

type TurnstileApi = {
    render: (
        el: HTMLElement,
        options: Record<string, unknown>,
    ) => string | undefined;
    remove: (id: string) => void;
};

declare global {
    interface Window {
        turnstile?: TurnstileApi;
    }
}

const SCRIPT =
    'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
    if (window.turnstile) {
        return Promise.resolve(window.turnstile);
    }
    loading ??= new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = SCRIPT;
        script.async = true;
        script.onload = () =>
            window.turnstile
                ? resolve(window.turnstile)
                : reject(new Error('Turnstile unavailable'));
        script.onerror = () => {
            loading = null;
            reject(new Error('Turnstile failed to load'));
        };
        document.head.appendChild(script);
    });

    return loading;
}

/**
 * Cloudflare Turnstile widget. Put it inside a <form>: the widget adds a hidden
 * `cf-turnstile-response` input that is submitted with the form. Tokens are
 * single-use, so remount it (change `key`) after a failed submit.
 */
export default function Turnstile({
    siteKey,
    error,
}: {
    siteKey: string;
    error?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let id: string | undefined;
        let cancelled = false;
        loadTurnstile()
            .then((api) => {
                if (cancelled || !ref.current) {
                    return;
                }
                id = api.render(ref.current, {
                    sitekey: siteKey,
                    language: 'id',
                    theme: document.documentElement.classList.contains('dark')
                        ? 'dark'
                        : 'light',
                    size: 'flexible',
                });
            })
            .catch(() => {});

        return () => {
            cancelled = true;
            if (id) {
                window.turnstile?.remove(id);
            }
        };
    }, [siteKey]);

    return (
        <div>
            <div ref={ref} className="min-h-[65px]" />
            {error && <p className="mt-1.5 text-xs text-accent">{error}</p>}
        </div>
    );
}
