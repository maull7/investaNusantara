import type { Auth } from '@/types/auth';
import type { Category, Region } from '@/types/news';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            nav: { categories: Category[]; provinces: Region[] };
            flash: { success: string | null; error: string | null };
            [key: string]: unknown;
        };
    }
}
