// v0.8 Tactical Combat & Power Scaling: boss titles, active clock, spell access, stances, scaling, magnitude VFX.
import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { arena, evoWith, botPlay } from './helpers.mjs';
import { ACTS, bossNameOf, bossTitleOf } from '../src/data/encounters.js';
import { generateMap } from '../src/engine/campaign.js';
import { templateFor, buildEncounter, reinforcements, bossAdaptation, COUNTERS, buildFocus } from '../src/engine/encounters.js';
import { newRun, enterNode, concludeBattle, chooseReward, skipReward, RUN_VERSION, runStats } from '../src/engine/run.js';
import { availableNodes } from '../src/engine/campaign.js';
import { createStore, memoryStorage, KEYS, _internal } from '../src/engine/save.js';
import { newClock, tickClock, formatDuration, clockActive, MAX_FRAME_MS } from '../src/engine/clock.js';
import { generatePack, primerPack } from '../src/engine/rewards.js';
import { resolveCard, rewardCards } from '../src/cards/catalog.js';
import { REAL_SPELLS } from '../src/cards/real-pool.js';
import { cast, guard, channel, endTurn, player, enemies, attack, guardValue, intents, movePlayer, moveOptions } from '../src/engine/combat.js';
import { getLegalPlayerActions, shouldAutoEnd, usefulStances } from '../src/engine/legal.js';
import { spellNumbers, castBlockReason, spellMagnitude } from '../src/engine/spells.js';
import { strengthOf, expectedStrength } from '../src/engine/strength.js';
import { deriveStats, newEvolution } from '../src/engine/evolution.js';
import { intensityOf, MAX_SHAKE, castSpellVisual } from '../src/rendering/casting.js';
import { playRanked } from './ranked-bot.mjs';
import { replayRun, applyDecision, startRanked, RULES_VERSION, RANKED_CHALLENGES } from '../src/engine/ranked.js';
import { TACTICS } from '../src/data/tactics.js';
const E = id => s => s.units.find(u => u.defId === id && u.hp > 0);
const book = ids => ids.map(id => ({ id: 'mtg:' + id, level: 1 }));
const src = f => readFileSync(new URL('../src/' + f, import.meta.url), 'utf8');

// ── 1. Boss titles ([object Object] fix) ──────────────────────────────────
test('boss data model: string names, separate authored encounter lists, no duplicate keys', () => {
  assert.deepEqual(ACTS.map(a => a.bossName), ['The Thornmother', 'The Pyre Matron', 'The Unwritten']);
  for (const [i, A] of ACTS.entries()) {
    assert.equal(typeof A.bossName, 'string'); assert.ok(A.bossName.length > 3); assert.equal(A.boss, undefined, 'no ambiguous `boss` field');
    assert.ok(Array.isArray(A.bossEncounters) && A.bossEncounters.length >= 1 && A.bossEncounters.every(e => e.boss && e.enemies.length));
    assert.equal(bossNameOf(i), A.bossName); assert.equal(typeof bossTitleOf(i), 'string'); assert.notEqual(bossTitleOf(i), A.bossName, 'location subtitle differs from the name');
    const tpl = templateFor(i, 'boss', 7, 99); assert.equal(tpl, A.bossEncounters[0]); assert.ok(buildEncounter(tpl, 99, 'boss').enemies.length);
  }
  const text = src('data/encounters.js'); for (const a of ['hollow', 'warrens', 'nexus']) { const block = text.slice(text.indexOf(`id: '${a}'`)); assert.equal((block.slice(0, block.indexOf('bossEncounters')).match(/\bboss:/g) || []).length, 0); }
});
test('no boss UI can display [object Object]: maps carry a string; banners refuse non-strings; map labels use the act name', () => {
  for (let act = 0; act < 3; act++) { const m = generateMap(7, { act }); assert.equal(typeof m.boss, 'string'); assert.notEqual(String(m.boss), '[object Object]'); }
  const ui = src('ui/battle-ui.js'), sc = src('ui/screens.js');
  assert.match(ui, /bossNameOf\(s\.act\)/); assert.match(ui, /typeof text !== 'string'/); assert.ok(!/ACTS\[s\.act \|\| 0\]\.boss\b/.test(ui));
  assert.match(sc, /bossNameOf\(run\.act\)/); assert.ok(!/map\.boss/.test(sc));
  for (let a = 0; a < 3; a++) assert.ok(!String(bossNameOf(a)).includes('[object'));
});
test('old saves with the buggy serialized boss array load and are repaired; map progression stays deterministic', () => {
  const st = memoryStorage(); const store = createStore(st); const r = newRun({ seed: 5 }); r.v = 4; delete r.clock; delete r.primerDone;
  r.map.boss = [{ name: 'Heart of the Hollow', enemies: ['thornmother'] }];   // what v0.5–v0.7 serialized
  st.setItem(KEYS.run, _internal.wrap(4, r)); const out = store.loadRun();
  assert.ok(out.migrated); assert.equal(out.run.v, RUN_VERSION); assert.equal(out.run.map.boss, 'The Thornmother');
  assert.deepEqual(out.run.map.nodes, r.map.nodes, 'nodes untouched'); assert.equal(out.run.clock.partial, true); assert.equal(out.run.primerDone, true);
  assert.deepEqual(generateMap(5, { act: 1 }), generateMap(5, { act: 1 }));
  assert.ok(store.loadRun().run && !store.loadRun().migrated, 'idempotent');
});

// ── 2. Active-time clock ───────────────────────────────────────────────────
test('clock: new runs start at zero, accumulate per act, clamp sleep gaps, and format readably', () => {
  const r = newRun({ seed: 1 }); assert.deepEqual(r.clock, { v: 1, ms: 0, byAct: [0, 0, 0], partial: false });
  tickClock(r.clock, 16, 0); tickClock(r.clock, 3.6e6, 1); assert.equal(r.clock.ms, 16 + MAX_FRAME_MS, 'a frozen tab adds at most 1 s');
  assert.deepEqual(r.clock.byAct, [16, MAX_FRAME_MS, 0]);
  tickClock(r.clock, -5, 0); tickClock(r.clock, NaN, 0); assert.equal(r.clock.ms, 16 + MAX_FRAME_MS);
  assert.equal(formatDuration(36e3), '36s'); assert.equal(formatDuration(245e3), '4m 05s'); assert.equal(formatDuration((3600 + 24 * 60 + 36) * 1000), '1h 24m 36s');
});
test('clock pauses for the pause menu, hidden tabs, title/end screens and finished runs; survives save/reload; not in replays', () => {
  const on = { hasRun: true, mode: 'battle', paused: false, hidden: false, ended: false };
  assert.ok(clockActive(on)); for (const k of ['paused', 'hidden', 'ended']) assert.ok(!clockActive({ ...on, [k]: true }), k);
  for (const m of ['title', 'end']) assert.ok(!clockActive({ ...on, mode: m })); assert.ok(clockActive({ ...on, mode: 'reward' })); assert.ok(!clockActive({ ...on, hasRun: false }));
  const st = memoryStorage(); const store = createStore(st); const r = newRun({ seed: 2 }); tickClock(r.clock, 900, 0); store.saveRun(r);
  assert.equal(store.loadRun().run.clock.ms, 900, 'elapsed time persists; no start timestamp is stored, so offline time cannot count');
  const m = src('main.js'); assert.match(m, /performance\.now|now - clockLast/); assert.match(m, /visibilitychange/); assert.match(m, /pauseOpen/);
  assert.ok(!/clock/.test(src('engine/ranked.js')) && !/clock/.test(src('engine/scoring.js')), 'never scored or ranked');
});
test('end screen shows Time Taken on victory and defeat (and per act; partial for pre-v0.8 runs)', async () => {
  const sc = src('ui/screens.js'); assert.match(sc, /Time Taken/); assert.match(sc, /\$\{timeRows\(run\)\}/); assert.match(sc, /partial — tracked since the v0\.8 update/);
  assert.match(sc, /data-a="title">Home<\/button>/); assert.match(src('main.js'), /Save &amp; Return Home/);
});

// ── 3. Spell access & new real spells ─────────────────────────────────────
test('three new REAL spells with reviewed adaptations fill new roles (weaken, burst, board-wide area)', () => {
  for (const n of ['Disfigure', 'Titanic Growth', 'Pyroclasm']) { assert.ok(REAL_SPELLS.some(c => c.name === n), n); const c = rewardCards().find(x => x.name === n); assert.ok(c && c.reference && /Adapted/.test(c.adaptationNote), n); }
  assert.equal(rewardCards().filter(c => c.kind === 'spell').length, 16);
  const s = arena(['hh......', '........', '........', '.......P'], { h: 'hound' }, { spellbook: book(['disfigure', 'pyroclasm', 'titanic-growth']) }); s.p.mana = 9; s.p.maxMana = 9;
  const [a, b] = enemies(s); cast(s, 'mtg:disfigure', a.x, a.y); assert.equal(a.hp, 1); assert.equal(a.statuses.weakened, 2);
  cast(s, 'mtg:pyroclasm', player(s).x, player(s).y); assert.equal(a.hp, 0); assert.equal(b.hp, 0, '2 to every foe');
  const g = arena(['g..', '...', 'P..'], { g: 'grub' }, { spellbook: book(['titanic-growth']) }); g.p.mana = 5; cast(g, 'mtg:titanic-growth', player(g).x, player(g).y); assert.equal(player(g).statuses.empowered, 4);
});
test('Weaken on a foe reduces its next strike, then wears off', () => {
  const s = arena(['....', '.h..', '.P..', '....'], { h: 'tortoise' }, { spellbook: book(['disfigure']) }); s.p.mana = 5; const t = E('tortoise')(s); t.hp = t.maxHp = 50;
  cast(s, 'mtg:disfigure', t.x, t.y); assert.equal(intents(s)[0].damage, 0, 'a 1-power foe weakened by 2 strikes for 0'); const hp = player(s).hp; endTurn(s);
  assert.equal(player(s).hp, hp); assert.equal(t.statuses.weakened, 0);
});
test('spell access: early packs carry two spells of different roles while the spellbook is thin; creatures always remain', () => {
  for (let seed = 1; seed < 200; seed++) {
    const p = generatePack(seed, { step: seed % 6, minSpells: 2 }); const sp = p.map(resolveCard).filter(c => c.kind === 'spell');
    assert.equal(p.length, 3); assert.ok(sp.length >= 2, seed + ':' + p); assert.ok(p.some(id => resolveCard(id).kind === 'creature'));
    if (sp.length === 2 && rewardCards().filter(c => c.kind === 'spell' && c.cost <= 2).length) assert.notEqual(sp[0].category, sp[1].category);
  }
  assert.ok(generatePack(3, { step: 2 }).filter(id => resolveCard(id).kind === 'spell').length >= 1);
});
test('Spell Primer: after the first victory, a free spells-only choice of 3 affordable spells from different roles; once; deterministic', () => {
  for (let seed = 1; seed < 60; seed++) { const p = primerPack(seed); assert.equal(p.length, 3); const cs = p.map(resolveCard); assert.ok(cs.every(c => c.kind === 'spell' && c.cost <= 2)); assert.equal(new Set(cs.map(c => c.category)).size, 3); assert.deepEqual(p, primerPack(seed)); }
  const run = newRun({ seed: 77, tutorial: true }); enterNode(run, 0); run.battle.units.filter(u => u.side === 'enemy').forEach(u => (u.hp = 0)); run.battle.phase = 'won'; concludeBattle(run);
  chooseReward(run, run.pending.cards[0]); assert.equal(run.phase, 'reward'); assert.equal(run.pending.tier, 'primer');
  assert.throws(() => chooseReward(run, 'mtg:grizzly-bears'), /Invalid|spells only/); const id = run.pending.cards[0]; chooseReward(run, id);
  assert.ok(run.spellbook.some(s => s.id === id)); assert.equal(run.phase, 'map'); assert.ok(run.primerDone, 'once per adventure');
});

// ── 4. Tactical stances ────────────────────────────────────────────────────
test('Guard: costs your attack, counts as one action, reduces every enemy hit until your next turn, never hazards', () => {
  const s = arena(['....', '.h..', '.P..', '....'], { h: 'hound' }, { evo: evoWith('mtg:pillarfield-ox') }); const p = player(s); E('hound')(s).hp = 99;
  const v = guardValue(p); assert.equal(v, Math.min(TACTICS.guard.max, TACTICS.guard.base + Math.floor(p.toughness / TACTICS.guard.perToughness)));
  guard(s); assert.equal(s.p.attacksLeft, 0); assert.equal(s.stats.actions, 1); assert.throws(() => attack(s, E('hound')(s).uid), /already attacked/); assert.throws(() => guard(s), /already used/);
  assert.equal(intents(s)[0].guarded > 0, true, 'intents show the reduced damage'); const hp = p.hp; endTurn(s);
  assert.equal(p.hp, hp - Math.max(0, 2 - v), 'the hound strike is reduced by Guard'); assert.equal(p.statuses.guard, 0, 'expires when your turn begins');
  const l = arena(['....g', '.....', '~....', 'P....'], { g: 'grub' }); guard(l); const h0 = player(l).hp; l.phase = 'player'; movePlayer(l, 0, 2); assert.equal(player(l).hp, h0 - 2, 'lava ignores guard');
});
test('Channel: costs attack and movement; +1 mana (max+1); the next spell this turn gains +1; one action', () => {
  const s = arena(['g...', '....', 'P...'], { g: 'tortoise' }, { spellbook: book(['shock']) }); s.p.mana = 0;
  channel(s); assert.equal(s.p.mana, 1); assert.equal(s.p.moveLeft, 0); assert.equal(s.p.attacksLeft, 0); assert.equal(s.stats.actions, 1);
  const t = E('tortoise')(s); cast(s, 'mtg:shock', t.x, t.y); assert.equal(t.hp, 5 - 3, 'Shock 2 +1 from Channel'); assert.equal(s.p.channel, 0, 'consumed');
});
test('auto-end: stances keep the turn only when useful (Guard when threatened, Channel when +1 mana unlocks a cast)', () => {
  const far = arena(['g......', '.......', '......P'], { g: 'grub' }); far.p.moveLeft = 0;
  assert.deepEqual(usefulStances(far), [], 'nothing threatens you: no stance blocks auto-end'); assert.equal(shouldAutoEnd(far), true);
  const near = arena(['...', '.h.', '.P.'], { h: 'hound' }); near.p.moveLeft = 0; near.units.find(u => u.defId === 'hound').hp = 99;
  near.p.attacksLeft = 1; assert.ok(usefulStances(near).includes('guard')); assert.equal(shouldAutoEnd(near), false);
  const ch = arena(['g...', '....', 'P...'], { g: 'grub' }, { spellbook: book(['lightning-bolt']) }); ch.p.mana = 1; ch.p.moveLeft = 0; ch.p.attacksLeft = 1;
  ch.units[1].x = 3; ch.units[1].y = 0; assert.ok(usefulStances(ch).includes('channel'));
});
test('ranked replays include stances: recorded runs re-verify byte-identically under rules 0.8 / challenge revision 2', () => {
  assert.equal(RULES_VERSION, 'graftbound-rules-0.8.0'); assert.equal(RANKED_CHALLENGES['gb-expedition-01'].revision, 2);
  const { run, log } = playRanked(); assert.ok(log.some(d => d.type === 'guard' || d.type === 'channel'), 'the bot used a stance');
  assert.equal(JSON.stringify(replayRun('gb-expedition-01', log, { revision: 2 }).run), JSON.stringify(run));
  const i = log.findIndex(d => d.type === 'guard'); if (i >= 0) { const bad = log.map(d => ({ ...d })); bad.splice(i, 0, { ...bad[i] }); bad.forEach((d, k) => (d.seq = k)); assert.throws(() => replayRun('gb-expedition-01', bad)); }
});

// ── 5. Strength & scaling ───────────────────────────────────────────────────
const S = (...ids) => { const e = evoWith(...ids.map(i => 'mtg:' + i)); return strengthOf(e, { stats: deriveStats(e) }); };
test('strength model: grows with real combat value, counts synergy once, and weighs spells, mana and defense', () => {
  const blank = S(), bears = S('grizzly-bears'); assert.ok(bears.score > blank.score);
  const ds = S('fencing-ace', 'hill-giant'), plain = S('hill-giant', 'grizzly-bears'); assert.ok(ds.offense > plain.offense, 'double strike doubles power');
  const dsdt = S('fencing-ace', 'typhoid-rats'); assert.ok(dsdt.offense < (1 + 1 + 1) * 2 * 2 + 8, 'deathtouch is not multiplied by double strike');
  const e = evoWith('mtg:grizzly-bears'); const withSpells = strengthOf(e, { spellbook: book(['lightning-bolt', 'shock', 'flame-slash']), stats: deriveStats(e, { spellCount: 3 }) });
  assert.ok(withSpells.score > strengthOf(e, { stats: deriveStats(e) }).score, 'spells count'); assert.equal(withSpells.profile.spells, 3);
  const glass = strengthOf({ ...e, power: 20 }, { stats: { maxHealth: 3 } }), wall = strengthOf({ ...e, power: 1 }, { stats: { maxHealth: 60 } });
  assert.ok(Math.abs(glass.score - wall.score) < glass.score, 'geometric mean: one-sided builds are not over-rated');
  assert.ok(expectedStrength(16) > expectedStrength(8));
});
test('reinforcements: weak/average builds get none; extremely powerful Act II builds draw COUNTERS (never extra health)', () => {
  const weak = evoWith('mtg:grizzly-bears'); assert.deepEqual(reinforcements(1, 'battle', 3, weak, 9, { stats: deriveStats(weak) }), []);
  const eld = evoWith('mtg:vampire-nighthawk', 'mtg:colossal-dreadmaw', 'mtg:serra-angel', 'mtg:fencing-ace', 'mtg:charging-monstrosaur', 'mtg:air-elemental');
  const r = reinforcements(1, 'battle', 3, eld, 9, { stats: deriveStats(eld) }); assert.ok(r.length >= 1 && r.length <= 2); assert.equal(r[0], 'harpooner', 'a flying eldritch horror draws Skyhook Harpooners');
  const spells = reinforcements(2, 'battle', 3, eld, 9, { spellbook: book(['lightning-bolt', 'fireball', 'pyroclasm', 'shock']), stats: deriveStats(eld, { spellCount: 4 }) });
  assert.ok(COUNTERS[2].flying.includes(spells[0]));
  assert.equal(buildFocus({ flying: false, spells: 4, melee: true }), 'spells'); assert.equal(buildFocus({ flying: false, spells: 0, melee: true }), 'melee');
  const b = arena(['h.', '.P'], { h: 'harpooner' }); assert.equal(E('harpooner')(b).maxHp, 3, 'no health inflation');
});
test('bosses adapt to an over-curve build: Thornmother hardens earlier; the Unwritten silences a spell for one turn only', () => {
  const eld = evoWith('mtg:vampire-nighthawk', 'mtg:colossal-dreadmaw', 'mtg:serra-angel', 'mtg:fencing-ace'); const ad = bossAdaptation(0, eld, { stats: deriveStats(eld) }); assert.ok(ad.surge);
  const t = arena(['........', '...B....', '........', '........', '........', '........', '........', '...P....'], { B: 'thornmother' }); t.adapt = ad;
  const b = E('thornmother')(t); b.hp = Math.floor(b.maxHp * 0.6); endTurn(t); assert.ok(b.barked, 'bark at 2/3 instead of 1/2 against a surging build');
  const u = arena(['........', '...U....', '........', '........', '........', '........', '........', '...P....'], { U: 'unwritten' }, { spellbook: book(['shock', 'lightning-bolt', 'flame-slash']) });
  const un = E('unwritten')(u); un.hp = 20; un.cycle = 1; u.p.mana = 9; endTurn(u);
  assert.equal(u.p.silenced, 'mtg:flame-slash', 'costliest spell silenced'); assert.match(castBlockReason(u, 'mtg:flame-slash'), /Silenced/); assert.equal(castBlockReason(u, 'mtg:shock'), null);
  endTurn(u); assert.notEqual(u.p.silenced, 'mtg:flame-slash', 'returns after that turn');
});
test('Act II coordination: an Ashbound Brute rallies the foe beside it (+1 on its next action only)', () => {
  const s = arena(['......', '..xh..', '......', '...P..'], { x: 'ashbrute', h: 'hound' }); const h = E('hound')(s); h.hp = 99;
  const ev = endTurn(s); const ri = ev.findIndex(e => e.t === 'status' && e.uid === h.uid && e.status === 'empowered' && e.value === 1);
  assert.ok(ri >= 0, 'rallied'); assert.equal(h.statuses.empowered || 0, 0, 'used on its next action, then gone');
});
test('skill matters: the same weak build wins more boss fights when it Guards against telegraphs than when it never does', () => {
  // Boxed in beside the Thornmother (rocks on every side): her Root Slam cannot be dodged, only guarded against.
  const evo = evoWith('mtg:grizzly-bears', 'mtg:glory-seeker', 'mtg:pillarfield-ox'); let smart = 0, naive = 0;
  for (let seed = 1; seed <= 8; seed++) for (const tactics of [true, false]) {
    const s = arena(['........', '...B....', '..#P#...', '...#....'], { B: 'thornmother' }, { evo, seed });
    const r = botPlay(s, 40, { tactics }); if (tactics) smart += s.stats.damageTaken; else naive += s.stats.damageTaken;
  }
  assert.ok(smart < naive, `guarding bot took ${smart} vs ${naive}`);
});

// ── 6. Magnitude-scaled VFX (presentation only) ─────────────────────────────
test('spell events carry the RESOLVED magnitude; bigger hits mean bigger effects on a bounded curve', () => {
  const s = arena(['t...', '....', 'P...'], { t: 'tortoise' }, { spellbook: [{ id: 'mtg:lightning-bolt', level: 3 }, { id: 'mtg:shock', level: 1 }] }); s.p.mana = 9; s.p.maxMana = 9;
  const t = E('tortoise')(s); t.hp = t.maxHp = 50; const ev = cast(s, 'mtg:lightning-bolt', t.x, t.y); const sp = ev.find(e => e.t === 'spell');
  assert.equal(sp.magnitude, spellNumbers('mtg:lightning-bolt', 3)[0]); assert.ok(intensityOf(2) < intensityOf(5) && intensityOf(5) < intensityOf(15));
  assert.equal(intensityOf(1000), 2); assert.equal(intensityOf(0), 0.6); assert.ok(intensityOf(20) < intensityOf(2) * 10 / 2, 'not linear');
  assert.equal(spellMagnitude([{ t: 'damage', kind: 'spell', amount: 4 }, { t: 'damage', kind: 'spell', amount: 4 }, { t: 'damage', kind: 'spell', amount: 4 }]), 4 + 2, 'area: others count a quarter');
  assert.equal(spellMagnitude([{ t: 'heal', amount: 5 }]), 5); assert.equal(spellMagnitude([{ t: 'shield', amount: 3 }]), 3);
  assert.ok(MAX_SHAKE <= 0.3); assert.ok(!/engine\//.test(src('rendering/casting.js').split('\n').filter(l => l.startsWith('import')).join()), 'renderer imports no rules');
});
test('impact amplifier respects caps, reduced motion and instant mode', async () => {
  const log = []; const units = new Map([[1, { uid: 1, pos: [0, 0, 2], dir: [0, -1], lunge: [0, 0, 0], hover: 0, fh: 48, scale: 1 }], [2, { uid: 2, pos: [0, 0, -2], dir: [0, 1], lunge: [0, 0, 0], hover: 0, fh: 32, scale: 1 }]]);
  const mk = (speed, reduced) => ({ speed, reduced, time: 0, zoom: 1, units, heightOf: v => v.fh / 30, centerPos: u => units.get(u).pos, face() {}, play() {}, light: () => ({}), addBolt() {}, addRing() {}, screenFlash() {}, hit() {},
    shake: a => log.push(a), tween: (d, f) => { f(1); return Promise.resolve(); }, projectile: () => Promise.resolve(), fx: { emit() {}, burst() {}, swirl() {} } });
  await castSpellVisual(mk(25, false), { kind: 'fireball', uid: 1, to: [0, 0, -2], magnitude: 200 }); assert.ok(log.every(a => a <= MAX_SHAKE));
  log.length = 0; await castSpellVisual(mk(25, true), { kind: 'fireball', uid: 1, to: [0, 0, -2], magnitude: 200 }); assert.equal(log.length, 0, 'reduced motion: no shake');
});

// ── 7. Spell hand ───────────────────────────────────────────────────────────
test('spell hand renders real card faces with GRAFTBOUND overlays, keeps disabled spells visible, supports keys, mobile and inspection', () => {
  const ui = src('ui/battle-ui.js'), css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8'), cards = src('ui/cards.js');
  for (const x of ['renderHand(s)', 'cardHTML(e.id', 'hc-cost', 'GRAFTBOUND mana cost (not the printed Magic cost)', "st-${state}", 'aria-pressed', 'data-inspect', '<kbd>${i + 1}</kbd>', 'enrichAll(s.spellbook']) assert.ok(ui.includes(x), x);
  assert.match(cards, /onerror="this\.closest\('\.lc-card'\)\.classList\.add\('img-failed'\)"/, 'broken images fall back to the GRAFTBOUND frame');
  assert.match(css, /\.handcard:hover, \.handcard:focus-visible/); assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.handcard \{ --cw: 76px/); assert.match(css, /scroll-snap-type: x proximity/);
  assert.match(ui, /used: 'Cast this turn'/); assert.match(ui, /nomana: 'Not enough mana'/);
});
