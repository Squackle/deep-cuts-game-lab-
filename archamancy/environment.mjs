import {paintTerrain, seasonOf} from './terrain.mjs';

const MARGIN_STEP = 96;
const EDGE_BLEED = 18;
const PIXEL_BUDGET = 3_200_000;
const AXIS_LIMIT = 4096;

// Work in the same units as the board. Quantize outward so browser chrome and small
// resizes reveal an already painted area without rebuilding the texture.
export function environmentBounds(board, viewport, width, height) {
 if (!board.width || !board.height) return null;
 const units = board.width / width;
 const margin = (before, after) => Math.max(1, Math.ceil((Math.max(before, after) + EDGE_BLEED) / units / MARGIN_STEP)) * MARGIN_STEP;
 const x = margin(board.left - viewport.left, viewport.right - board.right);
 const y = margin(board.top - viewport.top, viewport.bottom - board.bottom);
 return {left: -x, top: -y, right: width + x, bottom: height + y};
}

export function mountEnvironment(board) {
 const stage = board.parentElement;
 const canvas = document.createElement('canvas');
 canvas.className = 'map-environment';
 canvas.setAttribute('aria-hidden', 'true');
 canvas.hidden = true;
 const ctx = canvas.getContext('2d');
 board.prepend(canvas);
 let frameKey;
 return (game, density) => {
  const {width, height, id} = game.map;
  const season = seasonOf(game);
  const bounds = environmentBounds(board.getBoundingClientRect(), stage.getBoundingClientRect(), width, height);
  if (!bounds) return;
  const w = bounds.right - bounds.left, h = bounds.bottom - bounds.top;
  const quality = Math.min(1.5, Math.max(.75, Math.ceil(density * 4) / 4), AXIS_LIMIT / w, AXIS_LIMIT / h, Math.sqrt(PIXEL_BUDGET / (w * h)));
  const pixels = [Math.floor(w * quality), Math.floor(h * quality)];
  const key = [id, season, w, h, ...pixels].join(':');
  if (key === frameKey) return;
  // This backing store is reused. Painting and sizing run synchronously, so a resize
  // or map change never presents a cleared canvas to the compositor.
  canvas.width = pixels[0];
  canvas.height = pixels[1];
  ctx.setTransform(pixels[0] / w, 0, 0, pixels[1] / h, -bounds.left * pixels[0] / w, -bounds.top * pixels[1] / h);
  paintTerrain(ctx, game, {still: true, outside: bounds});
  Object.assign(canvas.style, {
   left: `${bounds.left / width * 100}%`, top: `${bounds.top / height * 100}%`,
   width: `${w / width * 100}%`, height: `${h / height * 100}%`
  });
  canvas.dataset.biome = id;
  canvas.dataset.season = season;
  canvas.hidden = false;
  frameKey = key;
 };
}
