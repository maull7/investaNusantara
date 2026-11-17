<?php

namespace Tests\Feature;

use App\Enums\Permission;
use App\Enums\Role;
use App\Models\Article;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SubAdminTest extends TestCase
{
    use RefreshDatabase;

    private function subAdmin(Permission ...$permissions): User
    {
        return User::factory()->create([
            'role' => Role::SubAdmin,
            'permissions' => array_map(fn (Permission $p) => $p->value, $permissions),
        ]);
    }

    public function test_super_admin_creates_a_sub_admin_with_chosen_areas(): void
    {
        $this->actingAs(User::factory()->create(['role' => Role::SuperAdmin]))
            ->post('/admin/users', [
                'name' => 'Sub Admin',
                'email' => 'sub@example.com',
                'password' => 'rahasia-panjang',
                'role' => 'sub_admin',
                'permissions' => ['categories', 'activity'],
            ])->assertRedirect('/admin/users');

        $user = User::where('email', 'sub@example.com')->sole();
        $this->assertSame(Role::SubAdmin, $user->role);
        $this->assertSame(['categories', 'activity'], $user->permissions);
    }

    public function test_permissions_are_dropped_for_non_admin_roles(): void
    {
        $this->actingAs(User::factory()->create(['role' => Role::SuperAdmin]))
            ->post('/admin/users', [
                'name' => 'Wartawan',
                'email' => 'w@example.com',
                'password' => 'rahasia-panjang',
                'role' => 'journalist',
                'permissions' => ['users'],
            ]);

        $this->assertNull(User::where('email', 'w@example.com')->sole()->permissions);
    }

    public function test_sub_admin_only_opens_granted_areas(): void
    {
        $this->actingAs($this->subAdmin(Permission::Categories));

        $this->get('/admin/categories')->assertOk();
        $this->get('/admin/users')->assertForbidden();
        $this->get('/admin/activity')->assertForbidden();
        $this->get('/admin/ai')->assertForbidden();
        $this->get('/admin/articles')->assertInertia(fn (Assert $page) => $page->where('auth.user.access', ['categories']));
    }

    public function test_sub_admin_with_user_access_cannot_create_or_touch_admins(): void
    {
        $sub = $this->subAdmin(Permission::Users);
        $boss = User::factory()->create(['role' => Role::SuperAdmin]);
        $this->actingAs($sub);

        $this->get('/admin/users/create')->assertInertia(fn (Assert $page) => $page
            ->where('roles', fn ($roles) => collect($roles)->pluck('value')->intersect(['super_admin', 'sub_admin'])->isEmpty()));

        $this->post('/admin/users', [
            'name' => 'Naik pangkat',
            'email' => 'x@example.com',
            'password' => 'rahasia-panjang',
            'role' => 'super_admin',
        ])->assertSessionHasErrors('role');

        $this->get("/admin/users/{$boss->id}/edit")->assertForbidden();
        $this->put("/admin/users/{$sub->id}", [
            'name' => $sub->name,
            'email' => $sub->email,
            'role' => 'sub_admin',
            'permissions' => ['users', 'ai', 'activity'],
        ])->assertForbidden();
        $this->delete("/admin/users/{$boss->id}")->assertForbidden();
    }

    public function test_article_access_lets_a_sub_admin_handle_everyones_articles(): void
    {
        $article = Article::factory()->create();

        $this->actingAs($this->subAdmin())->get("/admin/articles/{$article->id}/edit")->assertForbidden();
        $this->actingAs($this->subAdmin(Permission::Articles))->get("/admin/articles/{$article->id}/edit")->assertOk();
    }
}
