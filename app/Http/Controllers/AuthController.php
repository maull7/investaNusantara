<?php

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Models\Article;
use App\Models\Region;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    /** Login and registration share one page; the route decides which tab opens first. */
    public function create(Request $request): Response
    {
        $breaking = Article::published()->card()->where('is_breaking', true)->limit(6)->get();

        return Inertia::render('auth/login', [
            'mode' => $request->routeIs('register') ? 'register' : 'login',
            // Ticker: breaking news, or the latest stories when nothing is flagged.
            'breaking' => $breaking->isNotEmpty() ? $breaking : Article::published()->card()->limit(6)->get(),
            'stats' => [
                'cities' => Region::where('level', '!=', Region::PROVINCE)->count(),
                'weekly' => Article::published()->where('published_at', '>=', now()->subWeek())->count(),
            ],
        ]);
    }

    /** Public sign-up creates a citizen contributor: drafts only, published after editor review. */
    public function register(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $user = User::create([...$data, 'role' => Role::Contributor]);
        Auth::login($user);
        $request->session()->regenerate();

        return to_route('admin.articles.index')->with('success', 'Akun kontributor dibuat. Selamat menulis!');
    }

    public function store(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (! Auth::attempt($credentials, $request->boolean('remember'))) {
            throw ValidationException::withMessages(['email' => 'Email atau password salah.']);
        }

        $request->session()->regenerate();

        return redirect()->intended(route('admin.articles.index'));
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('home');
    }
}
