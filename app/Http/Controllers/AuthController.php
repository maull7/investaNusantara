<?php

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Models\Article;
use App\Models\Region;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
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

    /** Public sign-up: a pelanggan (reader), or a citizen contributor whose drafts an editor reviews before publishing. */
    public function register(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'type' => ['nullable', 'in:customer,contributor'],
        ]);

        $role = ($data['type'] ?? 'customer') === 'contributor' ? Role::Contributor : Role::Customer;
        $user = User::create([...Arr::except($data, 'type'), 'role' => $role]);
        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->intended($this->landing($user))->with('success', $role === Role::Customer
            ? 'Akun pelanggan dibuat. Selamat membaca!'
            : 'Akun kontributor dibuat. Selamat menulis!');
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

        return redirect()->intended($this->landing($request->user()));
    }

    /** Staff land in the newsroom, pelanggan on the public home page. */
    private function landing(User $user): string
    {
        return route(match (true) {
            $user->role === Role::Client => 'admin.insights',
            $user->role->isStaff() => 'admin.articles.index',
            default => 'home',
        });
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('home');
    }
}
