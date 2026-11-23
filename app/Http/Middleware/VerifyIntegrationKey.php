<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Autentikasi server-to-server untuk project utama.
 * Kunci diatur di INTEGRATION_API_KEYS dengan format "nama:secret,nama2:secret2".
 */
class VerifyIntegrationKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = (string) $request->bearerToken();
        abort_if($token === '', 401, 'Token API tidak ditemukan.');

        $client = null;
        foreach (config()->array('services.integrations.keys') as $name => $secret) {
            if (is_string($secret) && hash_equals($secret, $token)) {
                $client = $name;
            }
        }
        abort_if($client === null, 401, 'Token API tidak valid.');

        $request->attributes->set('integrationClient', $client);

        return $next($request);
    }
}
