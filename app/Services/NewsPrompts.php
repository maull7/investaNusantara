<?php

namespace App\Services;

use App\Models\Article;
use App\Models\NewsItem;
use App\Models\NewsSource;
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
    public static function summarize(NewsItem $item, array $categories, array $regions): string
    {
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
}
