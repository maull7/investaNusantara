<?php

namespace App\Models;

use App\Enums\ArticleStatus;
use App\Models\Concerns\LogsActivity;
use Database\Factories\ArticleFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * @property int $id
 * @property string $title
 * @property string $slug
 * @property string|null $excerpt
 * @property string $body
 * @property string|null $cover_path URL (AI articles hotlink the source image) or public-disk path
 * @property string|null $source_name
 * @property string|null $source_url
 * @property bool $is_ai_generated
 * @property int $category_id
 * @property string|null $region_code
 * @property int $author_id
 * @property int|null $editor_id
 * @property ArticleStatus $status
 * @property bool $is_headline
 * @property bool $is_breaking
 * @property Carbon|null $published_at
 * @property int $views
 */
class Article extends Model
{
    /** @use HasFactory<ArticleFactory> */
    use HasFactory, LogsActivity, SoftDeletes;

    public function activityNoun(): string
    {
        return 'artikel';
    }

    /** @return array{0: string, 1: string}|null */
    protected function activityUpdateEvent(): ?array
    {
        if (! $this->wasChanged('status')) {
            return null;
        }

        return match ($this->status) {
            ArticleStatus::Review => ['submitted', 'mengajukan'],
            ArticleStatus::Published => ['published', 'menerbitkan'],
            ArticleStatus::Rejected => ['rejected', 'mengembalikan'],
            default => null,
        };
    }

    protected $guarded = ['id', 'views'];

    protected $appends = ['cover_url'];

    protected function casts(): array
    {
        return [
            'status' => ArticleStatus::class,
            'is_headline' => 'boolean',
            'is_breaking' => 'boolean',
            'is_ai_generated' => 'boolean',
            'published_at' => 'datetime',
        ];
    }

    public function getCoverUrlAttribute(): ?string
    {
        return match (true) {
            ! $this->cover_path => null,
            str_starts_with($this->cover_path, 'http') => $this->cover_path,
            default => Storage::disk('public')->url($this->cover_path),
        };
    }

    /** @return BelongsTo<Category, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /** @return BelongsTo<Region, $this> */
    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class, 'region_code');
    }

    /** @return BelongsTo<User, $this> */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    /** @param Builder<Article> $query */
    public function scopePublished(Builder $query): void
    {
        $query->where('status', ArticleStatus::Published)
            ->where('published_at', '<=', now())
            ->latest('published_at');
    }

    /**
     * Region and everything below it, via Kemendagri code prefix.
     *
     * @param  Builder<Article>  $query
     */
    public function scopeInRegion(Builder $query, Region|string $region): void
    {
        $code = $region instanceof Region ? $region->code : $region;
        $query->where(fn (Builder $q) => $q->where('region_code', $code)->orWhere('region_code', 'like', $code.'.%'));
    }

    /** @param Builder<Article> $query */
    public function scopeSearch(Builder $query, string $term): void
    {
        // ponytail: MySQL FULLTEXT; move to OpenSearch/Meilisearch (Scout) when relevance or volume demands it.
        if (DB::connection($this->getConnectionName())->getDriverName() === 'mysql') {
            $query->whereFullText(['title', 'excerpt'], $term);
        } else {
            $query->where(fn (Builder $q) => $q->where('title', 'like', "%$term%")->orWhere('excerpt', 'like', "%$term%"));
        }
    }

    /**
     * Fields needed by article cards.
     *
     * @param  Builder<Article>  $query
     */
    public function scopeCard(Builder $query): void
    {
        $query->select(['id', 'title', 'slug', 'excerpt', 'cover_path', 'category_id', 'region_code', 'published_at', 'is_breaking'])
            ->with(['category:id,name,slug', 'region:code,name,slug,parent_code,level,image_url', 'region.parent:code,name,slug,image_url']);
    }
}
