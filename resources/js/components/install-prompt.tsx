import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import Icon from '@/components/icons';
import { LogoMark } from '@/components/logo';
import { ease } from '@/components/motion';

type InstallEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISSED = 'install-dismissed-at';
// After "Nanti", ask again in two weeks.
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

function snoozed(): boolean {
    try {
        return (
            Date.now() - Number(localStorage.getItem(DISMISSED) ?? 0) <
            SNOOZE_MS
        );
    } catch {
        return false;
    }
}

/**
 * "Pasang aplikasi" banner on phones. Chrome/Android offers the install prompt; iOS Safari has
 * none, so it gets the Share > Add to Home Screen hint instead.
 */
export default function InstallPrompt() {
    const [event, setEvent] = useState<InstallEvent | null>(null);
    const [ios, setIos] = useState(false);

    useEffect(() => {
        const standalone =
            matchMedia('(display-mode: standalone)').matches ||
            (navigator as Navigator & { standalone?: boolean }).standalone;
        if (standalone || snoozed()) {
            return;
        }

        const onPrompt = (e: Event) => {
            e.preventDefault();
            setEvent(e as InstallEvent);
        };
        window.addEventListener('beforeinstallprompt', onPrompt);

        // iOS Safari (not Chrome/Firefox on iOS, which can't add to home screen the same way).
        const ua = navigator.userAgent;
        const timer = window.setTimeout(() => {
            if (
                /iPhone|iPad|iPod/.test(ua) &&
                /Safari/.test(ua) &&
                !/CriOS|FxiOS|EdgiOS/.test(ua)
            ) {
                setIos(true);
            }
        }, 4000);

        return () => {
            window.removeEventListener('beforeinstallprompt', onPrompt);
            window.clearTimeout(timer);
        };
    }, []);

    function dismiss() {
        try {
            localStorage.setItem(DISMISSED, String(Date.now()));
        } catch {
            // Private mode: it just shows again next visit.
        }
        setEvent(null);
        setIos(false);
    }

    async function install() {
        if (!event) {
            return;
        }
        await event.prompt();
        const { outcome } = await event.userChoice;
        if (outcome === 'dismissed') {
            dismiss();
        }
        setEvent(null);
    }

    const open = Boolean(event) || ios;

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 40, opacity: 0 }}
                    transition={{ duration: 0.35, ease }}
                    role="dialog"
                    aria-label="Pasang aplikasi"
                    className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-xl ring-1 shadow-accent/15 ring-accent/10 md:inset-x-auto md:right-6 md:bottom-6 md:w-96"
                >
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-white">
                        <LogoMark className="size-7" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-navy-900">
                            Pasang NusantaraNews
                        </p>
                        <p className="text-xs text-slate-500">
                            {ios ? (
                                <>
                                    Ketuk{' '}
                                    <Icon
                                        name="share"
                                        width={12}
                                        height={12}
                                        className="inline align-[-1px]"
                                    />{' '}
                                    lalu “Tambah ke Layar Utama”.
                                </>
                            ) : (
                                'Buka berita lebih cepat dari layar utama.'
                            )}
                        </p>
                    </div>
                    {event && (
                        <button
                            type="button"
                            onClick={() => void install()}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-sm font-semibold text-white active:scale-95"
                        >
                            <Icon name="download" width={15} height={15} />
                            Pasang
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={dismiss}
                        aria-label="Nanti saja"
                        className="grid size-8 shrink-0 place-items-center rounded-full text-slate-400 hover:text-accent"
                    >
                        <Icon name="x" width={16} height={16} />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
