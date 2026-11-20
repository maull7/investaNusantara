<?php

namespace App\Services;

use App\Enums\NewsTaskStatus;
use App\Enums\Role;
use App\Jobs\DiscoverNews;
use App\Jobs\DraftRegion;
use App\Jobs\SummarizeNews;
use App\Models\Article;
use App\Models\NewsFetch;
use App\Models\NewsItem;
use App\Models\NewsSource;
use App\Models\RegionDraft;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/** Entry points for the AI news flow: queueing, retrying, recovering, and shared checks. */
class NewsPipeline
{
    /** Gap between article jobs from one fetch, so Hermes isn't hit by a burst. */
    public const ITEM_GAP_SECONDS = 20;

    /** Returns null when the source is inactive or already has a fetch in progress. */
    public function queue(NewsSource $source, string $trigger = 'manual', ?User $user = null): ?NewsFetch
    {
        $fetch = DB::transaction(function () use ($source, $trigger, $user) {
            $source = NewsSource::lockForUpdate()->find($source->id);
            if (! $source?->active || $source->hasActiveFetch()) {
                return null;
            }
            $source->update(['last_fetched_at' => now()]);

            return $source->fetches()->create([
                'trigger' => $trigger,
                'requested_by' => $user?->id,
                'status' => NewsTaskStatus::Queued,
            ]);
        });

        if ($fetch) {
            DiscoverNews::dispatch($fetch->id);
        }

        return $fetch;
    }

    public function retryFetch(NewsFetch $fetch): void
    {
        $fetch->update(['status' => NewsTaskStatus::Queued, 'attempts' => 0, 'error' => null, 'finished_at' => null]);
        DiscoverNews::dispatch($fetch->id);
    }

    public function retryItem(NewsItem $item): void
    {
        $item->update(['status' => NewsTaskStatus::Queued, 'attempts' => 0, 'error' => null]);
        SummarizeNews::dispatch($item->id);
    }

    /**
     * Re-dispatch tasks whose job vanished (Redis flushed, worker killed mid-release).
     * Live tasks touch their row on every poll, so silence means the chain is gone.
     * Paused tasks may legitimately wait up to an hour for the provider.
     */
    public function recoverStale(): int
    {
        $stale = fn ($query) => $query
            ->where(fn ($q) => $q->whereIn('status', [NewsTaskStatus::Queued->value, NewsTaskStatus::Running->value])->where('updated_at', '<', now()->subMinutes(10)))
            ->orWhere(fn ($q) => $q->where('status', NewsTaskStatus::Paused->value)->where('updated_at', '<', now()->subMinutes(70)));

        $count = 0;
        NewsFetch::where($stale)->each(function (NewsFetch $fetch) use (&$count) {
            $fetch->touch();
            DiscoverNews::dispatch($fetch->id);
            $count++;
        });
        NewsItem::where($stale)->each(function (NewsItem $item) use (&$count) {
            $item->touch();
            SummarizeNews::dispatch($item->id);
            $count++;
        });
        RegionDraft::where($stale)->each(function (RegionDraft $draft) use (&$count) {
            $draft->touch();
            DraftRegion::dispatch($draft->id);
            $count++;
        });

        return $count;
    }

    /** Account shown as the author of AI articles; it has no usable password. */
    public function author(): User
    {
        return User::firstOrCreate(
            ['email' => config('hermes.author_email')],
            ['name' => 'Redaksi AI', 'role' => Role::Journalist, 'password' => Str::random(64)],
        );
    }

    /**
     * Share of the synopsis' 6-word phrases that also appear in the source text.
     * A real paraphrase scores near 0; copied paragraphs score high.
     */
    public static function overlap(string $synopsis, string $source): float
    {
        $phrases = function (string $text): Collection {
            $words = preg_split('/\s+/u', trim(preg_replace('/[^\p{L}\p{N}\s]+/u', ' ', mb_strtolower($text)) ?? ''), -1, PREG_SPLIT_NO_EMPTY) ?: [];

            return collect(range(0, max(-1, count($words) - 6)))->map(fn ($i) => implode(' ', array_slice($words, $i, 6)))->unique();
        };
        $mine = $phrases($synopsis);
        if ($mine->isEmpty() || trim($source) === '') {
            return 0.0;
        }

        return round($mine->intersect($phrases($source))->count() / $mine->count(), 3);
    }

    /** Opening of the source article for the "Ringkasan" button. */
    public static function firstWords(string $text, int $words = 50): ?string
    {
        $text = trim((string) preg_replace('/\s+/u', ' ', strip_tags($text)));

        return $text === '' ? null : Str::words($text, $words, '…');
    }

    /**
     * First paragraph, at most $words words, cut back to its last full sentence.
     * shortcut: a "Kab." style abbreviation can end the cut early; fine for a 50-word lead.
     */
    public static function lead(string $text, int $words = 50): string
    {
        $paragraph = trim(strtok(trim($text), "\n") ?: '');
        $parts = preg_split('/\s+/u', $paragraph, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        if (count($parts) <= $words) {
            return $paragraph;
        }

        $cut = implode(' ', array_slice($parts, 0, $words));
        // A cut that would leave only a few words is worse than an ellipsis.
        if (preg_match('/^.*[.!?](?=\s|$)/us', $cut, $m) && self::wordCount($m[0]) >= 15) {
            return $m[0];
        }

        return $cut.'…';
    }

    public static function wordCount(string $text): int
    {
        return count(preg_split('/\s+/u', trim($text), -1, PREG_SPLIT_NO_EMPTY) ?: []);
    }

    /** Same story already taken in the last two days (from any source), by near-identical title. */
    public function similarTitleExists(string $title, ?int $ignoreItemId = null): bool
    {
        $needle = self::normalizeTitle($title);
        if ($needle === '') {
            return false;
        }

        $recent = NewsItem::where('created_at', '>', now()->subDays(2))
            ->whereNotIn('status', [NewsTaskStatus::Failed->value, NewsTaskStatus::Duplicate->value])
            ->when($ignoreItemId, fn ($q) => $q->whereKeyNot($ignoreItemId))
            ->pluck('title')
            ->merge(Article::where('created_at', '>', now()->subDays(2))->pluck('title'));

        return $recent->contains(function (string $other) use ($needle) {
            similar_text($needle, self::normalizeTitle($other), $percent);

            return $percent >= 85;
        });
    }

    private static function normalizeTitle(string $title): string
    {
        return trim(preg_replace('/[^\p{L}\p{N}]+/u', ' ', mb_strtolower($title)) ?? '');
    }

    public static function validUrl(mixed $url): ?string
    {
        return is_string($url)
            && filter_var($url = trim($url), FILTER_VALIDATE_URL)
            && in_array(strtolower((string) parse_url($url, PHP_URL_SCHEME)), ['http', 'https'], true)
            ? $url : null;
    }
}
