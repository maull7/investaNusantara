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
