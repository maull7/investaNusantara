<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string $code
 * @property string|null $parent_code
 * @property int $level
 * @property string|null $type
 * @property string $name
 * @property string $slug
 */
class Region extends Model
{
    public const PROVINCE = 1;

    public const CITY = 2;

    public $incrementing = false;

    public $timestamps = false;

    protected $primaryKey = 'code';

    protected $keyType = 'string';

    protected $guarded = [];

    /** @return BelongsTo<Region, $this> */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Region::class, 'parent_code');
    }

    /** @return HasMany<Region, $this> */
    public function children(): HasMany
    {
        return $this->hasMany(Region::class, 'parent_code')->orderBy('name');
    }

    /** @param Builder<Region> $query */
    public function scopeProvinces(Builder $query): void
    {
        $query->where('level', self::PROVINCE)->orderBy('name');
    }

    /**
     * Landmark icon for the region page: its own, else its province's (public/landmarks, see scripts/build-landmarks.py).
     *
     * @return array{name: string, url: string}|null
     */
    public function landmark(): ?array
    {
        static $names;
        $names ??= collect(file(database_path('data/landmarks.csv'), FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES))
            ->skip(1)->mapWithKeys(fn ($l) => [explode(',', $l, 2)[0] => explode(',', $l, 2)[1]]);

        $code = $names->has($this->code) ? $this->code : substr($this->code, 0, 2);

        return $names->has($code) ? ['name' => $names[$code], 'url' => "/landmarks/{$code}.svg"] : null;
    }

    /** True when $code is this region or any region below it. */
    public function contains(?string $code): bool
    {
        return $code !== null && ($code === $this->code || str_starts_with($code, $this->code.'.'));
    }
}
