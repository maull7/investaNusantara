<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\User;
use App\Support\InfoPages;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BookmarkTest extends TestCase
{
    use RefreshDatabase;

    public function test_reader_saves_and_removes_an_article(): void
    {
        $user = User::factory()->create();
        $older = Article::factory()->published()->create();
        $newer = Article::factory()->published()->create();

        $this->actingAs($user)->post("/berita/{$older->slug}/simpan")->assertRedirect();
        $this->travel(1)->minute();
        $this->actingAs($user)->post("/berita/{$newer->slug}/simpan")->assertRedirect();
        // Saving twice keeps one row.
        $this->actingAs($user)->post("/berita/{$newer->slug}/simpan");
        $this->assertSame(2, $user->bookmarks()->count());

        $this->actingAs($user)->get("/berita/{$newer->slug}")
            ->assertInertia(fn (Assert $page) => $page->where('bookmarked', true));

        // Newest save first.
        $this->actingAs($user)->get('/tersimpan')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('bookmarks')
            ->has('articles.data', 2)
            ->where('articles.data.0.id', $newer->id));

        $this->actingAs($user)->delete("/berita/{$newer->slug}/simpan")->assertRedirect();
        $this->assertSame([$older->id], $user->bookmarks()->pluck('articles.id')->all());
    }

    public function test_guests_and_unpublished_articles_are_refused(): void
    {
        $draft = Article::factory()->create();
        $published = Article::factory()->published()->create();

        $this->get('/tersimpan')->assertRedirect('/login');
        $this->post("/berita/{$published->slug}/simpan")->assertRedirect('/login');
        $this->get("/berita/{$published->slug}")->assertInertia(fn (Assert $page) => $page->where('bookmarked', false));

        $this->actingAs(User::factory()->create())->post("/berita/{$draft->slug}/simpan")->assertNotFound();
    }

    public function test_info_pages_render_and_are_in_the_sitemap(): void
    {
        foreach (InfoPages::SLUGS as $slug) {
            $this->get("/{$slug}")->assertOk()->assertInertia(fn (Assert $page) => $page
                ->component('info')
                ->where('slug', $slug)
                ->has('sections'));
        }

        $this->get('/halaman-tidak-ada')->assertNotFound();
        $this->get('/sitemap.xml')->assertSee(route('info', 'kebijakan-privasi'));
    }
}
