"""Builds all runtime art for GRAFTBOUND (deterministic). Run: python3 tools/build_assets.py
Outputs to assets/: sprite sheets + manifest, evolution layer sheets, terrain texture atlas, foliage
billboards, and pixel-quantized card illustrations from assets-src/ (original generated sources)."""
import json, math, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from pixelkit import Spr, RAMPS, BAYER, merge
from sprites_def import ANIMS, pose, draw_blank, PARTS, PW, PH
from enemies_def import ENEMY_SPRITES

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'assets')
VIEWS = ['front', 'back']
COLS = max(a[1] for a in ANIMS)

def sheet(w, h, paint, mask=False):
    img = Image.new('RGBA', (w * COLS, h * len(VIEWS) * len(ANIMS)), (0, 0, 0, 0))
    msk = Image.new('RGBA', img.size, (0, 0, 0, 0)) if mask else None
    for vi, view in enumerate(VIEWS):
        for ai, (name, n, fps, loop) in enumerate(ANIMS):
            for f in range(n):
                s = Spr(w, h); paint(s, pose(name, f), view == 'back'); s.outline()
                r = vi * len(ANIMS) + ai
                img.paste(s.image(), (f * w, r * h))
                if mask: msk.paste(s.mask_image(), (f * w, r * h))
    return img, msk

def anim_meta():
    return {name: {'row': ai, 'frames': n, 'fps': fps, 'loop': loop} for ai, (name, n, fps, loop) in enumerate(ANIMS)}

def build_sprites():
    os.makedirs(f'{OUT}/sprites/parts', exist_ok=True)
    man = {'cols': COLS, 'views': VIEWS, 'anims': anim_meta(), 'sprites': {}, 'parts': {}}
    img, msk = sheet(PW, PH, draw_blank, mask=True)
    img.save(f'{OUT}/sprites/blank.png'); msk.save(f'{OUT}/sprites/blank_mask.png')
    man['sprites']['blank'] = {'w': PW, 'h': PH, 'file': 'blank.png', 'mask': 'blank_mask.png', 'pivotY': PH - 3}
    for name, (fn, layers, tiers) in PARTS.items():
        man['parts'][name] = {}
        for tier in range(1, tiers + 1):
            entry = {}
            for layer in ('behind', 'front'):
                if not any(layers[v] == layer for v in VIEWS): continue
                def paint(s, P, back, fn=fn, tier=tier, layer=layer):
                    if layers['back' if back else 'front'] == layer: fn(s, P, back, tier)
                im, _ = sheet(PW, PH, paint)
                if im.getbbox() is None: continue
                fname = f'parts/{name}_{tier}_{layer}.png'; im.save(f'{OUT}/sprites/{fname}'); entry[layer] = fname
            man['parts'][name][tier] = entry
    for name, (fn, w, h, hover) in ENEMY_SPRITES.items():
        img, _ = sheet(w, h, fn); img.save(f'{OUT}/sprites/{name}.png')
        man['sprites'][name] = {'w': w, 'h': h, 'file': f'{name}.png', 'hover': hover, 'pivotY': h - 3}
    return man

def vnoise(n, cells, seed):
    rng = np.random.RandomState(seed); g = rng.rand(cells, cells)
    xs = np.arange(n) / n * cells; i0 = np.floor(xs).astype(int); t = xs - i0; t = t * t * (3 - 2 * t)
    i1 = (i0 + 1) % cells; i0 %= cells
    a = g[np.ix_(i0, i0)]; b = g[np.ix_(i0, i1)]; c = g[np.ix_(i1, i0)]; d = g[np.ix_(i1, i1)]
    tx = t[None, :]; ty = t[:, None]
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty
def fbm(n, seed, oct=(4, 8, 16), w=(0.55, 0.3, 0.15)):
    return sum(vnoise(n, o, seed + i) * wi for i, (o, wi) in enumerate(zip(oct, w)))
def paint_ramp(v, R):
    n = v.shape[0]; out = np.zeros((n, n, 3), np.uint8)
    for y in range(n):
        for x in range(n):
            k = v[y, x] * (len(R) - 1) + (BAYER[y % 4, x % 4] - 0.5) * 0.7
            out[y, x] = R[max(0, min(len(R) - 1, int(round(k))))]
    return out
def tex_flagstone(seed, mossy=False):
    n = 32; v = fbm(n, seed) * 0.32 + 0.48
    grout = np.zeros((n, n), bool); grout[[0, 15], :] = True
    for y in range(n):
        for x in (0, 11, 22) if y < 15 else (6, 19):
            grout[y, x] = True
    v[grout] = 0.22
    edge = np.roll(grout, 1, 0) | np.roll(grout, 1, 1); v[edge & ~grout] += 0.1
    img = paint_ramp(np.clip(v, 0, 1), RAMPS['stone'])
    if mossy:
        m = fbm(n, seed + 50, (4, 8), (0.7, 0.3)); mm = (m > 0.55) | (grout & (m > 0.4))
        img[mm] = paint_ramp(np.clip(fbm(n, seed + 9) * 0.4 + 0.05, 0, 0.6), RAMPS['moss'])[mm]
    return img
def tex_simple(rampname, seed, base=0.2, amp=0.75, oct=(4, 8, 16)):
    return paint_ramp(np.clip(fbm(32, seed, oct) * amp + base, 0, 1), RAMPS[rampname])
def tex_grass(seed):
    img = tex_simple('leaf', seed, 0.12, 0.55); rng = np.random.RandomState(seed)
    for _ in range(70):
        x, y = rng.randint(32), rng.randint(32); img[y, x] = RAMPS['leaf'][4]; img[(y + 1) % 32, x] = RAMPS['leaf'][3]
    return img
def tex_brick(seed):
    n = 32; v = fbm(n, seed) * 0.5 + 0.35
    for y in range(n):
        for x in range(n):
            row = y // 8; off = 8 if row % 2 else 0
            if y % 8 == 0 or (x + off) % 16 == 0: v[y, x] = 0.05
    return paint_ramp(np.clip(v, 0, 1), RAMPS['stone'])
def tex_bark(seed):
    n = 32; v = np.zeros((n, n))
    for x in range(n): v[:, x] = 0.45 + 0.35 * math.sin(x * 1.7 + seed) * math.sin(x * 0.4)
    v += (fbm(n, seed) - 0.5) * 0.4
    return paint_ramp(np.clip(v, 0, 1), RAMPS['bark'])
def tex_cliff(seed):
    n = 32; v = fbm(n, seed) * 0.4 + 0.3
    for y in range(n): v[y, :] += 0.18 * math.sin(y * 0.9)
    return paint_ramp(np.clip(v, 0, 1), RAMPS['stone'])
def tex_rune(seed):
    img = tex_flagstone(seed); g = RAMPS['gold']
    for t in range(80):
        a = t / 80 * math.pi * 2; x, y = int(16 + math.cos(a) * 10), int(16 + math.sin(a) * 10); img[y, x] = g[3]
    for k in range(-7, 8): img[16 + k, 16] = g[4]; img[16, 16 + k] = g[4]; img[16 + k // 2, 16 + k] = g[2]
    return img
def tex_water(seed): return tex_simple('teal', seed, 0.15, 0.6, (2, 4, 8))
def tex_path(seed):
    R = [(60, 48, 34), (92, 74, 52), (122, 100, 70), (150, 128, 94), (178, 156, 118)]
    img = paint_ramp(np.clip(fbm(32, seed) * 0.7 + 0.2, 0, 1), R); rng = np.random.RandomState(seed)
    for _ in range(25): x, y = rng.randint(31), rng.randint(31); img[y, x] = R[4]; img[y + 1, x + 1] = R[0]
    return img
TEXTURES = [
  ('flag', lambda: tex_flagstone(3)), ('flagmoss', lambda: tex_flagstone(5, True)), ('grass', lambda: tex_grass(7)),
  ('dirt', lambda: tex_path(9)), ('brick', lambda: tex_brick(11)), ('rock', lambda: tex_simple('stone', 13, 0.15, 0.85)),
  ('bark', lambda: tex_bark(15)), ('leaves', lambda: tex_simple('leaf', 17, 0.1, 0.9, (8, 16, 32))), ('cliff', lambda: tex_cliff(19)),
  ('rune', lambda: tex_rune(21)), ('water', lambda: tex_water(23)), ('moss', lambda: tex_simple('moss', 25, 0.05, 0.55)),
]
def build_textures():
    os.makedirs(f'{OUT}/textures', exist_ok=True)
    atlas = Image.new('RGB', (128, 128))
    for i, (name, fn) in enumerate(TEXTURES): atlas.paste(Image.fromarray(fn()), ((i % 4) * 32, (i // 4) * 32))
    atlas.save(f'{OUT}/textures/terrain.png')
    return {name: i + 1 for i, (name, _) in enumerate(TEXTURES)}

def foliage_pine(seed, w=40, h=64):
    s = Spr(w, h); cx = w // 2
    s.rect(cx - 2, h - 12, cx + 1, h - 2, 'bark', 0.2)
    for i, (y, r) in enumerate(((h - 14, 15), (h - 26, 12), (h - 37, 9), (h - 47, 6), (h - 55, 3))):
        s.poly([(cx, y - 13), (cx - r, y), (cx + r, y)], 'leaf', lambda x, yy, y=y: 0.6 - (x - cx) * 0.06 - (yy - y + 13) * 0.02)
    return s.outline()
def foliage_oak(seed, w=56, h=64):
    s = Spr(w, h); cx = w // 2; rng = np.random.RandomState(seed)
    s.rect(cx - 3, h - 22, cx + 2, h - 2, 'bark', 0.25); s.line(cx, h - 20, cx - 9, h - 32, 'bark', 2); s.line(cx, h - 22, cx + 10, h - 34, 'bark', 2)
    for _ in range(14):
        x = cx + rng.randint(-17, 18); y = h - 38 + rng.randint(-14, 10); r = rng.randint(6, 10)
        s.ellipse(x, y, r, r * 0.8, 'leaf')
    return s.outline()
def foliage_bush(seed):
    s = Spr(24, 16); rng = np.random.RandomState(seed)
    for _ in range(6): s.ellipse(12 + rng.randint(-6, 7), 10 + rng.randint(-2, 3), 5, 4, 'leaf')
    for _ in range(3): s.px(12 + rng.randint(-7, 8), 6 + rng.randint(0, 6), RAMPS['red'][4])
    return s.outline()
def foliage_fern(seed):
    s = Spr(20, 14); cx = 10
    for k in range(-3, 4): s.line(cx, 13, cx + k * 3, 3 + abs(k), 'sprout')
    return s.outline()
def foliage_grass(seed):
    s = Spr(12, 8); rng = np.random.RandomState(seed)
    for k in range(7): x = 1 + k * 1.6; s.line(x, 7, x + rng.randint(-1, 2), 2 + rng.randint(0, 3), 'leaf')
    return s
def foliage_mushroom(seed):
    s = Spr(12, 12)
    for dx, r in ((-2, 2.6), (3, 1.8)):
        s.rect(6 + dx, 7 + (2 - r), 6 + dx, 10, 'bone', 0.4); s.ellipse(6 + dx, 6 + (2 - r), r + 0.8, r * 0.7, 'teal')
    return s.outline()
def foliage_bramble(seed):
    s = Spr(28, 18); rng = np.random.RandomState(seed)
    for _ in range(9):
        x0 = rng.randint(2, 26); y0 = 17; x1 = x0 + rng.randint(-7, 8); y1 = rng.randint(2, 9)
        s.line(x0, y0, x1, y1, 'leaf' if rng.rand() < 0.6 else 'bark')
        s.px(x1, y1, RAMPS['red'][3])
    for _ in range(10): s.px(rng.randint(2, 26), rng.randint(4, 16), RAMPS['red'][2])
    return s.outline()
FOLIAGE = {'pine': foliage_pine, 'oak': foliage_oak, 'bush': foliage_bush, 'fern': foliage_fern, 'grass': foliage_grass, 'mushroom': foliage_mushroom, 'bramble': foliage_bramble}
def build_foliage():
    out = {}; x = 0; imgs = []
    for name, fn in FOLIAGE.items(): imgs.append((name, fn(1).image()))
    W = sum(im.width for _, im in imgs) + len(imgs); H = max(im.height for _, im in imgs)
    atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for name, im in imgs:
        atlas.paste(im, (x, H - im.height)); out[name] = {'x': x, 'y': H - im.height, 'w': im.width, 'h': im.height}; x += im.width + 1
    atlas.save(f'{OUT}/sprites/foliage.png')
    return {'size': [W, H], 'frames': out}

CARD_SOURCES = {'nightcap_toad': 'nightcap_toad.png'}
def pixelate(src, w=128, h=92, colors=40):
    im = Image.open(src).convert('RGB')
    sw, sh = im.size; ar = w / h
    if sw / sh > ar: nw = int(sh * ar); im = im.crop(((sw - nw) // 2, 0, (sw - nw) // 2 + nw, sh))
    else: nh = int(sw / ar); im = im.crop((0, (sh - nh) // 2, sw, (sh - nh) // 2 + nh))
    small = im.resize((w, h), Image.LANCZOS)
    return small.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
def build_cards():
    os.makedirs(f'{OUT}/cards', exist_ok=True); done = {}
    for cid, fn in CARD_SOURCES.items():
        p = os.path.join(ROOT, 'assets-src', fn)
        if os.path.exists(p): pixelate(p).save(f'{OUT}/cards/{cid}.png'); done[cid] = f'cards/{cid}.png'
    json.dump(done, open(f'{OUT}/cards/manifest.json', 'w'), indent=1)
    return done

if __name__ == '__main__':
    man = build_sprites(); mats = build_textures(); fol = build_foliage(); cards = build_cards()
    man['foliage'] = fol; man['materials'] = mats
    json.dump(man, open(f'{OUT}/sprites/manifest.json', 'w'), indent=1)
    print('sprites', len(man['sprites']), 'parts', len(man['parts']), 'materials', len(mats), 'foliage', len(fol['frames']), 'cards', len(cards))
