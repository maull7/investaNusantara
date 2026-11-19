<?php

namespace App\Models;

use App\Enums\NewsTaskStatus;
use App\Jobs\DraftRegion;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * One Hermes research run that drafts a region's directory.
 *
 * @property int $id
 * @property string $region_code
 * @property int|null $requested_by
 * @property NewsTaskStatus $status
 * @property int $attempts
 * @property string|null $error
 */
class RegionDraft extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['status' => NewsTaskStatus::class];
    }

    /** Starts a research run for the region, unless one is already waiting or running. */
    public static function queueFor(string $regionCode, ?int $userId = null): ?self
    {
        if (static::where('region_code', $regionCode)->whereIn('status', NewsTaskStatus::activeValues())->exists()) {
            return null;
        }
        $draft = static::create(['region_code' => $regionCode, 'requested_by' => $userId]);
        DraftRegion::dispatch($draft->id);

        return $draft;
    }

    /** @return BelongsTo<Region, $this> */
    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class, 'region_code');
    }

    /** @return MorphMany<AiRun, $this> */
    public function runs(): MorphMany
    {
        return $this->morphMany(AiRun::class, 'subject');
    }
}
