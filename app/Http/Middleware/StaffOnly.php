<?php

namespace App\Http\Middleware;

use App\Enums\Role;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Pelanggan only read the public site; Klien Data only see Media Intelligence.
 * The rest of the newsroom is closed to both.
 */
class StaffOnly
{
    public function handle(Request $request, Closure $next): Response
    {
        $role = $request->user()->role;
        if ($role === Role::Client) {
            return $request->routeIs('admin.insights*') ? $next($request) : redirect()->route('admin.insights');
        }

        return $role->isStaff() ? $next($request) : redirect()->route('home');
    }
}
