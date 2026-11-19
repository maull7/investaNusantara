<?php

namespace Database\Seeders;

use App\Models\Article;
use App\Models\Tag;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Demo data for the Media Intelligence dashboard (local development only):
 * tags, a sentiment and 60 days of daily reads for the dummy articles.
 *
 * Only touches articles written by hand (not AI) that have no tags and no sentiment yet,
 * so real newsroom data is never overwritten. Recent articles lean on a few "hot" tags,
 * so the dashboard shows rising keywords and issues spreading across provinces.
 */
class InsightsSeeder extends Seeder
{
    private const STEADY = ['UMKM', 'Pariwisata', 'Pendidikan', 'Kesehatan', 'Infrastruktur', 'Investasi', 'Festival Budaya', 'Kemacetan'];

    /** Tags that surge in the last 7 days (rising keywords / national issues). */
    private const HOT = ['Banjir', 'Harga Beras', 'Pilkada'];

    public function run(): void
    {
        mt_srand(2026); // same demo every run
        $week = now()->subDays(7);

        Article::published()->reorder()->where('is_ai_generated', false)->whereNull('sentiment')->doesntHave('tags')
            ->get(['id', 'published_at', 'region_code'])
            ->each(function (Article $article) use ($week) {
                $recent = $article->published_at->gte($week);
                $pool = $recent && mt_rand(1, 100) <= 70 ? self::HOT : self::STEADY;
                $names = [$pool[array_rand($pool)], self::STEADY[array_rand(self::STEADY)]];
                $article->tags()->sync(Tag::idsFor($names));

                $hot = array_intersect($names, ['Banjir']) !== [];
                $roll = mt_rand(1, 100);
                $article->forceFill(['sentiment' => match (true) {
                    $hot || $roll <= 25 => 'negatif',
                    $roll <= 65 => 'netral',
                    default => 'positif',
                }])->saveQuietly();

                // Reads: a peak on publication day, fading over the following days.
                $peak = mt_rand(40, 400) * ($recent ? 2 : 1);
                $rows = [];
                for ($day = $article->published_at->copy()->startOfDay(); $day->lte(today()); $day = $day->addDay()) {
                    $age = (int) $article->published_at->copy()->startOfDay()->diffInDays($day);
                    $views = (int) round($peak / (1 + $age * 0.8)) + mt_rand(0, 5);
                    if ($views > 0) {
                        $rows[] = ['article_id' => $article->id, 'date' => $day->toDateString(), 'views' => $views];
                    }
                }
                DB::table('article_daily_views')->upsert($rows, ['article_id', 'date'], ['views']);
            });
    }
}
