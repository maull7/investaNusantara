<?php

namespace Tests\Feature;

use App\Enums\ArticleStatus;
use App\Enums\Role;
use App\Models\ActivityLog;
use App\Models\Article;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_and_failed_login_are_recorded(): void
    {
        $user = User::factory()->create(['email' => 'a@example.com']);

        $this->post('/login', ['email' => 'a@example.com', 'password' => 'salah']);
        $this->post('/login', ['email' => 'a@example.com', 'password' => 'password']);

        $this->assertDatabaseHas('activity_logs', ['event' => 'auth.failed', 'user_id' => $user->id]);
        $this->assertDatabaseHas('activity_logs', ['event' => 'auth.login', 'user_id' => $user->id]);
    }

    public function test_publishing_is_recorded_with_its_changes(): void
    {
        $editor = User::factory()->create(['role' => Role::SuperAdmin]);
        $article = Article::factory()->create(['status' => ArticleStatus::Review, 'title' => 'Banjir Bandung']);

        $this->actingAs($editor)->post("/admin/articles/{$article->id}/publish");

        $log = ActivityLog::where('event', 'article.published')->sole();
        $this->assertSame($editor->id, $log->user_id);
        $this->assertSame('menerbitkan artikel “Banjir Bandung”', $log->description);
        $this->assertSame(['from' => 'review', 'to' => 'published'], $log->properties['changes']['status']);
    }

    public function test_view_counts_and_passwords_do_not_leak_into_the_log(): void
    {
        $article = Article::factory()->published()->create();
        $article->increment('views');
        $this->assertDatabaseMissing('activity_logs', ['event' => 'article.updated']);

        $user = User::factory()->create();
        $user->update(['password' => 'baru-rahasia']);
        $log = ActivityLog::where('event', 'user.updated')->sole();
        $this->assertSame(['from' => null, 'to' => null], $log->properties['changes']['password']);
    }

    public function test_public_registration_credits_the_new_user(): void
    {
        $this->post('/register', [
            'name' => 'Warga',
            'email' => 'warga@example.com',
            'password' => 'rahasia-panjang',
            'password_confirmation' => 'rahasia-panjang',
        ]);

        $user = User::where('email', 'warga@example.com')->sole();
        $this->assertDatabaseHas('activity_logs', ['event' => 'user.registered', 'user_id' => $user->id]);
    }

    public function test_activity_page_filters_by_module(): void
    {
        $admin = User::factory()->create(['role' => Role::SuperAdmin]);
        ActivityLog::record('auth.login', 'masuk', user: $admin);
        ActivityLog::record('article.created', 'menambahkan artikel “A”', user: $admin);

        $this->actingAs($admin)->get('/admin/activity?module=article')
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/activity/index')
                ->has('logs.data', 1)
                ->where('logs.data.0.event', 'article.created'));
    }
}
