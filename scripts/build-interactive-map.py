"""Build lightweight GeoJSON for /wilayah from the sources used by build-region-maps.py.

Usage: python scripts/build-interactive-map.py --prov prov.json --kab gb2.json
"""
import argparse
import csv
import json
import os
import re

parser = argparse.ArgumentParser()
parser.add_argument('--prov', required=True)
parser.add_argument('--kab', required=True)
parser.add_argument('--out', default='public/maps/interactive')
args = parser.parse_args()


def norm(name):
    name = name.lower().strip()
    name = re.sub(r'^(kabupaten administrasi|kota administrasi|kabupaten|kota)\s+', '', name)
    return re.sub(r'[^a-z0-9]', '', name)


aliases = {
    'daerahkhususibukotajakarta': 'dkijakarta',
    'toba': 'tobasamosir', 'kotabaru': 'baru',
    'mahakamulu': 'mahakamhulu',
    'kepsiautagulandangbiaro': 'siautagulandangbiaro',
    'pasangkayu': 'mamujuutara',
    'kepulauantanimbar': 'malukutenggarabarat',
}


def key(name):
    value = norm(name)
    return aliases.get(value, value)


def simplify_ring(ring, step=3):
    # Sample along the existing simplified source, retaining closure.
    points = ring[::step]
    if points[-1] != ring[-1]:
        points.append(ring[-1])
    return [[round(p[0], 3), round(p[1], 3)] for p in points] if len(points) >= 4 else []


def signed_area(ring):
    return sum(ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1] for i in range(len(ring) - 1)) / 2


def rewind(polygon):
    # d3-geo works on the sphere: exterior rings must run clockwise, holes counter-clockwise
    # (the opposite of RFC 7946). Wrong winding makes a shape cover the whole globe.
    return [ring[::-1] if (signed_area(ring) > 0) == (i == 0) else ring for i, ring in enumerate(polygon)]


def simplify(geometry, step=3):
    polygons = [geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']
    polygons = [[r for ring in polygon if (r := simplify_ring(ring, step))] for polygon in polygons]
    polygons = [rewind(p) for p in polygons if p]
    return {'type': 'MultiPolygon', 'coordinates': polygons}


def feature(code, geometry):
    return {'type': 'Feature', 'properties': {'code': code}, 'geometry': simplify(geometry)}


regions = list(csv.DictReader(open('database/data/regions.csv', encoding='utf-8')))
provinces = {norm(f['properties']['PROVINSI']): f['geometry'] for f in json.load(open(args.prov, encoding='utf-8'))['features'] if f['geometry']}
boundaries = json.load(open(args.kab, encoding='utf-8'))['features']
cities, regencies = {}, {}
for boundary in boundaries:
    name = boundary['properties']['shapeName'].strip()
    target = cities if name.startswith('Kota ') and name != 'Kota Baru' else regencies
    target.setdefault(norm(name), boundary['geometry'])

os.makedirs(args.out, exist_ok=True)
national = [feature(r['code'], provinces[key(r['name'])]) for r in regions if '.' not in r['code'] and key(r['name']) in provinces]
with open(os.path.join(args.out, 'provinces.json'), 'w') as output:
    json.dump({'type': 'FeatureCollection', 'features': national}, output, separators=(',', ':'))

by_province = {}
for r in regions:
    if r['code'].count('.') != 1:
        continue
    source = cities if r['name'].startswith('Kota ') else regencies
    fallback = regencies if source is cities else cities
    geometry = source.get(key(r['name'])) or fallback.get(key(r['name']))
    if geometry:
        by_province.setdefault(r['code'][:2], []).append(feature(r['code'], geometry))
for code, features in by_province.items():
    with open(os.path.join(args.out, f'{code}.json'), 'w') as output:
        json.dump({'type': 'FeatureCollection', 'features': features}, output, separators=(',', ':'))
print(f'{len(national)} provinces, {sum(map(len, by_province.values()))} cities')
