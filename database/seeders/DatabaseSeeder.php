<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\Category;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(RegionSeeder::class);

        collect(['Nasional', 'Politik', 'Ekonomi', 'Hukum', 'Pendidikan', 'Budaya', 'Pariwisata', 'UMKM', 'Olahraga'])
            ->each(fn ($name, $i) => Category::updateOrCreate(['slug' => Str::slug($name)], ['name' => $name, 'sort' => $i]));

        $this->user([
            'name' => 'Super Admin',
            'email' => 'admin@nusantaranews.test',
            'role' => Role::SuperAdmin,
        ]);
        $this->user([
            'name' => 'Editor Jawa Barat',
            'email' => 'editor.jabar@nusantaranews.test',
            'role' => Role::Editor,
            'region_code' => '32',
        ]);
        $this->user([
            'name' => 'Wartawan Bandung',
            'email' => 'wartawan@nusantaranews.test',
            'role' => Role::Journalist,
            'region_code' => '32.73',
        ]);
        $this->user([
            'name' => 'Kontributor Warga',
            'email' => 'kontributor@nusantaranews.test',
            'role' => Role::Contributor,
        ]);

        // No dummy articles: news comes from the AI pipeline (admin > Berita AI) and the newsroom.
    }

    /**
     * Returns the existing user with this email, or creates it, so the seeder can be re-run.
     *
     * @param  array<string, mixed>  $attributes
     */
    private function user(array $attributes): User
    {
        return User::where('email', $attributes['email'])->first()
            ?? User::factory()->create($attributes);
    }
}
