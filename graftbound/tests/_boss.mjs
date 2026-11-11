import { createBattle, endTurn, player, enemies } from '../src/engine/combat.js';
import { buildEncounter, templateFor } from '../src/engine/encounters.js';
import { deriveStats } from '../src/engine/evolution.js';
import { evoWith, botPlay } from './helpers.mjs';
const builds = {
  bears: evoWith('mtg:grizzly-bears', 'mtg:glory-seeker', 'mtg:elvish-warrior', 'mtg:centaur-courser'),
  flyDT: evoWith('mtg:typhoid-rats', 'mtg:suntail-hawk', 'mtg:storm-crow', 'mtg:pharika-s-chosen'),
};
for (const act of [0, 1, 2]) for (const [name, evo] of Object.entries(builds)) {
  let w = 0, turns = 0, taken = 0; const N = 30;
  for (let seed = 1; seed <= N; seed++) {
    const st = deriveStats(evo);
    const s = createBattle({ evo, stats: st, spellbook: [{ id: 'mtg:shock', level: 1 }], encounter: buildEncounter(templateFor(act, 'boss', 7, seed), seed, 'boss'), seed });
    const r = botPlay(s, 40); if (r === 'won') w++; turns += s.turn; taken += s.stats.damageTaken;
  }
  console.log('act', act, name, 'P/T', evo.power + '/' + evo.toughness, 'hp', deriveStats(evo).maxHealth, 'win', (w / N).toFixed(2), 'turns', (turns / N).toFixed(1));
}
