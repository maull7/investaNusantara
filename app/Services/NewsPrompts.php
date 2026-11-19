<?php

namespace App\Services;

use App\Models\Article;
use App\Models\NewsItem;
use App\Models\NewsSource;
use App\Models\Region;
use App\Models\RegionProfile;
use Carbon\CarbonInterface;

/** Prompts sent to Hermes. Both ask for strict JSON so the app can validate every field. */
class NewsPrompts
{
    public static function discover(NewsSource $source, CarbonInterface $since): string
    {
        $extra = $source->instruction ? "\nInstruksi khusus untuk situs ini: {$source->instruction}\n" : '';
        // Indonesian sites show dates in WIB; give the agent the same clock.
        $sinceWib = $since->copy()->setTimezone('Asia/Jakarta')->format('Y-m-d H:i');

        return <<<PROMPT
        Anda adalah agen pencari berita untuk portal berita daerah Indonesia.

        Buka halaman ini: {$source->url}
        {$extra}
        Kumpulkan maksimal {$source->max_articles} tautan artikel berita paling baru, utamakan yang terbit setelah {$sinceWib} WIB.
        - Hanya artikel berita (bukan halaman kategori, tag, video, iklan, atau indeks).
        - Hanya tautan di domain {$source->host()}.
        - Urutkan dari yang paling baru. Jika tanggal tidak terlihat, ambil yang paling atas di halaman.
        - Jika tidak ada yang terbit setelah batas waktu itu, tetap kembalikan artikel terbaru yang ada (aplikasi akan membuang yang sudah pernah diambil).
        - Jangan membuka atau meringkas isi artikel pada tahap ini.
        - Jangan mengarang URL. Tulis URL lengkap (absolut, diawali https://). Jika tautan di halaman relatif seperti "berita/judul", gabungkan dengan alamat situs.

        Balas HANYA dengan JSON valid tanpa markdown:
        {"status":"ok","note":null,"articles":[{"url":"https://...","title":"judul asli","published_at":"ISO 8601 atau null"}]}

        Jika halaman tidak bisa dibuka (akses ditolak, captcha, error) balas {"status":"blocked","note":"apa yang terlihat","articles":[]}.
        Jika halaman terbuka tetapi tidak ada artikel berita, balas {"status":"empty","note":"alasannya","articles":[]}.
        PROMPT;
    }

    /**
     * @param  array<int, string>  $categories
     * @param  array<int, string>  $regions
     */
    public static function summarize(NewsItem $item, array $categories, array $regions, array $tags = []): string
    {
        $tagList = $tags ? implode(', ', $tags) : '(belum ada)';
        $categoryList = implode(', ', $categories);
        $regionLine = $regions
            ? "\n- \"region\": salah satu dari [".implode(', ', $regions).'] yang paling sesuai lokasi berita, atau null.'
            : '';

        $feed = $item->feed_excerpt
            ? "\nBahan cadangan dari RSS resmi situs ini (pakai HANYA jika halaman tidak bisa dibuka):\n\"\"\"\n".mb_substr($item->feed_excerpt, 0, 3000)."\n\"\"\"\n"
            : '';

        return <<<PROMPT
        Anda adalah redaktur portal berita daerah Indonesia.

        Buka artikel ini: {$item->url}
        Judul asli: {$item->title}

        Jika halaman tidak bisa dibuka (akses ditolak, error), coba jalur RESMI lain yang disediakan penerbit, berurutan:
        1. Versi AMP: tautan <link rel="amphtml"> di halaman, atau alamat yang sama dengan akhiran /amp atau ?amp=1.
        2. Bahan cadangan RSS di bawah (jika ada).
        Jangan membobol proteksi: jangan menyelesaikan captcha, login, melewati paywall, atau memakai layanan pihak ketiga untuk menyalin halaman.
        {$feed}

        Tulis SINOPSIS berita dalam Bahasa Indonesia dengan kalimat Anda sendiri.
        Aturan:
        - 3 sampai 5 paragraf, total 150-400 kata. Pisahkan paragraf dengan baris kosong.
        - Parafrasekan: JANGAN menyalin kalimat dari artikel asli. Maksimal kutipan langsung satu kalimat narasumber dalam tanda kutip.
        - Hanya fakta yang ada di artikel. Jangan menambah fakta, angka, atau opini.
        - Judul baru yang akurat dan tidak clickbait (bukan salinan judul asli).
        - Teks biasa tanpa HTML/markdown, tanpa menyebut "menurut sinopsis ini".

        Jika bukan artikel berita, terkunci paywall, atau tidak ada jalur resmi yang terbuka dan bahan cadangan kurang dari 80 kata, balas {"status":"not_article","reason":"..."}.
        Jika memakai bahan cadangan, tulis sinopsis hanya dari bahan itu (boleh lebih pendek, minimal 80 kata).

        Selain itu balas HANYA dengan JSON valid tanpa markdown:
        {
          "status": "ok",
          "read_from": "page | amp | rss",
          "title": "judul baru",
          "excerpt": "ringkasan 1-2 kalimat, maksimal 280 karakter",
          "synopsis": "paragraf 1\\n\\nparagraf 2\\n\\nparagraf 3",
          "image_url": "URL gambar utama artikel (utamakan og:image), atau null. Jangan mengarang.",
          "category": "salah satu dari [{$categoryList}]",{$regionLine}
          "tags": ["3-6 tag: tokoh, lembaga, tempat, atau topik utama. Pakai tag yang sudah ada jika cocok, persis ejaannya: [{$tagList}]. Buat tag baru HANYA jika tidak ada yang cocok, 1-4 kata, huruf kapital di awal kata."],
          "seo_title": "judul untuk hasil pencarian Google, maksimal 60 karakter, sebut nama daerah jika ada",
          "meta_description": "deskripsi untuk hasil pencarian, 120-155 karakter, berisi fakta utama dan nama daerah",
          "sentiment": "positif | netral | negatif — nada berita bagi warga dan daerahnya (prestasi/pembangunan = positif, bencana/kriminal/konflik = negatif, informasi biasa = netral)",
          "social_post": "teks siap bagikan ke WhatsApp/Instagram, 2-3 kalimat, maksimal 2 emoji, akhiri dengan 2-3 hashtag (termasuk nama daerah), tanpa tautan",
          "source_title": "judul asli artikel",
          "source_published_at": "ISO 8601 atau null",
          "source_opening": "salin persis 2 paragraf pertama artikel asli (dipakai untuk mengecek kemiripan; 50 kata pertamanya ditampilkan sebagai kutipan dengan tautan ke sumber)"
        }
        PROMPT;
    }

    /** "Review AI" shown to readers: built only from the article text we already publish. */
    public static function review(Article $article): string
    {
        $body = mb_substr($article->body, 0, 8000);

        return <<<PROMPT
        Anda adalah analis berita untuk pembaca portal berita daerah Indonesia.

        Tulis REVIEW singkat atas berita berikut dalam Bahasa Indonesia yang mudah dipahami.
        Judul: {$article->title}
        Isi:
        """
        {$body}
        """

        Aturan:
        - Hanya berdasarkan teks di atas. Jangan membuka tautan, jangan menambah fakta, angka, atau nama baru.
        - Bersikap netral. Jangan menghakimi pihak mana pun. Jika ada informasi penting yang belum dijelaskan berita, sebutkan sebagai hal yang belum diketahui.
        - Teks biasa tanpa HTML/markdown.

        Balas HANYA dengan JSON valid tanpa markdown:
        {
          "points": ["3 sampai 5 poin penting berita, masing-masing satu kalimat"],
          "review": "2 sampai 3 paragraf: konteks, dampak bagi masyarakat, dan hal yang perlu dicermati pembaca. Pisahkan paragraf dengan baris kosong."
        }
        PROMPT;
    }

    /** Directory draft: Hermes researches one region on the web; an editor verifies before readers see it. */
    public static function region(Region $region): string
    {
        $place = $region->parent ? "{$region->name}, Provinsi {$region->parent->name}" : "Provinsi {$region->name}";
        $facts = collect(RegionProfile::FACTS)->map(fn ($f, $key) => "- {$key}: {$f[0]}".($f[1] ? " ({$f[1]})" : ''))->implode("\n");
        $year = now()->year;

        return <<<PROMPT
        Anda adalah riset redaksi portal berita daerah Indonesia. Kumpulkan profil digital untuk: {$place} (kode Kemendagri {$region->code}).

        Cari di web dan BUKA halamannya sebelum mengutip. Utamakan sumber resmi, berurutan:
        BPS (bps.go.id, *.bps.go.id), situs resmi pemerintah daerah (*.go.id), Kemendagri, DJPK Kemenkeu (APBD), KPU (kepala daerah terpilih),
        dinas pariwisata / Kemenparekraf, lalu media berita nasional yang kredibel.

        Aturan keras:
        - JANGAN mengarang. Setiap fakta dan setiap entri WAJIB punya "source" berupa URL halaman yang benar-benar Anda buka dan memuat fakta itu.
        - Jika tidak menemukan sumber, lewati fakta/entri itu (jangan tulis perkiraan).
        - "as_of" = tahun atau tanggal data menurut sumber (misalnya "2024" untuk data penduduk BPS 2024).
        - Kepala daerah: pejabat yang menjabat saat ini (definitif atau Pj.), tulis nama lengkap tanpa gelar berlebihan.
        - APBD: total belanja APBD tahun terbaru dalam rupiah, misalnya "Rp 3,2 triliun".
        - Tulis dalam Bahasa Indonesia, kalimat sendiri, teks biasa tanpa HTML/markdown.

        Fakta yang dicari (kunci => arti):
        {$facts}

        Balas HANYA JSON valid tanpa markdown:
        {
          "status": "ok",
          "facts": {
            "population": {"value": "1.052.359", "source": "https://...", "as_of": "2024"}
          },
          "description": {"text": "2-3 paragraf profil singkat: letak, sejarah singkat, ekonomi, ciri khas. Pisahkan paragraf dengan baris kosong.", "source": "https://..."},
          "wisata": [{"name": "...", "description": "1-2 kalimat", "address": "kecamatan/desa", "website": "URL resmi atau null", "source": "https://..."}],
          "umkm": [{"name": "nama UMKM atau produk unggulan", "description": "1-2 kalimat", "address": "...", "website": "URL atau null", "source": "https://..."}],
          "events": [{"name": "...", "category": "daerah | seminar | workshop | festival | pameran", "description": "1-2 kalimat", "address": "lokasi", "organizer": "penyelenggara atau null", "starts_on": "YYYY-MM-DD", "ends_on": "YYYY-MM-DD atau null", "website": "URL atau null", "source": "https://..."}],
          "industri": [{"name": "kawasan industri / sentra industri", "description": "luas, sektor, tenant utama", "address": "...", "website": "URL atau null", "source": "https://..."}],
          "infrastruktur": [{"name": "tol, stasiun, bandara, pelabuhan, proyek strategis", "description": "status dan manfaat", "address": "...", "website": null, "source": "https://..."}],
          "properti": [{"name": "kawasan hunian / kota mandiri / proyek perumahan / kawasan komersial", "description": "jenis dan pengembang, TANPA harga", "address": "...", "website": "URL atau null", "source": "https://..."}],
          "pendidikan": [{"name": "perguruan tinggi / sekolah unggulan / politeknik", "description": "1-2 kalimat", "address": "...", "website": "URL atau null", "source": "https://..."}]
        }
        Maksimal 6 entri per daftar. Event hanya yang berlangsung mulai hari ini sampai akhir {$year} atau tahun depan dengan tanggal pasti.
        Hanya isi kunci "facts" yang sumbernya ditemukan.
        PROMPT;
    }
}
