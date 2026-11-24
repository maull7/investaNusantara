<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Permission;
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

/**
 * Team management. Only a Super Admin hands out admin roles: a Sub Admin with the
 * "users" area manages editors, journalists, and contributors, never other admins.
 */
class UserController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('admin/users/index', [
            'users' => User::with('region:code,name')->orderBy('name')->paginate(20)
                ->through(fn (User $u) => [
                    ...$u->only('id', 'name', 'organization', 'email', 'role', 'region_code', 'permissions', 'region', 'client_regions'),
                    'subscription_ends_at' => $u->subscription_ends_at?->toDateString(),
                    'created_at' => $u->created_at?->toIso8601String(),
                    'manageable' => $this->manageable($request->user(), $u),
                ]),
            'permissions' => $this->permissionOptions(),
        ]);
    }

    public function create(Request $request): Response
    {
        return $this->form($request->user(), null);
    }

    public function store(Request $request): RedirectResponse
    {
        User::create($this->validated($request));

        return to_route('admin.users.index')->with('success', 'Pengguna dibuat.');
    }

    public function edit(Request $request, User $user): Response
    {
        $this->authorizeManage($request->user(), $user);

        return $this->form($request->user(), $user);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $this->authorizeManage($request->user(), $user);
        $data = $this->validated($request, $user);
        if (empty($data['password'])) {
            unset($data['password']);
        }
        $user->update($data);

        return to_route('admin.users.index')->with('success', 'Pengguna diperbarui.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        $this->authorizeManage($request->user(), $user);
        abort_if($user->is($request->user()), 422, 'Tidak bisa menghapus akun sendiri.');
        if (Article::withTrashed()->where('author_id', $user->id)->exists()) {
            return back()->with('error', 'Pengguna masih punya artikel.');
        }
        $user->delete();

        return back()->with('success', 'Pengguna dihapus.');
    }

    private function form(User $actor, ?User $user): Response
    {
        return Inertia::render('admin/users/form', [
            'user' => $user ? [
                ...$user->only('id', 'name', 'organization', 'email', 'role', 'region_code', 'permissions', 'client_regions'),
                'subscription_ends_at' => $user->subscription_ends_at?->toDateString(),
            ] : null,
            'roles' => collect($this->assignableRoles($actor))->map(fn (Role $r) => ['value' => $r->value, 'label' => $r->label()]),
            'permissions' => $this->permissionOptions(),
            'regions' => Region::whereIn('level', [1, 2])->orderBy('code')->get(['code', 'name', 'level']),
        ]);
    }

    /** @return list<Role> */
    private function assignableRoles(User $actor): array
    {
        return $actor->role === Role::SuperAdmin
            ? Role::cases()
            : array_values(array_filter(Role::cases(), fn (Role $r) => ! $this->isAdminRole($r)));
    }

    private function isAdminRole(Role $role): bool
    {
        return in_array($role, [Role::SuperAdmin, Role::SubAdmin], true);
    }

    /** A Sub Admin may manage everyone except admins (themselves included). */
    private function manageable(User $actor, User $user): bool
    {
        return $actor->role === Role::SuperAdmin || ! $this->isAdminRole($user->role);
    }

    private function authorizeManage(User $actor, User $user): void
    {
        abort_unless($this->manageable($actor, $user), 403, 'Hanya Super Admin yang dapat mengelola akun admin.');
    }

    /** @return list<array{value: string, label: string, description: string}> */
    private function permissionOptions(): array
    {
        return array_map(fn (Permission $p) => [
            'value' => $p->value,
            'label' => $p->label(),
            'description' => $p->description(),
        ], Permission::cases());
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?User $user = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($user)],
            'password' => [$user ? 'nullable' : 'required', Password::defaults()],
            'role' => ['required', Rule::in(array_map(fn (Role $r) => $r->value, $this->assignableRoles($request->user())))],
            'region_code' => ['nullable', 'exists:regions,code'],
            'permissions' => ['array'],
            'permissions.*' => [Rule::enum(Permission::class)],
            // Klien Data: who they are, which provinces, until when.
            'organization' => ['nullable', 'required_if:role,client', 'string', 'max:255'],
            'client_regions' => ['array'],
            'client_regions.*' => [Rule::exists('regions', 'code')->where('level', Region::PROVINCE)],
            'subscription_ends_at' => ['nullable', 'date'],
        ], ['organization.required_if' => 'Nama organisasi wajib untuk Klien Data.']);
        $client = $data['role'] === Role::Client->value;
        $data['organization'] = $client ? $data['organization'] : null;
        // No provinces picked = all of Indonesia.
        $data['client_regions'] = $client && ! empty($data['client_regions']) ? array_values(array_unique($data['client_regions'])) : null;
        $data['subscription_ends_at'] = $client ? ($data['subscription_ends_at'] ?? null) : null;

        // Permissions only mean something for a Sub Admin.
        $data['permissions'] = $data['role'] === Role::SubAdmin->value
            ? array_values(array_unique($data['permissions'] ?? []))
            : null;

        return $data;
    }
}
