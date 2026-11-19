"""
Resolves a freely licensed photo for every UMKM in province-profiles-data.py from Wikimedia Commons,
saves a 480px copy in public/umkm/ and writes database/data/province_profiles.json (with credits).

Only CC BY / CC BY-SA / CC0 / public-domain files are used; credit is kept in the JSON and shown on the page.
Run: python -I scripts/fetch-umkm-images.py            (re-run is safe: existing files are kept)
"""
import json
import os
import re
import runpy
import time
import urllib.parse
import urllib.request

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
API = 'https://commons.wikimedia.org/w/api.php'
UA = 'NusantaraNewsBot/1.0 (educational news portal; image credits kept in profile data)'
OK_LICENSE = re.compile(r'^(CC BY|CC BY-SA|CC0|Public domain|PD)', re.I)

# Photos checked by eye and rejected (wrong subject, duplicate, or unsuitable): (province code, UMKM name).
BLOCKED = {
    ('15', 'Batik Jambi'), ('15', 'Kopi Kerinci'), ('21', 'Gonggong'), ('21', 'Tenun Songket Melayu'),
    ('31', 'Batik Betawi'), ('35', 'Kerupuk Udang'), ('18', 'Kain Tapis'), ('71', 'Kain Bentenan'),
    ('73', 'Kopi Toraja'), ('74', 'Jambu Mete'), ('76', 'Sutra Mandar'), ('92', 'Noken Arfak'),
    ('94', 'Noken'), ('95', 'Noken Dani'), ('96', 'Sagu Sorong'), ('96', 'Cenderamata Raja Ampat'),
}

data = runpy.run_path(os.path.join(ROOT, 'scripts', 'province-profiles-data.py'))['PROFILES']
out_dir = os.path.join(ROOT, 'public', 'umkm')
os.makedirs(out_dir, exist_ok=True)


def get(url, binary=False):
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=40) as r:
                body = r.read()
                return body if binary else json.loads(body)
        except Exception:
            time.sleep(2 + attempt * 3)
    return None


def strip(html):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', html or '')).strip()


def find(query):
    params = urllib.parse.urlencode({
        'action': 'query', 'generator': 'search', 'gsrsearch': f'{query} filetype:bitmap', 'gsrnamespace': 6,
        'gsrlimit': 8, 'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size', 'iiurlwidth': 480, 'format': 'json',
    })
    res = get(f'{API}?{params}')
    pages = sorted((res or {}).get('query', {}).get('pages', {}).values(), key=lambda p: p.get('index', 99))
    for p in pages:
        info = (p.get('imageinfo') or [{}])[0]
        meta = info.get('extmetadata', {})
        license_name = meta.get('LicenseShortName', {}).get('value', '')
        if info.get('thumburl') and info.get('width', 0) >= 480 and OK_LICENSE.match(license_name):
            return {
                'thumb': info['thumburl'],
                'credit': strip(meta.get('Artist', {}).get('value'))[:80] or 'Wikimedia Commons',
                'license': license_name,
                'page': info.get('descriptionurl'),
            }
    return None


profiles = {}
for code, (capital, region, summary, icons, umkm) in data.items():
    items = []
    for i, (name, category, text, query) in enumerate(umkm, 1):
        item = {'name': name, 'category': category, 'description': text, 'image': None}
        path = os.path.join(out_dir, f'{code}-{i}.jpg')
        found = None if (code, name) in BLOCKED else (find(query) or find(name))
        time.sleep(0.4)
        if found:
            if not os.path.exists(path):
                body = get(found['thumb'], binary=True)
                if body:
                    open(path, 'wb').write(body)
            if os.path.exists(path):
                item['image'] = {'url': f'/umkm/{code}-{i}.jpg', 'credit': found['credit'], 'license': found['license'], 'page': found['page']}
        print(code, name, '->', 'ok' if item['image'] else 'NO IMAGE', flush=True)
        items.append(item)
    profiles[code] = {'capital': capital, 'region': region, 'summary': summary, 'icons': icons, 'umkm': items}

with open(os.path.join(ROOT, 'database', 'data', 'province_profiles.json'), 'w', encoding='utf-8') as f:
    json.dump(profiles, f, ensure_ascii=False, indent=1)
print('done', sum(len(p['umkm']) for p in profiles.values()), 'umkm,', sum(1 for p in profiles.values() for u in p['umkm'] if u['image']), 'with image')
