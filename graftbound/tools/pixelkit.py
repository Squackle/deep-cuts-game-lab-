"""Tiny pixel-art authoring kit: shaded primitives with ordered dithering, selective outlines.
All art produced with this kit is ORIGINAL programmer art (see ART-BIBLE.md, 'asset status')."""
import numpy as np
from PIL import Image

BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0
L = np.array([-0.55, -0.65, 0.52]); L = L / np.linalg.norm(L)
def hexc(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
def ramp(*hexes): return [hexc(h) for h in hexes]
RAMPS = {
  'parch': ramp('#5b4a35', '#9c8763', '#cdb88c', '#ecdcb4', '#fff6dc'), 'gold': ramp('#5a3e12', '#9a6c22', '#d3a43f', '#f2d27a', '#fff2be'),
  'ink': ramp('#120d0a', '#2a2018', '#43362a', '#5e4e3c', '#7d6a52'), 'fur': ramp('#2a1a10', '#5a3a22', '#87603a', '#b48a58', '#d8b482'),
  'bark': ramp('#1f150e', '#3e2a1a', '#5f4429', '#82623d', '#a58456'), 'leaf': ramp('#10200f', '#1f3d1c', '#33602b', '#4f8a3a', '#7fb855'),
  'moss': ramp('#16260f', '#2a4719', '#3f6a24', '#5f9433', '#8cc252'), 'stone': ramp('#26282a', '#46494a', '#686b68', '#8f918a', '#b9b9ad'),
  'teal': ramp('#0f2a33', '#1d4b57', '#2f7480', '#55a3a8', '#9fd6cf'), 'grub': ramp('#2d1414', '#5e2e2a', '#8f5446', '#b97d64', '#e0ac8c'),
  'violet': ramp('#1c0f2e', '#3b1f5c', '#5f3590', '#8a5cc0', '#c4a0ee'), 'night': ramp('#09080d', '#18151f', '#2a2534', '#403a4d', '#5c5468'),
  'red': ramp('#2a0808', '#5e1212', '#962020', '#cc3b2b', '#f07a52'), 'bone': ramp('#4a4234', '#857a64', '#bdb093', '#e2d8bd', '#fffbea'),
  'glass': ramp('#1b3a38', '#2f6b64', '#58a399', '#93d6c7', '#e6fff6'), 'sprout': ramp('#123012', '#22571d', '#3b8a2a', '#64bd3e', '#a9eb6c'),
  'amber': ramp('#4a1a05', '#8a3b0a', '#d06a14', '#f3a43a', '#ffe08a'), 'ember': ramp('#2a0d05', '#6b2410', '#b5461c', '#ea7a32', '#ffc06a'),
  'white': ramp('#808080', '#a8a8a8', '#d0d0d0', '#ececec', '#ffffff'), 'steel': ramp('#1c2228', '#3a4550', '#647380', '#9aa8b2', '#d8e2e8'),
  'basalt': ramp('#0e0b0b', '#1f1918', '#332926', '#4a3c36', '#66544a'), 'lava': ramp('#5a0e02', '#a52a06', '#ec5a12', '#ffa236', '#fff0a0'),
  'ash': ramp('#1a1716', '#2e2927', '#48403c', '#655a53', '#8a7d72'), 'crystal': ramp('#1a0f33', '#3a2470', '#6448b0', '#9c82e6', '#e2d6ff'),
  'void': ramp('#05030a', '#100a1c', '#1f1533', '#33244f', '#4c3a70'),
}
class Spr:
    def __init__(s, w, h):
        s.w, s.h = w, h
        s.rgb = np.zeros((h, w, 3), np.uint8); s.a = np.zeros((h, w), np.uint8)
        s.dark = np.zeros((h, w, 3), np.uint8); s.tag = np.zeros((h, w), np.uint8)
    def put(s, x, y, c, dark=None, tag=0):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < s.w and 0 <= y < s.h:
            s.rgb[y, x] = c; s.a[y, x] = 255; s.dark[y, x] = dark if dark is not None else tuple(int(v * 0.35) for v in c); s.tag[y, x] = tag
    def shade(s, r, lam, x, y):
        v = (lam * 0.5 + 0.5) * 3.2 + 0.55 + (BAYER[y % 4, x % 4] - 0.5) * 0.9
        return r[max(0, min(len(r) - 2, int(v)))]
    def ellipse(s, cx, cy, rx, ry, r, tag=0, hi=True):
        R = RAMPS[r] if isinstance(r, str) else r
        for y in range(int(cy - ry - 1), int(cy + ry + 2)):
            for x in range(int(cx - rx - 1), int(cx + rx + 2)):
                nx, ny = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
                d = nx * nx + ny * ny
                if d > 1: continue
                nz = (1 - d) ** 0.5; lam = nx * L[0] + ny * L[1] + nz * L[2]
                c = s.shade(R, lam, x, y)
                if hi and lam > 0.93: c = R[-1]
                s.put(x, y, c, R[0], tag)
    def rect(s, x0, y0, x1, y1, r, face=0.3, tag=0):
        R = RAMPS[r] if isinstance(r, str) else r
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1):
                lam = face + (0.25 if y == int(y0) else 0) - (0.3 if y == int(y1) else 0)
                s.put(x, y, s.shade(R, lam, x, y), R[0], tag)
    def poly(s, pts, r, lam_fn=None, tag=0):
        R = RAMPS[r] if isinstance(r, str) else r
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        for y in range(int(min(ys)), int(max(ys)) + 1):
            for x in range(int(min(xs)), int(max(xs)) + 1):
                if _inside(x + 0.5, y + 0.5, pts): s.put(x, y, s.shade(R, lam_fn(x, y) if lam_fn else 0.2, x, y), R[0], tag)
    def line(s, x0, y0, x1, y1, c, w=1):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        C = RAMPS[c][2] if isinstance(c, str) else c; D = RAMPS[c][0] if isinstance(c, str) else None
        for i in range(n + 1):
            t = i / max(1, n); x = x0 + (x1 - x0) * t; y = y0 + (y1 - y0) * t
            for k in range(w): s.put(x + (k if abs(x1 - x0) < abs(y1 - y0) else 0), y + (k if abs(x1 - x0) >= abs(y1 - y0) else 0), C, D)
    def px(s, x, y, c): s.put(x, y, RAMPS[c][3] if isinstance(c, str) else c, None)
    def outline(s):
        a = s.a > 0; o = np.zeros_like(a); col = np.zeros_like(s.rgb)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sh = np.roll(np.roll(a, dy, 0), dx, 1)
            if dy == 1: sh[0, :] = False
            if dy == -1: sh[-1, :] = False
            if dx == 1: sh[:, 0] = False
            if dx == -1: sh[:, -1] = False
            src = np.roll(np.roll(s.dark, dy, 0), dx, 1)
            m = sh & ~a & ~o; col[m] = src[m]; o |= m
        s.rgb[o] = col[o]; s.a[o] = 255
        return s
    def image(s): return Image.fromarray(np.dstack([s.rgb, s.a]), 'RGBA')
    def mask_image(s):
        m = (s.tag == 1) & (s.a > 0)
        return Image.fromarray(np.dstack([np.full((s.h, s.w, 3), 255, np.uint8), (m * 255).astype(np.uint8)]), 'RGBA')
def _inside(x, y, pts):
    c = False; n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]; x2, y2 = pts[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-9) + x1: c = not c
    return c
