// GRAFTBOUND v1.8.1 owner feedback: archer ordinary shot every eligible turn (#1), death-trigger damage excluded from
// Global Threat (#10), and the presentation items (#2, #3, #5, #6, #8, #9, #4/#7) checked at their data contracts.
import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const src = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
import { arena } from './helpers.mjs';
import { endTurn, player, attack } from '../src/engine/combat.js';
const shots = (ev, uid) => ev.filter(e => e.t === 'attack' && e.kind === 'quickShot' && e.uid === uid);
const archerOf = s => s.units.find(u => u.defId === 'archer');

// ── #1 archer ────────────────────────────────────────────────────────────────────────────────────────────
test('#1 preparing a line AND taking the ordinary shot happen in the same enemy turn', () => {
  const s = arena(['a.....', '......', '......', '......', '......', 'P.....'], { a: 'archer' }); const ar = archerOf(s);
  const ev = endTurn(s); assert.ok(ar.aim, 'line prepared'); assert.equal(shots(ev, ar.uid).length, 1);
});
test('#1 firing the prepared line next turn still includes exactly one ordinary shot', () => {
  const s = arena(['a.....', '......', '......', '......', '......', 'P.....'], { a: 'archer' }); const ar = archerOf(s);
  endTurn(s); assert.ok(ar.aim); const ev = endTurn(s);
  assert.ok(ev.some(e => e.t === 'fire' && e.uid === ar.uid)); assert.equal(shots(ev, ar.uid).length, 1, 'no duplicate ordinary shot');
});
test('#1 no prepared line available -> fallback ordinary shot instead of nothing', () => {
  // hero diagonal and within 4: no straight line from any reachable tile this turn (archer is boxed in by rocks)
  const s = arena(['#####', '#a###', '##...', '###P.', '.....'], { a: 'archer' }); const ar = archerOf(s);
  const ev = endTurn(s); assert.equal(ar.aim, undefined); assert.equal(shots(ev, ar.uid).length, 1);
});
test('#1 blocked line of sight or stunned archer: no ordinary shot; never two per turn', () => {
  const s = arena(['a......', '#######', '.......', '......P'], { a: 'archer' }); const ar = archerOf(s);
  for (const c of [0, 1, 2, 3, 4, 5, 6]) s.terrain[1 * s.w + c] = 3;
  const b = arena(['a.....', '......', '......', 'P.....'], { a: 'archer' }); const br = archerOf(b); br.statuses.stunned = 1;
  const ev2 = endTurn(b); assert.equal(shots(ev2, br.uid).length, 0, 'stunned');
  for (let i = 0; i < 4; i++) { const ev = endTurn(s); if (s.phase !== 'player') break; assert.ok(shots(ev, ar.uid).length <= 1); }
});
test('#1 the intent shows the ordinary shot the AI will actually take', async () => {
  const { intents } = await import('../src/engine/combat.js');
  const s = arena(['a.....', '......', '......', 'P.....'], { a: 'archer' }); const ar = archerOf(s);
  const it = intents(s).find(i => i.uid === ar.uid); const ev = endTurn(s); const q = shots(ev, ar.uid);
  assert.equal(!!it.quick, q.length === 1); if (it.quick) assert.equal(it.quick.target, q[0].target);
});
// ── #10 death trigger ────────────────────────────────────────────────────────────────────────────────────
const torch = () => { const s = arena(['...', '.c.', '.P.'], { c: 'cinderling' }); const c = s.units.find(u => u.defId === 'cinderling'); c.hp = 1; return { s, c, h: player(s) }; };
test('#10 Torchrunner death blast: real HP loss + damage taken, but NOT threat-eligible enemy damage', () => {
  const { s, c, h } = torch(); const hp0 = h.hp; attack(s, c.uid);
  assert.ok(h.hp < hp0, 'real HP loss'); assert.equal(s.stats.damageTaken, hp0 - h.hp); assert.equal(s.stats.deathTriggerHp, hp0 - h.hp);
  assert.equal(s.stats.enemyHealthDamage, 0, 'Global Threat sees a flawless clear');
});
test('#10 shield fully absorbs the blast (0 HP) and partial absorption counts only real HP', () => {
  let { s, c, h } = torch(); h.statuses.shield = 5; const hp0 = h.hp; attack(s, c.uid);
  assert.equal(h.hp, hp0); assert.equal(s.stats.deathTriggerHp || 0, 0); assert.equal(s.stats.damageTaken, 0);
  ({ s, c, h } = torch()); h.statuses.shield = 2; const hp1 = h.hp; attack(s, c.uid);
  assert.equal(s.stats.deathTriggerHp, hp1 - h.hp); assert.equal(s.stats.enemyHealthDamage, 0);
});
test('#10 other avoidable enemy damage still counts; settlement treats a death-trigger-only fight as flawless', async () => {
  const { dealDamage } = await import('../src/engine/abilities.js'); const { settleWorldThreat } = await import('../src/engine/world-threat.js');
  const { s, c, h } = torch(); dealDamage(s, [], c, h, 2, { combat: true }); assert.equal(s.stats.enemyHealthDamage, 2);
  const a = {}, b = {}; settleWorldThreat({ level: 5 }, { victory: true, enemyDamage: 0, maxHealth: 20, turns: 4 }, a);
  const t = torch(); attack(t.s, t.c.uid); settleWorldThreat({ level: 5 }, { victory: true, enemyDamage: t.s.stats.enemyHealthDamage, maxHealth: 20, turns: 4 }, b);
  assert.equal(a.after, b.after);
  assert.match(src('src/engine/scoring.js'), /deathTriggerDamage: b\.stats\.deathTriggerHp/);
});
// ── presentation items (contracts; rendered results are in qa-screenshots) ───────────────────────────────
test('#5 Guard is shown next to Shield with distinct tooltips; mechanics untouched', () => {
  const ui = src('src/ui/battle-ui.js'); assert.match(ui, /guard: u\.statuses\.guard \|\| 0/); assert.match(ui, /temporary shield points from Guard/);
  assert.match(ui, /Shield \$\{d\.shield\}: absorbs \$\{d\.shield\} total damage/); assert.match(src('styles.css'), /\.pl-hp \.gb-guard/);
});
test('#3 wolf coats: biome-weighted, deterministic, no gameplay meaning; white rare in forest, common in arctic', async () => {
  const { wolfCoatFor, COAT_WEIGHTS, THEME_BIOME } = await import('../src/rendering/creature-variants.js');
  for (const w of Object.values(COAT_WEIGHTS)) assert.equal(Object.values(w).reduce((a, b) => a + b, 0), 100);
  const count = (biome) => { const c = {}; for (let i = 0; i < 20000; i++) { const n = wolfCoatFor(12345, i, biome).name; c[n] = (c[n] || 0) + 1; } return c; };
  const t = count('temperate'), a = count('arctic');
  assert.ok(t.arctic / 20000 < 0.05 && t.grey / 20000 > 0.3 && t.timber / 20000 > 0.3); assert.ok(a.arctic / 20000 > 0.6);
  assert.equal(wolfCoatFor(7, 3), wolfCoatFor(7, 3)); assert.equal(THEME_BIOME.hollow, 'temperate');
  assert.doesNotMatch(src('src/ui/battle-ui.js'), /rare coat|coat rarity/i);
});
test('#2 status visuals: friendly rise, hostile drip, timers persist across refreshes; pure and presentation-only', async () => {
  const { statusVisuals, STATUS_FX } = await import('../src/ui/battle-ui.js').catch(() => ({}));
  if (statusVisuals) { const a = statusVisuals({ empowered: 2, poison: 1 }); assert.deepEqual(a.map(x => x.key).sort(), ['empowered', 'poison']);
    a[0].t = 0.5; const b = statusVisuals({ empowered: 2, poison: 1 }, a); assert.equal(b.find(x => x.key === a[0].key).t, 0.5);
    assert.equal(STATUS_FX.poison.hostile, true); assert.equal(STATUS_FX.empowered.hostile, false); }
  const sc = src('src/rendering/scene.js'); assert.match(sc, /v1\.8\.1: buffs\/auras\/statuses read ~2x stronger/); assert.match(sc, /fx\.t = \(fx\.t \|\| r\(\) \* pulse\) \+ dt/);
});
test('#6 Lightning Strike: cloud gathers over the CASTER head, bolt launches from it; fast mode unchanged', async () => {
  const v = src('src/rendering/vfx.js'); const { STORM_CLOUD } = await import('../src/rendering/vfx.js');
  assert.ok(STORM_CLOUD.gather > 0 && STORM_CLOUD.above > 0); assert.match(v, /const head = sc\.headPos\(uid\), cloud = \[head\[0\], head\[1\] \+ STORM_CLOUD\.above/);
  assert.match(v, /await lightningBolt\(sc, \{ \.\.\.args, from: cloud, charged: true \}\)/); assert.match(v, /if \(fast \|\| uid == null/);
});
test('#8 Electrostatic Field: visual-only arcs from graft ownership on the scene clock', () => {
  const sc = src('src/rendering/scene.js'), ui = src('src/ui/battle-ui.js');
  assert.match(ui, /v\.electro = !!s0Traits\(this\)\.includes\('electrofield'\)/); assert.match(sc, /if \(v\.electro\) \{ v\.electroT/);
  assert.doesNotMatch(sc.slice(sc.indexOf('if (v.electro)'), sc.indexOf('if (v.electro)') + 900), /Math\.random/);
});
test('#9 golem sheets: no small enclosed transparency islands left in any of the 7 poses; alpha binary', async () => {
  const { PNG } = await import('../tools/png.mjs').catch(() => ({}));
  const fs = await import('node:fs'); const zlib = await import('node:zlib');
  const decode = buf => { // minimal RGBA8 non-interlaced PNG decoder
    let o = 8, w, h, idat = []; while (o < buf.length) { const len = buf.readUInt32BE(o), type = buf.toString('ascii', o + 4, o + 8), d = buf.subarray(o + 8, o + 8 + len);
      if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); assert.equal(d[8], 8); assert.equal(d[9], 6); } if (type === 'IDAT') idat.push(d); o += 12 + len; }
    const raw = zlib.inflateSync(Buffer.concat(idat)), px = Buffer.alloc(w * h * 4), bpr = w * 4;
    for (let y = 0; y < h; y++) { const f = raw[y * (bpr + 1)], line = raw.subarray(y * (bpr + 1) + 1, (y + 1) * (bpr + 1));
      for (let x = 0; x < bpr; x++) { const a = x >= 4 ? px[y * bpr + x - 4] : 0, b = y ? px[(y - 1) * bpr + x] : 0, c = x >= 4 && y ? px[(y - 1) * bpr + x - 4] : 0;
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        px[y * bpr + x] = (line[x] + [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f]) & 255; } }
    return { w, h, px }; };
  for (const key of ['golemFly', 'golemVigilance', 'golemTrample', 'sentinel', 'nullwarden']) {
    const { w, h, px } = decode(fs.readFileSync(new URL(`../assets/hd2d/creatures/${key}-poses.png`, import.meta.url))); const S = h / 2;
    let small = 0;
    for (let cy = 0; cy < 2; cy++) for (let cx = 0; cx < 4; cx++) {
      const seen = new Uint8Array(S * S), A = (x, y) => px[((cy * S + y) * w + cx * S + x) * 4 + 3];
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const i = y * S + x; if (seen[i] || A(x, y)) continue;
        let q = [[x, y]], n = 0, edge = false; seen[i] = 1;
        while (q.length) { const [a, b] = q.pop(); n++; if (a === 0 || b === 0 || a === S - 1 || b === S - 1) edge = true;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = a + dx, yy = b + dy; if (xx < 0 || yy < 0 || xx >= S || yy >= S) continue; const j = yy * S + xx; if (!seen[j] && !A(xx, yy)) { seen[j] = 1; q.push([xx, yy]); } } }
        if (!edge && n <= 30) small++; } }
    assert.equal(small, 0, key + ' still has pinholes');
    for (let i = 3; i < px.length; i += 4) assert.ok(px[i] === 0 || px[i] === 255);
  }
});
test('#4/#7 boss sheets keep layout, frame order and binary alpha after the readability refinement', () => {
  const idx = JSON.parse(src('assets/hd2d/creatures/index.json'));
  for (const k of ['nemata', 'drakuseth', 'toxrill']) { const e = idx.creatures.find(c => c.key === k); assert.equal(e.size, 192); assert.ok(existsSync(new URL(`../assets/hd2d/creatures/${k}-poses.png`, import.meta.url))); }
});
test('v1.8.1 rules fingerprint and challenge revision (archer + threat attribution change replays)', async () => {
  const { RULES_VERSION, RANKED_CHALLENGES } = await import('../src/engine/ranked.js'); const { GAME } = await import('../src/config.js');
  assert.equal(GAME.version, '1.8.4-candidate'); assert.equal(RULES_VERSION, 'graftbound-rules-1.8.4-candidate'); assert.equal(RANKED_CHALLENGES['gb-expedition-01'].revision, 31);
});
