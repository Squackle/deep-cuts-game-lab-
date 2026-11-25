// Whole-adventure simulator (3 acts, 24 nodes). A naive bot walks the map, fights with botPlay and picks
// rewards by a scoring policy. Numbers are DIRECTIONAL — not a substitute for human playtests.
import { newRun, enterNode, concludeBattle, chooseReward, shrineChoice, runStats, graftsFull, eventChoice } from '../src/engine/run.js';
import { eventChoices } from '../src/engine/events.js';
import { availableNodes } from '../src/engine/campaign.js';
import { resolveCard } from '../src/cards/catalog.js';
import { graftRating } from '../src/engine/power.js';
import { botPlay } from './helpers.mjs';

export const SUMMON_TRAITS = new Set(['ophiomancer', 'rabblemaster', 'brimaz', 'pyromancer', 'talrand', 'mystic', 'skeleton', 'hornetQueen', 'hermit', 'nadir', 'zulaport', 'bloodArtist', 'ayara', 'lambholt']);
export const POLICIES = {
  greedy: (run, c) => c.kind === 'creature' ? graftRating(c, run.evo) : ({ damage: 5, area: 5.5, weaken: 4, disable: 4, protection: 3.5, healing: 3.5, enhance: 3.5 }[c.category] || 3) - (run.spellbook.length >= 5 ? 3 : 0),
  random: () => 0,
  melee: (run, c) => c.kind === 'creature' ? c.power * 2 + (c.keywords.trample ? 3 : 0) + (c.keywords.doubleStrike ? 4 : 0) : 0,
  tank: (run, c) => c.kind === 'creature' ? c.toughness * 2 + (c.keywords.lifelink ? 3 : 0) : (c.category === 'protection' || c.category === 'healing' ? 5 : 0),
  // v1.4.0: a spell-FOCUSED player, not a spell-ONLY bot — prefers damaging/area spells, still grafts a body when the pack has no useful spell.
  spells: (run, c) => c.kind === 'spell' ? ({ damage: 12, area: 12.5, weaken: 9, disable: 9, protection: 6, healing: 6, enhance: 5 }[c.category] ?? 4) + c.cost * 0.5 - (run.spellbook.some(e => e.id === c.id) ? 2 : 0) : (run.evo.absorbed.length < 3 ? 11 : 0) + graftRating(c, run.evo) * 0.5,
  // v1.6.0 summoning build: token-making grafts and summon spells first, then bodies.
  summoner: (run, c) => c.kind === 'creature' ? (SUMMON_TRAITS.has(c.trait) ? 30 : 0) + graftRating(c, run.evo) * 0.6 : c.category === 'summon' ? 14 : ({ damage: 5, area: 5 }[c.category] || 2),
  flyDeath: (run, c) => c.kind === 'creature' ? (c.keywords.flying ? 6 : 0) + (c.keywords.deathtouch ? 6 : 0) + c.power + c.toughness : 1,
};
export function simulateRun(seed, { policy = 'greedy', smarterSpells = false, onBattle = null, afterBattleReward = null, challenges = [], preferElites = false } = {}) {
  const run = newRun({ seed, tutorial: false, challenges });
  const score = POLICIES[policy]; let steps = 0; const log = { battles: 0, turns: 0, taken: 0, bossWins: 0 };
  while (run.phase !== 'won' && run.phase !== 'lost' && steps++ < 60) {
    if (run.phase === 'map') {
      const opts = availableNodes(run.map, run.current);
      enterNode(run, ((preferElites && opts.find(n => n.type === 'elite')) || opts.find(n => n.type === 'shrine') || opts.find(n => n.type === 'battle') || opts[0]).id);
    }
    if (run.phase === 'shrine') {
      const o = run.shrine.options;
      const pick = o.includes('restoration') && run.hp < runStats(run).maxHealth * 0.6 ? 'restoration' : o.find(x => ['spark', 'offering', 'arcane'].includes(x)) || o[0];
      shrineChoice(run, pick, pick === 'inscribe' ? run.spellbook.find(s => s.level < 3).id : pick === 'graftsmith' ? 0 : undefined);
    }
    if (run.phase === 'event') {   // v0.6: take the stated bargain when available (no-arg choices), else walk on
      const ch = eventChoices({ ...run, maxHp: runStats(run).maxHealth }, run.event.id).filter(c => c.available);
      const c = ch.find(x => x.id === 'sacrifice' && run.hp > runStats(run).maxHealth * 0.7) || ch.find(x => x.id === 'leave');
      eventChoice(run, c.id);
    }
    if (run.phase === 'battle') {
      const boss = run.battle.nodeType === 'boss';
      if (onBattle) onBattle(structuredClone(run.battle), { seed, policy, act: run.act, node: run.current });
      botPlay(run.battle, 60, { smarterSpells }); if (run.battle.phase === 'player') {log.timeouts=(log.timeouts||0)+1;run.battle.phase = 'lost';}
      (log.per ||= []).push({ act: run.act, type: run.battle.nodeType, name: run.battle.name, startHp: run.hp, won: run.battle.phase === 'won', enemyDamage: run.battle.stats.enemyHealthDamage || 0, maxHp: run.battle.units.find(u => u.hero)?.maxHp || 1, turns: run.battle.turn, threat: run.battle.worldThreat || 0, reinforced: run.battle.reinforced || 0 });
      log.battles++; log.turns += run.battle.turn; log.taken += run.battle.stats.damageTaken; if (boss && run.battle.phase === 'won') log.bossWins++;
      const rewardContext={seed:run.battle.rng.s^0x5eed,actualTier:run.battle.nodeType};
      concludeBattle(run);
      if(afterBattleReward&&run.phase==='reward')afterBattleReward(run,rewardContext);
    }
    if (run.phase === 'reward') {
      const ids = run.pending.cards; if (!ids.length) { run.phase = 'map'; run.pending = null; continue; }
      const pick = policy === 'random' ? ids[seed % ids.length] : ids.slice().sort((a, b) => score(run, resolveCard(b)) - score(run, resolveCard(a)))[0];
      const c = resolveCard(pick); let rel;
      if (c.kind === 'creature' && graftsFull(run)) rel = run.evo.absorbed.map((a, i) => [graftRating(resolveCard(a.cardId), { keywords: {} }), i]).sort((a, b) => a[0] - b[0])[0][1];
      (log.picks ||= []).push({ act: run.act, offered: ids.slice(), picked: pick });
      chooseReward(run, pick, rel);
    }
  }
  return { finalThreat: run.worldThreat?.level || 0, per: log.per || [], won: run.phase === 'won', act: run.act, depth: run.current != null ? run.map.nodes.find(n => n.id === run.current).depth : 0, power: run.evo.power, toughness: run.evo.toughness, kws: Object.keys(run.evo.keywords), maxHp: runStats(run).maxHealth, ...log };
}
export function winRate(n, opts) {
  const runs = []; for (let s = 1; s <= n; s++) runs.push(simulateRun(s * 7919, opts));
  const won = runs.filter(r => r.won).length;
  const actReached = [0, 1, 2].map(a => runs.filter(r => r.act >= a).length / n);
  return { rate: won / n, actReached, runs, avgTurns: runs.reduce((a, r) => a + r.turns, 0) / Math.max(1, runs.reduce((a, r) => a + r.battles, 0)), bossWins: runs.reduce((a, r) => a + r.bossWins, 0) };
}
