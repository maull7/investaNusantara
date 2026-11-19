"""
Builds public/landmarks/{code}.svg (line-art landmark per region) and database/data/landmarks.csv.

Icons are single-colour (black stroke on transparent, 100x100): the site uses them as a CSS mask,
so the colour comes from the page. A region without its own icon uses its province's
(see App\\Models\\Region::landmark). To add one: add a line to ICONS, run `python -I scripts/build-landmarks.py`.
"""
import os

G = 'M8 90H92'  # ground line

ICONS = {
    # ---- Provinsi ----
    '11': ('Masjid Raya Baiturrahman', f'{G}M30 90V62h40v28M36 62a14 14 0 0 1 28 0M50 48V40M44 90V77a6 6 0 0 1 12 0v13M14 90V50M10 50a4 4 0 0 1 8 0M86 90V50M82 50a4 4 0 0 1 8 0M30 62a5 5 0 0 1 10 0M60 62a5 5 0 0 1 10 0'),
    '12': ('Rumah Bolon', f'{G}M26 90V68h48v22M16 68l12-30h44l12 30zM30 38l-6-12M70 38l6-12M40 68v22M60 68v22M26 76h48'),
    '13': ('Rumah Gadang', f'{G}M22 90V66h56v24M14 66c8-4 10-16 12-30 6 4 10 8 24 10 14-2 18-6 24-10 2 14 4 26 12 30zM36 66v24M64 66v24M22 78h56'),
    '14': ('Candi Muara Takus', f'{G}M22 90V78h56v12M30 78V66h40v12M38 66V54h24v12M44 54V44h12v10M50 44V30M46 30h8M50 30V24'),
    '15': ('Candi Muaro Jambi', f'{G}M16 90V78h68v12M24 78V66h52v12M32 66V54h36v12M40 54V42h20v12M46 42V30h8v12M50 30V22M44 90V82h12v8'),
    '16': ('Jembatan Ampera', f'{G}M8 78h84M28 78V30M72 78V30M24 30h8M68 30h8M28 30L8 78M28 30l14 48M72 30L92 78M72 30L58 78M28 40h44M10 90c12-6 24-6 36 0s24 6 44 0'),
    '17': ('Bunga Rafflesia', f'M50 52a10 10 0 1 0 0 .1M50 42c-4-14-18-16-22-8s2 16 14 16M58 50c14-4 18-18 10-22s-16 2-18 14M56 60c10 10 24 6 24-4s-12-14-24-8M44 60c-10 10-24 6-24-4s12-14 24-8M50 62c-6 14 4 24 14 18M50 90v-14M36 90h28'),
    '18': ('Menara Siger', f'{G}M30 90V54M70 90V54M24 54h12M64 54h12M30 54c0-12 8-20 20-26 12 6 20 14 20 26M42 40l8 8 8-8M50 28V18M34 90V62h32v28'),
    '19': ('Mercusuar Pulau Lengkuas', f'{G}M38 90l4-52h16l4 52M42 38l8-10 8 10M50 28V16M46 16h8M44 56h12M42 72h16M10 90c10-4 20-4 30 0M60 90c10-4 20-4 30 0'),
    '21': ('Jembatan Barelang', f'{G}M8 80h84M30 80V24M70 80V24M30 24L8 80M30 24l12 56M30 24L50 80M70 24L50 80M70 24L58 80M70 24l22 56M8 90c14-6 28-6 42 0s28 6 42 0'),
    '31': ('Monumen Nasional', f'{G}M24 90V80h52v10M34 80V70h32v10M44 70L47 26h6l3 44M42 26h16M44 26V20h12v6M50 20v-6M52 12a6 6 0 1 0-4 0'),
    '32': ('Gedung Sate', f'{G}M14 90V58h72v32M14 58h72M30 58V46h40v12M42 46V34h16v12M50 34V20M46 28h8M50 20l-4-6M50 20l4-6M22 90V68h8v22M70 90V68h8v22M42 90V70h16v20'),
    '33': ('Candi Borobudur', f'{G}M12 90V78h76v12M20 78V66h60v12M28 66V54h44v12M36 54V44h28v10M44 44V34h12v10M50 34V24M44 24h12M30 60h.1M42 60h.1M58 60h.1M70 60h.1'),
    '34': ('Tugu Yogyakarta', f'{G}M30 90V80h40v10M36 80V64h28v16M40 64L44 30h12l4 34M44 30c0-8 3-12 6-16 3 4 6 8 6 16M50 14V8M40 90V84M60 90V84'),
    '35': ('Gunung Bromo', f'{G}M6 90l26-34 8 8 10-14 12 18 8-8 24 30M44 50c0-6 4-10 4-16s-4-8-2-14M34 90V74M66 90V76'),
    '36': ('Menara Masjid Agung Banten', f'{G}M34 90V76h32v14M38 76V62h24v14M42 62V50h16v12M45 50V40h10v10M50 40V28M47 28h6M50 28V20M20 90V70l10-6v26M70 90V64l10 6v20'),
    '51': ('Pura Ulun Danu Bratan', f'{G}M26 90V78h48v12M20 78h60M34 78V68h32v10M28 68h44M40 68V58h20v10M34 58h32M44 58V48h12v10M40 48h20M48 48V40M50 40V32M10 94c14-4 26-4 40 0s26 4 40 0'),
    '52': ('Gunung Rinjani', f'{G}M4 90l30-44 10-6 6 8 8-4 12 8 26 38M44 40l6 8 6-8M20 74c14-6 30 0 48-4 10-2 18 0 24 4'),
    '53': ('Rumah Adat Sumba', f'{G}M30 90V72h40v18M24 72h52M34 72L50 16l16 56M44 54h12M40 90V80M60 90V80M30 82h40'),
    '61': ('Tugu Khatulistiwa', f'{G}M30 90V80h40v10M38 80V54h24v26M30 54h40M42 54V38h16v16M36 38h28M50 38V22M50 22l-8-8M50 22l8-8M44 66h12'),
    '62': ('Rumah Betang', f'{G}M12 66h76M18 66l4-16h56l4 16M24 50l6-12h40l6 12M20 66v24M36 66v24M52 66v24M68 66v24M82 66v24M26 80h52'),
    '63': ('Pasar Terapung', f'{G}M18 78c4 10 60 10 64 0M24 78h52M40 62c0-14 20-14 20 0M32 62h36M50 62V50M10 90c14-4 26-4 40 0s26 4 40 0'),
    '64': ('Islamic Center Samarinda', f'{G}M30 90V62h40v28M36 62a14 14 0 0 1 28 0M50 48V40M86 90V30M82 30h8M84 30V22h4v8M14 90V54M10 54h8M12 54V46h4v8M44 90V76a6 6 0 0 1 12 0v14'),
    '65': ('Rumah Baloy Mido', f'{G}M16 70h68M22 70l8-20h40l8 20M30 50l20-22 20 22M50 28V18M20 70v20M36 70v20M64 70v20M80 70v20M26 80h48'),
    '71': ('Monumen Yesus Memberkati', f'{G}M34 90V74h32v16M40 74V62h20v12M50 62V30M50 36c-10 0-18 6-24 18M50 36c10 0 18 6 24 18M50 30a5 5 0 1 0 0-.1M44 90V80h12v10'),
    '72': ('Jembatan Palu IV', f'{G}M6 84h88M10 84C22 36 78 36 90 84M26 56V84M38 44V84M50 40V84M62 44V84M74 56V84M6 94c14-4 26-4 44 0s30 4 44 0'),
    '73': ('Rumah Tongkonan', f'{G}M26 90V72h48v18M10 56c12 0 16-12 22-30l18 6 18-6c6 18 10 30 22 30zM34 72V90M66 72V90M26 80h48'),
    '74': ('Benteng Keraton Buton', f'{G}M8 90V58h84v32M8 58V50h8v8M22 58V50h8v8M36 58V50h8v8M50 58V50h8v8M64 58V50h8v8M78 58V50h8v8M42 90V76a8 8 0 0 1 16 0v14'),
    '75': ('Benteng Otanaha', f'{G}M14 90V60h22v30M64 90V50h22v40M14 60V52h6v8M24 60V52h6v8M64 50V42h6v8M76 50V42h6v8M36 78h28M36 72h28M30 90V80M70 90V80'),
    '76': ('Perahu Sandeq', f'M8 70c14 10 70 10 84 0M20 70L50 16l30 54zM50 16V70M10 84c12-4 24-4 40 0s28 4 40 0M82 70l8 14M18 70L10 84'),
    '81': ('Gong Perdamaian Dunia', f'{G}M24 90V24M76 90V24M20 24h60M50 24V36M50 62m-22 0a22 22 0 1 0 44 0 22 22 0 1 0-44 0M50 62m-10 0a10 10 0 1 0 20 0 10 10 0 1 0-20 0'),
    '82': ('Gunung Gamalama', f'{G}M6 90l34-54h20l34 54M44 36c-2-8 6-12 2-22M54 36c4-8 10-6 8-18M20 74c14-6 32 0 50-4 8-2 14 0 20 4'),
    '91': ('Honai', f'{G}M24 90V62h52v28M18 62c0-24 14-40 32-40s32 16 32 40zM50 22V14M42 90V76a8 8 0 0 1 16 0v14'),
    '92': ('Burung Cendrawasih', f'M58 24c-8-6-18 0-16 10 2 8 8 10 8 18 0 6-6 8-14 12-6 4-12 10-18 22M58 24l12-2-10 6M44 34l-12-4M50 52c8 4 14 14 12 36M54 54c12 6 20 18 22 32M56 56c10 2 22 8 30 18'),
    '93': ('Tugu Sabang-Merauke', f'{G}M30 90V80h40v10M38 80V70h24v10M44 70L47 20h6l3 50M47 20h6M50 20V10M50 10h14v8H50'),
    '94': ('Puncak Jaya', f'{G}M4 90l24-36 8 6 14-34 10 22 10-8 26 50M42 38l8 12 6-8M26 56l4 8M62 52l4 6'),
    '95': ('Lembah Baliem', f'{G}M6 66l20-26 14 16 18-24 22 28 14-14M30 90V76h24v14M26 76c0-10 8-16 16-16s16 6 16 16zM70 90V80h16v10M68 80c0-6 6-10 10-10s10 4 10 10z'),
    '96': ('Raja Ampat', f'M8 78c10-2 14-8 12-20-2-8 6-10 10-4 2 8 0 16 6 20M46 78c8-4 10-12 8-26-2-10 10-12 12-2 2 12 0 22 8 28M6 84c14-4 26-4 44 0s30 4 44 0M10 92c14-4 26-4 40 0s26 4 40 0M18 54c4-4 12-4 16 0M54 40c4-4 12-4 16 0'),
    # ---- Kota / kabupaten ----
    '11.71': ('Masjid Raya Baiturrahman', None),
    '12.71': ('Istana Maimun', f'{G}M12 90V60h76v30M12 60l10-12h56l10 12M30 48V38h40v10M40 38a10 10 0 0 1 20 0M50 28V22M20 90V70h10v20M70 90V70h10v20M42 90V76a8 8 0 0 1 16 0v14'),
    '13.75': ('Jam Gadang', f'{G}M36 90V40h28v50M30 40h40M36 40L50 18l14 22M50 18V10M42 58a8 8 0 1 0 16 0 8 8 0 1 0-16 0M50 58v-5M50 58l4 2M30 90h40'),
    '14.71': ('Masjid Raya An-Nur', f'{G}M24 90V64h52v28M32 64a18 18 0 0 1 36 0M50 46V38M12 90V44M10 44h4M88 90V44M86 44h4M40 90V76a10 10 0 0 1 20 0v14'),
    '15.71': ('Tugu Keris Siginjai', f'{G}M34 90V80h32v10M50 80V20M50 20c-4 6-6 14-6 24h12c0-10-2-18-6-24M44 44l-6 6M56 44l6 6'),
    '16.71': ('Jembatan Ampera', None),
    '17.71': ('Benteng Marlborough', f'{G}M10 90V60l12-10h56l12 10v30M10 60h80M26 50V40h8v10M66 50V40h8v10M40 90V74a10 10 0 0 1 20 0v14M16 74h14M70 74h14'),
    '18.71': ('Menara Siger', None),
    '19.71': ('Pantai Pasir Padi', f'{G}M8 70c14-6 28-6 42 0s28 6 42 0M30 90V50M30 50c-10 0-16 6-18 12M30 50c10 0 16 6 18 12M30 50c0-8-6-12-12-12M30 50c0-8 6-12 12-12M66 62a8 8 0 0 1 16 0'),
    '31.71': ('Monumen Nasional', None),
    '32.71': ('Tugu Kujang', f'{G}M34 90V80h32v10M40 80V70h20v10M50 70V16M50 16c-10 6-14 18-12 32 2 8 8 14 12 22M50 16c10 6 12 16 8 26l-8 10M42 36a3 3 0 1 0 6 0M50 16l6-6'),
    '32.73': ('Gedung Sate', None),
    '32.74': ('Keraton Kasepuhan', f'{G}M12 90V62h76v28M8 62h84M16 62l10-14h48l10 14M34 48l16-20 16 20M50 28V18M30 90V76h12v14M58 90V76h12v14M44 90V68h12v22'),
    '32.76': ('Masjid Kubah Emas', f'{G}M24 90V66h52v24M30 66a20 20 0 0 1 40 0M50 46V38M14 90V50M12 50h4M86 90V50M84 50h4M36 66a6 6 0 0 1 12 0M52 66a6 6 0 0 1 12 0M42 90V80h16v10'),
    '33.72': ('Keraton Surakarta', f'{G}M10 90V64h80v26M6 64h88M18 64l8-12h48l8 12M34 52V40h32v12M42 40V30h16v10M50 30V20M24 90V76h10v14M66 90V76h10v14M44 90V72h12v18'),
    '33.74': ('Lawang Sewu', f'{G}M8 90V56h84v34M8 56h84M30 56V40h40v16M42 40V28h16v12M50 28V18M16 90V72a4 4 0 0 1 8 0v18M32 90V72a4 4 0 0 1 8 0v18M60 90V72a4 4 0 0 1 8 0v18M76 90V72a4 4 0 0 1 8 0v18M44 90V68a6 6 0 0 1 12 0v22'),
    '33.76': ('Teh Poci', f'M22 52h44v26c0 8-6 14-14 14H36c-8 0-14-6-14-14zM66 58h8c6 0 8 4 8 8s-2 8-8 8h-8M30 52c0-6 6-10 14-10s14 4 14 10M36 38c-4-6 4-10 0-16M48 38c-4-6 4-10 0-16'),
    '34.71': ('Tugu Yogyakarta', None),
    '35.73': ('Tugu Malang', f'{G}M26 90V78h48v12M34 78V66h32v12M40 66l4-36h12l4 36M44 30c0-6 3-10 6-14 3 4 6 8 6 14M50 16V8M30 90c0-6 4-10 4-12M70 90c0-6-4-10-4-12'),
    '35.78': ('Tugu Pahlawan', f'{G}M26 90V78h48v12M34 78V68h32v10M42 68V56M58 68V56M42 56h16M46 56L47 22h6l1 34M44 22l6-10 6 10M50 12V6M40 90V82M60 90V82'),
    '36.71': ('Masjid Raya Al-Azhom', f'{G}M24 90V66h52v24M30 66a20 20 0 0 1 40 0M50 46V38M14 90V48M12 48h4M86 90V48M84 48h4M42 90V78a8 8 0 0 1 16 0v12'),
    '36.72': ('Pabrik Baja Krakatau', f'{G}M14 90V56h24v34M46 90V40h14v50M68 90V60h20v30M50 40V28M54 40V22M18 56V46h6v10M22 70h10M72 72h12M20 80h12'),
    '36.73': ('Menara Masjid Agung Banten', None),
    '51.71': ('Patung Catur Muka', f'{G}M30 90V76h40v14M38 76V64h24v12M42 64h16M46 64V28h8v36M40 28h20M44 28c-2-8 2-10 6-14 4 4 8 6 6 14M34 44l12-4M66 44L54 40M36 56l10-2M64 56l-10-2'),
    '52.71': ('Lumbung Sasak', f'{G}M30 90V72h40v18M24 72h52M26 72L50 38l24 34M50 38V28M44 28h12M34 90V80M66 90V80M44 90V80h12v10'),
    '53.71': ('Pantai Lasiana', f'{G}M8 72c14-6 28-6 42 0s28 6 42 0M30 90V48M30 48c-10 0-16 6-18 12M30 48c10 0 16 6 18 12M30 48c0-8-6-12-12-12M30 48c0-8 6-12 12-12M70 38a8 8 0 1 0 0 .1'),
    '61.71': ('Tugu Khatulistiwa', None),
    '61.72': ('Klenteng Singkawang', f'{G}M12 90V62h76v28M6 62c10 0 14-8 14-8h60s4 8 14 8M16 54l6-10h56l6 10M34 44l16-14 16 14M50 30V22M42 90V74h16v16M24 74h10M66 74h10'),
    '63.71': ('Pasar Terapung', None),
    '64.71': ('Patung Beruang Madu', f'M34 38a6 6 0 1 0 0 .1M60 38a6 6 0 1 0 0 .1M26 52c0-14 10-20 24-20s24 6 24 20-10 18-24 18-24-4-24-18zM44 52h12M50 52v6M20 90c4-14 14-20 30-20s26 6 30 20M44 60h12'),
    '64.72': ('Islamic Center Samarinda', None),
    '71.71': ('Monumen Yesus Memberkati', None),
    '72.71': ('Jembatan Palu IV', None),
    '73.71': ('Pantai Losari', f'{G}M8 74c14-6 28-6 42 0s28 6 42 0M16 74L40 28l24 46M40 28V74M10 90c14-4 26-4 40 0s26 4 40 0M70 40a8 8 0 1 0 0 .1'),
    '75.71': ('Benteng Otanaha', None),
    '81.71': ('Gong Perdamaian Dunia', None),
    '82.71': ('Gunung Gamalama', None),
    '91.71': ('Jembatan Youtefa', f'{G}M6 84h88M10 84C24 30 76 30 90 84M26 52V84M42 38V84M58 38V84M74 52V84M6 94c14-4 26-4 44 0s30 4 44 0'),
    '96.71': ('Raja Ampat', None),
}

root = os.path.join(os.path.dirname(__file__), '..')
out = os.path.join(root, 'public', 'landmarks')
os.makedirs(out, exist_ok=True)
rows = []
# Entries with None reuse an icon drawn for the same landmark elsewhere.
by_name = {n: d for n, d in ICONS.values() if d}
for code, (name, d) in ICONS.items():
    d = d or by_name[name]
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="#000" '
           f'stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="{d}"/></svg>')
    open(os.path.join(out, f'{code}.svg'), 'w', encoding='utf-8').write(svg)
    rows.append(f'{code},{name}')
open(os.path.join(root, 'database', 'data', 'landmarks.csv'), 'w', encoding='utf-8', newline='').write('code,name\n' + '\n'.join(rows) + '\n')
print(len(rows), 'icons')
