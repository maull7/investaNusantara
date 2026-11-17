<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_and_register_routes_open_the_matching_tab(): void
    {
        $this->get('/login')->assertInertia(fn (Assert $page) => $page->component('auth/login')->where('mode', 'login')
            ->has('breaking')->has('stats.cities')->has('stats.weekly'));
        $this->get('/register')->assertInertia(fn (Assert $page) => $page->component('auth/login')->where('mode', 'register'));
    }

    public function test_registration_creates_a_contributor_and_logs_in(): void
    {
        $this->post('/register', [
            'name' => 'Warga Bandung',
            'email' => 'warga@example.com',
            'password' => 'rahasia-panjang',
            'password_confirmation' => 'rahasia-panjang',
            'role' => Role::SuperAdmin->value, // must be ignored
        ])->assertRedirect(route('admin.articles.index'));

        $user = User::firstWhere('email', 'warga@example.com');
        $this->assertSame(Role::Contributor, $user->role);
        $this->assertAuthenticatedAs($user);
    }

    public function test_registration_rejects_a_taken_email(): void
    {
        User::factory()->create(['email' => 'warga@example.com']);

        $this->post('/register', [
            'name' => 'Warga',
            'email' => 'warga@example.com',
            'password' => 'rahasia-panjang',
            'password_confirmation' => 'rahasia-panjang',
        ])->assertSessionHasErrors('email');

        $this->assertGuest();
    }
}
