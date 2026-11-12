#!/usr/bin/env python3
"""Audit generated GRAFTBOUND sprite sheets for cropping and dimension mismatches.
Run from any directory: python3 graftbound/tools/audit_sprite_bounds.py
Optional: --strict exits nonzero if a live sprite touches any frame boundary.
This script reads assets only; it never alters images or manifests.
"""
from pathlib import Path
import argparse
import json
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit('Pillow required: python3 -m pip install Pillow')

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / 'assets/sprites/manifest.json'


def audit_sprite(name, info, manifest):
    path = ROOT / 'assets/sprites' / info['file']
    w, h = info['w'], info['h']
    rows = len(manifest['anims'])
    cols = manifest['cols']
    views = len(manifest['views'])
    issues = []
    if not path.exists():
        return [(name, 'MISSING FILE ' + str(path.relative_to(ROOT)))]
    with Image.open(path) as sheet:
        img = sheet.convert('RGBA')
        expected = (w * cols, h * rows * views)
        if img.size != expected:
            issues.append((name, f'INVALID SHEET SIZE {img.size} != {expected}'))
            return issues
        for view_idx, view in enumerate(manifest['views']):
            for anim, cfg in manifest['anims'].items():
                for frame in range(cfg['frames']):
                    x = frame * w
                    y = (view_idx * rows + cfg['row']) * h
                    tile = img.crop((x, y, x + w, y + h))
                    box = tile.getchannel('A').getbbox()
                    if box is None:
                        issues.append((name, f'EMPTY {view}/{anim}/{frame}'))
                        continue
                    sides = []
                    if box[0] == 0: sides.append('left')
                    if box[1] == 0: sides.append('top')
                    if box[2] == w: sides.append('right')
                    # Feet rest at bottom by design, so don't flag contact there.
                    if sides:
                        issues.append((name, f'EDGE {view}/{anim}/{frame} ({", ".join(sides)}), alpha bounds {box}'))
    return issues


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--strict', action='store_true', help='Fail for edge contact as well as missing/invalid sprites')
    args = parser.parse_args()
    manifest = json.loads(MANIFEST.read_text())
    issues = []
    for name, info in sorted(manifest['sprites'].items()):
        issues.extend(audit_sprite(name, info, manifest))
    for name, detail in issues:
        print(f'{name}: {detail}')
    severe = [detail for _, detail in issues if not detail.startswith('EDGE')]
    print(f'Checked {len(manifest["sprites"])} sheets: {len(issues)} edge/empty/size warnings; {len(severe)} missing, empty or invalid frames')
    if severe or (args.strict and issues):
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
