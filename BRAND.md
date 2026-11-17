# NusantaraNews 360 — Brand Brief

Ringkasan identitas brand untuk keperluan desain logo. Semua data diambil dari kode proyek.

## 1. Identitas

| Item              | Isi                                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| Nama              | **NusantaraNews 360**                                                                               |
| Tagline (di logo) | `360 · INDONESIA`                                                                                   |
| Deskripsi         | NusantaraNews 360: berita nasional dan daerah dari 38 provinsi dan 514 kabupaten/kota di Indonesia. |
| Sub-judul beranda | Kabar harian dari 38 provinsi Indonesia                                                             |
| Bahasa            | Indonesia                                                                                           |

**Makna "360":** liputan menyeluruh dari segala sudut, dari pusat sampai pelosok daerah.

## 2. Tujuan Website

Portal berita nasional dan daerah yang mencakup seluruh Indonesia.

- **Fokus utamanya daerah.** Ada kanal per provinsi, pemilih wilayah, dan halaman region (38 provinsi, 514 kabupaten/kota).
- **Isinya** berita utama (headline slider), breaking news dalam bentuk ticker berjalan, berita terbaru, trending, dan berita nasional.
- **Ada redaksi berjenjang:** Super Admin → Editor provinsi → Wartawan kota → **Kontributor Warga** (ada unsur jurnalisme warga).
- **Ada fitur berita AI.** Berita dari berbagai sumber dikumpulkan dan diolah otomatis oleh agent AI, lalu dikurasi admin.
- **Desainnya mobile-first** dan terasa seperti aplikasi.

## 3. Warna Brand

Konsepnya **Merah Putih** (bendera Indonesia), ditambah navy untuk kesan serius dan terpercaya. Semua merah sengaja dibuat **satu hue**; versi yang lebih terang hanyalah merah yang sama dengan opacity rendah.

| Peran                           | Nama                | Hex       |
| ------------------------------- | ------------------- | --------- |
| **Warna utama**                 | Merah "Merah Putih" | `#A50E1E` |
| Merah gelap (hover/shadow)      | Merah dark          | `#6B0712` |
| Teks utama / gelap              | Navy 900            | `#0A1C36` |
| Navy pendukung                  | Navy 800            | `#0F2748` |
| Navy pendukung                  | Navy 700            | `#163563` |
| Navy muda (latar)               | Navy 100            | `#D6E2F2` |
| Navy muda (latar)               | Navy 50             | `#EEF3FA` |
| Aksen sekunder (jarang dipakai) | Teal                | `#14B8A6` |
| Latar halaman                   | Putih kemerahan     | `#FFFCFC` |
| Putih                           | White               | `#FFFFFF` |

Sumber: `resources/css/app.css`

## 4. Tipografi

- **Font:** [Poppins](https://fonts.google.com/specimen/Poppins), sans-serif geometris.
- **Judul / wordmark:** semibold (600), tracking rapat.
- **Tagline kecil:** medium (500), huruf kapital, letter-spacing lebar (±0.18em).

## 5. Gaya Visual

- Modern dan bersih.
- Sudut sangat membulat (radius 12–24px).
- Efek _frosted glass_ pada bar dan tombol mengambang.
- Bayangan lembut bernuansa merah.
- Latar putih dengan semburat merah tipis di bagian atas.

## 6. Logo Saat Ini

Sumber: `resources/js/components/logo.tsx`

- **Ikon:** kotak membulat merah `#A50E1E` dengan ikon **petir (bolt)** putih.
- **Wordmark:** "Nusantara" (navy `#0A1C36`) + "**News**" (merah `#A50E1E`).
- **Tagline:** `360 · INDONESIA` berwarna abu-abu di bawah wordmark.
- **Versi inverted (latar gelap):** kotak putih, ikon merah, teks putih.
- **Favicon** (`public/favicon.svg`) masih **logo bawaan Laravel**, jadi perlu diganti.

## 7. Arahan Logo Baru

**Konsep yang disarankan**

- Gabungan **"360" atau lingkaran** (cakupan menyeluruh) dengan **unsur Nusantara**, misalnya siluet kepulauan, peta, atau titik-titik pulau yang membentuk lingkaran.
- Tetap terasa sebagai **media berita**: tegas, terpercaya, cepat.

**Warna**

- Merah `#A50E1E` sebagai warna utama.
- Navy `#0A1C36` untuk teks.
- Putih sebagai ruang negatif.

**Kebutuhan teknis**

- Ikon harus tetap terbaca di ukuran kecil (favicon 32px, kotak 36px di header).
- Siapkan **versi terang** dan **versi gelap/inverted**.
- Siapkan **ikon saja** (tanpa teks) untuk favicon dan app icon.
- File yang dibutuhkan:
    - `favicon.svg`
    - `favicon.ico` (16/32/48px)
    - `apple-touch-icon.png` (180×180)
    - Logo lengkap (ikon + wordmark) dalam SVG
