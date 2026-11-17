<?php

namespace Tests\Feature;

use App\Enums\ArticleStatus;
use App\Enums\NewsTaskStatus;
use App\Enums\Role;
use App\Jobs\DiscoverNews;
use App\Jobs\SummarizeNews;
use App\Models\AiRun;
use App\Models\Article;
use App\Models\Category;
use App\Models\NewsFetch;
use App\Models\NewsItem;
use App\Models\NewsSource;
use App\Models\Region;
use App\Models\User;
use App\Services\HermesClient;
use App\Services\NewsPipeline;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AiNewsTest extends TestCase
{
    use RefreshDatabase;

    private NewsSource $source;

    protected function setUp(): void
    {
        parent::setUp();
        config(['hermes.base_url' => 'http://hermes.test/v1', 'hermes.token' => 'secret', 'hermes.feed_discovery' => false]);
        Region::insert([
            ['code' => '15', 'parent_code' => null, 'level' => 1, 'type' => null, 'name' => 'Jambi', 'slug' => 'jambi'],
            ['code' => '15.71', 'parent_code' => '15', 'level' => 2, 'type' => 'kota', 'name' => 'Kota Jambi', 'slug' => 'kota-jambi'],
        ]);
        Category::factory()->create(['name' => 'Nasional', 'sort' => 0]);
        Category::factory()->create(['name' => 'Ekonomi', 'sort' => 1]);
        $this->source = NewsSource::create(['name' => 'Jambi Berita', 'url' => 'https://www.jamberita.com', 'region_code' => '15', 'max_articles' => 5]);
    }

    public function test_only_super_admin_can_open_ai_pages(): void
    {
        $this->actingAs(User::factory()->create(['role' => Role::Editor]))->get('/admin/ai')->assertForbidden();
        $this->actingAs(User::factory()->create(['role' => Role::SuperAdmin]))->get('/admin/ai')
            ->assertInertia(fn (Assert $page) => $page->component('admin/ai/index')->has('hermes')->has('fetches', 0));
        $this->get('/admin/ai/sources')
            ->assertInertia(fn (Assert $page) => $page->component('admin/ai/sources')->has('sources', 1)->has('provinces', 1));
    }

    public function test_ai_pages_count_items_per_status(): void
    {
        $this->item(NewsTaskStatus::Published);
        $this->actingAs(User::factory()->create(['role' => Role::SuperAdmin]));

        $this->get('/admin/ai/sources')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where("counts.{$this->source->id}.published", 1));
        $this->get('/admin/ai')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('stats.published', 1));
    }

    public function test_fetch_now_queues_one_discovery_per_source(): void
    {
        Queue::fake();
        $admin = User::factory()->create(['role' => Role::SuperAdmin]);

        $this->actingAs($admin)->post("/admin/ai/sources/{$this->source->id}/fetch")->assertRedirect('/admin/ai');
        $this->actingAs($admin)->post("/admin/ai/sources/{$this->source->id}/fetch")->assertSessionHas('error');

        $this->assertSame(1, NewsFetch::count());
        Queue::assertPushed(DiscoverNews::class, 1);
        Queue::assertPushedOn('hermes', DiscoverNews::class);
    }

    public function test_discovery_polls_the_run_and_queues_only_new_on_domain_links(): void
    {
        Queue::fake();
        Http::fake([
            'hermes.test/v1/runs' => Http::response(['run_id' => 'run-1']),
            'hermes.test/v1/runs/run-1' => Http::sequence()
                ->push(['status' => 'running'])
                ->push(['status' => 'completed', 'output' => '```json '.json_encode(['articles' => [
                    ['url' => 'https://jamberita.com/read/2026/11/17/1/banjir-di-kota-jambi', 'title' => 'Banjir di Kota Jambi'],
                    ['url' => 'https://daerah.jamberita.com/read/2', 'title' => 'Harga karet naik di Muaro Jambi'],
                    ['url' => 'https://other-site.com/read/3', 'title' => 'Berita situs lain'],
                    ['url' => 'https://jamberita.com/read/known?utm_source=fb', 'title' => 'Sudah pernah diambil'],
                ]]).' ```', 'usage' => ['input_tokens' => 100, 'output_tokens' => 50]]),
        ]);
        $fetch = app(NewsPipeline::class)->queue($this->source);
        NewsItem::create(['news_fetch_id' => $fetch->id, 'news_source_id' => $this->source->id, 'url' => 'https://jamberita.com/read/known', 'url_hash' => NewsItem::hashUrl('https://jamberita.com/read/known'), 'title' => 'Lama', 'status' => NewsTaskStatus::Published]);

        $job = new DiscoverNews($fetch->id);
        $job->handle(app(HermesClient::class)); // starts the run
        $this->assertSame('run-1', AiRun::first()->hermes_run_id);
        $job->handle(app(HermesClient::class)); // still running
        $this->assertSame(NewsTaskStatus::Running, $fetch->fresh()->status);
        $job->handle(app(HermesClient::class)); // completed

        $this->assertSame(NewsTaskStatus::Completed, $fetch->fresh()->status, (string) $fetch->fresh()->error);
        $this->assertSame(2, $fetch->fresh()->found);
        $this->assertSame(150, AiRun::first()->total_tokens);
        $this->assertNotNull($this->source->fresh()->last_success_at);
        Queue::assertPushed(SummarizeNews::class, 2);
        Http::assertSentCount(3); // create, poll (running), poll (completed)
        Http::assertSent(fn ($request) => $request->hasHeader('Authorization', 'Bearer secret'));
    }

    public function test_relative_links_are_resolved_against_the_source(): void
    {
        $this->assertSame('https://beritabogor.co.id/berita/banjir', DiscoverNews::absolute('berita/banjir', 'https://beritabogor.co.id/'));
        $this->assertSame('https://beritabogor.co.id/berita/banjir', DiscoverNews::absolute('/berita/banjir', 'https://beritabogor.co.id/kanal/'));
        $this->assertSame('https://x.id/a', DiscoverNews::absolute('https://x.id/a', 'https://beritabogor.co.id/'));
    }

    public function test_blocked_site_fails_with_a_reason_and_empty_run_says_why(): void
    {
        Queue::fake();
        Http::fake(['hermes.test/v1/runs' => Http::sequence()
            ->push(['output' => ['status' => 'blocked', 'note' => 'Akses ditolak', 'articles' => []]])
            ->push(['output' => ['status' => 'empty', 'note' => 'halaman kosong', 'articles' => []]])]);

        $blocked = app(NewsPipeline::class)->queue($this->source);
        (new DiscoverNews($blocked->id))->handle(app(HermesClient::class));
        $this->assertSame(NewsTaskStatus::Failed, $blocked->fresh()->status);
        $this->assertStringContainsString('menolak akses', $blocked->fresh()->error);

        $empty = app(NewsPipeline::class)->queue($this->source);
        (new DiscoverNews($empty->id))->handle(app(HermesClient::class));
        $this->assertSame(NewsTaskStatus::Completed, $empty->fresh()->status);
        $this->assertStringContainsString('halaman kosong', $empty->fresh()->error);
        $this->assertNull($this->source->fresh()->last_success_at); // window doesn't move on an empty run
    }

    public function test_discovery_uses_the_announced_rss_feed_without_hermes(): void
    {
        Queue::fake();
        config(['hermes.feed_discovery' => true]);
        Http::fake([
            'www.jamberita.com/robots.txt' => Http::response("User-agent: *\nDisallow: /private/\n"),
            'www.jamberita.com/rss' => Http::response(<<<'XML'
                <?xml version="1.0"?>
                <rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
                <channel><title>Jambi</title>
                <item><title>Banjir di Kota Jambi</title><link>https://www.jamberita.com/read/banjir</link>
                  <pubDate>Tue, 17 Nov 2026 10:00:00 +0700</pubDate><enclosure url="https://cdn.jamberita.com/banjir.jpg" type="image/jpeg"/>
                  <description><![CDATA[<p>Hujan deras sejak pagi membuat sejumlah ruas jalan tergenang.</p>]]></description></item>
                <item><title>Harga karet naik</title><link>https://www.jamberita.com/read/karet</link>
                  <pubDate>Tue, 17 Nov 2026 09:00:00 +0700</pubDate></item>
                </channel></rss>
                XML, 200, ['Content-Type' => 'application/rss+xml']),
            'www.jamberita.com' => Http::response('<html><head><link rel="alternate" type="application/rss+xml" href="/rss"></head><body></body></html>'),
            '*' => Http::response('', 404),
        ]);

        $fetch = app(NewsPipeline::class)->queue($this->source);
        (new DiscoverNews($fetch->id))->handle(app(HermesClient::class));

        $fetch->refresh();
        $this->assertSame(NewsTaskStatus::Completed, $fetch->status);
        $this->assertSame('rss', $fetch->via);
        $this->assertSame(2, $fetch->found);
        $this->assertSame('https://www.jamberita.com/rss', $this->source->fresh()->feed_url);
        $banjir = NewsItem::where('title', 'Banjir di Kota Jambi')->first();
        $this->assertSame('https://cdn.jamberita.com/banjir.jpg', $banjir->image_url);
        $this->assertStringContainsString('Hujan deras', $banjir->feed_excerpt);
        $this->assertSame(0, AiRun::count());
        Http::assertNotSent(fn ($request) => str_contains($request->url(), 'hermes.test'));
        Queue::assertPushed(SummarizeNews::class, 2);
    }

    public function test_news_sitemap_from_robots_is_used_when_there_is_no_feed(): void
    {
        Queue::fake();
        config(['hermes.feed_discovery' => true]);
        Http::fake([
            'www.jamberita.com/robots.txt' => Http::response("User-agent: *\nAllow: /\nSitemap: https://www.jamberita.com/news-sitemap.xml\n"),
            'www.jamberita.com/news-sitemap.xml' => Http::response(<<<'XML'
                <?xml version="1.0" encoding="UTF-8"?>
                <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
                <url><loc>https://www.jamberita.com/read/pilkada</loc>
                  <news:news><news:publication_date>2026-11-17T08:00:00+07:00</news:publication_date><news:title>Debat Pilkada Jambi</news:title></news:news></url>
                </urlset>
                XML),
            '*' => Http::response('', 404),
        ]);

        $fetch = app(NewsPipeline::class)->queue($this->source);
        (new DiscoverNews($fetch->id))->handle(app(HermesClient::class));

        $this->assertSame('sitemap', $fetch->fresh()->via);
        $this->assertSame('Debat Pilkada Jambi', NewsItem::first()->title);
    }

    public function test_feed_disallowed_by_robots_is_skipped_and_hermes_browses_instead(): void
    {
        Queue::fake();
        config(['hermes.feed_discovery' => true]);
        Http::fake([
            'hermes.test/v1/runs' => Http::response(['output' => ['status' => 'ok', 'articles' => [['url' => 'https://www.jamberita.com/read/a', 'title' => 'Berita A']]]]),
            'www.jamberita.com/robots.txt' => Http::response("User-agent: *\nDisallow: /rss\n"),
            'www.jamberita.com/rss' => Http::response('<?xml version="1.0"?><rss><channel><item><title>X</title><link>https://www.jamberita.com/x</link></item></channel></rss>'),
            '*' => Http::response('', 404),
        ]);

        $fetch = app(NewsPipeline::class)->queue($this->source);
        (new DiscoverNews($fetch->id))->handle(app(HermesClient::class));

        $this->assertSame('hermes', $fetch->fresh()->via);
        Http::assertNotSent(fn ($request) => $request->url() === 'https://www.jamberita.com/rss');
        $this->assertSame(['Berita A'], NewsItem::pluck('title')->all());
    }

    public function test_summary_from_feed_text_is_held_for_review_and_keeps_feed_image(): void
    {
        $item = $this->item();
        $item->update(['feed_excerpt' => 'Ringkasan resmi dari RSS.', 'image_url' => 'https://cdn.jamberita.com/a.jpg']);
        $output = $this->hermesOutput();
        $output['read_from'] = 'rss';
        $output['image_url'] = null;
        Http::fake(['hermes.test/v1/runs' => Http::response(['output' => $output])]);

        (new SummarizeNews($item->id))->handle(app(HermesClient::class));

        $item->refresh();
        $this->assertSame(NewsTaskStatus::Review, $item->status);
        $this->assertSame('https://cdn.jamberita.com/a.jpg', $item->article->cover_path);
        $this->assertStringContainsString('Ringkasan resmi dari RSS.', AiRun::first()->input);
    }

    public function test_synopsis_is_published_with_source_attribution(): void
    {
        $item = $this->item();
        Http::fake(['hermes.test/v1/runs' => Http::response(['output' => json_encode($this->hermesOutput())])]);

        (new SummarizeNews($item->id))->handle(app(HermesClient::class));

        $item->refresh();
        $article = $item->article;
        $this->assertSame(NewsTaskStatus::Published, $item->status);
        $this->assertSame(ArticleStatus::Published, $article->status);
        $this->assertTrue($article->is_ai_generated);
        $this->assertSame('Jambi Berita', $article->source_name);
        $this->assertSame($item->url, $article->source_url);
        $this->assertSame('https://jamberita.com/foto.jpg', $article->cover_url);
        $this->assertSame('15.71', $article->region_code); // narrowed to the city Hermes named
        $this->assertSame('Ekonomi', $article->category->name);
        $this->assertSame('Redaksi AI', $article->author->name);
        $this->assertStringContainsString("\n\n", $article->body);

        $this->get("/berita/{$article->slug}")->assertInertia(fn (Assert $page) => $page
            ->where('article.source_url', $item->url)
            ->where('article.is_ai_generated', true));
    }

    public function test_missing_image_falls_back_to_the_pages_og_image(): void
    {
        $item = $this->item();
        $output = $this->hermesOutput();
        $output['image_url'] = null;
        Http::fake([
            'hermes.test/v1/runs' => Http::response(['output' => $output]),
            'www.jamberita.com/robots.txt' => Http::response('', 404),
            'jamberita.com/robots.txt' => Http::response('', 404),
            'jamberita.com/read/harga-karet' => Http::response('<html><head><meta property="og:image" content="/foto/karet.jpg"></head></html>'),
            '*' => Http::response('', 404),
        ]);

        (new SummarizeNews($item->id))->handle(app(HermesClient::class));

        $this->assertSame('https://jamberita.com/foto/karet.jpg', $item->fresh()->article->cover_path);
    }

    public function test_home_slider_uses_newest_photos_until_editors_pick_headlines(): void
    {
        $user = User::factory()->create();
        $withPhoto = Article::factory()->published()->create(['author_id' => $user->id, 'cover_path' => 'https://x.test/a.jpg']);
        Article::factory()->published()->create(['author_id' => $user->id, 'cover_path' => null]);

        $this->get('/')->assertInertia(fn (Assert $page) => $page
            ->has('headlines', 1)
            ->where('headlines.0.id', $withPhoto->id));
    }

    public function test_copied_synopsis_waits_for_review(): void
    {
        $item = $this->item();
        $output = $this->hermesOutput();
        $output['source_opening'] = $output['synopsis'];
        Http::fake(['hermes.test/v1/runs' => Http::response(['output' => $output])]);

        (new SummarizeNews($item->id))->handle(app(HermesClient::class));

        $item->refresh();
        $this->assertSame(NewsTaskStatus::Review, $item->status);
        $this->assertSame(ArticleStatus::Review, $item->article->status);
        $this->assertNull($item->article->published_at);
        $this->assertStringContainsString('kemiripan', $item->error);
    }

    public function test_provider_outage_pauses_queue_without_spending_attempts(): void
    {
        $item = $this->item();
        Http::fake(['hermes.test/*' => Http::response('Service Unavailable', 503)]);

        $job = new SummarizeNews($item->id);
        $job->handle(app(HermesClient::class));

        $item->refresh();
        $this->assertSame(NewsTaskStatus::Paused, $item->status);
        $this->assertSame(0, $item->attempts);
        $this->assertGreaterThan(0, app(HermesClient::class)->pausedFor());

        // While paused nothing is sent to Hermes.
        $job->handle(app(HermesClient::class));
        Http::assertSentCount(1);
    }

    public function test_retry_resumes_existing_hermes_run_instead_of_starting_a_new_one(): void
    {
        $item = $this->item(NewsTaskStatus::Running);
        $item->runs()->create(['operation' => 'summarize', 'status' => 'running', 'hermes_run_id' => 'run-9', 'input' => '...', 'started_at' => now()]);
        Http::fake(['hermes.test/v1/runs/run-9' => Http::response(['status' => 'completed', 'output' => $this->hermesOutput()])]);

        (new SummarizeNews($item->id))->handle(app(HermesClient::class));

        $this->assertSame(NewsTaskStatus::Published, $item->fresh()->status);
        Http::assertSentCount(1);
        $this->assertSame(1, Article::count());
    }

    public function test_bad_output_is_retried_then_marked_failed(): void
    {
        $item = $this->item();
        Http::fake(['hermes.test/v1/runs' => Http::response(['output' => 'maaf, saya tidak bisa'])]);

        foreach (range(1, 3) as $attempt) {
            (new SummarizeNews($item->id))->handle(app(HermesClient::class));
        }

        $item->refresh();
        $this->assertSame(NewsTaskStatus::Failed, $item->status);
        $this->assertSame(3, $item->attempts);
        $this->assertSame(0, Article::count());
    }

    public function test_overlap_scores_copies_high_and_paraphrases_low(): void
    {
        $source = 'Pemerintah Kota Jambi resmi menaikkan anggaran perbaikan jalan rusak di kawasan Telanaipura tahun depan.';

        $this->assertSame(1.0, NewsPipeline::overlap($source, $source));
        $this->assertSame(0.0, NewsPipeline::overlap('Tahun depan, Pemkot menambah dana untuk memperbaiki ruas jalan yang rusak di Telanaipura.', $source));
    }

    private function item(NewsTaskStatus $status = NewsTaskStatus::Queued): NewsItem
    {
        $fetch = $this->source->fetches()->create(['status' => NewsTaskStatus::Completed]);

        return NewsItem::create([
            'news_fetch_id' => $fetch->id,
            'news_source_id' => $this->source->id,
            'url' => 'https://jamberita.com/read/harga-karet',
            'url_hash' => NewsItem::hashUrl('https://jamberita.com/read/harga-karet'),
            'title' => 'Harga karet naik',
            'status' => $status,
        ]);
    }

    /** @return array<string, mixed> */
    private function hermesOutput(): array
    {
        $paragraph = fn (int $p) => implode(' ', array_map(fn ($w) => "kata{$p}x{$w}", range(1, 45)));

        return [
            'status' => 'ok',
            'title' => 'Petani Jambi menikmati kenaikan harga karet',
            'excerpt' => 'Harga karet di Jambi naik pekan ini.',
            'synopsis' => implode('\n\n', [$paragraph(1), $paragraph(2), $paragraph(3)]),
            'image_url' => 'https://jamberita.com/foto.jpg',
            'category' => 'ekonomi',
            'region' => 'Kota Jambi',
            'source_title' => 'Harga karet naik',
            'source_opening' => 'Harga karet di tingkat petani naik signifikan minggu ini menurut dinas perkebunan.',
        ];
    }
}
