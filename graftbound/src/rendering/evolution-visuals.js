// Composes the player's sprite sheet from the base Blank + evolution layers, driven by engine/appearance.js.
import { PALETTE } from '../engine/appearance.js';
const SLOT_ORDER = ['back', 'rear', 'body', 'head', 'front'];
export function composePlayerSheet(assets, app) {
  const base = assets.images.blank, mask = assets.images['blank:mask'];
  const W = base.width, H = base.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const part = (name, tier, layer) => assets.parts[`${name}:${tier}:${layer}`] || assets.parts[`${name}:1:${layer}`];
  const used = SLOT_ORDER.filter(s => app.slots[s]).map(s => app.slots[s]);
  for (const p of used) { const im = part(p.part, p.tier, 'behind'); if (im) x.drawImage(im, 0, 0); }
  const b = document.createElement('canvas'); b.width = W; b.height = H; const bx = b.getContext('2d');
  bx.drawImage(base, 0, 0);
  if (app.tintMix > 0) {
    const m = document.createElement('canvas'); m.width = W; m.height = H; const mx = m.getContext('2d'); mx.drawImage(mask, 0, 0);
    const bd = bx.getImageData(0, 0, W, H), md = mx.getImageData(0, 0, W, H).data, d = bd.data; const tint = PALETTE[app.dominant] || PALETTE.parchment;
    for (let i = 0; i < d.length; i += 4) {
      if (md[i + 3] < 128) continue;
      const l = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255;
      for (let k = 0; k < 3; k++) d[i + k] = Math.round(d[i + k] * (1 - app.tintMix) + Math.min(255, tint[k] * l * 1.55 * 255) * app.tintMix);
    }
    bx.putImageData(bd, 0, 0);
  }
  x.drawImage(b, 0, 0);
  app.markings.slice(0, 3).forEach((col, i) => {
    const im = part('mark' + i, 1, 'front'); if (!im) return;
    const t = document.createElement('canvas'); t.width = W; t.height = H; const tx = t.getContext('2d');
    tx.drawImage(im, 0, 0); tx.globalCompositeOperation = 'source-in'; const p = PALETTE[col]; tx.fillStyle = `rgb(${p.map(v => Math.round(v * 255)).join(',')})`; tx.fillRect(0, 0, W, H);
    x.drawImage(t, 0, 0);
  });
  for (const p of used) { const im = part(p.part, p.tier, 'front'); if (im) x.drawImage(im, 0, 0); }
  for (const e of app.effects) { const im = part(e, 1, 'front'); if (im) x.drawImage(im, 0, 0); }
  return c;
}
