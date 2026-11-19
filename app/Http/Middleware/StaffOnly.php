<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Pelanggan only read the public site; the newsroom is closed to them. */
class StaffOnly
{
    public function handle(Request $request, Closure $next): Response
    {
        return $request->user()->role->isStaff() ? $next($request) : redirect()->route('home');
    }
}
