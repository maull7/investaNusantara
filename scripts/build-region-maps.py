"""
Builds public/maps/{code}.svg (one outline map per province and kabupaten/kota).

Sources (download once, pass the paths):
  --prov   38 provinsi GeoJSON, props KODE_PROV
           https://github.com/ardian28/GeoJson-Indonesia-38-Provinsi (Provinsi/...Provinsi.json)
  --kab    geoBoundaries IDN ADM2 simplified GeoJSON, props shapeName (CC BY 3.0 IGO, credit geoBoundaries)
           https://www.geoboundaries.org/api/current/gbOpen/IDN/ADM2/
Run: python -I scripts/build-region-maps.py --prov prov.json --kab gb2.json
"""
import argparse
import csv
import json
import math
import os
import re

ap = argparse.ArgumentParser()
ap.add_argument('--prov', required=True)
ap.add_argument('--kab', required=True)
ap.add_argument('--regions', default='database/data/regions.csv')
ap.add_argument('--out', default='public/maps')
a = ap.parse_args()

SIZE = 1000.0


def rings(geom):
    """List of polygons; each polygon is a list of rings (lon, lat)."""
    if geom['type'] == 'Polygon':
        return [geom['coordinates']]
    return geom['coordinates']


def bbox_of(polys):
    xs = [p[0] for poly in polys for r in poly[:1] for p in r]
    ys = [p[1] for poly in polys for r in poly[:1] for p in r]
    return min(xs), min(ys), max(xs), max(ys)


def dp(points, tol):
    """Douglas-Peucker, iterative."""
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        s, e = stack.pop()
        (x1, y1), (x2, y2) = points[s], points[e]
        dx, dy = x2 - x1, y2 - y1
        norm = math.hypot(dx, dy)
        best, idx = 0.0, -1
        for i in range(s + 1, e):
            px, py = points[i]
            d = (math.hypot(px - x1, py - y1) if norm == 0
                 else abs(dy * px - dx * py + x2 * y1 - y2 * x1) / norm)
            if d > best:
                best, idx = d, i
        if best > tol and idx != -1:
            keep[idx] = True
            stack += [(s, idx), (idx, e)]
    return [p for p, k in zip(points, keep) if k]


def area(r):
    return abs(sum(r[i][0] * r[(i + 1) % len(r)][1] - r[(i + 1) % len(r)][0] * r[i][1] for i in range(len(r)))) / 2


class View:
    """Equirectangular fit of a bbox into a 1000-unit box."""

    def __init__(self, box, pad=0.06):
        x0, y0, x1, y1 = box
        self.k = math.cos(math.radians((y0 + y1) / 2))
        w, h = (x1 - x0) * self.k, (y1 - y0)
        self.s = SIZE / max(w, h) / (1 + 2 * pad)
        self.x0, self.y1 = x0, y1
        self.px = (SIZE - w * self.s) / 2
        self.py = (SIZE - h * self.s) / 2

    def pt(self, lon, lat):
        return ((lon - self.x0) * self.k * self.s + self.px, (self.y1 - lat) * self.s + self.py)


def path(polys, view, tol_units=1.4, min_area=14.0):
    d = []
    for poly in polys:
        for i, ring in enumerate(poly):
            pts = [view.pt(*p[:2]) for p in ring]
            if i == 0 and area(pts) < min_area:
                break
            pts = dp(pts, tol_units)
            if len(pts) < 4:
                continue
            d.append('M' + 'L'.join(f'{x:.0f} {y:.0f}' if abs(x - round(x)) < .05 and abs(y - round(y)) < .05 else f'{x:.1f} {y:.1f}' for x, y in pts[:-1]) + 'Z')
    return ''.join(d)


def svg(layers):
    body = ''.join(f'<path d="{d}" fill="#fff" fill-opacity="{fo}" stroke="#fff" stroke-opacity="{so}" stroke-width="{sw}" stroke-linejoin="round" fill-rule="evenodd"/>' for d, fo, so, sw in layers if d)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {int(SIZE)} {int(SIZE)}">{body}</svg>'


def norm(n):
    n = n.lower().strip()
    n = re.sub(r'^(kabupaten administrasi|kota administrasi|kabupaten|kota)\s+', '', n)
    return re.sub(r'[^a-z0-9]', '', n)


# Our name -> source name, for renamed regions and abbreviations.
ALIAS = {
    'daerahkhususibukotajakarta': 'dkijakarta',
    'toba': 'tobasamosir',
    'kotabaru': 'baru',
    'mahakamulu': 'mahakamhulu',
    'kepsiautagulandangbiaro': 'siautagulandangbiaro',
    'pasangkayu': 'mamujuutara',
    'kepulauantanimbar': 'malukutenggarabarat',
}


def key_of(name):
    k = norm(name)
    return ALIAS.get(k, k)


regions = list(csv.DictReader(open(a.regions, encoding='utf-8')))
# Matched by name: the source reuses 91/92 for the new Papua provinces.
by_name = {norm(f['properties']['PROVINSI']): f['geometry'] for f in json.load(open(a.prov, encoding='utf-8'))['features'] if f['geometry']}
prov_geo = {r['code']: by_name[key_of(r['name'])] for r in regions if '.' not in r['code'] and key_of(r['name']) in by_name}
gb = json.load(open(a.kab, encoding='utf-8'))['features']

# geoBoundaries names: "Kota X" for cities, plain "X" for regencies ("Kota Baru" is a regency, "Kotabaru").
gb_kota, gb_kab = {}, {}
for f in gb:
    n = f['properties']['shapeName'].strip()
    (gb_kota if n.startswith('Kota ') and norm(n) != 'barukab' else gb_kab)
    if n.startswith('Kota ') and n not in ('Kota Baru',):
        gb_kota.setdefault(norm(n), f['geometry'])
    else:
        gb_kab.setdefault(norm(n), f['geometry'])

children, missing = {}, []
for r in regions:
    if r['code'].count('.') != 1:
        continue
    is_kota = r['name'].startswith('Kota ')
    key = key_of(r['name'])
    geom = (gb_kota if is_kota else gb_kab).get(key) or (gb_kab if is_kota else gb_kota).get(key)
    if geom:
        children.setdefault(r['code'].split('.')[0], {})[r['code']] = rings(geom)
    else:
        missing.append(r['name'])

os.makedirs(a.out, exist_ok=True)
count = 0

for code, geom in prov_geo.items():
    kids = children.get(code, {})
    polys = rings(geom)
    view = View(bbox_of(polys))
    layers = [(path(polys, view, 2.4, 25), 0.10, 0.0, 0)]
    layers += [(path(p, view, 2.2, 25), 0.07, 0.5, 1) for p in kids.values()]
    layers.append((path(polys, view, 2.4, 25), 0, 0.9, 2))
    open(f'{a.out}/{code}.svg', 'w').write(svg(layers))
    count += 1

    for ccode, cpolys in kids.items():
        box = bbox_of(cpolys)
        view = View(box, 0.12)
        w, h = box[2] - box[0], box[3] - box[1]
        near = [p for c, p in kids.items() if c != ccode and (lambda b: not (b[2] < box[0] - w * .4 or b[0] > box[2] + w * .4 or b[3] < box[1] - h * .4 or b[1] > box[3] + h * .4))(bbox_of(p))]
        layers = [(path(p, view, 3.0, 40), 0.06, 0.35, 1) for p in near]
        layers.append((path(cpolys, view, 1.8, 12), 0.30, 0.95, 2))
        open(f'{a.out}/{ccode}.svg', 'w').write(svg(layers))
        count += 1

print('maps written:', count)
print('no boundary for', len(missing), ':', missing)
