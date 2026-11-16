<?php

namespace Database\Seeders;

use App\Models\Region;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/** Seeds Kemendagri provinces and regencies/cities from database/data/regions.csv (code,name). */
class RegionSeeder extends Seeder
{
    public function run(): void
    {
        $lines = file(database_path('data/regions.csv'), FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        $images = $this->images();
        $rows = [];

        foreach (array_slice($lines, 1) as $line) {
            [$code, $name] = str_getcsv($line);
            $level = substr_count($code, '.') + 1;
            $rows[] = [
                'code' => $code,
                'parent_code' => $level > 1 ? Str::beforeLast($code, '.') : null,
                'level' => $level,
                'type' => match (true) {
                    $level !== 2 => null,
                    str_starts_with($name, 'Kota ') => 'kota',
                    default => 'kabupaten',
                },
                'name' => $name,
                'slug' => Str::slug($name),
                'image_url' => $images[$code] ?? null,
            ];
        }

        // Parents first so the self-referencing FK holds.
        usort($rows, fn ($a, $b) => $a['level'] <=> $b['level']);

        foreach (array_chunk($rows, 500) as $chunk) {
            Region::upsert($chunk, ['code'], ['parent_code', 'level', 'type', 'name', 'slug', 'image_url']);
        }
    }

    /**
     * Province landmark photos (Wikimedia Commons, via id.wikipedia page images).
     *
     * @return array<string, string>
     */
    private function images(): array
    {
        $lines = file(database_path('data/region_images.csv'), FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        $images = [];
        foreach (array_slice($lines, 1) as $line) {
            [$code, $url] = array_map('trim', str_getcsv($line));
            if ($url !== '') {
                $images[$code] = $url;
            }
        }

        return $images;
    }
}
