<?php

namespace App\Jobs;

use App\Enums\ArticleStatus;
use App\Models\Article;
use App\Models\PushSubscription;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Str;
use Minishlink\WebPush\WebPush;

/** Notifies followers of the article's province (everyone, for national news) about a breaking story. */
class SendBreakingPush implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public function __construct(public int $articleId) {}

    /** Breaking, published and not pushed yet. Push is disabled until VAPID keys are set. */
    public static function shouldSend(Article $article): bool
    {
        return filled(config('services.webpush.private_key'))
            && $article->is_breaking
            && $article->status === ArticleStatus::Published
            && $article->published_at?->isPast()
            // A story that went out hours ago is no longer "breaking".
            && $article->published_at->gt(now()->subHours(6))
            && $article->pushed_at === null;
    }

    public function handle(WebPush $webPush): void
    {
        $article = Article::with('region:code,name')->find($this->articleId);
        // Claim the article first: saving it twice must never notify twice.
        if (! $article || ! self::shouldSend($article)
            || Article::whereKey($article->id)->whereNull('pushed_at')->toBase()->update(['pushed_at' => now()]) === 0) {
            return;
        }

        $payload = json_encode([
            'title' => 'Breaking'.($article->region ? ' · '.$article->region->name : ' · Nasional'),
            'body' => Str::limit($article->title, 140),
            'url' => route('article', $article->slug),
            'image' => $article->cover_url,
            'tag' => 'article-'.$article->id,
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: null;

        PushSubscription::query()->audienceFor($article)->chunkById(500, function ($subscriptions) use ($webPush, $payload) {
            foreach ($subscriptions as $subscription) {
                $webPush->queueNotification($subscription->toWebPush(), $payload, ['TTL' => 6 * 3600, 'urgency' => 'high']);
            }

            $sent = [];
            foreach ($webPush->flush() as $report) {
                $hash = PushSubscription::hash($report->getEndpoint());
                if ($report->isSubscriptionExpired()) {
                    // The browser unsubscribed or the user revoked permission.
                    PushSubscription::where('endpoint_hash', $hash)->delete();
                } elseif ($report->isSuccess()) {
                    $sent[] = $hash;
                }
            }
            PushSubscription::whereIn('endpoint_hash', $sent)->update(['last_sent_at' => now()]);
        });
    }
}
