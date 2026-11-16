<?php

namespace Database\Factories;

use App\Enums\ArticleStatus;
use App\Models\Article;
use App\Models\Category;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Article> */
class ArticleFactory extends Factory
{
    public function definition(): array
    {
        $title = rtrim(fake()->sentence(8), '.');

        return [
            'title' => $title,
            'slug' => Str::slug($title).'-'.Str::lower(Str::random(5)),
            'excerpt' => fake()->paragraph(),
            'body' => fake()->paragraphs(6, true),
            'category_id' => Category::factory(),
            'author_id' => User::factory(),
            'status' => ArticleStatus::Draft,
        ];
    }

    public function published(): static
    {
        return $this->state(fn () => [
            'status' => ArticleStatus::Published,
            'published_at' => fake()->dateTimeBetween('-30 days'),
        ]);
    }
}
