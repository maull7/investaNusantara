<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $operation
 * @property string|null $hermes_run_id
 * @property string $status running|completed|failed
 * @property string $input
 * @property array<string, mixed>|null $output
 * @property string|null $error
 * @property int|null $total_tokens
 * @property Carbon|null $started_at
 * @property Carbon|null $finished_at
 */
class AiRun extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'output' => 'array',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    /** @return MorphTo<Model, $this> */
    public function subject(): MorphTo
    {
        return $this->morphTo();
    }
}
