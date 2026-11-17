<?php

namespace App\Models\Concerns;

use App\Models\ActivityLog;

/**
 * Writes created/updated/deleted rows to the activity log.
 *
 * A model names itself with activityNoun() ("artikel") and activityName() (its title),
 * and may turn a specific change into its own event via activityUpdateEvent().
 */
trait LogsActivity
{
    /** @var list<string> Columns whose changes are noise in an audit trail. */
    protected static array $activityIgnored = ['updated_at', 'created_at', 'views', 'remember_token'];

    public static function bootLogsActivity(): void
    {
        static::created(fn (self $m) => $m->logActivity('created', 'menambahkan'));
        static::deleted(fn (self $m) => $m->logActivity('deleted', 'menghapus'));
        static::updated(function (self $m) {
            $changes = $m->activityChanges();
            if (! $changes) {
                return;
            }
            [$event, $verb] = $m->activityUpdateEvent() ?? ['updated', 'memperbarui'];
            $m->logActivity($event, $verb, ['changes' => $changes]);
        });
    }

    abstract public function activityNoun(): string;

    public function activityName(): string
    {
        return (string) ($this->getAttribute('title') ?? $this->getAttribute('name') ?? "#{$this->getKey()}");
    }

    /** @return array{0: string, 1: string}|null [event suffix, verb] for a meaningful update, e.g. publishing. */
    protected function activityUpdateEvent(): ?array
    {
        return null;
    }

    /** @param  array<string, mixed>  $properties */
    protected function logActivity(string $event, string $verb, array $properties = []): void
    {
        $prefix = str($this->getTable())->singular()->value();
        ActivityLog::record(
            "{$prefix}.{$event}",
            "{$verb} {$this->activityNoun()} “{$this->activityName()}”",
            $this,
            $properties,
        );
    }

    /** @return array<string, array{from: mixed, to: mixed}> */
    protected function activityChanges(): array
    {
        $changes = [];
        foreach (array_keys($this->getChanges()) as $key) {
            if (in_array($key, static::$activityIgnored, true)) {
                continue;
            }
            // Never store secrets or long bodies, just note that they changed.
            $hidden = in_array($key, ['password', 'body'], true);
            $changes[$key] = [
                'from' => $hidden ? null : $this->stringify($this->getOriginal($key)),
                'to' => $hidden ? null : $this->stringify($this->getAttribute($key)),
            ];
        }

        return $changes;
    }

    private function stringify(mixed $value): mixed
    {
        return match (true) {
            $value instanceof \BackedEnum => $value->value,
            $value instanceof \DateTimeInterface => $value->format('Y-m-d H:i'),
            is_string($value) => str($value)->limit(120)->value(),
            default => $value,
        };
    }
}
