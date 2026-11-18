<?php

namespace App\Models;

use App\Enums\NewsTaskStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * "Review AI" of one article, generated once by Hermes and then shown to every reader.
 *
 * @property int $id
 * @property int $article_id
 * @property int|null $requested_by
 * @property NewsTaskStatus $status queued → running → completed | failed
 * @property int $attempts
 * @property list<string>|null $points
 * @property string|null $body
 * @property string|null $error
 * @property-read Article $article
 */
class ArticleReview extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'status' => NewsTaskStatus::class,
            'points' => 'array',
        ];
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
