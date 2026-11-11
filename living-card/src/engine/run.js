// Run lifecycle: everything that persists within a single adventure.
import { newEvolution, absorb, deriveStats, STARTING_NAME } from './evolution.js';
import { generateMap, nodeById, availableNodes } from './campaign.js';
import { buildEncounter, templateFor, reinforcements } from './encounters.js';
import { createBattle } from './combat.js';
import { generatePack, MAX_SPELL_LEVEL } from './rewards.js';
import { resolveCard } from '../cards/catalog.js';

export const RUN_VERSION = 2;
export const CHALLENGES = {
  paperThin: { name: 'Paper Thin', text: 'Your Spark is 1 instead of 5.' },
  pauper:    { name: 'Pauper\u2019s Pack', text: 'Boosters never contain Rare or Mythic cards.' },
  feral:     { name: 'Feral Wilds', text: 'Every foe has +1 power.' },
};

export function newRun({ seed, unlocks = {}, challenges = [], tutorial = false, contentMode = 'original' }) {
  return {
    v: RUN_VERSION, seed: seed >>> 0, name: STARTING_NAME, contentMode, evo: newEvolution(), spellbook: [], sparkBonus: 0,
    map: generateMap(seed, { tutorial }), current: null, visited: [], phase: 'map', battle: null, pending: null,
    unlocks: { ...unlocks }, challenges: challenges.slice(), tutorial,
    stats: { battlesWon: 0, kills: 0, damageDealt: 0, damageTaken: 0, spellsCast: 0, turns: 0, cardsAbsorbed: 0, spellsLearned: 0, elitesDefeated: 0, flawless: 0 },
    startedAt: Date.now(),
  };
}
export const runStats = run => deriveStats(run.evo, { sparkBonus: run.sparkBonus, baseSpark: run.challenges.includes('paperThin') ? 1 : 5 });
const packOpts = run => ({ unlocks: run.unlocks, spellbook: run.spellbook, noRares: run.challenges.includes('pauper'), includeReference: run.contentMode === 'reference' });
const depthOf = run => (run.current != null ? nodeById(run.map, run.current).depth : 0);

export function enterNode(run, nodeId) {
  if (run.phase !== 'map') throw new Error('Not on map');
  if (!availableNodes(run.map, run.current).some(n => n.id === nodeId)) throw new Error('Node not reachable');
  const node = nodeById(run.map, nodeId);
  run.current = nodeId; run.visited.push(nodeId);
  if (node.type === 'shrine') { run.phase = 'shrine'; return run; }
  const base = templateFor(node.type, node.depth, node.seed);
  const extra = reinforcements(node.type, node.depth, run.evo, node.seed);
  const tpl = extra.length ? { ...base, enemies: [...base.enemies, ...extra] } : base;
  const enc = buildEncounter(tpl, node.seed, node.type);
  const battle = createBattle({ evo: run.evo, stats: runStats(run), spellbook: run.spellbook, encounter: enc, seed: node.seed, heroName: run.name });
  if (run.challenges.includes('feral')) for (const u of battle.units) if (u.side === 'enemy') u.power += 1;
  battle.nodeType = node.type; battle.reinforced = extra.length;
  run.battle = battle; run.phase = 'battle';
  return run;
}

/** Call once the battle reports phase 'won' or 'lost'. */
export function concludeBattle(run) {
  const b = run.battle; if (!b) throw new Error('No battle');
  for (const k of ['kills', 'damageDealt', 'damageTaken', 'spellsCast', 'turns']) run.stats[k] += b.stats[k];
  if (b.phase === 'lost') { run.phase = 'lost'; run.lastBattle = summarize(b); run.battle = null; return { outcome: 'lost' }; }
  if (b.phase !== 'won') throw new Error('Battle not finished');
  run.stats.battlesWon++;
  if (b.stats.damageTaken === 0) run.stats.flawless++;
  if (b.nodeType === 'elite') run.stats.elitesDefeated++;
  const tier = b.nodeType === 'boss' ? 'boss' : b.nodeType === 'elite' ? 'elite' : 'battle';
  const forced = b.nodeType === 'tutorial' ? ['nightcap_toad'] : [];
  run.pending = { cards: generatePack(b.rng.s ^ 0x5eed, { tier, forced, depth: depthOf(run), ...packOpts(run) }), tier, boss: b.nodeType === 'boss' };
  run.lastBattle = summarize(b);
  run.battle = null; run.phase = 'reward';
  return { outcome: 'won', boss: b.nodeType === 'boss', elite: b.nodeType === 'elite', battleStats: b.stats };
}
const summarize = b => ({ name: b.name, nodeType: b.nodeType, stats: { ...b.stats } });

export function chooseReward(run, cardId) {
  if (run.phase !== 'reward' || !run.pending || !run.pending.cards.includes(cardId)) throw new Error('Invalid reward choice');
  const card = resolveCard(cardId); if (!card) throw new Error('Unknown card ' + cardId);
  let change;
  if (card.kind === 'creature') {
    const res = absorb(run.evo, card); run.evo = res.evo; change = { kind: 'absorb', ...res.change };
    run.stats.cardsAbsorbed++;
  } else {
    const e = run.spellbook.find(s => s.id === cardId);
    if (e) { e.level = Math.min(MAX_SPELL_LEVEL, e.level + 1); change = { kind: 'empower', cardId, level: e.level }; }
    else { run.spellbook.push({ id: cardId, level: 1 }); change = { kind: 'learn', cardId, level: 1 }; }
    run.stats.spellsLearned++;
  }
  finishReward(run);
  return change;
}
export function skipReward(run) {
  if (run.phase !== 'reward') throw new Error('No reward pending');
  run.sparkBonus += 1; finishReward(run);
  return { kind: 'spark', amount: 1 };
}
function finishReward(run) { const boss = run.pending && run.pending.boss; run.pending = null; run.phase = boss ? 'won' : 'map'; }
export function shrineChoice(run, choice) {
  if (run.phase !== 'shrine') throw new Error('Not at a shrine');
  if (choice === 'spark') { run.sparkBonus += 3; run.phase = 'map'; return { kind: 'spark', amount: 3 }; }
  if (choice === 'pack') {
    const node = nodeById(run.map, run.current);
    run.pending = { cards: generatePack(node.seed ^ 0xa11ce, { tier: 'battle', depth: node.depth, ...packOpts(run) }), tier: 'shrine' };
    run.phase = 'reward'; return { kind: 'pack' };
  }
  throw new Error('Unknown shrine choice');
}
