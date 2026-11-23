<?php

namespace Tests\Feature;

use App\Enums\ArticleStatus;
use App\Jobs\SendBreakingPush;
use App\Models\Article;
use App\Models\PushSubscription;
use App\Models\Region;
use GuzzleHttp\Psr7\Request as PsrRequest;
use GuzzleHttp\Psr7\Response as PsrResponse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;
use Minishlink\WebPush\MessageSentReport;
use Minishlink\WebPush\WebPush;
use Mockery;
use Tests\TestCase;

class PushTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.webpush.public_key' => 'public', 'services.webpush.private_key' => 'private']);
        Region::insert([
            ['code' => '32', 'parent_code' => null, 'level' => 1, 'type' => null, 'name' => 'Jawa Barat', 'slug' => 'jawa-barat'],
            ['code' => '33', 'parent_code' => null, 'level' => 1, 'type' => null, 'name' => 'Jawa Tengah', 'slug' => 'jawa-tengah'],
            ['code' => '32.73', 'parent_code' => '32', 'level' => 2, 'type' => 'kota', 'name' => 'Kota Bandung', 'slug' => 'kota-bandung'],
        ]);
    }

    private function subscribe(string $endpoint, ?string $province = null): TestResponse
    {
        return $this->postJson('/api/push', [
            'endpoint' => $endpoint,
            'keys' => ['p256dh' => 'key', 'auth' => 'auth'],
            'province' => $province,
        ]);
    }

    public function test_browser_follows_and_unfollows_provinces(): void
    {
        $endpoint = 'https://push.example.com/abc';

        $this->subscribe($endpoint, '32')->assertOk()->assertJson(['subscribed' => true, 'provinces' => ['32']]);
        $this->subscribe($endpoint, '33')->assertJson(['provinces' => ['32', '33']]);
        // Same endpoint: one row, no duplicate province.
        $this->subscribe($endpoint, '32')->assertJson(['provinces' => ['32', '33']]);
        $this->assertSame(1, PushSubscription::count());

        // Only provinces can be followed.
        $this->subscribe($endpoint, '32.73')->assertUnprocessable();

        $this->postJson('/api/push/status', ['endpoint' => $endpoint])->assertJson(['provinces' => ['32', '33']]);
        $this->deleteJson('/api/push', ['endpoint' => $endpoint, 'province' => '32'])->assertJson(['provinces' => ['33']]);
        $this->deleteJson('/api/push', ['endpoint' => $endpoint])->assertJson(['subscribed' => false]);
        $this->assertSame(0, PushSubscription::count());
    }

    public function test_publishing_breaking_news_queues_one_push(): void
    {
        Queue::fake();

        $article = Article::factory()->create(['is_breaking' => true, 'region_code' => '32.73']);
        Queue::assertNothingPushed(); // still a draft

        $article->update(['status' => ArticleStatus::Published, 'published_at' => now()]);
        Queue::assertPushed(SendBreakingPush::class, fn ($job) => $job->articleId === $article->id);

        // Ordinary news never notifies.
        Article::factory()->published()->create(['is_breaking' => false]);
        Queue::assertPushed(SendBreakingPush::class, 1);

        // A breaking story published long ago is not news any more.
        Article::factory()->published()->create(['is_breaking' => true, 'published_at' => now()->subDay()]);
        Queue::assertPushed(SendBreakingPush::class, 1);

        // Without VAPID keys push is off.
        config(['services.webpush.private_key' => null]);
        Article::factory()->published()->create(['is_breaking' => true, 'published_at' => now()]);
        Queue::assertPushed(SendBreakingPush::class, 1);
        $this->get('/')->assertInertia(fn (Assert $page) => $page->where('vapidPublicKey', null));
    }

    public function test_job_notifies_the_province_audience_once_and_drops_expired_browsers(): void
    {
        Queue::fake(); // keep the model hook from running the job on its own
        $bandungFan = PushSubscription::create(['endpoint' => 'https://push.example.com/jabar', 'endpoint_hash' => PushSubscription::hash('https://push.example.com/jabar'), 'public_key' => 'k', 'auth_token' => 'a', 'provinces' => ['32']]);
        $gone = PushSubscription::create(['endpoint' => 'https://push.example.com/gone', 'endpoint_hash' => PushSubscription::hash('https://push.example.com/gone'), 'public_key' => 'k', 'auth_token' => 'a', 'provinces' => ['32']]);
        PushSubscription::create(['endpoint' => 'https://push.example.com/jateng', 'endpoint_hash' => PushSubscription::hash('https://push.example.com/jateng'), 'public_key' => 'k', 'auth_token' => 'a', 'provinces' => ['33']]);
        $article = Article::factory()->published()->create(['is_breaking' => true, 'region_code' => '32.73', 'published_at' => now()->subMinute()]);

        $queued = [];
        $webPush = Mockery::mock(WebPush::class);
        $webPush->shouldReceive('queueNotification')->andReturnUsing(function ($subscription) use (&$queued) {
            $queued[] = $subscription->getEndpoint();
        });
        $webPush->shouldReceive('flush')->once()->andReturnUsing(fn () => (function () {
            yield new MessageSentReport(new PsrRequest('POST', 'https://push.example.com/jabar'), new PsrResponse(201));
            yield new MessageSentReport(new PsrRequest('POST', 'https://push.example.com/gone'), new PsrResponse(410), false);
        })());
        $this->app->instance(WebPush::class, $webPush);

        $job = new SendBreakingPush($article->id);
        $this->app->call([$job, 'handle']);
        // A second run (e.g. the article saved again) sends nothing.
        $this->app->call([$job, 'handle']);

        $this->assertEqualsCanonicalizing(['https://push.example.com/jabar', 'https://push.example.com/gone'], $queued);
        $this->assertNotNull($article->fresh()->pushed_at);
        $this->assertNotNull($bandungFan->fresh()->last_sent_at);
        $this->assertNull($gone->fresh());
    }

    public function test_offline_page_and_manifest_are_served(): void
    {
        $this->get('/offline')->assertOk()->assertSee('Anda sedang offline');
        $this->assertFileExists(public_path('sw.js'));
        $manifest = json_decode((string) file_get_contents(public_path('site.webmanifest')), true);
        $this->assertSame('standalone', $manifest['display']);
    }
}
