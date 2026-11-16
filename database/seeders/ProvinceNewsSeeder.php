<?php

namespace Database\Seeders;

use App\Enums\ArticleStatus;
use App\Enums\Role;
use App\Models\Article;
use App\Models\Category;
use App\Models\Region;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Dummy news so every province channel (and some of its regencies/cities) has content.
 * Illustration data only, not real news. Safe to re-run: tops each province up to PER_PROVINCE.
 */
class ProvinceNewsSeeder extends Seeder
{
    private const PER_PROVINCE = 8;

    /** @var array<string, list<string>> category slug => title templates ({p} = place) */
    private const TEMPLATES = [
        'ekonomi' => [
            'Harga Bahan Pokok di {p} Mulai Stabil Jelang Akhir Pekan',
            'Pemerintah Daerah {p} Dorong Investasi Sektor Hilirisasi',
            'Inflasi {p} Terkendali, Daya Beli Warga Menguat',
        ],
        'umkm' => [
            'UMKM {p} Tembus Pasar Ekspor Lewat Platform Digital',
            'Pelaku Usaha Kecil di {p} Dapat Pelatihan Pemasaran Online',
            'Produk Kerajinan Khas {p} Dilirik Pembeli Mancanegara',
        ],
        'budaya' => [
            'Festival Budaya {p} Kembali Digelar, Ribuan Warga Hadir',
            'Generasi Muda {p} Lestarikan Tarian Tradisional',
            'Rumah Adat di {p} Direvitalisasi Jadi Pusat Edukasi',
        ],
        'pariwisata' => [
            'Kunjungan Wisatawan ke {p} Naik Selama Musim Liburan',
            'Destinasi Baru di {p} Jadi Incaran Pelancong Muda',
            'Desa Wisata {p} Raih Penghargaan Tingkat Nasional',
        ],
        'pendidikan' => [
            'Sekolah di {p} Terapkan Kurikulum Digital Mulai Semester Ini',
            'Beasiswa Daerah {p} Dibuka untuk Ribuan Pelajar',
        ],
        'politik' => [
            'DPRD {p} Bahas Rancangan APBD Tahun Depan',
            'Kepala Daerah {p} Resmikan Program Layanan Publik Terpadu',
        ],
        'hukum' => [
            'Polda {p} Perketat Pengawasan Lalu Lintas Jelang Libur Panjang',
            'Pengadilan di {p} Luncurkan Layanan Sidang Daring',
        ],
        'olahraga' => [
            'Atlet {p} Bersiap Hadapi Kejuaraan Nasional',
            'Klub Sepak Bola Asal {p} Raih Kemenangan Kandang',
        ],
    ];

    public function run(): void
    {
        $categories = Category::pluck('id', 'slug');
        $authors = User::whereIn('role', [Role::SuperAdmin, Role::Journalist, Role::Editor])->pluck('id');
        if ($authors->isEmpty() || $categories->isEmpty()) {
            return;
        }

        foreach (Region::provinces()->with('children:code,parent_code,name')->get() as $province) {
            $missing = self::PER_PROVINCE - Article::published()->inRegion($province)->count();

            for ($i = 0; $i < $missing; $i++) {
                // Half at province level, half spread over its regencies/cities.
                $place = $i % 2 === 0 || $province->children->isEmpty()
                    ? $province
                    : $province->children->random();
                $slug = array_rand(self::TEMPLATES);
                $title = str_replace('{p}', $place->name, fake()->randomElement(self::TEMPLATES[$slug]));

                Article::create([
                    'title' => $title,
                    'slug' => Str::slug($title).'-'.Str::lower(Str::random(5)),
                    'excerpt' => "Ringkasan berita ilustrasi dari {$place->name}, {$province->name}. ".fake()->sentence(12),
                    'body' => fake()->paragraphs(6, true),
                    'cover_path' => 'https://picsum.photos/seed/'.Str::random(8).'/800/500',
                    'category_id' => $categories[$slug] ?? $categories->first(),
                    'region_code' => $place->code,
                    'author_id' => $authors->random(),
                    'status' => ArticleStatus::Published,
                    'published_at' => fake()->dateTimeBetween('-20 days'),
                ]);
            }
        }
    }
}
