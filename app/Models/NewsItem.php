<?php

namespace App\Models;

use App\Enums\NewsTaskStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $news_fetch_id
 * @property int $news_source_id
 * @property string $url
 * @property string $url_hash
 * @property string $title
 * @property string|null $feed_excerpt
 * @property string|null $image_url
 * @property NewsTaskStatus $status
 * @property int $attempts
 * @property int|null $article_id
 * @property string|null $error
 * @property Carbon|null $source_published_at
 * @property Carbon $updated_at
 * @property-read NewsSource $source
 * @property-read NewsFetch $fetch
 */
class NewsItem extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'status' => NewsTaskStatus::class,
            'source_published_at' => 'datetime',
        ];
    }

    /** Same article regardless of scheme, "www.", trailing slash, fragment or tracking params. */
    public static function hashUrl(string $url): string
    {
        $parts = parse_url(trim($url)) ?: [];
        $host = preg_replace('/^www\./', '', strtolower($parts['host'] ?? ''));
        $path = rtrim($parts['path'] ?? '', '/');
        parse_str($parts['query'] ?? '', $query);
        $query = array_filter($query, fn ($key) => ! str_starts_with((string) $key, 'utm_') && ! in_array($key, ['fbclid', 'gclid'], true), ARRAY_FILTER_USE_KEY);
        ksort($query);

        return hash('sha256', $host.$path.($query ? '?'.http_build_query($query) : ''));
    }

    /** @return BelongsTo<NewsSource, $this> */
    public function source(): BelongsTo
    {
        return $this->belongsTo(NewsSource::class, 'news_source_id');
    }

    /** @return BelongsTo<NewsFetch, $this> */
    public function fetch(): BelongsTo
    {
        return $this->belongsTo(NewsFetch::class, 'news_fetch_id');
    }

    /** @return BelongsTo<Article, $this> */
    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }

    /** @return MorphMany<AiRun, $this> */
    public function runs(): MorphMany
    {
        return $this->morphMany(AiRun::class, 'subject');
    }
}
