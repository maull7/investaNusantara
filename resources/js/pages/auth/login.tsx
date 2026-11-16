import { Form, Head, Link } from '@inertiajs/react';
import { store } from '@/actions/App/Http/Controllers/AuthController';
import { home } from '@/routes';

export default function Login() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-navy-900 p-4">
            <Head title="Masuk Redaksi" />
            <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-xl">
                <Link
                    href={home.url()}
                    className="text-xl font-extrabold text-navy-900"
                >
                    Nusantara<span className="text-teal">News</span>{' '}
                    <span className="text-accent">360</span>
                </Link>
                <p className="mb-6 text-sm text-slate-500">
                    Masuk ke ruang redaksi
                </p>
                <Form
                    action={store.url()}
                    method="post"
                    resetOnError={['password']}
                    className="space-y-4"
                >
                    {({ errors, processing }) => (
                        <>
                            <label className="block text-sm">
                                Email
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    autoFocus
                                    autoComplete="email"
                                    className="mt-1 input"
                                />
                                {errors.email && (
                                    <span className="text-xs text-accent">
                                        {errors.email}
                                    </span>
                                )}
                            </label>
                            <label className="block text-sm">
                                Password
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    autoComplete="current-password"
                                    className="mt-1 input"
                                />
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    name="remember"
                                    type="checkbox"
                                    value="1"
                                />{' '}
                                Ingat saya
                            </label>
                            <button
                                disabled={processing}
                                className="btn-primary w-full"
                            >
                                Masuk
                            </button>
                        </>
                    )}
                </Form>
            </div>
        </div>
    );
}
