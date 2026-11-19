<?php

namespace Database\Seeders;

use App\Models\DirectoryEntry;
use App\Models\RegionProfile;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Demo data for the regional directory and "Pusat Data Daerah" (local development only).
 *
 * The numbers are illustrative, NOT real statistics: every source points to example.com,
 * every description and entry says "(contoh)", and officials are placeholder names.
 * Re-running updates the same rows.
 */
class DirectorySeeder extends Seeder
{
    private const SOURCE = 'https://example.com/data-contoh';

    public function run(): void
    {
        $editor = User::where('email', 'admin@nusantaranews.test')->first();

        // code => [population, area km², districts, umk, growth %, unemployment %, ipm, mean schooling, schools, universities, large industries, tourists, verified]
        $regions = [
            '32' => [50_300_000, 35_378, 627, 2_200_000, 5.0, 6.8, 74.2, 8.9, 32_000, 380, 9_800, 60_000_000, true],
            '35' => [41_800_000, 47_800, 666, 2_300_000, 4.9, 4.9, 73.4, 8.1, 33_500, 340, 8_900, 70_000_000, true],
            '51' => [4_400_000, 5_780, 57, 2_900_000, 5.7, 2.7, 77.1, 9.4, 3_500, 60, 450, 15_000_000, true],
            '32.16' => [3_200_000, 1_273, 23, 5_500_000, 5.2, 9.5, 75.0, 9.3, 2_400, 25, 4_100, 1_200_000, true],
            '32.71' => [1_050_000, 118, 6, 5_100_000, 5.3, 8.6, 78.9, 10.6, 900, 30, 120, 6_500_000, true],
            '32.04' => [3_700_000, 1_768, 31, 3_800_000, 4.8, 6.7, 73.6, 8.9, 3_100, 20, 900, 3_900_000, true],
            '35.15' => [2_100_000, 714, 18, 4_900_000, 5.4, 7.6, 81.0, 10.4, 1_700, 30, 1_500, 900_000, true],
            '51.03' => [550_000, 418, 6, 3_600_000, 6.1, 3.0, 82.0, 10.6, 400, 15, 40, 9_000_000, true],
            '34.04' => [1_150_000, 575, 17, 2_400_000, 5.0, 3.4, 84.9, 11.3, 1_000, 50, 160, 4_500_000, true],
            '12.71' => [2_500_000, 265, 21, 4_000_000, 5.0, 8.0, 81.9, 11.4, 1_900, 90, 700, 2_700_000, true],
            '73.71' => [1_480_000, 175, 15, 3_900_000, 5.5, 8.7, 83.0, 11.6, 1_100, 80, 260, 1_900_000, true],
            '11.03' => [440_000, 6_040, 24, 3_500_000, 4.2, 6.5, 70.8, 8.7, 700, 5, 20, 150_000, true],
            // Draft only: shows up in Admin > Direktori as "Draf", not on the site.
            '64.72' => [870_000, 718, 10, 3_700_000, 4.5, 6.2, 81.5, 11.0, 800, 20, 90, 900_000, false],
        ];

        foreach ($regions as $code => $v) {
            [$population, $area, $districts, $umk, $growth, $unemployment, $ipm, $schooling, $schools, $universities, $industries, $tourists, $verified] = $v;
            $facts = [
                'head' => 'Kepala Daerah Contoh',
                'deputy' => 'Wakil Kepala Daerah Contoh',
                'capital' => 'Pusat Pemerintahan Contoh',
                'population' => $this->num($population),
                'area' => $this->num($area),
                'districts' => (string) $districts,
                'apbd' => 'Rp '.$this->num(intdiv($population, 1000) / 1000 + 1, 1).' triliun',
                'website' => 'https://example.com',
                'umk' => 'Rp '.$this->num($umk),
                'economic_growth' => $this->num($growth, 2),
                'pdrb' => 'Rp '.$this->num($population / 10_000_000 * 25 + 5, 1).' triliun',
                'investment' => 'Rp '.$this->num($industries / 100 + 1, 1).' triliun',
                'unemployment' => $this->num($unemployment, 2),
                'large_industries' => $this->num($industries),
                'ipm' => $this->num($ipm, 2),
                'mean_schooling' => $this->num($schooling, 2),
                'schools' => $this->num($schools),
                'universities' => $this->num($universities),
                'tourists' => $this->num($tourists),
            ];

            RegionProfile::updateOrCreate(['region_code' => $code], [
                'facts' => collect($facts)->map(fn ($value) => ['value' => $value, 'source' => self::SOURCE, 'as_of' => '2025'])->all(),
                'description' => "Data contoh untuk uji tampilan direktori daerah. Angka dan nama pada halaman ini bukan data resmi.\n\nDeskripsi asli akan disusun Hermes dari sumber resmi (BPS, situs pemda, DJPK) lalu diverifikasi redaksi.",
                'description_source' => self::SOURCE,
                'verified_at' => $verified ? now() : null,
                'verified_by' => $verified ? $editor?->id : null,
            ]);

            if (str_contains($code, '.')) {
                $this->entries($code, $verified, $editor?->id);
            }
        }
    }

    /** A few entries of every non-event type; the last one of each region waits for verification. */
    private function entries(string $code, bool $verified, ?int $editorId): void
    {
        $items = [
            ['wisata', 'Taman Kota', 'Ruang terbuka hijau dengan jalur pejalan kaki dan area bermain.'],
            ['wisata', 'Museum Sejarah Daerah', 'Koleksi benda bersejarah dan budaya setempat.'],
            ['umkm', 'Sentra Kerajinan Tangan', 'Kumpulan perajin anyaman dan batik lokal.'],
            ['umkm', 'Kuliner Khas Daerah', 'Produk olahan makanan khas yang dipasarkan hingga luar daerah.'],
            ['industri', 'Kawasan Industri Terpadu', 'Kawasan manufaktur dengan tenant otomotif dan elektronik.'],
            ['industri', 'Sentra Industri Kecil', 'Klaster industri kecil dan menengah pengolahan pangan.'],
            ['infrastruktur', 'Akses Jalan Tol', 'Gerbang tol yang menghubungkan pusat kota dengan kawasan industri.'],
            ['infrastruktur', 'Stasiun Kereta', 'Stasiun penumpang dengan layanan kereta komuter.'],
            ['properti', 'Kawasan Hunian Terpadu', 'Kawasan perumahan dengan fasilitas sekolah dan pusat belanja.'],
            ['properti', 'Kawasan Komersial', 'Area perkantoran dan ruko di koridor jalan utama.'],
            ['pendidikan', 'Politeknik Negeri', 'Pendidikan vokasi bidang teknik dan bisnis.'],
            ['pendidikan', 'SMK Unggulan', 'Sekolah kejuruan dengan program magang industri.', false],
        ];

        foreach ($items as $item) {
            [$type, $name, $description] = $item;
            $on = $verified && ($item[3] ?? true);
            DirectoryEntry::updateOrCreate(
                ['region_code' => $code, 'type' => $type, 'name' => "{$name} (contoh)"],
                [
                    'description' => $description.' Data contoh, bukan informasi resmi.',
                    'address' => 'Kecamatan Contoh',
                    'source_url' => self::SOURCE,
                    'verified_at' => $on ? now() : null,
                    'verified_by' => $on ? $editorId : null,
                ],
            );
        }
    }

    /** Indonesian number format: 1.234.567 or 5,25. */
    private function num(float|int $value, int $decimals = 0): string
    {
        return number_format($value, $decimals, ',', '.');
    }
}
