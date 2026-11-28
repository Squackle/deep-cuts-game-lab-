import {atlasIllustration, drawAtlasIllustration, paintAtlasFrame, paintCompass} from "./atlas-art.mjs";

// Campaign world map backdrop (cosmetic). Five regions run left to right along a trail:
// meadow lowlands, river country, frozen marsh, grey mountains and the volcanic Ember Wastes.
// NODES are the trail stops in 0..1 map units; main.mjs places a button on each.
export const NODES = [[.1, .62], [.3, .4], [.5, .64], [.7, .38], [.89, .58]];
const INK = "#15241c";
function paintFallback(a, W, H) {
 let seed = 7741; const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
 const ell = (x, y, rx, ry, c, r = 0) => { a.beginPath(); a.ellipse(x, y, rx, ry, r, 0, Math.PI * 2); a.fillStyle = c; a.fill(); };
 // Sea, then one long landmass with a ragged coast.
 a.fillStyle = "#2b5d72"; a.fillRect(0, 0, W, H);
 a.beginPath(); for (let k = 0; k <= 60; k++) { const x = k / 60 * W, y = H * .08 + Math.sin(k * .9) * H * .03 + rnd() * H * .03; k ? a.lineTo(x, y) : a.moveTo(x, y); }
 for (let k = 60; k >= 0; k--) { const x = k / 60 * W, y = H * .93 - Math.sin(k * .7) * H * .03 - rnd() * H * .03; a.lineTo(x, y); } a.closePath();
 const land = a.createLinearGradient(0, 0, W, 0);
 for (const [t, c] of [[0, "#6f9c4e"], [.2, "#79a352"], [.3, "#5f9a6a"], [.42, "#7aa07a"], [.5, "#dfe8ee"], [.6, "#cdd9e2"], [.66, "#8f9686"], [.78, "#7d7a6e"], [.84, "#5a3a30"], [1, "#3a2420"]]) land.addColorStop(t, c);
 a.save(); a.fillStyle = land; a.fill(); a.lineWidth = 5; a.strokeStyle = "#e9dcb4"; a.stroke(); a.lineWidth = 2; a.strokeStyle = INK; a.stroke(); a.clip();
 // Lowlands: tree clumps. Riverlands: a winding river. Marches: frozen pools and snow. Mountains: peaks. Wastes: lava.
 for (let i = 0; i < 26; i++) { const x = rnd() * W * .22, y = H * (.15 + rnd() * .7); ell(x + 3, y + 3, 7, 4, "#13241a55"); ell(x, y, 7, 6, "#3f7a3a"); ell(x - 2, y - 2, 4, 3.5, "#6fab52"); }
 a.lineCap = "round"; a.lineJoin = "round"; a.beginPath(); for (let k = 0; k <= 30; k++) { const x = W * (.2 + k / 30 * .24), y = H * (.1 + k / 30 * .82) + Math.sin(k * .8) * H * .06; k ? a.lineTo(x, y) : a.moveTo(x, y); }
 a.strokeStyle = "#2f6b80"; a.lineWidth = 9; a.stroke(); a.strokeStyle = "#58a7c0"; a.lineWidth = 5; a.stroke();
 for (let i = 0; i < 6; i++) { const x = W * (.47 + rnd() * .12), y = H * (.2 + rnd() * .6); ell(x, y, 16 + rnd() * 10, 7 + rnd() * 4, "#a9c9da"); ell(x - 3, y - 2, 9, 3, "#e8f4fa"); }
 for (let i = 0; i < 40; i++) { const x = W * (.46 + rnd() * .16), y = H * (.12 + rnd() * .76); ell(x, y, 2, 1.4, "#ffffff"); }
 const peak = (x, y, h, lit, dark, cap) => { a.beginPath(); a.moveTo(x - h * .7, y); a.lineTo(x, y - h); a.lineTo(x + h * .7, y); a.closePath(); a.fillStyle = dark; a.fill(); a.lineWidth = 1.5; a.strokeStyle = INK; a.stroke();
  a.beginPath(); a.moveTo(x - h * .7, y); a.lineTo(x, y - h); a.lineTo(x - h * .05, y); a.closePath(); a.fillStyle = lit; a.fill();
  if (cap) { a.beginPath(); a.moveTo(x, y - h); a.lineTo(x - h * .22, y - h * .68); a.lineTo(x + h * .22, y - h * .68); a.closePath(); a.fillStyle = cap; a.fill(); } };
 const pk = []; for (let i = 0; i < 16; i++) pk.push([W * (.63 + rnd() * .17), H * (.25 + rnd() * .65), H * (.14 + rnd() * .12)]); pk.sort((p, q) => p[1] - q[1]);
 for (const [x, y, h] of pk) peak(x, y, h, "#b3ab92", "#6c675a", "#f4f8fa");
 const vx = W * .9, vy = H * .3; const glow = a.createRadialGradient(vx, vy - H * .1, 0, vx, vy - H * .1, H * .35); glow.addColorStop(0, "#ff8a3a88"); glow.addColorStop(1, "#ff8a3a00"); a.fillStyle = glow; a.fillRect(0, 0, W, H);
 peak(vx, vy + H * .05, H * .3, "#6a4a3e", "#3a2622", null); ell(vx, vy - H * .24, H * .05, H * .02, "#ffb24a");
 for (let i = 0; i < 4; i++) { a.beginPath(); a.moveTo(vx + (i - 1.5) * 6, vy - H * .23); a.quadraticCurveTo(vx + (i - 1.5) * 18, vy - H * .05, vx + (i - 1.5) * 26 + rnd() * 10, vy + H * .55); a.strokeStyle = "#ff7a2e"; a.lineWidth = 2.4; a.stroke(); }
 for (let i = 0; i < 10; i++) { const x = W * (.84 + rnd() * .15), y = H * (.5 + rnd() * .4); peak(x, y, H * (.05 + rnd() * .05), "#5a3e34", "#2e1e1a", null); }
 a.restore();
}

function paintWorldRoute(a, W, H) {
 const pts = NODES.map(([x, y]) => [x * W, y * H]);
 a.save();
 a.lineCap = "round";
 a.beginPath();
 pts.forEach(([x, y], i) => {
  if (!i) {a.moveTo(x, y);return;}
  const [px, py] = pts[i - 1], span = x - px;
  a.bezierCurveTo(px + span * .38, py, x - span * .38, y, x, y);
 });
 const unit = H / 460;
 for (const [ink, width, dash] of [["#13211db3", 10, []], ["#6d5337b8", 6, []], ["#f2dba0", 3.7, [8, 9]]]) {
  a.strokeStyle = ink;
  a.lineWidth = width * unit;
  a.setLineDash(dash.map(length => length * unit));
  a.stroke();
 }
 a.restore();
}

export function paintWorld(a, W, H) {
 const art = atlasIllustration("world");
 const draw = image => {
  a.clearRect(0, 0, W, H);
  if (image) {
   drawAtlasIllustration(a, image, W, H, true);
   a.canvas.dataset.atlasArt = "world";
  } else paintFallback(a, W, H);
  paintWorldRoute(a, W, H);
  paintAtlasFrame(a, W, H);
  paintCompass(a, W * .077, H * .18, H * .077);
 };
 draw(art.image);
 if (!art.image) art.ready.then(image => {if (image) draw(image);});
}
