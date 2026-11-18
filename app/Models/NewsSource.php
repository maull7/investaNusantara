<?php

namespace App\Models;

use App\Enums\NewsTaskStatus;
use App\Models\Concerns\LogsActivity;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $url
 * @property string|null $feed_url
 * @property string|null $region_code
 * @property int|null $category_id
 * @property string|null $instruction
 * @property int $max_articles
 * @property int|null $fetch_interval_minutes
 * @property bool $auto_publish
 * @property bool $active
 * @property Carbon|null $last_fetched_at
 * @property Carbon|null $last_success_at
 * @property string|null $last_error
 */
class NewsSource extends Model
{
    use LogsActivity;

    public function activityNoun(): string
    {
        return 'sumber berita';
    }

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'auto_publish' => 'boolean',
            'active' => 'boolean',
            'last_fetched_at' => 'datetime',
            'last_success_at' => 'datetime',
        ];
    }

    /** Host without "www.", used for attribution and to check article links belong to this site. */
    public function host(): string
    {
        return preg_replace('/^www\./', '', strtolower((string) parse_url($this->url, PHP_URL_HOST)));
    }

    /** Scheduled sources are due once their interval has passed since the last fetch. */
    public function isDue(): bool
    {
        return $this->active
            && $this->fetch_interval_minutes
            && (! $this->last_fetched_at || $this->last_fetched_at->addMinutes($this->fetch_interval_minutes)->isPast());
    }

    public function hasActiveFetch(): bool
    {
        return $this->fetches()->whereIn('status', NewsTaskStatus::activeValues())->exists();
    }

    /**
     * Admin filter: '' = all, 'nasional' = no region, otherwise a province code (its cities included).
     *
     * @param  Builder<NewsSource>  $query
     */
    public function scopeInProvince(Builder $query, string $province): void
    {
        match ($province) {
            '' => null,
            'nasional' => $query->whereNull('region_code'),
            default => $query->where(fn (Builder $q) => $q->where('region_code', $province)->orWhere('region_code', 'like', $province.'.%')),
        };
    }

    /** @return BelongsTo<Region, $this> */
    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class, 'region_code');
    }

    /** @return BelongsTo<Category, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /** @return HasMany<NewsFetch, $this> */
    public function fetches(): HasMany
    {
        return $this->hasMany(NewsFetch::class);
    }
}
