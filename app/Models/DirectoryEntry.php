<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * A tourism spot, UMKM or event of one region.
 *
 * @property int $id
 * @property string $region_code
 * @property string $type see TYPES
 * @property string|null $category event category, see EVENT_CATEGORIES
 * @property string|null $slug events only
 * @property string|null $organizer
 * @property string|null $contact
 * @property int|null $submitted_by
 * @property bool $featured_requested
 * @property Carbon|null $featured_at
 * @property string $name
 * @property string|null $description
 * @property string|null $address
 * @property string|null $website
 * @property string|null $source_url
 * @property Carbon|null $starts_on
 * @property Carbon|null $ends_on
 * @property Carbon|null $verified_at
 */
class DirectoryEntry extends Model
{
    public const TYPES = [
        'wisata' => 'Wisata',
        'umkm' => 'UMKM',
        'event' => 'Event',
        'industri' => 'Kawasan industri',
        'infrastruktur' => 'Infrastruktur',
        'properti' => 'Properti',
        'pendidikan' => 'Pendidikan',
    ];

    public const EVENT_CATEGORIES = [
        'daerah' => 'Event daerah',
        'seminar' => 'Seminar',
        'workshop' => 'Workshop',
        'festival' => 'Festival',
        'pameran' => 'Pameran',
    ];

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'starts_on' => 'date:Y-m-d',
            'ends_on' => 'date:Y-m-d',
            'verified_at' => 'datetime',
            'featured_at' => 'datetime',
            'featured_requested' => 'boolean',
        ];
    }

    /** Organizer contact is for the newsroom only. */
    protected $hidden = ['contact'];

    protected static function booted(): void
    {
        // Events get a stable public URL (/agenda/{slug}).
        static::saving(function (self $entry) {
            if ($entry->type === 'event' && ! $entry->slug) {
                $entry->slug = (Str::slug($entry->name) ?: 'event').'-'.Str::lower(Str::random(5));
            }
        });
    }

    /** @return BelongsTo<User, $this> */
    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    /** @return BelongsTo<Region, $this> */
    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class, 'region_code');
    }

    /**
     * What readers see: verified rows, and events only until they end.
     *
     * @param  Builder<DirectoryEntry>  $query
     */
    public function scopePublic(Builder $query): void
    {
        $today = now()->toDateString();
        $query->whereNotNull('verified_at')
            ->where(fn (Builder $q) => $q->where('type', '!=', 'event')
                ->orWhere(fn (Builder $e) => $e->where(fn (Builder $d) => $d->whereNull('ends_on')->where('starts_on', '>=', $today))
                    ->orWhere('ends_on', '>=', $today)))
            ->orderByRaw("case when type = 'event' then starts_on end")
            ->orderBy('name');
    }
}
