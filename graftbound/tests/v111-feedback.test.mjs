// v1.1.1: regressions from owner screenshot feedback.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { arena } from './helpers.mjs';
import { enemies, player, endTurn } from '../src/engine/combat.js';
import { planEnemy, hazardDistanceField, pathDamage } from '../src/engine/ai.js';
import { visualManaTier, visualChargeTimings, profileFor, aftermathSigil, castSignature } from '../src/rendering/casting.js';
import { RULES_VERSION, RANKED_CHALLENGES } from '../src/engine/ranked.js';

test('hazards no longer freeze a brute: a nonlethal lava crossing is available when necessary', () => {
  const s = arena(['#######', '#P..~g#', '#######'], { g: 'ashbrute' });
  const e = enemies(s)[0]; e.hp=e.maxHp=12;
  const plan = planEnemy(s, e);
  assert.deepEqual(plan.to, { x: 3, y: 1 });
  assert.equal(pathDamage(s, e, plan.path), 2);
  const hp = e.hp; endTurn(s);
  assert.deepEqual({ x: e.x, y: e.y }, { x: 3, y: 1 });
  assert.equal(e.hp, hp - 2);
});

test('AI chooses a safe detour instead of freezing beside hazardous tiles', () => {
  const s = arena(['.......','.......','.g~~~P.','.......','.......'], { g: 'ashbrute' });
  const e = enemies(s)[0], p = player(s);e.hp=e.maxHp=12;
  const field = hazardDistanceField(s, p, e);
  assert.ok(field[e.y*s.w+e.x] < 15);
  const initial = planEnemy(s, e);
  assert.ok(initial.to && initial.to.y !== 2, 'detour must leave the hazardous row');
  assert.equal(pathDamage(s, e, initial.path), 0);
  for (let i = 0; i < 3; i++) endTurn(s);
  assert.ok(e.hp>=e.maxHp-1, 'safe detour avoids lava; hero may legitimately counterattack the attacker');
  assert.equal(Math.abs(e.x-p.x) + Math.abs(e.y-p.y), 1, 'approaches to attack range');
});

test('AI does not suicide into terrain that would kill it', () => {
  const s = arena(['#######','#P..~g#','#######'], { g:'grub' });
  assert.equal(planEnemy(s, enemies(s)[0]).to, null);
});

test('mana cost, not hardcoded spell identity, determines visual complexity and charge pacing', () => {
  assert.deepEqual([0,1,2,3,5].map(visualManaTier), [1,1,2,3,3]);
  const p = profileFor('lightningBolt');
  const timings = [1,2,3].map(t => visualChargeTimings(p,t));
  const total = x => x.gather + x.build;
  assert.ok(total(timings[0]) < total(timings[1]) && total(timings[1]) < total(timings[2]));
  assert.ok(total(timings[0]) <= 200, 'even Lightning Bolt is short when it costs just one game mana');
  assert.ok(total(timings[2]) >= 560, 'grand tier has a deliberate charge');
  const geometry = []; const scene = { speed: 1, reduced: false, addRing: r => geometry.push(r) };
  aftermathSigil(scene, 'lightningBolt', [1,1,1], 1, 1);
  aftermathSigil(scene, 'lightningBolt', [1,1,1], 1, 2);
  aftermathSigil(scene, 'lightningBolt', [1,1,1], 1, 3);
  assert.deepEqual(geometry.map(r=>r.spokes), [0, 7, 7, 7]);
  assert.ok(geometry[0].r1 < geometry[1].r1 && geometry[1].r1 < geometry[2].r1);
  const before=geometry.length;castSignature(scene,'shock',[0,0,0],1,1);assert.equal(geometry.length,before);
  castSignature(scene,'shock',[0,0,0],1,3);assert.equal(geometry.length,before+1);
});

test('spell event carries actual mana spent, and renderer respects it', () => {
  const c = readFileSync(new URL('../src/engine/combat.js',import.meta.url), 'utf8');
  const ui = readFileSync(new URL('../src/ui/battle-ui.js',import.meta.url), 'utf8');
  assert.match(c,/spellEvent\.manaCost = cost/);
  assert.match(ui,/manaCost: e\.manaCost \?\? c\.cost/);
});

test('spell cards cannot crop printed art or overflow the battle tray on short viewports', () => {
  const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
  assert.match(css,/\.lc-card\.real \.realface \.real-img \{ object-fit: contain/);
  assert.match(css,/#hud \.handcard \{[^}]*--hand-width: clamp\(/);
  assert.match(css,/#hud \.tray \{[^}]*padding: 26px 24px 14px/);
  assert.match(css,/@media \(max-height: 340px\)/);
});

test('changes to hazard planning use an isolated deterministic ranked rules revision',()=>{
  assert.equal(RULES_VERSION,'graftbound-rules-1.2.2-beta');
  assert.equal(RANKED_CHALLENGES['gb-expedition-01'].revision,9);
});