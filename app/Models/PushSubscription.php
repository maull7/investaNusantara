<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Minishlink\WebPush\Subscription;

/**
 * @property int $id
 * @property int|null $user_id
 * @property string $endpoint
 * @property string $endpoint_hash
 * @property string $public_key
 * @property string $auth_token
 * @property list<string> $provinces
 * @property Carbon|null $last_sent_at
 */
class PushSubscription extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['provinces' => 'array', 'last_sent_at' => 'datetime'];
    }

    public static function hash(string $endpoint): string
    {
        return hash('sha256', $endpoint);
    }

    public static function findByEndpoint(string $endpoint): ?self
    {
        return static::where('endpoint_hash', static::hash($endpoint))->first();
    }

    /**
     * Who gets a breaking-news push: everyone for national news, else followers of the province.
     *
     * @param  Builder<PushSubscription>  $query
     */
    public function scopeAudienceFor(Builder $query, Article $article): void
    {
        if ($article->region_code) {
            $query->whereJsonContains('provinces', substr($article->region_code, 0, 2));
        }
    }

    public function toWebPush(): Subscription
    {
        return Subscription::create([
            'endpoint' => $this->endpoint,
            'publicKey' => $this->public_key,
            'authToken' => $this->auth_token,
        ]);
    }
}
