"""Enemy & ally sprite designs for all three acts (facing LEFT). Same pose dict as sprites_def.pose. Original art."""
import math
from pixelkit import RAMPS
from sprites_def import eye

def quad_legs(s, cx, base, P, r, span=7, w=2, h=5):
    ph = P['leg']
    for i, (dx, far) in enumerate(((-span, 1), (-span + 3, 0), (span - 2, 1), (span + 1, 0))):
        lift = (ph if i % 2 else -ph); x = cx + dx + (lift if lift > 0 else 0)
        R = RAMPS[r]; c = R[1] if far else R[2]
        for y in range(h - max(0, int(lift))):
            for k in range(w): s.put(x + k, base - y, c, R[0])
# ── Act I ──
def draw_grub(s, P, back):
    base = s.h - 3; cx = s.w // 2 - 3 + P['lean']
    for i in range(4, -1, -1):
        wob = math.sin((i + P['leg'] * 2) * 1.3) * 0.6
        s.ellipse(cx + 1 + i * 3.4, base - 4 + wob + P['bob'] * (i % 2), 4.4 - i * 0.45, 4 - i * 0.4 - P['squash'] * 0.3, 'grub')
    if not back:
        hx = cx - 4 + (-2 if P['arm'] == 'strike' else 0)
        s.ellipse(hx, base - 5 + P['bob'], 4.2, 3.8, 'grub')
        s.line(hx - 4, base - 4, hx - 6, base - 2, RAMPS['ink'][1]); s.line(hx - 3, base - 2, hx - 5, base, RAMPS['ink'][1])
        eye(s, hx - 2, base - 7 + P['bob'], P, size=1, glow='amber')
def draw_hound(s, P, back, R='fur', spine='bark', eyeglow='red', scale=1.0):
    base = s.h - 3; cx = s.w // 2 + P['lean']
    quad_legs(s, cx, base, P, R, span=int(8 * scale), w=2 if scale < 1.2 else 3, h=int(6 * scale))
    by = base - 8 * scale + P['bob']
    for i in range(5): s.ellipse(cx + 10 * scale + i * 1.4, by - 1 - i * 1.2, 1.6, 1.4, R)
    s.ellipse(cx + 1, by, 10 * scale, 4.6 * scale - P['squash'] * 0.4, R)
    for k in range(6 if scale < 1.2 else 8):
        x = cx - 6 * scale + k * 2.6 * scale; y = by - 4.4 * scale
        s.line(x, y, x + 1.5, y - (3 if k % 2 else 4) * scale, spine)
    if not back:
        hx = cx - 9 * scale + (-3 if P['arm'] == 'strike' else 0); hy = by - 3 * scale
        s.ellipse(hx, hy, 4.6 * scale, 3.8 * scale, R)
        s.poly([(hx - 3 * scale, hy - 1), (hx - 9 * scale, hy + 1.5 * scale), (hx - 3 * scale, hy + 3 * scale)], R, lambda x, y: 0.1)
        s.poly([(hx + 1, hy - 3 * scale), (hx + 3, hy - 8 * scale), (hx + 4, hy - 3 * scale)], R, lambda x, y: 0.0)
        if P['arm'] == 'strike':
            for k in range(3): s.px(hx - 6 * scale + k * 2, hy + 2 * scale, RAMPS['bone'][4])
        eye(s, int(hx - 2 * scale), int(hy - 1), P, size=1, glow=eyeglow)
    else:
        s.ellipse(cx - 7 * scale, by - 4 * scale, 4 * scale, 3.4 * scale, R)
        s.poly([(cx - 7 * scale, by - 6 * scale), (cx - 6 * scale, by - 11 * scale), (cx - 4 * scale, by - 6 * scale)], R, lambda x, y: 0.0)
def draw_alpha(s, P, back): draw_hound(s, P, back, R='night', spine='violet', eyeglow='violet', scale=1.3)
def draw_archer(s, P, back):
    base = s.h - 3; cx = 16 + P['lean']
    for i, dx in enumerate((-3, 2)):
        lift = P['leg'] if i == 0 else -P['leg']
        s.rect(cx + dx, base - 6 + max(0, lift), cx + dx + 2, base, 'bark', 0.2)
    s.rect(cx - 5, base - 17 + P['bob'], cx + 5, base - 6, 'bark', 0.25)
    for k in range(3): s.line(cx - 4 + k * 4, base - 16, cx - 4 + k * 4, base - 7, RAMPS['bark'][1])
    hy = base - 21 + P['bob']; s.ellipse(cx, hy, 7, 6, 'leaf')
    for k in range(7): a = k / 7 * math.pi * 2; s.ellipse(cx + math.cos(a) * 6, hy - 1 + math.sin(a) * 4.5, 2.4, 2, 'leaf')
    if not back:
        eye(s, cx - 3, hy + 1, P, size=2, glow='sprout')
        bx = cx - 9 + (1 if P['arm'] == 'raise' else 0)
        for k in range(-8, 9): s.px(bx - int(4 * math.cos(k / 8 * 1.2)), base - 12 + k, RAMPS['bark'][3])
        s.line(bx, base - 20, bx + (4 if P['arm'] == 'raise' else 1), base - 12, RAMPS['bone'][3]); s.line(bx + (4 if P['arm'] == 'raise' else 1), base - 12, bx, base - 4, RAMPS['bone'][3])
        if P['arm'] == 'raise': s.line(bx - 6, base - 12, bx + 5, base - 12, RAMPS['bone'][4])
def draw_warden(s, P, back, R='stone', glow='teal', moss=True):
    base = s.h - 3; cx = 22 + P['lean']
    quad_legs(s, cx, base, P, R, span=10, w=4, h=4)
    by = base - 9 + P['bob']; s.ellipse(cx + 1, by, 15, 9 - P['squash'] * 0.5, R)
    for (dx, dy) in ((-6, -3), (0, -5), (6, -3), (-3, 1), (4, 1), (10, -1)):
        for t in range(6): a = t / 6 * math.pi * 2; s.px(cx + dx + round(math.cos(a) * 2.5), by + dy + round(math.sin(a) * 2), RAMPS[R][1])
    for i, (dx, r) in enumerate(((0, 3.5), (1, 2.6), (0, 1.8))): s.ellipse(cx + 2 + dx, by - 9 - i * 4, r + 1, r * 0.75, R)
    if moss:
        for dx in (-8, 7): s.ellipse(cx + dx, by - 6, 2.5, 1.5, 'moss', hi=False)
    if not back:
        hx = cx - 15 + (-2 if P['arm'] == 'strike' else 0)
        s.ellipse(hx, by + 1, 4.5, 3.6, R); eye(s, hx - 2, by, P, size=1, glow=glow)
def draw_moth(s, P, back, R='violet', eyes='amber', body='night'):
    cx = 22 + P['lean']; cy = 18 + P['bob']; f = P['wing']; span = 15; up = 11 * (1 - f) + 2
    for side in (1, -1):
        s.poly([(cx, cy - 1), (cx + side * span, cy - up), (cx + side * (span + 3), cy - up + 8), (cx + side * 9, cy + 6), (cx + side * 2, cy + 3)], R, lambda x, y: 0.5 - abs(x - cx) * 0.02)
        ex, ey = cx + side * 9, cy - up * 0.5 + 1; s.ellipse(ex, ey, 2.4, 2.2, eyes, hi=False); s.px(ex, ey, RAMPS['ink'][0])
        s.poly([(cx + side * 1, cy + 2), (cx + side * 8, cy + 11 - f * 3), (cx + side * 3, cy + 8)], R, lambda x, y: 0.1)
    s.ellipse(cx, cy + 2, 2.6, 6, body)
    if not back:
        s.line(cx - 1, cy - 4, cx - 5, cy - 10, RAMPS[R][3]); s.line(cx + 1, cy - 4, cx + 4, cy - 10, RAMPS[R][3])
        eye(s, cx - 2, cy - 3, P, size=1, glow=R); eye(s, cx + 1, cy - 3, P, size=1, glow=R)
def draw_hexer(s, P, back, robe='night', orb='violet', thorn='red'):
    base = s.h - 3; cx = 16 + P['lean']
    s.poly([(cx - 8, base), (cx + 8, base), (cx + 5, base - 20 + P['bob']), (cx - 5, base - 20 + P['bob'])], robe, lambda x, y: 0.5 - (x - cx) * 0.06)
    for k in range(-6, 7, 3): s.px(cx + k, base, RAMPS[orb][2])
    hy = base - 24 + P['bob']
    s.poly([(cx - 6, hy + 5), (cx + 6, hy + 5), (cx + 2, hy - 8), (cx - 1, hy - 9)], robe, lambda x, y: 0.4)
    for k in range(5): s.px(cx - 4 + k * 2, hy - 7 + (k % 2), RAMPS[thorn][3])
    if not back:
        for dx in (-3, 0): s.px(cx + dx, hy + 1, RAMPS[orb][4]); s.px(cx + dx, hy + 2, RAMPS[orb][3])
        sx = cx - 9 + (-2 if P['arm'] in ('raise', 'strike') else 0); top = hy - 6 - (3 if P['arm'] == 'raise' else 0)
        s.line(sx, base, sx + 1, top, 'bark', 1); s.ellipse(sx + 1, top - 1, 2.4 + P['glow'], 2.4 + P['glow'], orb); s.px(sx + 1, top - 2, RAMPS[orb][4])
def draw_thornmother(s, P, back):
    base = s.h - 3; cx = 36 + P['lean']
    for k in range(5): a = (k / 4 - 0.5) * 2.2; s.line(cx + math.sin(a) * 4, base - 6, cx + math.sin(a) * 15, base, 'bark', 2)
    s.poly([(cx - 9, base - 2), (cx + 9, base - 2), (cx + 7, base - 40 + P['bob']), (cx - 7, base - 40 + P['bob'])], 'bark', lambda x, y: 0.4 - (x - cx) * 0.05)
    for k in range(4): s.line(cx - 6 + k * 4, base - 38, cx - 5 + k * 4, base - 4, RAMPS['bark'][1])
    hy = base - 48 + P['bob']; s.ellipse(cx, hy, 11, 10, 'moss')
    for k in range(9): a = math.pi * (1.05 + k * 0.11); x0, y0 = cx + math.cos(a) * 9, hy + math.sin(a) * 8; s.line(x0, y0, x0 + math.cos(a) * 9, y0 + math.sin(a) * 9, 'red')
    for side in (-1, 1):
        reach = (8 if P['arm'] in ('raise', 'strike') else 0)
        s.line(cx + side * 7, base - 34 + P['bob'], cx + side * (18 + reach * 0.5), base - 26 - reach * 2, 'bark', 3)
        s.line(cx + side * (18 + reach * 0.5), base - 26 - reach * 2, cx + side * (22 + reach), base - 18 - reach * 3, 'bark', 2)
    if not back:
        eye(s, cx - 6, hy + 1, P, size=2, glow='amber'); eye(s, cx + 2, hy + 1, P, size=2, glow='amber')
        s.ellipse(cx - 1, base - 26 + P['bob'], 3.5 + P['glow'], 3, 'ember', hi=True)
def draw_sprout(s, P, back):
    base = s.h - 3; cx = 12 + P['lean']
    for i, dx in enumerate((-3, 2)): s.line(cx + dx, base - 2, cx + dx + (P['leg'] if i else -P['leg']), base, 'bark')
    s.ellipse(cx, base - 6 + P['bob'], 5, 4.6 - P['squash'] * 0.3, 'sprout')
    s.line(cx, base - 10 + P['bob'], cx, base - 13 + P['bob'], 'sprout')
    s.poly([(cx, base - 13 + P['bob']), (cx - 7, base - 17 + P['bob']), (cx - 2, base - 12 + P['bob'])], 'sprout', lambda x, y: 0.6)
    s.poly([(cx, base - 13 + P['bob']), (cx + 6, base - 18 + P['bob']), (cx + 2, base - 12 + P['bob'])], 'sprout', lambda x, y: 0.3)
    if not back: eye(s, cx - 3, base - 7 + P['bob'], P, size=1); eye(s, cx, base - 7 + P['bob'], P, size=1)
# ── Act II · The Ashen Warrens ──
def draw_cinderling(s, P, back):
    base = s.h - 3; cx = 14 + P['lean']; cy = base - 8 + P['bob']
    s.ellipse(cx, cy, 7 - P['squash'] * 0.3, 7 + P['squash'] * 0.2, 'basalt')
    for (dx, dy) in ((-3, -2), (2, -4), (3, 2), (-2, 3), (0, 0)): s.line(cx + dx, cy + dy, cx + dx + 2, cy + dy + 1, RAMPS['lava'][3 if dy else 4])
    for k in range(5): a = -math.pi / 2 + (k - 2) * 0.45; s.line(cx + math.cos(a) * 5, cy + math.sin(a) * 6, cx + math.cos(a) * (8 + (k % 2) * 2 + P['glow'] * 2), cy + math.sin(a) * (9 + (k % 2) * 2), 'lava')
    for i, dx in enumerate((-3, 3)): s.line(cx + dx, cy + 6, cx + dx + (P['leg'] if i else -P['leg']), base, 'basalt')
    if not back: eye(s, cx - 4, cy - 1, P, size=2, glow='lava'); eye(s, cx, cy - 1, P, size=2, glow='lava')
def draw_ashbrute(s, P, back):
    base = s.h - 3; cx = 22 + P['lean']
    for i, dx in enumerate((-6, 4)):
        lift = max(0, P['leg'] if i == 0 else -P['leg']); s.rect(cx + dx, base - 8 + lift, cx + dx + 4, base, 'basalt', 0.2)
    by = base - 17 + P['bob']
    s.ellipse(cx, by, 12, 10 - P['squash'] * 0.4, 'ash')
    for (dx, dy, r) in ((-7, -6, 4), (6, -7, 4.5), (0, -9, 3.5)): s.ellipse(cx + dx, by + dy, r, r * 0.75, 'basalt')
    for k in range(-8, 9, 4): s.line(cx + k, by - 2, cx + k + 2, by + 6, RAMPS['lava'][2])
    arm = -5 if P['arm'] == 'strike' else 0
    s.ellipse(cx - 12 + arm, by + 3, 4.5, 6, 'basalt'); s.ellipse(cx - 13 + arm, by + 9, 4, 3, 'ash')
    if not back: eye(s, cx - 6, by - 2, P, size=2, glow='amber')
def draw_harpooner(s, P, back):
    base = s.h - 3; cx = 18 + P['lean']
    for i, dx in enumerate((-3, 2)): lift = max(0, P['leg'] if i == 0 else -P['leg']); s.rect(cx + dx, base - 7 + lift, cx + dx + 2, base, 'basalt', 0.2)
    s.rect(cx - 6, base - 20 + P['bob'], cx + 6, base - 7, 'ash', 0.3)
    s.poly([(cx - 7, base - 20 + P['bob']), (cx + 7, base - 20 + P['bob']), (cx + 4, base - 25 + P['bob']), (cx - 4, base - 25 + P['bob'])], 'steel', lambda x, y: 0.4)
    for k in range(3): s.px(cx - 4 + k * 4, base - 13, RAMPS['gold'][3])
    if not back:
        eye(s, cx - 3, base - 23 + P['bob'], P, size=1, glow='lava')
        hx = cx - 7 - (5 if P['arm'] in ('strike', 'raise') else 0); hy = base - 16
        s.line(cx + 6, hy + 4, hx - 8, hy - 4, 'bark', 2)
        s.poly([(hx - 8, hy - 4), (hx - 13, hy - 7), (hx - 10, hy - 2)], 'steel', lambda x, y: 0.7); s.px(hx - 9, hy - 6, RAMPS['steel'][4])
        for k in range(4): s.px(cx + 8, hy + k * 2, RAMPS['bone'][2])
def draw_emberseer(s, P, back): draw_hexer(s, P, back, robe='basalt', orb='lava', thorn='amber')
def draw_champion(s, P, back):
    base = s.h - 3; cx = 24 + P['lean']
    for i, dx in enumerate((-5, 3)): lift = max(0, P['leg'] if i == 0 else -P['leg']); s.rect(cx + dx, base - 10 + lift, cx + dx + 3, base, 'basalt', 0.2)
    by = base - 22 + P['bob']
    s.poly([(cx - 9, by + 12), (cx + 9, by + 12), (cx + 11, by - 6), (cx - 11, by - 6)], 'basalt', lambda x, y: 0.5 - (x - cx) * 0.05)
    for k in range(-8, 9, 4): s.px(cx + k, by - 4, RAMPS['gold'][3]); s.px(cx + k, by + 10, RAMPS['gold'][2])
    s.ellipse(cx, by - 11, 6, 6, 'basalt'); s.line(cx - 6, by - 11, cx - 9, by - 18, RAMPS['gold'][3]); s.line(cx + 6, by - 11, cx + 9, by - 18, RAMPS['gold'][3])
    if not back:
        for k in range(-3, 4): s.px(cx + k, by - 11, RAMPS['lava'][3])
        sw = -6 if P['arm'] == 'strike' else 0
        s.line(cx - 10, by + 2, cx - 22 + sw, by - 14 - sw, 'steel', 2); s.line(cx - 12, by + 4, cx - 8, by, RAMPS['gold'][3])
        s.ellipse(cx + 11, by + 2, 5, 7, 'basalt'); s.ellipse(cx + 11, by + 2, 2, 3, 'lava')
def draw_matron(s, P, back):
    base = s.h - 3; cx = 36 + P['lean']
    s.poly([(cx - 16, base), (cx + 16, base), (cx + 10, base - 30 + P['bob']), (cx - 10, base - 30 + P['bob'])], 'basalt', lambda x, y: 0.4 - (x - cx) * 0.04)
    for k in range(-12, 13, 4): s.line(cx + k, base - 2, cx + k * 0.6, base - 28, RAMPS['lava'][2 + (k % 8 == 0)])
    hy = base - 40 + P['bob']; s.ellipse(cx, hy, 10, 9, 'ash')
    for k in range(7): a = math.pi * (1.1 + k * 0.13); s.line(cx + math.cos(a) * 8, hy + math.sin(a) * 7, cx + math.cos(a) * (14 + P['glow'] * 3), hy + math.sin(a) * (15 + P['glow'] * 3), 'lava', 2)
    for side in (-1, 1):
        r = 6 if P['arm'] in ('raise', 'strike') else 0
        s.line(cx + side * 9, base - 26 + P['bob'], cx + side * (20 + r), base - 16 - r * 2, 'basalt', 3); s.ellipse(cx + side * (21 + r), base - 15 - r * 2, 3, 3, 'lava')
    if not back:
        eye(s, cx - 5, hy, P, size=2, glow='lava'); eye(s, cx + 2, hy, P, size=2, glow='lava')
        for k in range(-3, 4): s.px(cx + k, hy + 5, RAMPS['lava'][4 if abs(k) < 2 else 3])
# ── Act III · The Fractured Nexus ──
def draw_riftstalker(s, P, back):
    base = s.h - 3; cx = 20 + P['lean']
    quad_legs(s, cx, base, P, 'void', span=8, w=2, h=8)
    by = base - 12 + P['bob']; s.ellipse(cx, by, 11, 4.5, 'void')
    for k in range(5): s.px(cx - 8 + k * 4, by - 4, RAMPS['crystal'][4]); s.px(cx - 8 + k * 4, by - 5, RAMPS['crystal'][3])
    for k in range(4): s.line(cx + 10 + k, by - k, cx + 14 + k * 2, by - 6 - k * 2, RAMPS['crystal'][2])
    if not back:
        hx = cx - 11 + (-3 if P['arm'] == 'strike' else 0); s.ellipse(hx, by - 2, 4.5, 3.5, 'void')
        s.poly([(hx - 3, by), (hx - 10, by + 2), (hx - 3, by + 3)], 'crystal', lambda x, y: 0.6)
        eye(s, hx - 2, by - 3, P, size=1, glow='crystal'); eye(s, hx + 1, by - 3, P, size=1, glow='crystal')
def draw_nullwarden(s, P, back): draw_warden(s, P, back, R='void', glow='crystal', moss=False)
def draw_shardling(s, P, back): draw_moth(s, P, back, R='crystal', eyes='white', body='void')
def draw_sentinel(s, P, back):
    base = s.h - 3; cx = 26 + P['lean']
    for i, dx in enumerate((-6, 4)): lift = max(0, P['leg'] if i == 0 else -P['leg']); s.rect(cx + dx, base - 12 + lift, cx + dx + 4, base, 'void', 0.2)
    by = base - 26 + P['bob']
    s.poly([(cx, by - 16), (cx + 13, by), (cx, by + 16), (cx - 13, by)], 'crystal', lambda x, y: 0.6 - (x - cx) * 0.04 - (y - by) * 0.02)
    s.poly([(cx, by - 9), (cx + 6, by), (cx, by + 9), (cx - 6, by)], 'void', lambda x, y: 0.3)
    for k in range(3): s.ellipse(cx - 16 + k * 16, by - 18 + abs(k - 1) * 6 + P['bob'], 2.5, 3.5, 'crystal')
    if not back: s.ellipse(cx - 1, by, 2.6 + P['glow'], 2.6 + P['glow'], 'white')
def draw_unwritten(s, P, back):
    base = s.h - 3; cx = 36 + P['lean']
    s.poly([(cx - 12, base), (cx + 12, base), (cx + 15, base - 44 + P['bob']), (cx - 15, base - 44 + P['bob'])], 'parch', lambda x, y: 0.5 - (x - cx) * 0.03)
    for k in range(9): y = base - 6 - k * 4; s.line(cx - 10 + (k % 2) * 3, y, cx + 8 - (k % 3) * 2, y, RAMPS['ink'][2])
    for k in range(-14, 15, 7): s.line(cx + k, base, cx + k * 1.4, base + 1, RAMPS['parch'][1])
    hy = base - 52 + P['bob']; s.ellipse(cx, hy, 10, 10, 'parch')
    for k in range(10): a = k / 10 * math.pi * 2 + P['glow']; s.px(cx + math.cos(a) * (14 + P['glow'] * 2), hy + math.sin(a) * (14 + P['glow'] * 2), RAMPS['crystal'][4])
    for side in (-1, 1):
        r = 6 if P['arm'] in ('raise', 'strike') else 0
        s.poly([(cx + side * 12, base - 40 + P['bob']), (cx + side * (30 + r), base - 30 - r * 2), (cx + side * (26 + r), base - 22 - r), (cx + side * 12, base - 30)], 'parch', lambda x, y: 0.3)
    if not back:
        s.ellipse(cx, hy, 5, 5, 'void'); s.px(cx - 1, hy - 1, RAMPS['crystal'][4]); s.px(cx, hy, RAMPS['white'][4])
ENEMY_SPRITES = {
  'grub': (draw_grub, 44, 24, 0), 'hound': (draw_hound, 40, 32, 0), 'archer': (draw_archer, 32, 40, 0), 'warden': (draw_warden, 44, 40, 0),
  'moth': (draw_moth, 44, 36, 1), 'hexer': (draw_hexer, 32, 44, 0), 'alpha': (draw_alpha, 52, 40, 0), 'thornmother': (draw_thornmother, 72, 80, 0),
  'sproutling': (draw_sprout, 24, 24, 0),
  'cinderling': (draw_cinderling, 28, 30, 0), 'ashbrute': (draw_ashbrute, 44, 44, 0), 'harpooner': (draw_harpooner, 40, 40, 0),
  'emberseer': (draw_emberseer, 32, 44, 0), 'champion': (draw_champion, 48, 52, 0), 'matron': (draw_matron, 72, 80, 0),
  'riftstalker': (draw_riftstalker, 44, 34, 0), 'nullwarden': (draw_nullwarden, 44, 40, 0), 'shardling': (draw_shardling, 44, 36, 1),
  'sentinel': (draw_sentinel, 52, 60, 1), 'unwritten': (draw_unwritten, 72, 84, 0),
}
