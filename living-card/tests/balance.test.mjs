import test from 'node:test'; import assert from 'node:assert/strict';
import { buildEncounter } from '../src/engine/encounters.js';
import { createBattle } from '../src/engine/combat.js';
import { deriveStats, newEvolution } from '../src/engine/evolution.js';
import { ENCOUNTERS } from '../src/data/encounters.js';
import { evoWith, botPlay } from './helpers.mjs';

function rate(evo, spellbook, tpl, type, n = 40) {
  let won = 0;
  for (let seed = 1; seed <= n; seed++) {
    const s = createBattle({ evo, stats: deriveStats(evo), spellbook, encounter: buildEncounter(tpl, seed * 101, type), seed });
    if (botPlay(s, 40) === 'won') won++;
  }
  return won / n;
}
test('tutorial reliably winnable by a blank 1/1 (naive bot)', () => { const r = rate(newEvolution(), [], ENCOUNTERS.tutorial[0], 'tutorial'); assert.ok(r >= 0.95, 'rate ' + r); });
test('one-pick build can win early encounters (naive bot)', () => {
  for (const tpl of ENCOUNTERS.early) { const r = rate(evoWith('nightcap_toad'), [], tpl, 'battle'); assert.ok(r >= 0.6, tpl.name + ' ' + r); }
});
test('spell-focused build is viable in mid encounters', () => {
  const evo = evoWith('nightcap_toad', 'hollow_owl', 'inkwell_wisp');
  const book = [{ id: 'ember_dart', level: 1 }, { id: 'chain_lightning', level: 1 }, { id: 'soul_siphon', level: 1 }];
  for (const tpl of ENCOUNTERS.mid) { const r = rate(evo, book, tpl, 'battle'); assert.ok(r >= 0.5, tpl.name + ' ' + r); }
});
test('defensive build differs from aggressive: it takes less damage per win', () => {
  const fight = (evo, book) => { let taken = 0, n = 0; for (let seed = 1; seed <= 30; seed++) { const s = createBattle({ evo, stats: deriveStats(evo), spellbook: book, encounter: buildEncounter(ENCOUNTERS.mid[2], seed * 7, 'battle'), seed }); if (botPlay(s) === 'won') { taken += s.stats.damageTaken; n++; } } return taken / Math.max(1, n); };
  const def = fight(evoWith('cairnshell_tortoise', 'briarback_hedgehog', 'mossback_brute'), [{ id: 'barkskin', level: 1 }]);
  const agg = fight(evoWith('ridgehorn_boar', 'twinfang_lynx', 'glassblade_mantis'), []);
  assert.ok(def < agg, `defensive ${def} vs aggressive ${agg}`);
});
test('boss is not trivial for a modest build but beatable by a strong one', () => {
  const modest = rate(evoWith('nightcap_toad', 'mossback_brute'), [], ENCOUNTERS.boss[0], 'boss', 30);
  const strong = rate(evoWith('nightcap_toad', 'mossback_brute', 'deeproot_wyrm', 'glassblade_mantis', 'cairnshell_tortoise', 'bloodmoss_leech'), [{ id: 'ember_dart', level: 1 }, { id: 'barkskin', level: 1 }], ENCOUNTERS.boss[0], 'boss', 30);
  assert.ok(modest < 0.9, 'modest ' + modest); assert.ok(strong >= 0.5, 'strong ' + strong);
});
