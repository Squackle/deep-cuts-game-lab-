// Deterministic balance harness: archetype builds × act encounters, using the naive bot. Directional only.
import { createBattle } from '../src/engine/combat.js';
import { buildEncounter, templateFor } from '../src/engine/encounters.js';
import { deriveStats } from '../src/engine/evolution.js';
import { ACTS } from '../src/data/encounters.js';
import { evoWith, botPlay } from './helpers.mjs';
const sb = ids => ids.map(id => ({ id: 'mtg:' + id, level: 1 }));
/** Representative builds at each act (respecting graft capacity 4/6/8). */
export const ARCHETYPES = {
  melee:  { cards: [['alpine-grizzly', 'centaur-courser', 'gnarled-mass', 'hill-giant'], ['alpine-grizzly', 'centaur-courser', 'gnarled-mass', 'rumbling-baloth', 'fire-elemental', 'hill-giant'], ['rumbling-baloth', 'fire-elemental', 'spined-wurm', 'craw-wurm', 'gnarled-mass', 'centaur-courser', 'alpine-grizzly', 'hill-giant']], spells: [] },
  tank:   { cards: [['pillarfield-ox', 'elvish-warrior', 'glory-seeker', 'walking-corpse'], ['pillarfield-ox', 'elvish-warrior', 'rumbling-baloth', 'gnarled-mass', 'glory-seeker', 'walking-corpse'], ['pillarfield-ox', 'elvish-warrior', 'rumbling-baloth', 'gnarled-mass', 'spined-wurm', 'feral-abomination', 'glory-seeker', 'walking-corpse']], spells: ['feat-of-resistance', 'healing-hands'] },
  flyDT:  { cards: [['typhoid-rats', 'storm-crow', 'suntail-hawk', 'pharika-s-chosen'], ['typhoid-rats', 'storm-crow', 'wind-drake', 'snapping-drake', 'pharika-s-chosen', 'gifted-aetherborn'], ['vampire-nighthawk', 'storm-crow', 'wind-drake', 'snapping-drake', 'air-elemental', 'typhoid-rats', 'gifted-aetherborn', 'skyknight-legionnaire']], spells: [] },
  dsTrample: { cards: [['fencing-ace', 'boros-swiftblade', 'grizzly-bears', 'glory-seeker'], ['fencing-ace', 'boros-swiftblade', 'war-mammoth', 'gnarled-mass', 'grizzly-bears', 'centaur-courser'], ['fencing-ace', 'boros-swiftblade', 'war-mammoth', 'colossal-dreadmaw', 'gnarled-mass', 'centaur-courser', 'rumbling-baloth', 'alpine-grizzly']], spells: [] },
  lifelink: { cards: [['child-of-night', 'mesa-unicorn', 'healer-s-hawk', 'glory-seeker'], ['child-of-night', 'mesa-unicorn', 'knight-of-meadowgrain', 'gifted-aetherborn', 'pillarfield-ox', 'glory-seeker'], ['child-of-night', 'mesa-unicorn', 'knight-of-meadowgrain', 'gifted-aetherborn', 'vampire-nighthawk', 'pillarfield-ox', 'rumbling-baloth', 'glory-seeker']], spells: ['healing-salve'] },
  spells: { cards: [['fugitive-wizard', 'storm-crow'], ['fugitive-wizard', 'storm-crow', 'wind-drake', 'coral-merfolk'], ['fugitive-wizard', 'storm-crow', 'wind-drake', 'coral-merfolk', 'air-elemental', 'snapping-drake']], spells: ['lightning-bolt', 'shock', 'arc-lightning', 'drain-life', 'frost-breath'] },
  hybrid: { cards: [['typhoid-rats', 'grizzly-bears', 'storm-crow', 'child-of-night'], ['typhoid-rats', 'centaur-courser', 'wind-drake', 'child-of-night', 'youthful-knight', 'gnarled-mass'], ['vampire-nighthawk', 'centaur-courser', 'snapping-drake', 'war-mammoth', 'youthful-knight', 'rumbling-baloth', 'child-of-night', 'gnarled-mass']], spells: ['lightning-bolt', 'feat-of-resistance'] },
};
export function archetype(name, act) { const a = ARCHETYPES[name]; return { evo: evoWith(...a.cards[act].map(c => 'mtg:' + c)), spellbook: sb(act === 0 ? a.spells.slice(0, 2) : a.spells) }; }
export function fight({ evo, spellbook, act, tier, n = 20, sparkBonus = act * 4, tactics = true }) {
  let won = 0, taken = 0, turns = 0; const st = deriveStats(evo, { sparkBonus, manaBonus: act >= 1 ? 1 : 0, spellCount: spellbook.length });
  const pools = tier === 'boss' ? ACTS[act].bossEncounters : tier === 'elite' ? ACTS[act].elite : [...ACTS[act].mid, ...ACTS[act].late];
  for (let seed = 1; seed <= n; seed++) {
    const tpl = tier === 'boss' ? templateFor(act, 'boss', 7, seed * 977 + act) : pools[seed % pools.length];
    const s = createBattle({ evo, stats: st, spellbook, encounter: buildEncounter(tpl, seed * 977 + act, tier), seed, act });
    const r = botPlay(s, 40, { tactics }); if (r === 'won') won++; taken += s.stats.damageTaken; turns += s.turn;
  }
  return { rate: won / n, taken: taken / n, turns: turns / n, maxHp: st.maxHealth };
}
