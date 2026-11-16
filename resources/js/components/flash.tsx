import { usePage } from '@inertiajs/react';

export default function Flash() {
    const { flash } = usePage().props;

    if (!flash.success && !flash.error) {
        return null;
    }

    return (
        <div
            role="status"
            className={
                flash.error
                    ? 'mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800'
                    : 'mb-4 rounded-md bg-teal/10 px-4 py-3 text-sm text-teal-dark'
            }
        >
            {flash.error ?? flash.success}
        </div>
    );
}
