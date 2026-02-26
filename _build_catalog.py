#!/usr/bin/env python3
"""Extract a lightweight catalog from the unified wine inventory for browser search.

Reads:  ../output/unified_wine_inventory.json (405K wines, ~134MB)
Writes: data/catalog.js (~5-15MB, minified)

Only includes wines with:
  - A real display name (not WineSensed anonymous entries)
  - Medium or high confidence vectors
  - 7-dimensional vector present

Fields per wine (array): [name, grape, country, colour, [vector]]
Vectors rounded to 2 decimal places. Region omitted to save space.
"""
import json
import os

PARENT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INPUT = os.path.join(PARENT, 'output', 'unified_wine_inventory.json')
OUTPUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'catalog.js')

print(f'Loading {INPUT}...')
with open(INPUT, 'r', encoding='utf-8') as f:
    data = json.load(f)

wines = []
for w in data.get('wines', []):
    name = w.get('name', '').strip()
    if not name or name.startswith('WineSensed #'):
        continue
    if w.get('confidence') not in ('medium', 'high'):
        continue
    vec = w.get('vector')
    if not vec or len(vec) != 7:
        continue

    entry = [
        name,
        w.get('grape', '') or '',
        w.get('country', '') or '',
        w.get('colour', '') or '',
        [round(v, 2) for v in vec],
    ]
    wines.append(entry)

print(f'Extracted {len(wines)} wines from {len(data.get("wines",[]))} total')

# Write as JS — array of arrays for minimum size
# Format: [name, grape, country, colour, [vector]]
js = 'export const catalog = ' + json.dumps(wines, separators=(',', ':'), ensure_ascii=False) + ';\n'

with open(OUTPUT, 'w', encoding='utf-8') as f:
    f.write(js)

size_mb = os.path.getsize(OUTPUT) / (1024 * 1024)
print(f'Wrote {OUTPUT}')
print(f'File size: {size_mb:.1f} MB')
print(f'Wines: {len(wines)}')
