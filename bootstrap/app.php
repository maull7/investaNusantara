<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\StaffOnly;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // In production the host's Nginx proxies to the app on 127.0.0.1;
        // trust its X-Forwarded-* headers (scheme, client IP) and nobody else's.
        $middleware->trustProxies(at: ['127.0.0.1', '::1']);
        $middleware->alias(['staff' => StaffOnly::class]);
        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Same JSON shape for every error on the integration API.
        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/v1/integrations/*')) {
                return response()->json(['success' => false, 'message' => 'Validasi gagal', 'errors' => $e->errors()], 422);
            }
        });
        $exceptions->render(function (HttpExceptionInterface $e, Request $request) {
            if ($request->is('api/v1/integrations/*')) {
                $message = match ($e->getStatusCode()) {
                    401 => $e->getMessage() ?: 'Autentikasi API gagal.',
                    429 => 'Terlalu banyak permintaan.',
                    default => $e->getMessage() ?: 'Permintaan gagal.',
                };

                return response()->json(['success' => false, 'message' => $message], $e->getStatusCode(), $e->getHeaders());
            }
        });
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
