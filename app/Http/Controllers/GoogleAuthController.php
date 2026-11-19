<?php

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/** "Masuk dengan Google": plain OAuth 2.0 authorization-code flow, no extra package. */
class GoogleAuthController extends Controller
{
    public function redirect(Request $request): RedirectResponse
    {
        if (! config('services.google.client_id') || ! config('services.google.client_secret')) {
            return $this->fail('Login dengan Google belum diatur.');
        }

        $request->session()->put('google_state', $state = Str::random(40));

        return redirect()->away('https://accounts.google.com/o/oauth2/v2/auth?'.http_build_query([
            'client_id' => config('services.google.client_id'),
            'redirect_uri' => config('services.google.redirect'),
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'state' => $state,
            'prompt' => 'select_account',
        ]));
    }

    public function callback(Request $request): RedirectResponse
    {
        $state = $request->session()->pull('google_state');
        if (! $state || ! hash_equals($state, (string) $request->query('state')) || ! $request->query('code')) {
            return $this->fail('Login dengan Google dibatalkan atau tidak valid.');
        }

        $token = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'code' => $request->query('code'),
            'client_id' => config('services.google.client_id'),
            'client_secret' => config('services.google.client_secret'),
            'redirect_uri' => config('services.google.redirect'),
            'grant_type' => 'authorization_code',
        ]);
        $profile = $token->successful()
            ? Http::withToken($token->json('access_token'))->get('https://openidconnect.googleapis.com/v1/userinfo')
            : null;

        if (! $profile?->successful() || ! $profile->json('email') || ! $profile->json('email_verified')) {
            return $this->fail('Akun Google tidak dapat diverifikasi.');
        }

        // Google vouches for the email, so an existing account with it is the same person.
        $user = User::firstOrCreate(
            ['email' => Str::lower($profile->json('email'))],
            [
                'name' => $profile->json('name') ?: Str::before($profile->json('email'), '@'),
                'password' => Str::random(40),
                'role' => Role::Customer,
            ],
        );

        Auth::login($user, true);
        $request->session()->regenerate();

        return redirect()->intended(route(match (true) {
            $user->role === Role::Client => 'admin.insights',
            $user->role->isStaff() => 'admin.articles.index',
            default => 'home',
        }));
    }

    private function fail(string $message): RedirectResponse
    {
        return redirect()->route('login')->withErrors(['email' => $message], 'login');
    }
}
