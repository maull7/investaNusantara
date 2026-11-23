<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Article;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_reader_sees_own_dashboard(): void
    {
        $user = User::factory()->create(['role' => Role::Customer]);
        $user->bookmarks()->attach(Article::factory()->published()->create());

        $this->actingAs($user)->get('/akun')->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('bookmarkCount', 1)
            ->has('bookmarks', 1)
            ->where('application', null));
    }

    public function test_guest_and_staff_are_kept_out(): void
    {
        $this->get('/akun')->assertRedirect('/login');
        $this->actingAs(User::factory()->create(['role' => Role::Editor]))->get('/akun')->assertNotFound();
    }
}
