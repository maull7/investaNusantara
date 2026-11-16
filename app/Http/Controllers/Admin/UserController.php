<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\Region;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/users/index', [
            'users' => User::with('region:code,name')->orderBy('name')->paginate(20),
        ]);
    }

    public function create(): Response
    {
        return $this->form(null);
    }

    public function store(Request $request): RedirectResponse
    {
        User::create($this->validated($request));

        return to_route('admin.users.index')->with('success', 'Pengguna dibuat.');
    }

    public function edit(User $user): Response
    {
        return $this->form($user);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $data = $this->validated($request, $user);
        if (empty($data['password'])) {
            unset($data['password']);
        }
        $user->update($data);

        return to_route('admin.users.index')->with('success', 'Pengguna diperbarui.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        abort_if($user->is($request->user()), 422, 'Tidak bisa menghapus akun sendiri.');
        if (Article::withTrashed()->where('author_id', $user->id)->exists()) {
            return back()->with('error', 'Pengguna masih punya artikel.');
        }
        $user->delete();

        return back()->with('success', 'Pengguna dihapus.');
    }

    private function form(?User $user): Response
    {
        return Inertia::render('admin/users/form', [
            'user' => $user?->only('id', 'name', 'email', 'role', 'region_code'),
            'roles' => collect(Role::cases())->map(fn (Role $r) => ['value' => $r->value, 'label' => $r->label()]),
            'regions' => Region::whereIn('level', [1, 2])->orderBy('code')->get(['code', 'name', 'level']),
        ]);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?User $user = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($user)],
            'password' => [$user ? 'nullable' : 'required', Password::defaults()],
            'role' => ['required', Rule::enum(Role::class)],
            'region_code' => ['nullable', 'exists:regions,code'],
        ]);
    }
}
