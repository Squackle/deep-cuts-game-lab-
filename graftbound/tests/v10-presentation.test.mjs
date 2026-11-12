// GRAFTBOUND v1.0 presentation contracts: no gameplay rewards modified by the new visuals.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { packIdentity, packOrnament, PACK_IDENTITIES } from '../src/ui/pack-opening.js';
import { aftermathSigil, AFTERMATH_SIGILS, CAST_PROFILE } from '../src/rendering/casting.js';
import { buildEnvironment, THEMES } from '../src/rendering/environment.js';
import { buildEncounter } from '../src/engine/encounters.js';
import { ACTS } from '../src/data/encounters.js';

test('each booster rank has a distinct original ornamental silhouette, a meaningful opening cue and truthful reward description', () => {
  const names = ['battle', 'elite', 'boss', 'primer'];
  assert.equal(new Set(names.map(t => packIdentity(t).emblem)).size, 4);
  for (const t of names) {
    const p = packIdentity(t);
    assert.ok(p.rank && p.omen && p.cue);
    assert.match(packOrnament(t), /<g class="pk-etch/);
    assert.ok(packOrnament(t).length > 100);
    assert.ok(!/guarantee|guaranteed rare|mythic guaranteed/i.test(JSON.stringify(p)));
  }
  assert.equal(packIdentity('missing'), PACK_IDENTITIES.battle);
  const ui = readFileSync(new URL('../src/ui/screens.js', import.meta.url), 'utf8');
  assert.match(ui, /packOrnament\(tier\)/);
  assert.match(ui, /aria-live="polite"/);
});

test('every spell has an element-specific, finite-cost aftermath glyph; reduced/instant modes skip it', () => {
  const names = Object.keys(CAST_PROFILE);
  for (const name of names) assert.ok(AFTERMATH_SIGILS[name], `${name} has residue design`);
  const geometry = [];
  const scene = { speed: 1, reduced: false, addRing: r => geometry.push(r) };
  aftermathSigil(scene, 'shock', [1, 1, 2], 1);
  aftermathSigil(scene, 'pyroclasm', [1, 1, 2], 1.8);
  assert.equal(geometry.length, 3); // Shock one ring; powerful Pyroclasm two.
  assert.equal(geometry[0].spokes, 0); // 1-mana spark is deliberately simple
  assert.equal(geometry[1].spokes, 12);
  assert.ok(geometry.every(x => x.life <= 0.7 && x.r1 <= 1.8));
  const before = geometry.length;
  aftermathSigil({ ...scene, reduced: true }, 'frost', [0, 0, 0]);
  aftermathSigil({ ...scene, speed: 100 }, 'frost', [0, 0, 0]);
  assert.equal(geometry.length, before, 'accessibility and instant playback do not add afterimages');
});

test('elite and boss arenas gain themed noninteractive exterior ornaments without changing walkable layout', () => {
  for (const [act, theme] of Object.keys(THEMES).entries()) {
    const template = ACTS[act].mid[0];
    const a = buildEncounter(template, 31, 'battle');
    const b = buildEncounter(template, 31, 'elite');
    const c = buildEncounter(template, 31, 'boss');
    assert.deepEqual(a.terrain, b.terrain);
    assert.deepEqual(a.terrain, c.terrain);
    const ordinary = buildEnvironment(a, 31, theme);
    const elite = buildEnvironment(b, 31, theme);
    const boss = buildEnvironment(c, 31, theme);
    assert.ok(elite.opaque.length > ordinary.opaque.length, `${theme} elite geo`);
    assert.ok(boss.opaque.length > elite.opaque.length, `${theme} boss geo`);
    assert.equal(elite.lights.length - ordinary.lights.length, 2);
    assert.equal(boss.lights.length - ordinary.lights.length, 4);
  }
});

test('grub sprite sheet and animation dimensions match widened source canvas to avoid sliced tail', () => {
  const man = JSON.parse(readFileSync(new URL('../assets/sprites/manifest.json', import.meta.url), 'utf8'));
  const grub = man.sprites.grub;
  assert.equal(grub.w, 44);
  assert.equal(grub.h, 24);
  const data = readFileSync(new URL('../assets/sprites/grub.png', import.meta.url));
  assert.equal(data.toString('ascii', 1, 4), 'PNG');
  assert.equal(data.readUInt32BE(16), grub.w * man.cols);
  assert.equal(data.readUInt32BE(20), grub.h * Object.keys(man.anims).length * man.views.length);
});


test('every original enemy sprite has frame-aligned alpha bleed and matches the packed manifest', () => {
  const man = JSON.parse(readFileSync(new URL('../assets/sprites/manifest.json', import.meta.url), 'utf8'));
  for (const [name, sprite] of Object.entries(man.sprites)) {
    if (name === 'blank') continue;
    assert.ok(Number.isInteger(sprite.bleedX) && sprite.bleedX >= 0 && sprite.bleedX <= 24, name);
    assert.equal(sprite.w, sprite.artWidth + 2 * sprite.bleedX, name);
    assert.equal(sprite.pivotY, sprite.h - 3, name);
    const png = readFileSync(new URL('../assets/sprites/' + sprite.file, import.meta.url));
    assert.equal(png.toString('ascii', 1, 4), 'PNG', name);
    assert.equal(png.readUInt32BE(16), sprite.w * man.cols, name + ' packed width');
    assert.equal(png.readUInt32BE(20), sprite.h * Object.keys(man.anims).length * man.views.length, name + ' packed height');
  }
});
