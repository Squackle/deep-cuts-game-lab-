/**
 * v1.7.0 central creature scale and anchoring.
 *
 * Every sprite's VISIBLE art bounds are measured once (idle front frame), then:
 *  - visual size comes from one species-aware table of target heights in tile units (squirrels small, wolves
 *    dog-sized, humanoids ~1 tile, bosses imposing), with a footprint width cap so nothing spills across tiles;
 *  - the sprite is anchored by its real FEET (bottom of the art) and horizontally by the art's centre, so an
 *    off-centre drawing (e.g. a coiled snake) still stands in the middle of its tile.
 * Pure presentation: never changes power/toughness, tiles, targeting or hitboxes.
 */
export const SIZE = Object.freeze({ tiny: 0.36, small: 0.5, low: 0.36, medium: 0.7, quad: 0.66, leader: 0.86, humanoid: 1.02, big: 1.2, huge: 1.4, boss: 1.85 });
export const SIZE_CLASS = Object.freeze({
  mtg_friendlySquirrel: 'tiny',
  mtg_friendlySpider: 'small', mtg_spider: 'small', mtg_friendlyTentacle: 'small', mtg_friendlyBirdIllusion: 'small', mtg_friendlyHornet: 'small', mtg_moth: 'small', mtg_shardling: 'small',
  mtg_friendlySnake: 'low', mtg_grub: 'low',
  mtg_friendlySaproling: 'medium', mtg_friendlySproutling: 'medium', mtg_saproling: 'medium', mtg_slug: 'medium', mtg_friendlyElemental: 'medium', mtg_friendlyGoblin: 'medium', mtg_goblin: 'medium', mtg_cinderling: 'medium', mtg_harpooner: 'medium', mtg_friendlyDrake: 'medium',
  mtg_hound: 'quad', mtg_wolf: 'quad', mtg_tortoise: 'quad',
  mtg_alpha: 'leader', mtg_champion: 'leader', mtg_nullwarden: 'leader',
  mtg_friendlyCatSoldier: 'humanoid', mtg_friendlySoldier: 'humanoid', mtg_archer: 'humanoid', mtg_hexer: 'humanoid', mtg_emberseer: 'humanoid', mtg_riftstalker: 'humanoid', mtg_zombie: 'humanoid', mtg_friendlySkeleton: 'humanoid', blank: 'humanoid',
  mtg_ashbrute: 'big', mtg_angel: 'big', mtg_golemFly: 'big', mtg_golemVigilance: 'big', mtg_golemTrample: 'big',
  mtg_sentinel: 'huge',
});
/** Side-view studies drawn facing screen-RIGHT (the legacy convention was left). Verified in dev/facing-qa.html. */
export const FACES_RIGHT = Object.freeze(new Set(['mtg_friendlyDrake', 'mtg_friendlySnake', 'mtg_grub', 'mtg_hound', 'mtg_tortoise', 'mtg_moth', 'mtg_alpha', 'mtg_champion', 'mtg_wolf', 'mtg_friendlyHornet']));
/** Mirror decision with hysteresis: when moving straight toward/away from the camera keep the previous side. */
export function mirrorFor(facesRight, rightDot, previous = false) { if (Math.abs(rightDot) <= 0.05) return previous; return facesRight ? rightDot < 0 : rightDot > 0; }
export const MAX_FOOTPRINT = 1.3, BOSS_FOOTPRINT = 2.2, PX = 1 / 19;
export const sizeClassOf = (key, meta) => SIZE_CLASS[key] || (meta?.w >= 112 || meta?.boss ? 'boss' : 'humanoid');
/** Opaque bounds of one frame (or several, unioned). frames: [[col,row]]. Returns frame-local pixels. */
export function measureBounds(img, fw, fh, frames = [[0, 0]], doc = typeof document !== 'undefined' ? document : null) {
  if (!img || !doc) return null;
  const c = doc.createElement('canvas'); c.width = fw; c.height = fh; const g = c.getContext('2d', { willReadFrequently: true });
  let x0 = fw, x1 = -1, y0 = fh, y1 = -1;
  for (const [col, row] of frames) {
    if ((col + 1) * fw > img.width || (row + 1) * fh > img.height) continue;
    g.clearRect(0, 0, fw, fh); g.drawImage(img, col * fw, row * fh, fw, fh, 0, 0, fw, fh);
    const d = g.getImageData(0, 0, fw, fh).data;
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (d[(y * fw + x) * 4 + 3] > 127) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return x1 < 0 ? null : { x0, x1: x1 + 1, y0, y1: y1 + 1 };
}
/** Pure: the per-unit render scale for a sprite of `meta` with measured `bounds`. */
export function visualScale(key, meta, bounds, { heroSize = 1 } = {}) {
  const cls = sizeClassOf(key, meta), ps = meta?.pixelScale || 1, b = bounds || { x0: 0, x1: meta.w, y0: 0, y1: meta.h };
  const h = Math.max(1, b.y1 - b.y0), w = Math.max(1, b.x1 - b.x0);
  let s = (SIZE[cls] * (key === 'blank' ? Math.min(1.35, heroSize) : 1)) / (h * PX * ps);
  const cap = cls === 'boss' ? BOSS_FOOTPRINT : MAX_FOOTPRINT;
  if (w * PX * ps * s > cap) s = cap / (w * PX * ps);
  return +s.toFixed(4);
}
/** Anchors from bounds: feet line (pivot) and horizontal art-centre offset, in frame pixels. */
export const anchorsOf = (meta, bounds) => bounds ? { pivot: bounds.y1, cx: (bounds.x0 + bounds.x1) / 2 - meta.w / 2 } : { pivot: meta.pivotY, cx: 0 };
/** Measure every installed sprite once (after all art installs). Front idle frame + back idle frame. */
export function installSpriteBounds(images, manifest) {
  for (const [key, meta] of Object.entries(manifest.sprites)) {
    const img = images[key]; if (!img) continue;
    const anims = meta.anims || manifest.anims, rows = Object.keys(anims).length, idleRow = anims.idle?.row ?? 0;
    meta.bounds = measureBounds(img, meta.w, meta.h, [[0, idleRow]]);
    meta.boundsAll = measureBounds(img, meta.w, meta.h, [[0, idleRow], [0, rows + idleRow]]);
  }
}
