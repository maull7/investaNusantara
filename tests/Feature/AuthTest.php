<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
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

    public function test_registration_defaults_to_a_pelanggan_kept_out_of_the_newsroom(): void
    {
        $this->post('/register', [
            'name' => 'Pembaca',
            'email' => 'pembaca@example.com',
            'password' => 'rahasia-panjang',
            'password_confirmation' => 'rahasia-panjang',
            'role' => Role::SuperAdmin->value, // must be ignored
        ])->assertRedirect(route('home'));

        $user = User::firstWhere('email', 'pembaca@example.com');
        $this->assertSame(Role::Customer, $user->role);
        $this->actingAs($user)->get('/admin/articles')->assertRedirect(route('home'));
    }

    public function test_registration_creates_a_contributor_and_logs_in(): void
    {
        $this->post('/register', [
            'name' => 'Warga Bandung',
            'email' => 'warga@example.com',
            'password' => 'rahasia-panjang',
            'password_confirmation' => 'rahasia-panjang',
            'type' => 'contributor',
        ])->assertRedirect(route('admin.articles.index'));

        $user = User::firstWhere('email', 'warga@example.com');
        $this->assertSame(Role::Contributor, $user->role);
        $this->assertAuthenticatedAs($user);
    }

    public function test_google_callback_creates_a_pelanggan_and_logs_in(): void
    {
        config(['services.google.client_id' => 'id', 'services.google.client_secret' => 'secret']);
        Http::fake([
            'oauth2.googleapis.com/*' => Http::response(['access_token' => 't']),
            'openidconnect.googleapis.com/*' => Http::response(['email' => 'Baru@Gmail.com', 'email_verified' => true, 'name' => 'Baru']),
        ]);

        $this->get('/auth/google')->assertRedirectContains('accounts.google.com');
        $state = session('google_state');

        $this->get('/auth/google/callback?code=abc&state='.$state)->assertRedirect(route('home'));

        $user = User::firstWhere('email', 'baru@gmail.com');
        $this->assertSame(Role::Customer, $user->role);
        $this->assertAuthenticatedAs($user);
    }

    public function test_google_callback_rejects_a_wrong_state(): void
    {
        $this->withSession(['google_state' => 'benar'])
            ->get('/auth/google/callback?code=abc&state=salah')
            ->assertRedirect(route('login'));

        $this->assertGuest();
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
