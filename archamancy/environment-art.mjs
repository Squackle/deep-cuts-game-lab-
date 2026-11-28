// Painted layouts in battlefield units. Each group describes land outside the playable 1000 × 600 area.
// The terrain painter supplies the same seasonal pigments and vegetation brushes used on the board.
const LANDSCAPES = {
 hollow: {
  seed: 37,
  groves: [[-150, 40, 170, 100, 36], [-240, 338, 133, 154, 42], [1115, 180, 142, 161, 44],
   [1250, 580, 160, 135, 46], [-490, 130, 210, 170, 54], [1530, 346, 226, 220, 64]],
  pools: [[-117, 417, 88, 47], [1215, 321, 126, 69], [265, 716, 115, 61]],
  terraces: [[-139, 239, 102, 67, -.16], [1152, 407, 91, 50, .14]],
  props: [["cottage", -107, 196, 23], ["logs", -76, 207, 15], ["cottage", 1087, 420, 23],
   ["fence", 1118, 442, 31], ["fence", 1180, 440, 30], ["hay", 1157, 423, 12], ["cart", 1064, 464, 16]],
  approaches: [[-165, 149, -86, 105]]
 },
 confluence: {
  seed: 146,
  groves: [[-153, 2, 127, 76, 27], [-74, 320, 62, 97, 17], [1155, 70, 129, 132, 35],
   [1095, 531, 98, 115, 34], [-375, 471, 153, 136, 40], [1515, 256, 230, 288, 55]],
  pools: [[-242, 218, 135, 57, -.28], [-204, 375, 116, 55, .42], [1158, 423, 98, 46, -.32]],
  streams: [ [[-441, -100], [-328, 7], [-287, 112], [-355, 213], [-319, 313], [-260, 387], [-287, 496], [-173, 706]],
   [[1340, -91], [1249, 102], [1283, 235], [1215, 318], [1153, 420], [1186, 510], [1333, 710]] ],
  props: [["cottage", -121, 144, 20], ["crates", -99, 155, 13], ["logs", -105, 184, 14],
   ["fence", -107, 567, 24], ["cottage", 1093, 369, 21], ["barrels", 1121, 380, 12]],
  approaches: [[-160, 41, -80, 63], [-152, 554, -82, 529]]
 },
 frostfen: {
  seed: 201,
  groves: [[-145, 70, 126, 95, 31], [-107, 422, 91, 112, 29], [1102, 162, 103, 147, 41],
   [1183, 534, 124, 94, 36], [-548, 375, 223, 272, 75], [1560, 351, 193, 226, 57]],
  pools: [[-233, 265, 180, 88, -.30], [1295, 347, 190, 110, -.23], [632, -137, 159, 62, .12]],
  ridges: [[-235, 471, 176, 63, 32], [1165, 88, 128, 45, 28], [1313, 537, 191, 57, 35]],
  props: [["cottage", -101, 465, 18], ["logs", -77, 472, 12], ["fence", -98, 489, 23],
   ["ruin", 1089, 385, 19], ["fence", 1138, 429, 24]],
  approaches: [[-199, 126, -93, 94]]
 },
 pass: {
  seed: 482,
  ridges: [[-184, 254, 155, 66, 72], [-293, 458, 233, 101, 105], [-106, 525, 83, 68, 49],
   [1148, 218, 125, 94, 103], [1267, 326, 218, 81, 116], [1244, 592, 194, 66, 74],
   [533, -38, 265, 60, 73], [-625, 264, 265, 120, 140], [1577, 421, 270, 123, 146]],
  groves: [[-137, 82, 105, 101, 32], [-178, 326, 131, 75, 25], [-213, 577, 129, 79, 25],
   [1081, 274, 62, 80, 23], [1112, 401, 95, 95, 33], [1369, 555, 176, 133, 46]],
  props: [["cliff", -56, 249, 30], ["logs", -70, 349, 15], ["cottage", 1072, 434, 21],
   ["fence", 1111, 444, 27], ["ruin", 1121, 529, 23]],
  approaches: [[-187, 58, -85, 85]]
 },
 caldera: {
  seed: 821,
  ridges: [[-210, 269, 164, 75, 79], [-128, 459, 96, 70, 51], [-384, 610, 231, 111, 94],
   [1177, 154, 148, 72, 65], [1191, 436, 157, 95, 81], [1438, 536, 219, 111, 112],
   [384, 710, 202, 64, 59], [1721, 326, 182, 124, 101]],
  pools: [[-247, 349, 105, 38, -.26], [1224, 292, 131, 46, -.37], [1520, 157, 160, 47, .36]],
  streams: [ [[-324, -84], [-278, 86], [-339, 183], [-300, 259], [-247, 349], [-225, 424], [-271, 513], [-224, 690]],
   [[1112, -65], [1184, 68], [1118, 192], [1179, 272], [1224, 292], [1321, 362], [1346, 510], [1466, 694]] ],
  groves: [[-128, 139, 116, 93, 14], [-140, 568, 85, 83, 13], [1142, 350, 103, 138, 16]],
  props: [["ruin", -69, 201, 21], ["cliff", 1050, 202, 30], ["cliff", 1058, 477, 29],
   ["stump", 1113, 505, 10], ["ruin", 1086, 544, 21]],
  approaches: [[-181, 140, -75, 98]]
 }
};

function seeded(seed) {
 return () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
 };
}

export function paintOutskirts(a, {map, bounds, pigments: S, brushes}) {
 const W = map.width, H = map.height;
 const scene = LANDSCAPES[map.id] ?? LANDSCAPES.hollow;
 const random = seeded(scene.seed);
 const {left, top, right, bottom} = bounds;
 const outside = (x, y, margin = 0) => x < -margin || x > W + margin || y < -margin || y > H + margin;
 const visible = (x, y, margin) => x + margin > left && x - margin < right && y + margin > top && y - margin < bottom;
 const ellipse = (x, y, rx, ry, color) => {
  a.beginPath(); a.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); a.fillStyle = color; a.fill();
 };
 const polygon = (points, color, rim) => {
  a.beginPath();
  points.forEach(([x, y], i) => i ? a.lineTo(x, y) : a.moveTo(x, y));
  a.closePath(); a.fillStyle = color; a.fill();
  if (rim) {a.strokeStyle = rim; a.lineWidth = 1.6; a.stroke();}
 };
 const curve = (points, width, color) => {
  a.beginPath(); a.moveTo(...points[0]);
  for (let i = 1; i < points.length - 1; i++) {
   const p = points[i], q = points[i + 1];
   a.quadraticCurveTo(...p, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  a.lineTo(...points.at(-1)); a.strokeStyle = color; a.lineWidth = width; a.stroke();
 };
 a.save();
 a.lineCap = 'round'; a.lineJoin = 'round';
 // Ground contours and brush grain continue the meadow. The world-space grid stays fixed on resize.
 for (let row = Math.floor(top / 110); row * 110 < bottom; row++) {
  for (let col = Math.floor(left / 110); col * 110 < right; col++) {
   const rand = seeded(Math.imul(col, 73856093) ^ Math.imul(row, 19349663) ^ scene.seed);
   const x = (col + .1 + rand() * .8) * 110, y = (row + .1 + rand() * .8) * 110;
   if (outside(x, y, 57)) {
    const r = 55 + rand() * 63, tint = S.patch[col % 2 === 0 ? 0 : 1];
    const ground = a.createRadialGradient(x, y, 0, x, y, r);
    ground.addColorStop(0, tint + '50'); ground.addColorStop(1, tint + '00');
    a.fillStyle = ground; a.fillRect(x - r, y - r, r * 2, r * 2);
   }
   for (let i = 0; i < 100; i++) {
    const gx = (col + rand()) * 110, gy = (row + rand()) * 110, len = 1.4 + rand() * 4;
    if (!outside(gx, gy)) continue;
    a.strokeStyle = S.grass[i % 4] + '61'; a.lineWidth = 1.1;
    a.beginPath(); a.moveTo(gx, gy); a.lineTo(gx + (len - 3) * .5, gy - len); a.stroke();
   }
  }
 }

 if (!S.snow) for (const [x, y, rx, ry, angle] of scene.terraces ?? []) {
  a.save(); a.translate(x, y); a.rotate(angle);
  ellipse(0, 2, rx + 5, ry + 4, S.bank[1]); ellipse(0, 0, rx, ry, S.earth[1]);
  a.beginPath(); a.ellipse(0, 0, rx - 3, ry - 3, 0, 0, Math.PI * 2); a.clip();
  for (let row = -ry; row < ry; row += 10) {
   curve([[-rx, row - 2], [-rx * .4, row - 5], [rx * .4, row + 8], [rx, row + 7]], 3, S.earth[0]);
   for (let col = -rx; col < rx; col += 8) ellipse(col + random() * 4, row + (col / rx + .5) * 5, 2.4, 1.5, S.tuft[col % 3 ? 1 : 0] + 'b0');
  }
  a.restore();
 }
 for (const points of scene.streams ?? []) {
  const widths = S.lava ? [40, 33, 23, 12, 3] : [60, 50, 39, 25, 10];
  const colors = S.lava ? [S.bank[0], S.bank[2], '#663320', '#aa4829', '#cb7446'] : [S.bank[0], S.bank[1], S.bank[2], S.water[0], S.water[1]];
  widths.forEach((width, i) => curve(points, width, colors[i]));
 }
 for (const [x, y, rx, ry, angle = 0] of scene.pools ?? []) {
  if (!visible(x, y, rx + 50)) continue;
  const rand = seeded(scene.seed + x * 13 + y * 7);
  a.save(); a.translate(x, y); a.rotate(angle);
  // Scalloped shore, layered banks, and broad reflected brush strokes follow the contour.
  const contour = gain => {
   a.beginPath();
   for (let i = 0; i <= 72; i++) {
    const t = i / 72 * Math.PI * 2, irregularity = 1 + Math.sin(t * 3 + x) * .07 + Math.cos(t * 5 + y) * .045;
    const px = Math.cos(t) * (rx + gain) * irregularity, py = Math.sin(t) * (ry + gain * .55) * irregularity;
    i ? a.lineTo(px, py) : a.moveTo(px, py);
   }
   a.closePath();
  };
  for (const [width, color] of [[13, S.bank[0] + '80'], [9, S.bank[1]], [5, S.bank[2]], [2, S.water[0]]]) {
   contour(width); a.fillStyle = color; a.fill();
  }
  contour(0);
  const water = a.createLinearGradient(-rx, -ry, rx, ry);
  water.addColorStop(0, S.lava ? '#963f23' : S.water[2]);
  water.addColorStop(.45, S.lava ? '#713520' : S.water[1]); water.addColorStop(1, S.water[0]);
  a.fillStyle = water; a.fill();
  a.save(); a.clip();
  for (let i = 0; i < 34; i++) {
   const xx = (rand() * 2 - 1) * rx, yy = (rand() * 2 - 1) * ry, span = 6 + rand() * rx * .48;
   ellipse(xx, yy, span, 1 + rand() * 3, S.water[i % 3 === 0 ? 0 : 2] + (S.lava ? '32' : '55'));
   if (S.snow && i % 3 === 0) curve([[xx - span, yy - 6], [xx, yy], [xx + 7, yy + 1], [xx + span, yy + 13]], .8, S.water[3] + '80');
  }
  a.restore();
  for (let i = 0; i < 47; i++) {
   const t = rand() * Math.PI * 2, xx = Math.cos(t) * (rx + 7), yy = Math.sin(t) * (ry + 4), r = 1.2 + rand() * 3.5;
   ellipse(xx, yy, r, r * .62, i % 3 ? S.bank[2] : S.moss[0]);
   if (i % 4 === 0 && !S.lava) {
    for (let k = -1; k < 2; k++) curve([[xx + k, yy], [xx + k * 2, yy - 4], [xx + k * 3, yy - 8 - rand() * 5]], 1.3, S.reed);
   }
  }
  a.restore();
 }

 const ridgeColors = S.lava ? ['#55483f', '#463935', '#352a28', '#261d1b'] : S.snow ?
  ['#dae2e8', '#a5b2b9', '#77848b', '#51626b'] : ['#a59b82', '#7c7665', '#625e52', '#46483d'];
 for (const [x, y, rx, depth, height] of scene.ridges ?? []) {
  if (!visible(x, y, Math.max(rx, height) + 40)) continue;
  const rand = seeded(scene.seed + x * 3 + y * 7);
  ellipse(x + rx * .11, y + 6, rx * 1.13, depth * .65, S.ao + '45');
  const base = [], crest = [];
  for (let i = 0; i <= 11; i++) {
   const t = i / 11, xx = x + (2 * t - 1) * rx;
   const edge = Math.sin(t * Math.PI), foot = y + (.3 * rand() + .4 * edge) * depth;
   base.push([xx, foot]); crest.push([xx - edge * rx * .12, foot - height * (.53 + rand() * .47) * edge]);
  }
  polygon([...crest, ...base.slice().reverse()], ridgeColors[2], ridgeColors[3]);
  for (let i = 0; i < crest.length - 1; i++) {
   const [cx, cy] = crest[i], [nx, ny] = crest[i + 1];
   const [bx, by] = base[i], [qx, qy] = base[i + 1];
   polygon([[cx, cy], [nx, ny], [qx, qy], [bx, by]], ridgeColors[i % 3 ? 1 : 2]);
   polygon([[cx, cy], [nx, ny], [(bx + qx) / 2, by - (by - cy) * .36], [bx, by]], ridgeColors[i % 4 ? 2 : 3]);
   polygon([[cx, cy], [nx, ny], [nx + (qx - nx) * .32, ny + (qy - ny) * .28], [cx + (bx - cx) * .32, cy + (by - cy) * .23]], ridgeColors[0]);
   if (i % 2 === 0) curve([[cx + 6, cy + 5], [cx + 10, (cy + by) / 2], [bx + 4, by - 3]], 1.2, ridgeColors[3] + '9a');
   for (let j = 0; j < 3; j++) ellipse(bx + rand() * (qx - bx), by + 3 + rand() * 11, 2 + rand() * 4, 1.6 + rand() * 2, ridgeColors[j % 2]);
  }
 }

 // The approach becomes a narrow track outside the wave entrance. The original road cross-section
 // meets its exact colors, widths and heading where it crosses the playable edge.
 map.entrances.forEach(([x, y], index) => {
  if (x !== 0) return;
  const [far, farY, bend, bendY] = scene.approaches[index] ?? [-154, y + 26, -73, y];
  for (const [width, color] of [[78, S.ao + '24'], [70, S.ao + '30'], [62, S.ao + '66'], [55, S.road[0]], [47, S.road[1]], [36, S.road[2]], [16, S.road[3] + '8c']]) {
   const half = width / 2;
   const dust = a.createLinearGradient(far, 0, -44, 0);
   dust.addColorStop(0, color.slice(0, 7) + '00'); dust.addColorStop(.75, color);
   dust.addColorStop(1, color);
   a.beginPath(); a.moveTo(far, farY);
   a.bezierCurveTo(bend - 21, bendY - half * .35, -42, y - half, 4, y - half);
   a.lineTo(4, y + half);
   a.bezierCurveTo(-42, y + half, bend - 21, bendY + half * .38, far, farY);
   a.fillStyle = dust; a.fill();
  }
  for (const side of [-1, 1]) for (let i = 0; i < 9; i++) {
   const xx = -6 - i * 11, t = Math.abs(xx / far), yy = y + (bendY - y) * t + side * 24 * (1 - t * t);
   ellipse(xx + 1, yy + 1.6, 4.3 - t * 2, 2.7 - t, S.ao + 'a0');
   ellipse(xx, yy, 3.7 - t * 2, 2.3 - t, i % 2 ? '#a59a7c' : '#968c6f');
  }
 });

 // Quiet, irregular clumps keep most open ground and all approaches clear. Props use the original
 // ink, lit faces and soft contact shadows. Their animated counterparts belong only to the board.
 const plants = [];
 for (const [x, y, rx, ry, count] of scene.groves) {
  const rand = seeded(scene.seed + x * 11 + y * 17);
  for (let i = 0; i < count; i++) {
   const angle = rand() * Math.PI * 2, r = Math.sqrt(rand()), kind = rand(), size = rand();
   const xx = x + Math.cos(angle) * r * rx, yy = y + Math.sin(angle) * r * ry;
   if (!outside(xx, yy, 14) || map.entrances.some(([ex, ey]) => Math.abs(xx - ex) < 188 && Math.abs(yy - ey) < 52)) continue;
   if (scene.pools?.some(([px, py, pw, ph]) => ((xx - px) / (pw + 10)) ** 2 + ((yy - py) / (ph + 9)) ** 2 < 1)) continue;
   if (scene.props.some(([, px, py, pr]) => Math.hypot(xx - px, yy - py) < pr + 19)) continue;
   plants.push({x: xx, y: yy, kind, size, seed: Math.floor(rand() * 0xffffffff)});
  }
 }
 for (const [kind, x, y, r] of scene.props) plants.push({x, y, landmark: kind, size: r, seed: x * 53 + y * 29});
 plants.sort((p, q) => p.y - q.y);
 for (const {x, y, kind, size, seed, landmark} of plants) {
  if (!visible(x, y, 65)) continue;
  brushes.seed(seed);
  if (landmark) brushes.landmark({kind: landmark, x, y, r: size});
  else if (kind < .2 || S.lava && kind > .50) brushes.rock(x, y, 4 + size * 9);
  else if (kind < .38) brushes.bush(x, y, 6 + size * 10);
  else if (kind < .82 || S.snow || map.id === 'pass' || S.lava) brushes.pine(x, y, 24 + size * 25);
  else brushes.tree(x, y, 12 + size * 11);
 }
 a.restore();
}

// Continue the exact banks that meet the top or bottom of the existing terrain into a quiet bend.
export function extendCreek(points, height) {
 const continuation = (edge, next) => {
  const [x, y] = edge, dy = y < 0 ? -1 : 1;
  if (y > -25 && y < height + 25) return [];
  const tangent = (x - next[0]) * 5;
  return [[x + tangent, y + dy * 37], [x + tangent * 1.7 + 23, y + dy * 85],
   [x + tangent * 1.9 + 56, y + dy * 147], [x + tangent * 1.7 + 47, y + dy * 224],
   [x + tangent * 1.5 - 12, y + dy * 340]];
 };
 return [...continuation(points[0], points[1]).reverse(), ...points,
  ...continuation(points.at(-1), points.at(-2))];
}
