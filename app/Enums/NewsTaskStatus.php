<?php

namespace App\Enums;

/** Lifecycle of a news fetch (source run) and of each news item found by it. */
enum NewsTaskStatus: string
{
    case Queued = 'queued';
    case Running = 'running';
    // Waiting for Hermes or the AI provider to come back.
    case Paused = 'paused';
    // Fetch finished listing articles.
    case Completed = 'completed';
    // Item became a published article.
    case Published = 'published';
    // Item became an article that needs an editor (guard failed or auto publish off).
    case Review = 'review';
    case Duplicate = 'duplicate';
    case Failed = 'failed';

    public function isFinal(): bool
    {
        return in_array($this, [self::Completed, self::Published, self::Review, self::Duplicate, self::Failed], true);
    }

    /** @return list<string> */
    public static function activeValues(): array
    {
        return [self::Queued->value, self::Running->value, self::Paused->value];
    }
}
