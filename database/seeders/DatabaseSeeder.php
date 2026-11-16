<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\Article;
use App\Models\Category;
use App\Models\Region;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(RegionSeeder::class);

        $categories = collect(['Nasional', 'Politik', 'Ekonomi', 'Hukum', 'Pendidikan', 'Budaya', 'Pariwisata', 'UMKM', 'Olahraga'])
            ->map(fn ($name, $i) => Category::updateOrCreate(['slug' => Str::slug($name)], ['name' => $name, 'sort' => $i]));

        $admin = User::factory()->create([
            'name' => 'Super Admin',
            'email' => 'admin@nusantaranews.test',
            'role' => Role::SuperAdmin,
        ]);
        User::factory()->create([
            'name' => 'Editor Jawa Barat',
            'email' => 'editor.jabar@nusantaranews.test',
            'role' => Role::Editor,
            'region_code' => '32',
        ]);
        $journalist = User::factory()->create([
            'name' => 'Wartawan Bandung',
            'email' => 'wartawan@nusantaranews.test',
            'role' => Role::Journalist,
            'region_code' => '32.73',
        ]);
        User::factory()->create([
            'name' => 'Kontributor Warga',
            'email' => 'kontributor@nusantaranews.test',
            'role' => Role::Contributor,
        ]);

        // Illustration data only, not real news.
        $regionCodes = Region::pluck('code')->push(null, null, null);
        Article::factory(120)->published()
            ->sequence(fn () => [
                'category_id' => $categories->random()->id,
                'region_code' => $regionCodes->random(),
                'author_id' => fake()->randomElement([$admin->id, $journalist->id]),
                // Placeholder photos for the illustration data.
                'cover_path' => 'https://picsum.photos/seed/'.Str::random(8).'/800/500',
            ])
            ->create();

        $this->call(ProvinceNewsSeeder::class);

        Article::published()->limit(5)->update(['is_headline' => true]);
        Article::published()->skip(5)->limit(4)->update(['is_breaking' => true]);
    }
}
