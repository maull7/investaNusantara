<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Article;
use App\Models\Region;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class InsightsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $rows = [];
        foreach (['11' => 'Aceh', '32' => 'Jawa Barat', '35' => 'Jawa Timur', '51' => 'Bali'] as $code => $name) {
            $rows[] = ['code' => $code, 'parent_code' => null, 'level' => 1, 'type' => null, 'name' => $name, 'slug' => str($name)->slug()->value()];
        }
        $rows[] = ['code' => '32.71', 'parent_code' => '32', 'level' => 2, 'type' => 'kota', 'name' => 'Kota Bogor', 'slug' => 'kota-bogor'];
        Region::insert($rows);
    }

    private function article(string $region, string $tag, int $daysAgo, ?string $sentiment = null): Article
    {
        $article = Article::factory()->published()->create([
            'region_code' => $region,
            'sentiment' => $sentiment,
            'published_at' => now()->subDays($daysAgo),
        ]);
        $article->tags()->sync(Tag::idsFor([$tag]));

        return $article;
    }

    public function test_reading_records_a_daily_view(): void
    {
        $article = $this->article('32.71', 'Banjir', 1);

        $this->get("/berita/{$article->slug}");
        $this->get("/berita/{$article->slug}");

        $this->assertSame(1, $article->refresh()->views);
        $this->assertSame(1, (int) DB::table('article_daily_views')->where('article_id', $article->id)->value('views'));

        $this->withHeader('User-Agent', 'another-reader')->get("/berita/{$article->slug}");
        $this->assertSame(2, $article->refresh()->views);
        $this->assertSame(2, (int) DB::table('article_daily_views')->where('article_id', $article->id)->value('views'));
    }

    public function test_dashboard_finds_rising_keywords_national_issues_and_sentiment(): void
    {
        // "Banjir": 1 article in the previous 7 days, 3 now, spread over 4 provinces => rising and national.
        $this->article('32.71', 'Banjir', 10);
        foreach (['32.71', '11', '35', '51'] as $i => $region) {
            $this->article($region, 'Banjir', $i + 1, 'negatif');
        }
        // "Festival": steady, one province only.
        $this->article('51', 'Festival', 9);
        $read = $this->article('51', 'Festival', 2, 'positif');
        DB::table('article_daily_views')->insert(['article_id' => $read->id, 'date' => today()->toDateString(), 'views' => 50]);

        $admin = User::factory()->create(['role' => Role::SuperAdmin]);
        $this->actingAs($admin)->get('/admin/insights?periode=7')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('admin/insights/index')
            ->where('kpi.published', 5)
            ->where('kpi.views', 50)
            ->where('kpi.sentiment.negatif', 4)
            ->where('kpi.sentiment.positif', 1)
            ->has('daily', 7)
            ->where('topics.0.name', 'Festival')
            ->where('rising.0.name', 'Banjir')
            ->where('rising.0.now', 4)
            ->where('rising.0.before', 1)
            ->where('rising.0.growth', 300)
            ->has('issues', 1)
            ->where('issues.0.name', 'Banjir')
            ->where('issues.0.provinces', 4)
            ->where('sentimentByRegion.0.negatif', 1));

        // Inside one province, rows are its regencies/cities.
        $this->actingAs($admin)->get('/admin/insights?periode=7&provinsi=32')->assertInertia(fn (Assert $page) => $page
            ->where('kpi.published', 1)
            ->where('regions.0.name', 'Kota Bogor')
            ->has('issues', 0));
    }

    public function test_only_granted_users_open_the_dashboard(): void
    {
        $editor = User::factory()->create(['role' => Role::Editor]);
        $subAdmin = User::factory()->create(['role' => Role::SubAdmin, 'permissions' => ['insights']]);

        $this->actingAs($editor)->get('/admin/insights')->assertForbidden();
        $this->actingAs($subAdmin)->get('/admin/insights')->assertOk();
    }

    public function test_readers_see_sentiment_on_articles_and_the_public_page(): void
    {
        $bad = $this->article('32.71', 'Banjir', 1, 'negatif');
        $this->article('51', 'Festival', 2, 'positif');
        $this->article('35', 'Rapat', 3); // no tone yet: left out

        $this->get("/berita/{$bad->slug}")->assertInertia(fn (Assert $page) => $page->where('article.sentiment', 'negatif'));
        $this->get('/sentimen')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('totals.negatif', 1)
            ->where('totals.positif', 1)
            ->has('regions', 2)
            ->has('articles.data', 2));
        $this->get('/sentimen?nada=positif')->assertInertia(fn (Assert $page) => $page
            ->has('articles.data', 1)
            ->where('articles.data.0.sentiment', 'positif'));
        $this->get('/sentimen?provinsi=32')->assertInertia(fn (Assert $page) => $page
            ->where('regions.0.name', 'Kota Bogor'));
        $this->get('/')->assertInertia(fn (Assert $page) => $page->where('sentiment.negatif', 1));
    }

    public function test_calendar_range_filters_everything_and_compares_with_the_period_before(): void
    {
        $this->article('51', 'Festival', 12);
        $inRange = $this->article('51', 'Festival', 5, 'positif');
        DB::table('article_daily_views')->insert([
            ['article_id' => $inRange->id, 'date' => today()->subDays(5)->toDateString(), 'views' => 30],
            ['article_id' => $inRange->id, 'date' => today()->subDays(1)->toDateString(), 'views' => 99], // outside the range
        ]);
        $admin = User::factory()->create(['role' => Role::SuperAdmin]);
        $from = today()->subDays(6)->toDateString();
        $to = today()->subDays(4)->toDateString();

        $this->actingAs($admin)->get("/admin/insights?dari={$from}&sampai={$to}")->assertInertia(fn (Assert $page) => $page
            ->where('filters.periode', null)
            ->where('filters.dari', $from)
            ->where('filters.sampai', $to)
            ->where('days', 3)
            ->where('previous.dari', today()->subDays(9)->toDateString())
            ->has('daily', 3)
            ->has('dailyPrevious', 3)
            ->where('kpi.published', 1)
            ->where('kpi.views', 30));

        // Reversed and future dates are corrected, not rejected.
        $future = today()->addDays(10)->toDateString();
        $this->actingAs($admin)->get("/admin/insights?dari={$future}&sampai={$from}")->assertInertia(fn (Assert $page) => $page
            ->where('filters.dari', $from)
            ->where('filters.sampai', today()->toDateString()));
    }

    public function test_client_sees_only_the_dashboard_for_subscribed_provinces(): void
    {
        $this->article('32.71', 'Banjir', 1, 'negatif');
        $this->article('51', 'Festival', 1, 'positif');
        $client = User::factory()->create([
            'role' => Role::Client, 'organization' => 'Pemkot Bogor',
            'client_regions' => ['32'], 'subscription_ends_at' => today()->addMonth(),
        ]);

        // The rest of the newsroom is closed: everything leads to the dashboard.
        $this->actingAs($client)->get('/admin/articles')->assertRedirect('/admin/insights');
        $this->actingAs($client)->get('/admin/articles/create')->assertRedirect('/admin/insights');

        // Asking for another province (or all of Indonesia) falls back to the subscribed one.
        $this->actingAs($client)->get('/admin/insights?periode=7&provinsi=51')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('filters.provinsi', '32')
            ->where('nationwide', false)
            ->has('provinces', 1)
            ->where('client.organization', 'Pemkot Bogor')
            ->where('kpi.published', 1));
        $this->actingAs($client)->get('/admin/insights?periode=7')->assertInertia(fn (Assert $page) => $page->where('filters.provinsi', '32'));

        // Detail panel: inside the subscription only.
        $this->actingAs($client)->get('/admin/insights?periode=7&wilayah=32.71')->assertInertia(fn (Assert $page) => $page
            ->missing('detail')) // optional prop: only sent on a partial reload
            ->assertOk();
        $partial = fn (string $query) => $this->actingAs($client)->withHeaders([
            'X-Inertia' => 'true', 'X-Inertia-Partial-Component' => 'admin/insights/index', 'X-Inertia-Partial-Data' => 'detail',
            'X-Inertia-Version' => app(HandleInertiaRequests::class)->version(request()),
        ])->get('/admin/insights?periode=7&'.$query)->json('props.detail');
        $this->assertSame('Kota Bogor', $partial('wilayah=32.71')['title']);
        $this->assertCount(1, $partial('wilayah=32.71')['articles']);
        $this->assertNull($partial('wilayah=51'));
        $this->flushHeaders();

        $csv = $this->actingAs($client)->get('/admin/insights/export?periode=7')->assertOk()->streamedContent();
        $this->assertStringContainsString('Jawa Barat', $csv);
        $this->assertStringContainsString('"Artikel terbit";1;0', $csv);

        $client->update(['subscription_ends_at' => today()->subDay()]);
        $this->actingAs($client)->get('/admin/insights')->assertInertia(fn (Assert $page) => $page->component('admin/insights/expired'));
        $this->actingAs($client)->get('/admin/insights/export')->assertForbidden();
    }

    public function test_only_super_admin_can_create_client_accounts_with_provinces(): void
    {
        $admin = User::factory()->create(['role' => Role::SuperAdmin]);
        $this->actingAs($admin)->post('/admin/users', [
            'name' => 'Klien', 'email' => 'klien@example.test', 'password' => 'password-123456',
            'role' => 'client', 'organization' => 'PT Data', 'client_regions' => ['32', '51'],
            'subscription_ends_at' => today()->addYear()->toDateString(),
        ])->assertRedirect();

        $client = User::where('email', 'klien@example.test')->firstOrFail();
        $this->assertSame(['32', '51'], $client->client_regions);
        $this->assertSame('PT Data', $client->organization);

        $this->post('/logout');
        $this->post('/login', ['email' => 'klien@example.test', 'password' => 'password-123456'])->assertRedirect('/admin/insights');
    }
}
