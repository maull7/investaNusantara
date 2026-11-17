<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\ActivityLog;
use App\Models\Category;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Seeded data isn't newsroom activity.
        ActivityLog::$enabled = false;

        $this->call(RegionSeeder::class);

        // No dummy articles: news comes from the AI pipeline (admin > Berita AI) and the newsroom.
        collect(['Nasional', 'Politik', 'Ekonomi', 'Hukum', 'Pendidikan', 'Budaya', 'Pariwisata', 'UMKM', 'Olahraga'])
            ->each(fn ($name, $i) => Category::updateOrCreate(['slug' => Str::slug($name)], ['name' => $name, 'sort' => $i]));

        $this->user([
            'name' => 'Super Admin',
            'email' => 'admin@nusantaranews.test',
            'role' => Role::SuperAdmin,
        ]);
        // Demo team accounts are for local development only.
        if (app()->isProduction()) {
            return;
        }

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
    }

    /**
     * Returns the existing user with this email, or creates it, so the seeder can be re-run.
     * Locally the password is "password"; in production a random one is printed once.
     *
     * @param  array<string, mixed>  $attributes
     */
    private function user(array $attributes): User
    {
        $existing = User::where('email', $attributes['email'])->first();
        if ($existing) {
            return $existing;
        }

        $password = app()->isProduction() ? Str::password(16, symbols: false) : 'password';
        if (app()->isProduction()) {
            $this->command->warn("Akun {$attributes['email']} dibuat dengan password: {$password} (segera ganti setelah login)");
        }

        return User::forceCreate([...$attributes, 'email_verified_at' => now(), 'password' => Hash::make($password)]);
    }
}
