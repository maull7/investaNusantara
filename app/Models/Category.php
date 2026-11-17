<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use Database\Factories\CategoryFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property int $sort
 */
class Category extends Model
{
    /** @use HasFactory<CategoryFactory> */
    use HasFactory, LogsActivity;

    public function activityNoun(): string
    {
        return 'kategori';
    }

    protected $fillable = ['name', 'slug', 'sort'];

    /** @return HasMany<Article, $this> */
    public function articles(): HasMany
    {
        return $this->hasMany(Article::class);
    }
}
