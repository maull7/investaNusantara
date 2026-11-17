<?php

namespace App\Models;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;

/**
 * One line in the newsroom's audit trail: who did what, to which record, from where.
 *
 * @property int $id
 * @property int|null $user_id
 * @property string $event
 * @property string $description
 * @property string|null $subject_type
 * @property int|null $subject_id
 * @property array<string, mixed>|null $properties
 * @property string|null $ip_address
 * @property Carbon $created_at
 */
class ActivityLog extends Model
{
    public const UPDATED_AT = null;

    /** Off while seeding so demo data doesn't flood the log. */
    public static bool $enabled = true;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['properties' => 'array'];
    }

    /**
     * @param  array<string, mixed>  $properties
     */
    public static function record(string $event, string $description, ?Model $subject = null, array $properties = [], ?Authenticatable $user = null): ?self
    {
        if (! static::$enabled) {
            return null;
        }
        $request = app()->runningInConsole() ? null : request();

        return static::create([
            'user_id' => ($user ?? auth()->user())?->getAuthIdentifier(),
            'event' => $event,
            'description' => $description,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'properties' => $properties ?: null,
            'ip_address' => $request?->ip(),
        ]);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return MorphTo<Model, $this> */
    public function subject(): MorphTo
    {
        return $this->morphTo();
    }
}
