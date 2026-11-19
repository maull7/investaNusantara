<?php

namespace Database\Seeders;

use App\Models\DirectoryEntry;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Demo events for the national agenda (local development only).
 * Dates are relative to today, so the calendar always has something to show.
 * Every event is marked "(contoh)" and cites example.com, so it is never mistaken for real news.
 * Re-running updates the same rows (matched by name).
 */
class AgendaSeeder extends Seeder
{
    public function run(): void
    {
        $contributor = User::where('email', 'kontributor@nusantaranews.test')->first();
        $editor = User::where('email', 'admin@nusantaranews.test')->first();

        // [name, category, region, day offset, length in days, featured, status]
        // status: verified | pending (organizer submission) | draft (AI find, not yet checked)
        $events = [
            ['Festival Budaya Nusantara', 'festival', '34.71', 3, 3, true, 'verified'],
            ['Pameran UMKM Kreatif Jawa Barat', 'pameran', '32.73', 6, 2, true, 'verified'],
            ['Seminar Nasional Ekonomi Digital Daerah', 'seminar', '31.71', 8, 1, false, 'verified'],
            ['Workshop Fotografi Jurnalistik', 'workshop', '35.78', 10, 1, false, 'verified'],
            ['Pesta Rakyat Hari Jadi Kota', 'daerah', '32.71', 12, 1, false, 'verified'],
            ['Bali Art & Culture Week', 'festival', '51.71', 15, 5, true, 'verified'],
            ['Pameran Kopi Nusantara', 'pameran', '12.71', 18, 3, false, 'verified'],
            ['Seminar Pariwisata Berkelanjutan', 'seminar', '73.71', 21, 1, false, 'verified'],
            ['Workshop Digital Marketing UMKM', 'workshop', '33.74', 25, 2, false, 'verified'],
            ['Karnaval Budaya Khatulistiwa', 'daerah', '61.71', 32, 1, false, 'verified'],
            ['Expo Investasi Daerah', 'pameran', '36.71', 40, 3, false, 'verified'],
            ['Festival Kuliner Aceh', 'festival', '11.71', 47, 2, false, 'verified'],
            ['Seminar Industri Hijau Kalimantan', 'seminar', '64.72', 55, 1, false, 'verified'],
            // Already over: hidden from the agenda, shows the date filter works.
            ['Lomba Perahu Tradisional', 'daerah', '18.71', -20, 1, false, 'verified'],
            // Moderation queue samples.
            ['Bazar Produk Lokal Tangerang', 'pameran', '36.71', 9, 2, false, 'pending', true],
            ['Workshop Batik untuk Pelajar', 'workshop', '34.71', 14, 1, false, 'pending', false],
            ['Konser Amal Peduli Pendidikan', 'daerah', '32.73', 20, 1, false, 'draft'],
        ];

        foreach ($events as $row) {
            [$name, $category, $region, $offset, $days, $featured, $status] = $row;
            $requested = $row[7] ?? false;
            $start = today()->addDays($offset);
            $submitted = $status === 'pending' ? $contributor : null;

            DirectoryEntry::updateOrCreate(
                ['type' => 'event', 'name' => "{$name} (contoh)"],
                [
                    'region_code' => $region,
                    'category' => $category,
                    'description' => "Data contoh untuk uji tampilan agenda: {$name}. Bukan event sungguhan.",
                    'address' => 'Gedung Serbaguna (contoh)',
                    'organizer' => 'Panitia Contoh',
                    'contact' => $submitted ? '0812-0000-0000 (contoh)' : null,
                    'website' => null,
                    'source_url' => $submitted ? null : 'https://example.com/agenda-contoh',
                    'starts_on' => $start->toDateString(),
                    'ends_on' => $days > 1 ? $start->copy()->addDays($days - 1)->toDateString() : null,
                    'submitted_by' => $submitted?->id,
                    'featured_requested' => $requested,
                    'verified_at' => $status === 'verified' ? now() : null,
                    'verified_by' => $status === 'verified' ? $editor?->id : null,
                    'featured_at' => $featured ? now() : null,
                ],
            );
        }
    }
}
