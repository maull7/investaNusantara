<?php

namespace Tests\Feature;

use App\Enums\ArticleStatus;
use App\Enums\Role;
use App\Models\Article;
use App\Models\Region;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    private User $writer;

    protected function setUp(): void
    {
        parent::setUp();
        Region::insert([
            ['code' => '32', 'parent_code' => null, 'level' => 1, 'type' => null, 'name' => 'Jawa Barat', 'slug' => 'jawa-barat'],
            ['code' => '33', 'parent_code' => null, 'level' => 1, 'type' => null, 'name' => 'Jawa Tengah', 'slug' => 'jawa-tengah'],
            ['code' => '32.73', 'parent_code' => '32', 'level' => 2, 'type' => 'kota', 'name' => 'Kota Bandung', 'slug' => 'kota-bandung'],
        ]);

        $this->writer = User::factory()->create(['role' => Role::Contributor]);
        $other = User::factory()->create(['role' => Role::Journalist]);

        // Writer: 2 drafts in Bandung + 1 in review in Jawa Tengah. Other: 1 published in Jawa Barat with views.
        Article::factory(2)->create(['author_id' => $this->writer->id, 'region_code' => '32.73', 'views' => 5]);
        Article::factory()->create(['author_id' => $this->writer->id, 'region_code' => '33', 'status' => ArticleStatus::Review]);
        Article::factory()->published()->create(['author_id' => $other->id, 'region_code' => '32', 'views' => 100]);
    }

    public function test_super_admin_sees_stats_for_everything(): void
    {
        $this->actingAs(User::factory()->create(['role' => Role::SuperAdmin]))
            ->get('/admin/articles')
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/articles/index')
                ->where('stats', ['total' => 4, 'views' => 110, 'draft' => 2, 'review' => 1, 'published' => 1, 'rejected' => 0])
                ->has('articles.data', 4));
    }

    public function test_writer_stats_only_count_their_own_articles(): void
    {
        $this->actingAs($this->writer)
            ->get('/admin/articles')
            ->assertInertia(fn (Assert $page) => $page
                ->where('stats.total', 3)
                ->where('stats.views', 10)
                ->where('stats.published', 0));
    }

    public function test_region_editor_stats_only_count_their_region(): void
    {
        $editor = User::factory()->create(['role' => Role::Editor, 'region_code' => '32']);

        $this->actingAs($editor)
            ->get('/admin/articles')
            ->assertInertia(fn (Assert $page) => $page
                ->where('stats.total', 3)
                ->where('stats.draft', 2)
                ->where('stats.review', 0)
                ->where('stats.published', 1));
    }

    public function test_status_filter_narrows_the_list_but_not_the_stats(): void
    {
        $this->actingAs(User::factory()->create(['role' => Role::SuperAdmin]))
            ->get('/admin/articles?status=draft')
            ->assertInertia(fn (Assert $page) => $page
                ->has('articles.data', 2)
                ->where('stats.total', 4));
    }
}
