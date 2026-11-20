<?php

namespace App\Models;

use App\Enums\NewsTaskStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $news_source_id
 * @property string $trigger
 * @property string|null $via rss|sitemap|hermes
 * @property int|null $requested_by
 * @property NewsTaskStatus $status
 * @property int $attempts
 * @property int $found
 * @property string|null $error
 * @property Carbon|null $started_at
 * @property Carbon|null $finished_at
 * @property Carbon $updated_at
 * @property-read NewsSource $source
 */
class NewsFetch extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'status' => NewsTaskStatus::class,
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
            'inspected_links' => 'array',
        ];
    }

    /** @return BelongsTo<NewsSource, $this> */
    public function source(): BelongsTo
    {
        return $this->belongsTo(NewsSource::class, 'news_source_id');
    }

    /** @return HasMany<NewsItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(NewsItem::class);
    }

    /** @return MorphMany<AiRun, $this> */
    public function runs(): MorphMany
    {
        return $this->morphMany(AiRun::class, 'subject');
    }
}
