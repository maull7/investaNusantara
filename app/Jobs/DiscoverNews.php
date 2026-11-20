<?php

namespace App\Jobs;

use App\Enums\NewsTaskStatus;
use App\Models\Article;
use App\Models\ArticleReview;
use App\Models\NewsFetch;
use App\Models\NewsItem;
use App\Models\RegionDraft;
use App\Services\NewsFeedReader;
use App\Services\NewsPipeline;
use App\Services\NewsPrompts;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

/** Hermes opens the source site and lists the latest article links; each new link becomes a SummarizeNews job. */
class DiscoverNews extends HermesTask
{
    protected function subject(): ?NewsFetch
    {
        return NewsFetch::with('source')->find($this->subjectId);
    }

    protected function operation(): string
    {
        return 'discover';
    }

    protected function runTimeout(): int
    {
        return (int) config('hermes.discovery_timeout');
    }

    protected function prompt(NewsFetch|NewsItem|ArticleReview|RegionDraft $subject): ?string
    {
        /** @var NewsFetch $subject */
        if (! $subject->source->active) {
            $subject->update(['status' => NewsTaskStatus::Failed, 'error' => 'Sumber dinonaktifkan.', 'finished_at' => now()]);

            return null;
        }
        // A generous window: known links are dropped below anyway, and small sites post rarely.
        $since = $subject->source->last_success_at?->subHours(6) ?? now()->subDays(3);

        return NewsPrompts::discover($subject->source, $since);
    }

    /** Sites that publish a feed or news sitemap are listed for free, without Hermes. */
    protected function shortcut(NewsFetch|NewsItem|ArticleReview|RegionDraft $subject): ?array
    {
        /** @var NewsFetch $subject */
        if (! config('hermes.feed_discovery') || ! $subject->source->active) {
            return null; // inactive: prompt() records the reason
        }
        $found = rescue(fn () => app(NewsFeedReader::class)->discover($subject->source), null);
        if (! $found) {
            return null;
        }
        $subject->source->update(['feed_url' => $found['feed_url']]);

        return ['status' => 'ok', 'articles' => $found['articles'], 'via' => $found['via']];
    }

    /** @param  array<string, mixed>  $output */
    protected function complete(NewsFetch|NewsItem|ArticleReview|RegionDraft $subject, array $output): void
    {
        /** @var NewsFetch $subject */
        $articles = $output['articles'] ?? null;
        if (! is_array($articles)) {
            throw new RuntimeException('Output Hermes tidak berisi daftar "articles".');
        }

        $source = $subject->source;
        $note = Str::limit(trim((string) ($output['note'] ?? '')), 300);
        if (($output['status'] ?? null) === 'blocked') {
            // The site refuses automated visitors. Retrying won't help; tell the admin why.
            $message = 'Situs menolak akses Hermes'.($note !== '' ? ": {$note}" : '.').' RSS/sitemap resmi juga tidak ditemukan. Jika situs punya RSS, isi kolom "Alamat RSS" di sumber ini.';
            $subject->update(['status' => NewsTaskStatus::Failed, 'error' => $message, 'finished_at' => now()]);
            $source->update(['last_error' => $message]);

            return;
        }

        $pipeline = app(NewsPipeline::class);
        $created = collect();
        $known = $foreign = 0;
        $inspected = [];
        foreach (array_slice($articles, 0, $source->max_articles) as $article) {
            $url = NewsPipeline::validUrl(self::absolute((string) ($article['url'] ?? ''), $source->url));
            $title = Str::limit(trim(strip_tags((string) ($article['title'] ?? ''))), 250, '');
            $host = preg_replace('/^www\./', '', strtolower((string) parse_url((string) $url, PHP_URL_HOST)));
            // Only links on the source's own domain (or its subdomains).
            if (! $url || $title === '' || ! ($host === $source->host() || str_ends_with($host, '.'.$source->host()))) {
                $foreign++;
                $inspected[] = ['url' => $url, 'title' => $title, 'reason' => 'invalid'];

                continue;
            }

            $hash = NewsItem::hashUrl($url);
            if (NewsItem::where('url_hash', $hash)->exists() || Article::where('source_url', $url)->exists()) {
                $known++;
                $inspected[] = ['url' => $url, 'title' => $title, 'reason' => 'known'];

                continue; // already taken, stay quiet
            }

            $created->push(NewsItem::create([
                'news_fetch_id' => $subject->id,
                'news_source_id' => $source->id,
                'url' => $url,
                'url_hash' => $hash,
                'title' => $title,
                'feed_excerpt' => filled($article['excerpt'] ?? null) ? Str::limit((string) $article['excerpt'], 4000) : null,
                'image_url' => NewsPipeline::validUrl($article['image_url'] ?? null),
                'source_published_at' => rescue(fn () => filled($article['published_at'] ?? null) ? now()->parse($article['published_at']) : null, null, false),
                'status' => $pipeline->similarTitleExists($title) ? NewsTaskStatus::Duplicate : NewsTaskStatus::Queued,
            ]));
            $inspected[] = ['url' => $url, 'title' => $title, 'reason' => 'new'];
        }

        // Say why nothing came in, so an empty run is never silent.
        $empty = $created->isEmpty() ? match (true) {
            $articles === [] => 'Hermes tidak menemukan artikel'.($note !== '' ? ": {$note}" : '.'),
            default => 'Tidak ada berita baru: '.count($articles)." tautan diperiksa, {$known} sudah pernah diambil, {$foreign} bukan dari domain {$source->host()} atau tanpa judul. Lihat rincian tautan di bawah.",
        } : null;

        DB::transaction(function () use ($subject, $source, $created, $empty, $articles, $output, $inspected) {
            $subject->update([
                'status' => NewsTaskStatus::Completed,
                'via' => in_array($output['via'] ?? null, ['rss', 'sitemap'], true) ? $output['via'] : 'hermes',
                'found' => $created->count(),
                'error' => $empty,
                'inspected_links' => $inspected,
                'finished_at' => now(),
            ]);
            // Only a run that brought news moves the time window forward.
            $source->update([
                ...($created->isNotEmpty() ? ['last_success_at' => now()] : []),
                'last_error' => $articles === [] ? $empty : null,
            ]);
        });

        $created->where('status', NewsTaskStatus::Queued)->values()->each(
            fn (NewsItem $item, int $i) => SummarizeNews::dispatch($item->id)->delay(now()->addSeconds($i * NewsPipeline::ITEM_GAP_SECONDS)),
        );
    }

    /** Resolve "berita/judul" or "/berita/judul" against the source page, as a browser would. */
    public static function absolute(string $url, string $base): string
    {
        $url = trim($url);
        if ($url === '' || preg_match('#^[a-z][a-z0-9+.-]*://#i', $url)) {
            return $url;
        }
        $parts = parse_url($base) ?: [];
        $origin = ($parts['scheme'] ?? 'https').'://'.($parts['host'] ?? '');
        if (str_starts_with($url, '//')) {
            return ($parts['scheme'] ?? 'https').':'.$url;
        }
        if (str_starts_with($url, '/')) {
            return $origin.$url;
        }
        $dir = preg_replace('#/[^/]*$#', '/', $parts['path'] ?? '/') ?: '/';

        return $origin.$dir.$url;
    }

    protected function gaveUp(NewsFetch|NewsItem|ArticleReview|RegionDraft $subject, string $message): void
    {
        /** @var NewsFetch $subject */
        $subject->update(['finished_at' => now()]);
        $subject->source->update(['last_error' => $message]);
    }
}
