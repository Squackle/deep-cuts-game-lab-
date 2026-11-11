// Whole-campaign simulator for balance checks: a naive bot walks the map, fights with botPlay, and picks
// rewards greedily. It is deliberately simple; numbers are directional, not a substitute for playtests.
import { newRun, enterNode, concludeBattle, chooseReward, shrineChoice, runStats } from '../src/engine/run.js';
import { availableNodes } from '../src/engine/campaign.js';
import { resolveCard } from '../src/cards/catalog.js';
import { botPlay } from './helpers.mjs';

const KW_VALUE = { deathtouch: 4, doubleStrike: 4, firstStrike: 2.5, flying: 2.5, lifelink: 2, trample: 1.5, regenerate: 2, ward: 2, spines: 1.5, vigilance: 1, haste: 1, reach: 1.5, attuned: 1, arcane: 1 };
export function scoreCard(run, id) {
  const c = resolveCard(id);
  if (c.kind === 'creature') return c.power + c.toughness + Object.entries(c.keywords).reduce((a, [k, v]) => a + (run.evo.keywords[k] && KW_VALUE[k] && v === 1 ? 1 : (KW_VALUE[k] || 1) * v), 0);
  const known = run.spellbook.find(s => s.id === id);
  return (c.category === 'damage' ? 4 : c.category === 'protection' || c.category === 'healing' ? 3 : 2.5) - (known ? 1 : 0) - (run.spellbook.length >= 4 ? 2 : 0);
}
export function simulateRun(seed, { contentMode = 'original', policy = 'greedy' } = {}) {
  const run = newRun({ seed, tutorial: false, contentMode });
  let steps = 0;
  while (run.phase !== 'won' && run.phase !== 'lost' && steps++ < 30) {
    if (run.phase === 'map') {
      const opts = availableNodes(run.map, run.current);
      const node = opts.find(n => n.type === 'shrine') || opts.find(n => n.type === 'battle') || opts[0];
      enterNode(run, node.id);
    }
    if (run.phase === 'shrine') shrineChoice(run, 'pack');
    if (run.phase === 'battle') { botPlay(run.battle, 60); if (run.battle.phase === 'player') run.battle.phase = 'lost'; concludeBattle(run); }
    if (run.phase === 'reward') {
      const ids = run.pending.cards;
      const pick = policy === 'random' ? ids[seed % 3] : ids.slice().sort((a, b) => scoreCard(run, b) - scoreCard(run, a))[0];
      chooseReward(run, pick);
    }
  }
  return { won: run.phase === 'won', depth: run.current != null ? run.map.nodes.find(n => n.id === run.current).depth : 0, power: run.evo.power, toughness: run.evo.toughness, health: runStats(run).maxHealth, absorbed: run.evo.absorbed.map(a => a.cardId), spells: run.spellbook.map(s => s.id) };
}
export function winRate(n, opts) { let w = 0, depth = 0; const runs = []; for (let s = 1; s <= n; s++) { const r = simulateRun(s * 7919, opts); runs.push(r); if (r.won) w++; depth += r.depth; } return { rate: w / n, avgDepth: depth / n, runs }; }
