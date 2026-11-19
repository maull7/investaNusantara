<?php

namespace Database\Seeders;

use App\Models\MembershipPlan;
use Illuminate\Database\Seeder;

/**
 * Default membership plans. Prices and benefits are starting points: admins edit them
 * in Admin > Langganan. Re-running never overwrites a plan an admin already changed.
 */
class MembershipPlanSeeder extends Seeder
{
    public function run(): void
    {
        $common = [
            'Dashboard Media Intelligence: topik, kata kunci naik, sentimen',
            'Rincian artikel di balik setiap topik dan daerah',
            'Filter tanggal bebas dan perbandingan periode',
            'Ekspor laporan CSV dan cetak PDF',
        ];

        $plans = [
            ['slug' => 'daerah', 'name' => 'Daerah', 'tagline' => 'Untuk pemda kabupaten/kota dan UMKM', 'price' => 499_000, 'max_provinces' => 1, 'sort' => 0,
                'benefits' => ['Pantau 1 provinsi beserta seluruh kabupaten/kotanya', ...$common]],
            ['slug' => 'regional', 'name' => 'Regional', 'tagline' => 'Untuk pemprov, perusahaan, dan konsultan', 'price' => 1_490_000, 'max_provinces' => 5, 'sort' => 1, 'highlighted' => true,
                'benefits' => ['Pantau hingga 5 provinsi', ...$common, 'Laporan bulanan dari redaksi']],
            ['slug' => 'nasional', 'name' => 'Nasional', 'tagline' => 'Untuk kementerian, korporasi, dan lembaga riset', 'price' => 0, 'max_provinces' => null, 'sort' => 2,
                'benefits' => ['Seluruh 38 provinsi dan 514 kabupaten/kota', 'Isu nasional yang berkembang lintas provinsi', ...$common, 'Pendampingan analis redaksi']],
        ];

        foreach ($plans as $plan) {
            MembershipPlan::firstOrCreate(['slug' => $plan['slug']], $plan);
        }
    }
}
