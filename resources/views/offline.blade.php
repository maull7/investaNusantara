<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#A50E1E">
    <meta name="robots" content="noindex">
    <title>Sedang offline - {{ config('app.name') }}</title>
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    {{-- Self-contained: the service worker caches this one page and shows it when there is no connection. --}}
    <style>
        :root { --red: #A50E1E; --navy: #0A1C36; --bg: #FFFCFC; --muted: #64748b; }
        @media (prefers-color-scheme: dark) { :root { --navy: #EEF3FA; --bg: #0A1C36; --muted: #94a3b8; } }
        * { box-sizing: border-box; }
        body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px;
            background: var(--bg); color: var(--navy); font-family: Poppins, system-ui, -apple-system, sans-serif; text-align: center; }
        .mark { width: 64px; height: 64px; margin: 0 auto 20px; border-radius: 18px; background: var(--red);
            display: grid; place-items: center; box-shadow: 0 12px 30px -10px rgba(165, 14, 30, .6); }
        h1 { margin: 0; font-size: 22px; font-weight: 600; }
        p { margin: 8px auto 0; max-width: 320px; color: var(--muted); font-size: 15px; line-height: 1.6; }
        button { margin-top: 24px; border: 0; border-radius: 999px; padding: 12px 24px; background: var(--red);
            color: #fff; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
    </style>
</head>
<body>
    <main>
        <div class="mark" aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 8.8a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01"/>
            </svg>
        </div>
        <h1>Anda sedang offline</h1>
        <p>Periksa koneksi internet Anda, lalu coba lagi.</p>
        <button type="button" onclick="location.reload()">Coba lagi</button>
    </main>
</body>
</html>
