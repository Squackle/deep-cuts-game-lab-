"""Sprite designs for GRAFTBOUND. Each draw fn(s, P, back) paints one frame.
P = pose dict: bob (px, + = down), lean (px, - = toward facing), leg (walk phase -1..1), arm ('rest'|'strike'|'raise'),
squash (px), hurt (bool), wing (0..1 flap).  Facing is LEFT in authored frames; the renderer mirrors for right."""
import math
from pixelkit import Spr, RAMPS, merge

ANIMS = [  # name, frames, fps, loop
  ('idle', 4, 4, True), ('walk', 4, 10, True), ('attack', 4, 12, False), ('cast', 3, 8, False), ('hurt', 2, 8, False),
]
def pose(anim, f):
    P = dict(bob=0, lean=0, leg=0, arm='rest', squash=0, hurt=False, wing=0.5, glow=0)
    if anim == 'idle': P.update(bob=[0, 0, 1, 1][f], wing=[0.3, 0.6, 0.9, 0.6][f])
    if anim == 'walk': P.update(bob=[0, 1, 0, 1][f], leg=[-1, 0, 1, 0][f], wing=[0.2, 0.8, 0.2, 0.8][f])
    if anim == 'attack': P.update(lean=[2, -3, -4, -1][f], arm=['rest', 'strike', 'strike', 'rest'][f], squash=[1, -1, 0, 0][f], wing=[0.9, 0.1, 0.0, 0.5][f])
    if anim == 'cast': P.update(arm='raise', bob=[0, -1, -1][f], glow=[0.4, 1, 0.7][f], wing=[0.5, 1, 0.8][f])
    if anim == 'hurt': P.update(lean=[3, 2][f], squash=[2, 1][f], hurt=True, wing=0.2)
    return P

def eye(s, x, y, P, r='ink', size=2, glow=None):
    if P['hurt']:
        s.px(x, y, RAMPS['ink'][0]); s.px(x + 1, y + 1, RAMPS['ink'][0]); return
    for dy in range(size):
        for dx in range(size - (1 if size > 2 else 0)): s.px(x + dx, y + dy, RAMPS[r][0] if not glow else RAMPS[glow][3])
    s.px(x, y, RAMPS['white'][4] if not glow else RAMPS[glow][4])

PW, PH = 48, 48
def blank_geom(P):
    cx = 24 + P['lean']; base = PH - 4
    rx, ry = 8 + P['squash'] * 0.5, 7.5 - P['squash'] * 0.6
    cy = base - ry - 1 + P['bob']
    return cx, cy, rx, ry, base

def draw_blank(s, P, back):
    cx, cy, rx, ry, base = blank_geom(P)
    for i, fx in enumerate((-4, 3)):
        lift = (P['leg'] if i == 0 else -P['leg'])
        s.ellipse(cx + fx, base - 1 - max(0, lift), 2.6, 1.8, 'parch', tag=1)
    s.ellipse(cx + rx - 1, cy + 1, 2, 2.5, 'parch', tag=1)
    s.ellipse(cx, cy, rx, ry, 'parch', tag=1)
    for k in range(4):
        for j in range(4 - k): s.px(cx + rx - 3 - j, cy - ry + 1 + k, RAMPS['parch'][4] if j == 0 else RAMPS['parch'][3])
    if not back:
        g = RAMPS['gold']
        for yy in range(4):
            for xx in range(3):
                edge = xx in (0, 2) or yy in (0, 3)
                s.px(cx - 2 + xx, cy + 1 + yy, g[3] if edge else (g[4] if P['glow'] > 0.5 else RAMPS['parch'][2]))
        eye(s, cx - 6, cy - 3, P, size=3); eye(s, cx - 1, cy - 3, P, size=3)
        s.px(cx - 4, cy + 1, RAMPS['parch'][1])
    else:
        s.line(cx - 3, cy - 2, cx + 3, cy + 2, RAMPS['parch'][1])
    if P['arm'] == 'strike': s.ellipse(cx - rx - 2, cy + 1, 2.6, 2, 'parch', tag=1)
    elif P['arm'] == 'raise': s.ellipse(cx - rx + 1, cy - ry + 1, 2, 2.6, 'parch', tag=1)
    else: s.ellipse(cx - rx + 1, cy + 2, 2, 2.6, 'parch', tag=1)

def part_wings(s, P, back, tier):
    cx, cy, rx, ry, base = blank_geom(P)
    span = 9 + 5 * tier; up = 4 + 7 * P['wing']
    for side in (-1, 1):
        if not back and side == -1: continue
        ox = cx + 2 + side * 1
        pts = [(ox, cy - 2), (ox + side * span, cy - ry - up), (ox + side * (span + 2), cy - ry - up + 4), (ox + side * span * 0.6, cy + 2), (ox + side * 2, cy + 3)]
        s.poly(pts, 'parch' if tier == 1 else 'bone', lambda x, y: 0.4 - (y - cy) * 0.05)
        for k in range(1, 4):
            s.line(ox, cy, ox + side * span * k / 4, cy - ry - up + 2 + k, RAMPS['parch'][1])
    if not back:
        ox = cx + 4; pts = [(ox, cy - 3), (ox + span * 0.9, cy - ry - up - 2), (ox + span, cy - ry - up + 3), (ox + 3, cy + 1)]
        s.poly(pts, 'parch' if tier == 1 else 'bone', lambda x, y: 0.6)
def part_shell(s, P, back, tier):
    cx, cy, rx, ry, base = blank_geom(P)
    ox = 0 if back else 5
    s.ellipse(cx + ox, cy - 2, rx - 3 + tier + (3 if back else 0), ry - 2 + tier * 0.6, 'teal')
    for k in range(-1, 2): s.px(cx + ox + k * 3, cy - 3 - abs(k), RAMPS['teal'][4])
def part_spikes(s, P, back, tier):
    cx, cy, rx, ry, base = blank_geom(P)
    for k in range(5 + tier * 2):
        a = math.pi * (1.05 + k * 0.11)
        x0, y0 = cx + 2 + math.cos(a) * -rx * 0.9, cy + math.sin(a) * ry * 0.95
        s.line(x0, y0, x0 + math.cos(a) * -(3 + tier), y0 + math.sin(a) * (3 + tier) - 1, 'bark')
def part_horns(s, P, back, tier):
    cx, cy, rx, ry, base = blank_geom(P)
    for i, hx in enumerate((-4, 2)):
        if back and i == 0: continue
        for k in range(4 + tier * 2):
            s.px(hx + cx - k * 0.5 - (1 if k > 3 else 0), cy - ry - k, RAMPS['bone'][3 if k < 3 else 2])
            s.px(hx + cx - k * 0.5 + 1, cy - ry - k, RAMPS['bone'][1])
def part_antlers(s, P, back, tier):
    cx, cy, rx, ry, base = blank_geom(P)
    for hx, d in ((-3, -1), (3, 1)):
        x, y = cx + hx, cy - ry
        s.line(x, y, x + d * 2, y - 7, 'bark'); s.line(x + d * 1, y - 4, x + d * 5, y - 6, 'bark'); s.line(x + d * 2, y - 7, x - d * 1, y - 10, 'bark')
def part_crown(s, P, back, tier):
    cx, cy, rx, ry, base = blank_geom(P)
    for k in range(-3, 4):
        h = 3 if k % 2 == 0 else 1
        for j in range(h): s.px(cx - 1 + k, cy - ry - 1 - j, RAMPS['gold'][3 if j else 2])
    s.px(cx - 1, cy - ry - 3, RAMPS['red'][4])
def part_tail(s, P, back, tier):
    cx, cy, rx, ry, base = blank_geom(P)
    sw = (P['bob'] - 0.5) * 2
    pts = [(cx + rx - 2 + i * 2.2, cy + 3 - i * 1.3 + (sw if i > 3 else 0)) for i in range(7)]
    for i, (x, y) in enumerate(pts): s.ellipse(x, y, 2.2 - i * 0.22, 2.2 - i * 0.22, 'parch', tag=1)
    s.px(pts[-1][0] + 1, pts[-1][1] - 1, RAMPS['ember'][3])
def part_blades(s, P, back, tier):
    cx, cy, rx, ry, base = blank_geom(P)
    ext = -4 if P['arm'] == 'strike' else 0
    s.poly([(cx - rx + 1, cy), (cx - rx - 7 + ext, cy - 9), (cx - rx - 6 + ext, cy - 10), (cx - rx + 3, cy - 1)], 'glass', lambda x, y: 0.7)
def part_claws(s, P, back, tier):
    cx, cy, rx, ry, base = blank_geom(P)
    hx = cx - rx - (2 if P['arm'] == 'strike' else -1); hy = cy + 2
    for k in range(3): s.line(hx, hy + k - 1, hx - 3, hy + k, RAMPS['bone'][3])
def part_tusks(s, P, back, tier):
    cx, cy, rx, ry, base = blank_geom(P)
    for hx in (-6, -2):
        s.px(cx + hx, cy + 2, RAMPS['bone'][4]); s.px(cx + hx - 1, cy + 1, RAMPS['bone'][3]); s.px(cx + hx - 1, cy, RAMPS['bone'][2])
def part_beak(s, P, back, tier):
    cx, cy, rx, ry, base = blank_geom(P)
    s.poly([(cx - rx + 1, cy - 2), (cx - rx - 5, cy), (cx - rx + 1, cy + 1)], 'amber', lambda x, y: 0.6)
def part_armor(s, P, back, tier):
    cx, cy, rx, ry, base = blank_geom(P)
    top = cy - 1; bot = cy + ry - 2
    for y in range(int(top), int(bot) + 1):
        half = int((rx - 1.5) * (1 - ((y - cy) / (ry + 1)) ** 2) ** 0.5)
        for x in range(int(cx) - half, int(cx) + half + 1):
            lam = 0.55 - (x - cx) * 0.06 - (y - top) * 0.04
            s.put(x, y, s.shade(RAMPS['steel'], lam, x, y), RAMPS['steel'][0])
    for x in range(int(cx) - int(rx) + 3, int(cx) + int(rx) - 2): s.px(x, top, RAMPS['gold'][3])
    for dx in (-3, 3): s.px(cx + dx, top + 2, RAMPS['gold'][4])
    if not back: s.px(cx, top + 3, RAMPS['gold'][3]); s.px(cx, top + 4, RAMPS['gold'][2])
    for x in range(int(cx) - int(rx) + 2, int(cx) + int(rx) - 1): s.px(x, cy - ry + 3, RAMPS['steel'][3]); s.px(x, cy - ry + 2, RAMPS['steel'][2])
    if tier >= 2:
        for side in (-1, 1): s.ellipse(cx + side * (rx - 1), cy - 1, 2.6, 2, 'steel')
        for k in range(4): s.px(cx - 1, cy - ry + 1 - k, RAMPS['red'][3 if k < 3 else 4])
def fx_venom(s, P, back, tier):
    cx, cy, rx, ry, base = blank_geom(P)
    for (dx, dy) in ((-3, -5), (4, -3), (5, 2), (-6, 3), (1, 4)): s.px(cx + dx, cy + dy, RAMPS['violet'][3]); s.px(cx + dx + 1, cy + dy, RAMPS['violet'][2])
    if not back: s.px(cx - 4, cy + 3, RAMPS['violet'][4]); s.px(cx - 4, cy + 4, RAMPS['violet'][3])
def fx_moss(s, P, back, tier):
    cx, cy, rx, ry, base = blank_geom(P)
    for dx in range(-5, 6, 2): s.ellipse(cx + dx + 1, cy - ry + 1 + abs(dx) * 0.3, 1.8, 1.3, 'moss', hi=False)
def fx_eyes(s, P, back, tier):
    cx, cy, rx, ry, base = blank_geom(P)
    if not back: s.px(cx - 3, cy - 6, RAMPS['teal'][4]); s.px(cx - 3, cy - 7, RAMPS['teal'][3])
def fx_tendrils(s, P, back, tier):
    cx, cy, rx, ry, base = blank_geom(P)
    for k, dx in enumerate((-5, 0, 5)): s.line(cx + dx, cy + ry - 2, cx + dx + (k - 1), cy + ry + 1 + P['bob'], RAMPS['red'][2])
def fx_aura(s, P, back, tier): pass
def mark(i):
    def f(s, P, back, tier):
        cx, cy, rx, ry, base = blank_geom(P)
        for k in range(3): s.px(cx + 3 + i * 2, cy - 3 + k * 2 + (i % 2), (255, 255, 255))
    return f

PARTS = {
  'wings':  (part_wings,  {'front': 'behind', 'back': 'front'}, 2),
  'shell':  (part_shell,  {'front': 'front', 'back': 'front'}, 2),
  'spikes': (part_spikes, {'front': 'behind', 'back': 'front'}, 2),
  'horns':  (part_horns,  {'front': 'front', 'back': 'front'}, 2),
  'antlers':(part_antlers,{'front': 'behind', 'back': 'front'}, 1),
  'crown':  (part_crown,  {'front': 'front', 'back': 'front'}, 1),
  'tail':   (part_tail,   {'front': 'behind', 'back': 'front'}, 1),
  'blades': (part_blades, {'front': 'front', 'back': 'behind'}, 1),
  'claws':  (part_claws,  {'front': 'front', 'back': 'behind'}, 1),
  'tusks':  (part_tusks,  {'front': 'front', 'back': 'behind'}, 1),
  'beak':   (part_beak,   {'front': 'front', 'back': 'behind'}, 1),
  'armor':  (part_armor,  {'front': 'front', 'back': 'front'}, 2),
  'venom':  (fx_venom,    {'front': 'front', 'back': 'front'}, 1),
  'moss':   (fx_moss,     {'front': 'front', 'back': 'front'}, 1),
  'eyes':   (fx_eyes,     {'front': 'front', 'back': 'front'}, 1),
  'tendrils':(fx_tendrils,{'front': 'front', 'back': 'front'}, 1),
  'mark0': (mark(0), {'front': 'front', 'back': 'front'}, 1),
  'mark1': (mark(1), {'front': 'front', 'back': 'front'}, 1),
  'mark2': (mark(2), {'front': 'front', 'back': 'front'}, 1),
}
