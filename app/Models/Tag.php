<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 */
class Tag extends Model
{
    protected $fillable = ['name', 'slug'];

    /** @return BelongsToMany<Article, $this> */
    public function articles(): BelongsToMany
    {
        return $this->belongsToMany(Article::class);
    }

    /**
     * Tag ids for these names. The slug decides identity, so "Pemkot Bogor" and "pemkot bogor"
     * are one tag; an existing tag keeps the name an admin gave it. Unknown names become new tags.
     *
     * @param  iterable<mixed>  $names
     * @return Collection<int, int>
     */
    public static function idsFor(iterable $names, int $max = 6): Collection
    {
        return collect($names)
            ->map(fn ($n) => Str::limit(trim(strip_tags((string) $n)), 60, ''))
            ->filter(fn ($n) => Str::slug($n) !== '')
            ->unique(fn ($n) => Str::slug($n))
            ->take($max)
            ->map(fn ($n) => static::firstOrCreate(['slug' => Str::slug($n)], ['name' => $n])->id)
            ->values();
    }
}
