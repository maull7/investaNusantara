<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">
        <link rel="manifest" href="/site.webmanifest">
        <meta name="theme-color" content="#A50E1E">
        {{-- Before first paint: saved choice, else the device setting. Toggled in layouts/public.tsx. --}}
        <script>
            try {
                var theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                }
            } catch (e) {}
        </script>

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ $meta['title'] ?? config('app.name', 'Laravel') }}</title>
        </x-inertia::head>
        {{-- Server-rendered for crawlers that don't run JavaScript (WhatsApp, Facebook, X). --}}
        @isset($meta)
            <meta name="description" content="{{ $meta['description'] }}">
            <link rel="canonical" href="{{ $meta['url'] }}">
            <meta property="og:site_name" content="{{ config('app.name') }}">
            <meta property="og:locale" content="id_ID">
            <meta property="og:type" content="{{ $meta['type'] }}">
            <meta property="og:title" content="{{ $meta['title'] }}">
            <meta property="og:description" content="{{ $meta['description'] }}">
            <meta property="og:url" content="{{ $meta['url'] }}">
            @if ($meta['image'])
                <meta property="og:image" content="{{ $meta['image'] }}">
                <meta name="twitter:card" content="summary_large_image">
            @endif
            @if ($meta['jsonLd'])
                <script type="application/ld+json">{!! json_encode($meta['jsonLd'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) !!}</script>
            @endif
        @endisset
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
