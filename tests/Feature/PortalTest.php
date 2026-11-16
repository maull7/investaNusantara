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

class PortalTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Region::insert([
            ['code' => '32', 'parent_code' => null, 'level' => 1, 'type' => null, 'name' => 'Jawa Barat', 'slug' => 'jawa-barat'],
            ['code' => '33', 'parent_code' => null, 'level' => 1, 'type' => null, 'name' => 'Jawa Tengah', 'slug' => 'jawa-tengah'],
            ['code' => '32.73', 'parent_code' => '32', 'level' => 2, 'type' => 'kota', 'name' => 'Kota Bandung', 'slug' => 'kota-bandung'],
            ['code' => '33.01', 'parent_code' => '33', 'level' => 2, 'type' => 'kabupaten', 'name' => 'Kabupaten Cilacap', 'slug' => 'kabupaten-cilacap'],
        ]);
    }

    public function test_province_page_includes_city_articles_only_published(): void
    {
        $bandung = Article::factory()->published()->create(['region_code' => '32.73']);
        $cilacap = Article::factory()->published()->create(['region_code' => '33.01']);
        $draft = Article::factory()->create(['region_code' => '32.73']);

        $this->get('/wilayah/jawa-barat')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('region/show')
            ->has('articles.data', 1)
            ->where('articles.data.0.id', $bandung->id));

        $this->get('/wilayah/jawa-barat/kota-bandung')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('region.code', '32.73'));

        // City must belong to the province in the URL.
        $this->get('/wilayah/jawa-barat/kabupaten-cilacap')->assertNotFound();
        $this->get('/berita/'.$draft->slug)->assertNotFound();
        $this->get('/berita/'.$cilacap->slug)->assertOk();
        $this->get('/')->assertOk();
        $this->get('/sitemap.xml')->assertOk()->assertSee('kota-bandung');
    }

    public function test_article_workflow_permissions(): void
    {
        $contributor = User::factory()->create(['role' => Role::Contributor]);
        $editorJabar = User::factory()->create(['role' => Role::Editor, 'region_code' => '32']);
        $own = Article::factory()->create(['author_id' => $contributor->id, 'region_code' => '32.73']);
        $jateng = Article::factory()->create(['region_code' => '33.01', 'status' => ArticleStatus::Review]);

        $this->actingAs($contributor)->post("/admin/articles/{$own->id}/publish")->assertForbidden();
        $this->actingAs($contributor)->post("/admin/articles/{$own->id}/submit")->assertRedirect();
        $this->assertSame(ArticleStatus::Review, $own->fresh()->status);
        // Under review, the author can no longer edit it.
        $this->actingAs($contributor)->get("/admin/articles/{$own->id}/edit")->assertForbidden();

        $this->actingAs($editorJabar)->post("/admin/articles/{$own->id}/publish")->assertRedirect();
        $this->assertSame(ArticleStatus::Published, $own->fresh()->status);
        $this->actingAs($editorJabar)->post("/admin/articles/{$jateng->id}/publish")->assertForbidden();

        $this->actingAs($editorJabar)->get('/admin/users')->assertForbidden();
    }
}
