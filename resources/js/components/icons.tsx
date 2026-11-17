import type { SVGProps } from 'react';

const paths = {
    home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zm0 0v14m6-12v14',
    search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4.3-4.3',
    grid: 'M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 0h7v7h-7z',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 9a8 8 0 0 1 16 0',
    back: 'M15 18l-6-6 6-6',
    share: 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4m4-4v13',
    flame: 'M12 3s5 4.5 5 9.5A5 5 0 0 1 7 12.5C7 10 9 8 9 8s.5 3 3 3c0-4 0-8 0-8z',
    eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    arrow: 'M5 12h14m-6-6 6 6-6 6',
    bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
    sliders: 'M4 7h9m4 0h3M4 17h3m4 0h9M15 5v4M9 15v4',
    chevron: 'M9 6l6 6-6 6',
    mail: 'M4 6h16v12H4zm0 0 8 7 8-7',
    file: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zm0 0v5h5M9 13h6m-6 4h6',
    tag: 'M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9zM8 8h.01',
    users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0m0-10a3 3 0 1 0 0-6m6 16a6 6 0 0 0-4-5.6',
    plus: 'M12 5v14M5 12h14',
    logout: 'M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5m5 5H3',
    edit: 'M4 20h4L19 9l-4-4L4 16zm9-13 4 4',
    check: 'M5 12l5 5L20 7',
    x: 'M6 6l12 12M18 6 6 18',
    send: 'M21 3 10 14M21 3l-7 18-4-7-7-4z',
    trash: 'M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3',
    image: 'M4 5h16v14H4zm0 11 5-5 4 4 2-2 5 5M15 9h.01',
    external:
        'M14 4h6v6m0-6L10 14M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
    star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
    activity: 'M3 12h4l3-8 4 16 3-8h4',
    shield: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-13v4l3 2',
    upload: 'M12 16V4m-5 5 5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
    lock: 'M6 11h12v9H6zm2 0V8a4 4 0 0 1 8 0v3',
    'eye-off':
        'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.8-1.3M9.9 9.9a3 3 0 0 0 4.2 4.2',
};

export type IconName = keyof typeof paths;

export default function Icon({
    name,
    ...props
}: { name: IconName } & SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            width={20}
            height={20}
            aria-hidden
            {...props}
        >
            <path d={paths[name]} />
        </svg>
    );
}
