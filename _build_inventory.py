#!/usr/bin/env python3
"""Convert matched JSON inventory files to a JS module for the web app.

Usage: python3 _build_inventory.py

Reads from: ../output/local_inventory/*_matched.json
Writes to:  data/inventory.js
"""
import json
import os

PARENT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INV_DIR = os.path.join(PARENT, 'output', 'local_inventory')
OUT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'inventory.js')

STORE_FILES = [
    'pascales_matched.json',
    'liquor_express_matched.json',
    'peters_matched.json',
]

WINE_FIELDS = [
    'name', 'price', 'description', 'brand', 'source_url', 'image_url',
    'subtype', 'grape', 'colour', 'region', 'country',
    'vector', 'confidence', 'match_type', 'rating', 'rating_count',
]

stores = []
for fname in STORE_FILES:
    path = os.path.join(INV_DIR, fname)
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    wines = []
    for w in data['wines']:
        wine = {}
        for field in WINE_FIELDS:
            if field in w and w[field] is not None:
                wine[field] = w[field]
        if 'vector' in wine:
            wine['vector'] = [round(v, 3) for v in wine['vector']]
        if 'price' in wine:
            wine['price'] = round(wine['price'], 2)
        wines.append(wine)

    store = {
        'id': data['store_id'],
        'name': data['store_name'],
        'address': data['address'],
        'lat': data['lat'],
        'lng': data['lng'],
        'wines': wines,
    }
    stores.append(store)
    print(f"  {data['store_name']}: {len(wines)} wines")

js = 'export const stores = ' + json.dumps(stores, separators=(',', ':')) + ';\n'

with open(OUT_FILE, 'w', encoding='utf-8') as f:
    f.write(js)

total = sum(len(s['wines']) for s in stores)
print(f"\nWrote {OUT_FILE}")
print(f"Total: {total} wines across {len(stores)} stores")
print(f"File size: {os.path.getsize(OUT_FILE) / 1024:.1f} KB")
