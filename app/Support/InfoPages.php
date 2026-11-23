<?php

namespace App\Support;

/**
 * Static pages linked from the footer: about, newsroom, cyber media guidelines, privacy, terms.
 * Each section is a heading plus paragraphs; a paragraph starting with "- " renders as a list item.
 * ponytail: plain PHP content; move to an admin-editable table if the newsroom edits these often.
 */
class InfoPages
{
    public const SLUGS = ['tentang', 'redaksi', 'pedoman-media-siber', 'kebijakan-privasi', 'syarat-layanan'];

    /** @return array{title: string, description: string, updated: string, sections: list<array{heading: string, body: list<string>}>}|null */
    public static function find(string $slug): ?array
    {
        $app = config('app.name');
        $email = config('app.contact_email');

        return match ($slug) {
            'tentang' => [
                'title' => 'Tentang Kami',
                'description' => "{$app} adalah portal berita nasional dan daerah dari 38 provinsi dan 514 kabupaten/kota di Indonesia.",
                'updated' => '2026-11-23',
                'sections' => [
                    ['heading' => 'Siapa kami', 'body' => [
                        "{$app} adalah media berita daring yang menyajikan kabar nasional dan daerah dari seluruh Indonesia, dari pusat sampai pelosok. Angka \"360\" berarti liputan menyeluruh dari segala sudut.",
                    ]],
                    ['heading' => 'Fokus liputan', 'body' => [
                        '- Berita daerah dari 38 provinsi dan 514 kabupaten/kota.',
                        '- Ekonomi, UMKM, investasi, wisata, dan agenda daerah.',
                        '- Pusat Data Daerah: profil dan perbandingan data antarwilayah.',
                    ]],
                    ['heading' => 'Cara kami bekerja', 'body' => [
                        'Berita ditulis oleh wartawan dan kontributor, lalu diperiksa editor sebelum terbit. Sebagian berita disusun dengan bantuan kecerdasan buatan (AI) dari sumber terbuka; setiap berita seperti itu diberi label "Disusun dengan bantuan AI", mencantumkan sumbernya, dan dikurasi redaksi sebelum tayang.',
                    ]],
                    ['heading' => 'Hubungi kami', 'body' => [
                        "Kirim kabar, koreksi, atau kerja sama ke {$email}.",
                    ]],
                ],
            ],
            'redaksi' => [
                'title' => 'Redaksi',
                'description' => "Susunan dan alur kerja redaksi {$app}, serta cara menghubungi redaksi.",
                'updated' => '2026-11-23',
                'sections' => [
                    ['heading' => 'Struktur redaksi', 'body' => [
                        '- Pemimpin Redaksi: bertanggung jawab atas seluruh isi pemberitaan.',
                        '- Editor Provinsi: memeriksa dan menerbitkan berita di wilayahnya.',
                        '- Wartawan Kota/Kabupaten: meliput dan menulis berita daerah.',
                        '- Kontributor Warga: mengirim kabar dari lingkungannya; setiap kiriman diperiksa editor sebelum terbit.',
                    ]],
                    ['heading' => 'Koreksi dan hak jawab', 'body' => [
                        "Jika menemukan kekeliruan atau ingin menggunakan hak jawab, kirim email ke {$email} dengan menyertakan tautan berita dan penjelasannya. Koreksi dan hak jawab dimuat sesuai Pedoman Pemberitaan Media Siber.",
                    ]],
                    ['heading' => 'Kontak redaksi', 'body' => [
                        "Email: {$email}",
                    ]],
                ],
            ],
            'pedoman-media-siber' => [
                'title' => 'Pedoman Pemberitaan Media Siber',
                'description' => "{$app} tunduk pada Pedoman Pemberitaan Media Siber yang ditetapkan Dewan Pers.",
                'updated' => '2026-11-23',
                'sections' => [
                    ['heading' => 'Komitmen', 'body' => [
                        "{$app} menjalankan kegiatan jurnalistik berdasarkan Undang-Undang Nomor 40 Tahun 1999 tentang Pers, Kode Etik Jurnalistik, dan Pedoman Pemberitaan Media Siber yang ditetapkan Dewan Pers.",
                    ]],
                    ['heading' => 'Verifikasi dan keberimbangan berita', 'body' => [
                        'Setiap berita melalui verifikasi. Berita yang dapat merugikan pihak lain memerlukan verifikasi pada berita yang sama untuk memenuhi prinsip akurasi dan keberimbangan. Bila verifikasi belum dapat dilakukan karena alasan mendesak, hal itu dijelaskan dalam berita dan verifikasi dilanjutkan pada berita pemutakhiran.',
                    ]],
                    ['heading' => 'Isi buatan pengguna', 'body' => [
                        'Pengguna wajib mematuhi Syarat Layanan. Isi yang bohong, fitnah, sadis, cabul, mengandung prasangka dan kebencian terkait SARA, atau menganjurkan kekerasan dilarang dan akan dihapus. Pengguna dapat melaporkan isi yang melanggar ke redaksi.',
                    ]],
                    ['heading' => 'Ralat, koreksi, dan hak jawab', 'body' => [
                        'Ralat, koreksi, dan hak jawab dimuat pada berita yang dikoreksi dan ditautkan dengan berita aslinya, disertai waktu pemuatannya.',
                    ]],
                    ['heading' => 'Pencabutan berita', 'body' => [
                        'Berita yang sudah terbit tidak dicabut karena tekanan pihak luar. Pencabutan hanya dilakukan karena alasan SARA, kesusilaan, masa depan anak, pengalaman traumatik korban, atau pertimbangan khusus lain yang ditetapkan Dewan Pers, dan disertai penjelasan kepada publik.',
                    ]],
                    ['heading' => 'Sengketa', 'body' => [
                        "Sengketa pemberitaan diselesaikan melalui Dewan Pers. Pengaduan dapat dikirim ke redaksi di {$email}. Naskah lengkap pedoman tersedia di situs Dewan Pers (dewanpers.or.id).",
                    ]],
                ],
            ],
            'kebijakan-privasi' => [
                'title' => 'Kebijakan Privasi',
                'description' => "Bagaimana {$app} mengumpulkan, memakai, dan melindungi data pribadi pembaca.",
                'updated' => '2026-11-23',
                'sections' => [
                    ['heading' => 'Data yang kami kumpulkan', 'body' => [
                        '- Data akun: nama, email, dan password (disimpan dalam bentuk hash, tidak bisa dibaca siapa pun). Bila masuk dengan Google, kami menerima nama dan email dari akun Google Anda.',
                        '- Data langganan: nama organisasi, kontak, dan pilihan paket yang Anda isi.',
                        '- Data penggunaan: berita yang dibaca dan disimpan, serta alamat IP dan jenis peramban dalam bentuk tersamarkan untuk menghitung jumlah pembaca.',
                        '- Cookie yang diperlukan agar Anda tetap masuk dan formulir aman.',
                    ]],
                    ['heading' => 'Untuk apa data dipakai', 'body' => [
                        '- Menyediakan akun, berita tersimpan, dan layanan langganan.',
                        '- Menghitung berita terpopuler dan meningkatkan layanan.',
                        '- Mencegah penyalahgunaan, misalnya dengan verifikasi captcha Cloudflare Turnstile.',
                        'Kami tidak menjual data pribadi Anda.',
                    ]],
                    ['heading' => 'Pihak ketiga', 'body' => [
                        'Kami memakai layanan pihak ketiga yang memproses data sesuai kebijakan mereka: Google (login), Cloudflare (keamanan dan captcha), dan penyedia server kami.',
                    ]],
                    ['heading' => 'Hak Anda', 'body' => [
                        "Sesuai Undang-Undang Pelindungan Data Pribadi, Anda dapat meminta salinan, perbaikan, atau penghapusan data pribadi Anda. Kirim permintaan ke {$email} dari email akun Anda; kami memprosesnya paling lambat 14 hari kerja.",
                    ]],
                    ['heading' => 'Perubahan kebijakan', 'body' => [
                        'Kebijakan ini dapat diperbarui. Tanggal pembaruan terakhir tercantum di halaman ini.',
                    ]],
                ],
            ],
            'syarat-layanan' => [
                'title' => 'Syarat Layanan',
                'description' => "Ketentuan penggunaan situs dan akun {$app}.",
                'updated' => '2026-11-23',
                'sections' => [
                    ['heading' => 'Penerimaan syarat', 'body' => [
                        "Dengan memakai {$app}, Anda menyetujui syarat ini. Jika tidak setuju, mohon tidak memakai layanan ini.",
                    ]],
                    ['heading' => 'Akun', 'body' => [
                        '- Anda bertanggung jawab menjaga kerahasiaan password dan aktivitas di akun Anda.',
                        '- Informasi yang Anda isi harus benar.',
                        '- Kami dapat menangguhkan akun yang melanggar syarat ini.',
                    ]],
                    ['heading' => 'Hak cipta', 'body' => [
                        "Seluruh isi {$app} dilindungi hak cipta. Anda boleh membagikan tautan berita, tetapi tidak boleh menyalin ulang isi lengkapnya tanpa izin tertulis.",
                    ]],
                    ['heading' => 'Kiriman kontributor', 'body' => [
                        'Kontributor menjamin kirimannya asli, benar, dan tidak melanggar hak pihak lain. Redaksi berhak menyunting, menolak, atau menurunkan kiriman sesuai Pedoman Pemberitaan Media Siber.',
                    ]],
                    ['heading' => 'Langganan', 'body' => [
                        'Paket langganan aktif setelah pengajuan disetujui. Rincian harga dan masa berlaku tercantum di halaman Langganan.',
                    ]],
                    ['heading' => 'Batasan tanggung jawab', 'body' => [
                        'Kami berupaya menyajikan informasi yang akurat, namun tidak bertanggung jawab atas keputusan yang diambil semata-mata berdasarkan isi situs ini, termasuk ringkasan dan review yang disusun AI.',
                    ]],
                    ['heading' => 'Hukum yang berlaku', 'body' => [
                        "Syarat ini tunduk pada hukum Republik Indonesia. Pertanyaan dapat dikirim ke {$email}.",
                    ]],
                ],
            ],
            default => null,
        };
    }
}
