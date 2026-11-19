<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $slug
 * @property string $name
 * @property string|null $tagline
 * @property int $price rupiah per month; 0 = "Hubungi kami"
 * @property int|null $max_provinces null = all of Indonesia
 * @property list<string> $benefits
 * @property bool $highlighted
 * @property bool $active
 */
class MembershipPlan extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['benefits' => 'array', 'highlighted' => 'boolean', 'active' => 'boolean'];
    }
}
