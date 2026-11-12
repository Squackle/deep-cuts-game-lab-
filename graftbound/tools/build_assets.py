"""Builds all runtime art for GRAFTBOUND (deterministic). Run: python3 tools/build_assets.py
Outputs to assets/: sprite sheets + manifest, evolution layers, terrain atlas + pre-filtered blur atlas, foliage."""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageFilter
sys.path.insert(0, os.path.dirname(__file__))
from pixelkit import Spr, RAMPS, BAYER
from sprites_def import ANIMS, pose, draw_blank, PARTS, PW, PH
from enemies_def import ENEMY_SPRITES

ROOT = os.path.join(os.path.dirname(__file__), '..'); OUT = os.path.join(ROOT, 'assets')
VIEWS = ['front', 'back']; COLS = max(a[1] for a in ANIMS)
# Keep authored creature coordinates unchanged, but give attack/cast poses safe
# horizontal bleed. This prevents primitives being silently clipped by Spr.put
# at x<0 / x>=logical width. Transparent margins have no effect on pixel scale
# or foot pivot: scene sprites are centered on the enlarged frame.
ENEMY_BLEED = 24  # maximum authoring bleed; trimmed to each sprite's actual extents at build time
class BleedSprite:
    def __init__(self, w, h, bleed):
        self.w, self.h = w, h                 # original authoring coordinate system
        self.bleed = bleed
        self.real = Spr(w + 2 * bleed, h)    # drawable pixels beyond old edges
    def put(self, x, y, c, dark=None, tag=0):
        self.real.put(x + self.bleed, y, c, dark, tag)
    def px(self, x, y, c): self.real.px(x + self.bleed, y, c)
    def line(self, x0, y0, x1, y1, c, w=1):
        self.real.line(x0 + self.bleed, y0, x1 + self.bleed, y1, c, w)
    def ellipse(self, cx, cy, rx, ry, r, tag=0, hi=True):
        self.real.ellipse(cx + self.bleed, cy, rx, ry, r, tag, hi)
    def rect(self, x0, y0, x1, y1, r, face=0.3, tag=0):
        self.real.rect(x0 + self.bleed, y0, x1 + self.bleed, y1, r, face, tag)
    def poly(self, pts, r, lam_fn=None, tag=0):
        # Shading must remain in the same local coordinate frame.
        lighting = (lambda x, y: lam_fn(x - self.bleed, y)) if lam_fn else None
        self.real.poly([(x + self.bleed, y) for x, y in pts], r, lighting, tag)
    def shade(self, *args): return self.real.shade(*args)
    def outline(self): self.real.outline(); return self
    def image(self): return self.real.image()
    def mask_image(self): return self.real.mask_image()

def sheet(w, h, paint, mask=False, bleed=0):
    frame_w = w + 2 * bleed
    img = Image.new('RGBA', (frame_w * COLS, h * len(VIEWS) * len(ANIMS)), (0, 0, 0, 0))
    msk = Image.new('RGBA', img.size, (0, 0, 0, 0)) if mask else None
    for vi, view in enumerate(VIEWS):
        for ai, (name, n, fps, loop) in enumerate(ANIMS):
            for f in range(n):
                s = BleedSprite(w, h, bleed) if bleed else Spr(w, h)
                paint(s, pose(name, f), view == 'back'); s.outline()
                r = vi * len(ANIMS) + ai
                img.paste(s.image(), (f * frame_w, r * h))
                if mask: msk.paste(s.mask_image(), (f * frame_w, r * h))
    return img, msk
def build_sprites():
    os.makedirs(f'{OUT}/sprites/parts', exist_ok=True)
    man = {'cols': COLS, 'views': VIEWS, 'anims': {name: {'row': ai, 'frames': n, 'fps': fps, 'loop': loop} for ai, (name, n, fps, loop) in enumerate(ANIMS)}, 'sprites': {}, 'parts': {}}
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
        # Render to an expanded physical frame first so reaching arms, mandibles
        # and attack weapons aren't prematurely cropped at the authored edges.
        sample, _ = sheet(w, h, fn, bleed=ENEMY_BLEED)
        full_w = w + 2 * ENEMY_BLEED
        nearest = full_w
        # Find the tightest union including every facing and animation frame.
        for r in range(len(VIEWS) * len(ANIMS)):
            for f in range(COLS):
                frame = sample.crop((f * full_w, r * h, (f + 1) * full_w, (r + 1) * h))
                bounds = frame.getchannel('A').getbbox()
                if bounds: nearest = min(nearest, bounds[0], full_w - bounds[2])
        # Retain at least 2px clear padding on BOTH sides, without adding 48px of
        # invisible overdraw to every sprite. All animation frames share one w.
        bleed = min(ENEMY_BLEED, max(0, ENEMY_BLEED + 2 - nearest))
        tight_w = w + 2 * bleed
        img = Image.new('RGBA', (tight_w * COLS, h * len(VIEWS) * len(ANIMS)), (0, 0, 0, 0))
        for r in range(len(VIEWS) * len(ANIMS)):
            for f in range(COLS):
                left = f * full_w + (ENEMY_BLEED - bleed)
                piece = sample.crop((left, r * h, left + tight_w, (r + 1) * h))
                img.paste(piece, (f * tight_w, r * h))
        img.save(f'{OUT}/sprites/{name}.png')
        man['sprites'][name] = {'w': tight_w, 'h': h,
                                 'file': f'{name}.png', 'hover': hover,
                                 'pivotY': h - 3, 'artWidth': w, 'bleedX': bleed}
    return man
def vnoise(n, cells, seed):
    rng = np.random.RandomState(seed); g = rng.rand(cells, cells)
    xs = np.arange(n) / n * cells; i0 = np.floor(xs).astype(int); t = xs - i0; t = t * t * (3 - 2 * t)
    i1 = (i0 + 1) % cells; i0 %= cells
    a = g[np.ix_(i0, i0)]; b = g[np.ix_(i0, i1)]; c = g[np.ix_(i1, i0)]; d = g[np.ix_(i1, i1)]
    tx = t[None, :]; ty = t[:, None]
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty
def fbm(n, seed, oct=(4, 8, 16), w=(0.55, 0.3, 0.15)): return sum(vnoise(n, o, seed + i) * wi for i, (o, wi) in enumerate(zip(oct, w)))
def paint_ramp(v, R):
    n = v.shape[0]; out = np.zeros((n, n, 3), np.uint8)
    for y in range(n):
        for x in range(n):
            k = v[y, x] * (len(R) - 1) + (BAYER[y % 4, x % 4] - 0.5) * 0.45   # lower dither amplitude than v0.4 → calmer at distance
            out[y, x] = R[max(0, min(len(R) - 1, int(round(k))))]
    return out
def tex_flagstone(seed, mossy=False, ramp='stone', cracks=True):
    """Two large irregular stones per tile cell with bevelled edges, cracks and wear — calm, readable stonework."""
    n = 32; rng = np.random.RandomState(seed)
    v = fbm(n, seed, (4, 8), (0.7, 0.3)) * 0.22 + 0.52
    grout = np.zeros((n, n), bool); grout[[0, 16], :] = True
    for y in range(n):
        for x in ((0, 13) if y < 16 else (0, 20)): grout[y, x] = True
    v[grout] = 0.16
    bev_hi = np.roll(grout, 1, 0) | np.roll(grout, 1, 1); bev_lo = np.roll(grout, -1, 0) | np.roll(grout, -1, 1)
    v[bev_hi & ~grout] += 0.12; v[bev_lo & ~grout & ~bev_hi] -= 0.08
    if cracks:
        for _ in range(2):
            x, y = rng.randint(3, 29), rng.randint(3, 29)
            for k in range(rng.randint(4, 8)):
                if 0 <= x < n and 0 <= y < n and not grout[y, x]: v[y, x] = 0.3
                x += rng.choice([-1, 0, 1]); y += 1
    img = paint_ramp(np.clip(v, 0, 1), RAMPS[ramp])
    if mossy:
        m = fbm(n, seed + 50, (4, 8), (0.7, 0.3)); mm = (m > 0.6) | (grout & (m > 0.45))
        img[mm] = paint_ramp(np.clip(fbm(n, seed + 9) * 0.4 + 0.15, 0, 0.6), RAMPS['moss'])[mm]
    return img
def tex_simple(rampname, seed, base=0.2, amp=0.75, oct=(4, 8, 16)): return paint_ramp(np.clip(fbm(32, seed, oct) * amp + base, 0, 1), RAMPS[rampname])
def tex_grass(seed):
    img = tex_simple('leaf', seed, 0.12, 0.55); rng = np.random.RandomState(seed)
    for _ in range(70): x, y = rng.randint(32), rng.randint(32); img[y, x] = RAMPS['leaf'][4]; img[(y + 1) % 32, x] = RAMPS['leaf'][3]
    return img
def tex_brick(seed, ramp='stone'):
    n = 32; v = fbm(n, seed) * 0.5 + 0.35
    for y in range(n):
        for x in range(n):
            off = 8 if (y // 8) % 2 else 0
            if y % 8 == 0 or (x + off) % 16 == 0: v[y, x] = 0.05
    return paint_ramp(np.clip(v, 0, 1), RAMPS[ramp])
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
    img = tex_flagstone(seed, cracks=False); g = RAMPS['gold']
    for t in range(80): a = t / 80 * math.pi * 2; x, y = int(16 + math.cos(a) * 10), int(16 + math.sin(a) * 10); img[y, x] = g[3]
    for k in range(-7, 8): img[16 + k, 16] = g[4]; img[16, 16 + k] = g[4]; img[16 + k // 2, 16 + k] = g[2]
    return img
def tex_path(seed):
    R = [(60, 48, 34), (92, 74, 52), (122, 100, 70), (150, 128, 94), (178, 156, 118)]
    img = paint_ramp(np.clip(fbm(32, seed) * 0.7 + 0.2, 0, 1), R); rng = np.random.RandomState(seed)
    for _ in range(25): x, y = rng.randint(31), rng.randint(31); img[y, x] = R[4]; img[y + 1, x + 1] = R[0]
    return img
def tex_lava(seed):
    n = 32; v = fbm(n, seed, (2, 4, 8), (0.5, 0.3, 0.2))
    crust = vnoise(n, 6, seed + 3) > 0.62
    img = paint_ramp(np.clip(v * 0.9 + 0.15, 0, 1), RAMPS['lava'])
    img[crust] = paint_ramp(np.clip(v * 0.5, 0, 1), RAMPS['basalt'])[crust]
    return img
def tex_crystal(seed):
    img = tex_flagstone(seed, ramp='void', cracks=False); rng = np.random.RandomState(seed)
    for _ in range(5):
        x, y = rng.randint(2, 30), rng.randint(2, 30)
        for k in range(rng.randint(3, 6)):
            if 0 <= y - k < 32: img[y - k, x] = RAMPS['crystal'][3 if k % 2 else 4]
    return img
TEXTURES = [
  ('flag', lambda: tex_flagstone(3)), ('flagmoss', lambda: tex_flagstone(5, True)), ('grass', lambda: tex_grass(7)),
  ('dirt', lambda: tex_path(9)), ('brick', lambda: tex_brick(11)), ('rock', lambda: tex_simple('stone', 13, 0.15, 0.85)),
  ('bark', lambda: tex_bark(15)), ('leaves', lambda: tex_simple('leaf', 17, 0.1, 0.9, (8, 16, 32))), ('cliff', lambda: tex_cliff(19)),
  ('rune', lambda: tex_rune(21)), ('water', lambda: tex_simple('teal', 23, 0.15, 0.6, (2, 4, 8))), ('moss', lambda: tex_simple('moss', 25, 0.05, 0.55)),
  ('basalt', lambda: tex_flagstone(27, ramp='basalt')), ('lava', lambda: tex_lava(29)), ('crystal', lambda: tex_crystal(31)), ('ash', lambda: tex_simple('ash', 33, 0.15, 0.6)),
]
def blur_cell(a):
    """Tileable pre-filter: 3×3 wrap blur (used when 1 screen pixel covers >1 texel)."""
    f = a.astype(np.float32); acc = np.zeros_like(f)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1): acc += np.roll(np.roll(f, dy, 0), dx, 1) * (4 if dx == 0 and dy == 0 else 2 if dx == 0 or dy == 0 else 1)
    return (acc / 16).clip(0, 255).astype(np.uint8)
def build_textures():
    os.makedirs(f'{OUT}/textures', exist_ok=True)
    atlas = Image.new('RGB', (128, 128)); blur = Image.new('RGB', (128, 128))
    for i, (name, fn) in enumerate(TEXTURES):
        a = fn(); atlas.paste(Image.fromarray(a), ((i % 4) * 32, (i // 4) * 32)); blur.paste(Image.fromarray(blur_cell(blur_cell(a))), ((i % 4) * 32, (i // 4) * 32))
    atlas.save(f'{OUT}/textures/terrain.png'); blur.save(f'{OUT}/textures/terrain_blur.png')
    return {name: i + 1 for i, (name, _) in enumerate(TEXTURES)}
def foliage_pine(seed, w=40, h=64):
    s = Spr(w, h); cx = w // 2; s.rect(cx - 2, h - 12, cx + 1, h - 2, 'bark', 0.2)
    for (y, r) in ((h - 14, 15), (h - 26, 12), (h - 37, 9), (h - 47, 6), (h - 55, 3)): s.poly([(cx, y - 13), (cx - r, y), (cx + r, y)], 'leaf', lambda x, yy, y=y: 0.6 - (x - cx) * 0.06 - (yy - y + 13) * 0.02)
    return s.outline()
def foliage_oak(seed, w=56, h=64):
    s = Spr(w, h); cx = w // 2; rng = np.random.RandomState(seed)
    s.rect(cx - 3, h - 22, cx + 2, h - 2, 'bark', 0.25); s.line(cx, h - 20, cx - 9, h - 32, 'bark', 2); s.line(cx, h - 22, cx + 10, h - 34, 'bark', 2)
    for _ in range(14): s.ellipse(cx + rng.randint(-17, 18), h - 38 + rng.randint(-14, 10), rng.randint(6, 10), rng.randint(5, 8), 'leaf')
    return s.outline()
def foliage_dead(seed, w=44, h=64):
    s = Spr(w, h); cx = w // 2; s.rect(cx - 2, h - 26, cx + 2, h - 2, 'basalt', 0.25)
    for (a, l, y0) in ((-0.9, 14, 30), (0.8, 12, 34), (-0.4, 10, 44), (0.5, 9, 46), (0.1, 12, 50)):
        x1 = cx + math.sin(a) * l; y1 = h - y0 - math.cos(a) * l; s.line(cx, h - y0 + 6, x1, y1, 'basalt', 2); s.px(x1, y1, RAMPS['lava'][3])
    return s.outline()
def foliage_crystal(seed, w=32, h=56):
    s = Spr(w, h); cx = w // 2
    for (dx, hh, wd) in ((0, 50, 6), (-8, 30, 4), (8, 36, 4)): s.poly([(cx + dx, h - 2 - hh), (cx + dx + wd, h - 2 - hh * 0.75), (cx + dx + wd * 0.7, h - 2), (cx + dx - wd * 0.7, h - 2), (cx + dx - wd, h - 2 - hh * 0.75)], 'crystal', lambda x, y, dx=dx: 0.6 - (x - cx - dx) * 0.12)
    return s.outline()
def foliage_shard(seed):
    s = Spr(14, 16); s.poly([(7, 1), (11, 6), (9, 15), (4, 15), (3, 6)], 'crystal', lambda x, y: 0.7 - (x - 7) * 0.12); return s.outline()
def foliage_ashgrass(seed):
    s = Spr(12, 8); rng = np.random.RandomState(seed)
    for k in range(6): x = 1 + k * 1.8; s.line(x, 7, x + rng.randint(-1, 2), 2 + rng.randint(0, 3), 'ash')
    s.px(6, 2, RAMPS['lava'][3]); return s
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
    for dx, r in ((-2, 2.6), (3, 1.8)): s.rect(6 + dx, 7 + (2 - r), 6 + dx, 10, 'bone', 0.4); s.ellipse(6 + dx, 6 + (2 - r), r + 0.8, r * 0.7, 'teal')
    return s.outline()
def foliage_bramble(seed):
    s = Spr(28, 18); rng = np.random.RandomState(seed)
    for _ in range(9):
        x0 = rng.randint(2, 26); x1 = x0 + rng.randint(-7, 8); y1 = rng.randint(2, 9)
        s.line(x0, 17, x1, y1, 'leaf' if rng.rand() < 0.6 else 'bark'); s.px(x1, y1, RAMPS['red'][3])
    for _ in range(10): s.px(rng.randint(2, 26), rng.randint(4, 16), RAMPS['red'][2])
    return s.outline()
FOLIAGE = {'pine': foliage_pine, 'oak': foliage_oak, 'bush': foliage_bush, 'fern': foliage_fern, 'grass': foliage_grass, 'mushroom': foliage_mushroom, 'bramble': foliage_bramble,
           'deadtree': foliage_dead, 'crystal': foliage_crystal, 'shard': foliage_shard, 'ashgrass': foliage_ashgrass}
def build_foliage():
    out = {}; x = 0; imgs = [(name, fn(1).image()) for name, fn in FOLIAGE.items()]
    W = sum(im.width for _, im in imgs) + len(imgs); H = max(im.height for _, im in imgs)
    atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for name, im in imgs: atlas.paste(im, (x, H - im.height)); out[name] = {'x': x, 'y': H - im.height, 'w': im.width, 'h': im.height}; x += im.width + 1
    atlas.save(f'{OUT}/sprites/foliage.png'); return {'size': [W, H], 'frames': out}
if __name__ == '__main__':
    man = build_sprites(); mats = build_textures(); fol = build_foliage()
    man['foliage'] = fol; man['materials'] = mats
    json.dump(man, open(f'{OUT}/sprites/manifest.json', 'w'), indent=1)
    print('sprites', len(man['sprites']), 'parts', len(man['parts']), 'materials', len(mats), 'foliage', len(fol['frames']))
