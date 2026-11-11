// Run lifecycle (v0.5): three acts, persistent wounds between battles, Wayshrine offerings, real-card rewards.
import { newEvolution, absorb, deriveStats, rebuild, STARTING_NAME } from './evolution.js';
import { generateMap, nodeById, availableNodes, ACT_COUNT } from './campaign.js';
import { buildEncounter, templateFor, reinforcements } from './encounters.js';
import { createBattle } from './combat.js';
import { generatePack, MAX_SPELL_LEVEL } from './rewards.js';
import { resolveCard } from '../cards/catalog.js';
import { stepOf } from './power.js';
import { SHRINES, rollShrine, offeringCost, MAX_SPARK_FONTS, MAX_MANA_FONTS } from './shrines.js';
import { encounterBenchmarks, recordEncounter, newScoring } from './scoring.js';
import { journalNote, newJournal } from './journal.js';
import { rollEvent, EVENTS, resolveEvent } from './events.js';

export const RUN_VERSION = 4;
export const TUTORIAL_CARD = 'mtg:typhoid-rats';  // real 1/1 Deathtouch: Blank 1/1 -> 2/2 Deathtouch
export const CHALLENGES = {
  paperThin: { name: 'Paper Thin', text: 'Your Spark is 2 instead of 6.' },
  pauper:    { name: 'Pauper\u2019s Pack', text: 'Boosters never contain Rare or Mythic cards.' },
  feral:     { name: 'Feral Wilds', text: 'Every foe has +1 power.' },
};
/** Fraction of missing health recovered after a victory. The rest stays as Wounds until a Restoration or act end. */
export const RECOVERY = 0.5;
/** Graft capacity per act (explicit v0.5 rule). When full, grafting a new creature requires releasing one. */
export const GRAFT_CAPACITY = [4, 6, 8];
export const graftCapacity = run => GRAFT_CAPACITY[Math.min(run.act || 0, GRAFT_CAPACITY.length - 1)];
export const graftsFull = run => run.evo.absorbed.length >= graftCapacity(run);

export function newRun({ seed, unlocks = {}, challenges = [], tutorial = false }) {
  const run = {
    v: RUN_VERSION, seed: seed >>> 0, name: STARTING_NAME, evo: newEvolution(), spellbook: [], sparkBonus: 0, manaBonus: 0, sparkFonts: 0,
    act: 0, map: generateMap(seed, { act: 0, tutorial }), current: null, visited: [], phase: 'map', battle: null, pending: null, shrine: null,
    unlocks: { ...unlocks }, challenges: challenges.slice(), tutorial, hp: null, wardNext: 0, actHistory: [], event: null, eventsSeen: [],
    scoring: newScoring(), journal: newJournal(),
    stats: { battlesWon: 0, kills: 0, damageDealt: 0, damageTaken: 0, spellsCast: 0, turns: 0, cardsAbsorbed: 0, spellsLearned: 0, elitesDefeated: 0, bossesDefeated: 0, flawless: 0 },
    startedAt: Date.now(),
  };
  run.hp = runStats(run).maxHealth;
  return run;
}
export const runStats = run => deriveStats(run.evo, { sparkBonus: run.sparkBonus, baseSpark: run.challenges.includes('paperThin') ? 2 : 6, manaBonus: run.manaBonus || 0, spellCount: run.spellbook.length });
export const maxHpOf = run => runStats(run).maxHealth;
export const woundsOf = run => Math.max(0, maxHpOf(run) - (run.hp == null ? maxHpOf(run) : run.hp));
export const stepOfRun = run => stepOf(run.act, run.current != null ? nodeById(run.map, run.current).depth : 0);
const packOpts = run => ({ spellbook: run.spellbook, noRares: run.challenges.includes('pauper'), evo: run.evo, step: stepOfRun(run) });
function setHp(run, hp) { run.hp = Math.max(1, Math.min(maxHpOf(run), hp)); }

export function enterNode(run, nodeId) {
  if (run.phase !== 'map') throw new Error('Not on map');
  if (!availableNodes(run.map, run.current).some(n => n.id === nodeId)) throw new Error('Node not reachable');
  const node = nodeById(run.map, nodeId);
  run.current = nodeId; run.visited.push(nodeId);
  if (node.type === 'shrine') { run.phase = 'shrine'; run.shrine = { options: rollShrine(shrineView(run), node.seed), node: nodeId }; return run; }
  if (node.type === 'event') { run.phase = 'event'; run.event = { id: rollEvent(eventView(run), node.seed), node: nodeId }; return run; }
  const base = templateFor(run.act, node.type, node.depth, node.seed);
  const extra = reinforcements(run.act, node.type, node.depth, run.evo, node.seed);
  const tpl = extra.length ? { ...base, enemies: [...base.enemies, ...extra] } : base;
  const enc = buildEncounter(tpl, node.seed, node.type);
  const battle = createBattle({ evo: run.evo, stats: runStats(run), spellbook: run.spellbook, encounter: enc, seed: node.seed, heroName: run.name, startHp: run.hp, act: run.act });
  if (run.wardNext) { const h = battle.units.find(u => u.hero); h.statuses.shield = (h.statuses.shield || 0) + run.wardNext; run.wardNext = 0; }
  if (run.challenges.includes('feral')) for (const u of battle.units) if (u.side === 'enemy') u.power += 1;
  battle.nodeType = node.type; battle.reinforced = extra.length; battle.nodeId = nodeId;
  battle.bench = encounterBenchmarks(node.type, run.act, enc.enemies.length);
  run.battle = battle; run.phase = 'battle';
  return run;
}
const shrineView = run => ({ ...run, wounds: woundsOf(run), maxHp: maxHpOf(run) });

export function concludeBattle(run) {
  const b = run.battle; if (!b) throw new Error('No battle');
  for (const k of ['kills', 'damageDealt', 'damageTaken', 'spellsCast', 'turns']) run.stats[k] += b.stats[k];
  recordEncounter(run, b, run.act + ':' + run.current);
  if (b.phase === 'lost') { run.phase = 'lost'; run.hp = 0; run.lastBattle = summarize(b); run.battle = null; return { outcome: 'lost' }; }
  if (b.phase !== 'won') throw new Error('Battle not finished');
  const hero = b.units.find(u => u.hero); const max = maxHpOf(run);
  run.stats.battlesWon++;
  if (b.stats.damageTaken === 0) run.stats.flawless++;
  if (b.nodeType === 'elite') run.stats.elitesDefeated++;
  const isBoss = b.nodeType === 'boss';
  if (isBoss) { run.stats.bossesDefeated++; setHp(run, max); journalNote(run, 'boss', { name: b.name }); }                 // act boss: full recovery
  else setHp(run, hero.hp + Math.ceil((max - hero.hp) * RECOVERY));          // otherwise: half the missing health returns
  const tier = isBoss ? 'boss' : b.nodeType === 'elite' ? 'elite' : 'battle';
  const forced = b.nodeType === 'tutorial' ? [TUTORIAL_CARD] : [];
  run.pending = { cards: generatePack(b.rng.s ^ 0x5eed, { tier, forced, ...packOpts(run) }), tier, boss: isBoss };
  run.lastBattle = summarize(b);
  run.battle = null; run.phase = 'reward';
  return { outcome: 'won', boss: isBoss, elite: b.nodeType === 'elite', battleStats: b.stats };
}
const summarize = b => ({ name: b.name, nodeType: b.nodeType, stats: { ...b.stats } });

/** Choose a reward. For a creature while grafts are full, `releaseIndex` names the graft to release first. */
export function chooseReward(run, cardId, releaseIndex) {
  if (run.phase !== 'reward' || !run.pending || !run.pending.cards.includes(cardId)) throw new Error('Invalid reward choice');
  const card = resolveCard(cardId); if (!card || !card.reference) throw new Error('Unknown card ' + cardId);
  let change;
  const maxBefore = maxHpOf(run);
  if (card.kind === 'creature') {
    if (run.pending.tier === 'archivist') throw new Error('The Archivist trades spells only');
    let released = null;
    if (graftsFull(run)) {
      const idx = Number(releaseIndex);
      if (!Number.isInteger(idx) || idx < 0 || idx >= run.evo.absorbed.length) throw new Error('Your grafts are full — choose one to release');
      released = run.evo.absorbed[idx].name;
      const keep = run.evo.absorbed.filter((_, i) => i !== idx).map(a => resolveCard(a.cardId));
      run.evo = rebuild(keep);
    }
    const res = absorb(run.evo, card); const stageBefore = run.evo.absorbed.length;
    run.evo = res.evo; change = { kind: 'absorb', ...res.change, released };
    journalNote(run, 'graft', { cardId: card.id, name: card.name, power: card.power, toughness: card.toughness, gained: res.change.gained, released, firstGraft: stageBefore === 0 && !released });
    run.stats.cardsAbsorbed++;
    setHp(run, run.hp + (maxHpOf(run) - maxBefore));   // new toughness/Spark arrives as fresh health
  } else {
    if (run.pending.tier === 'graftsmith') throw new Error('The Graftsmith offers creatures only');
    const e = run.spellbook.find(s => s.id === cardId);
    if (e) { e.level = Math.min(MAX_SPELL_LEVEL, e.level + 1); change = { kind: 'empower', cardId, level: e.level }; }
    else { run.spellbook.push({ id: cardId, level: 1 }); change = { kind: 'learn', cardId, level: 1 }; }
    journalNote(run, 'spell', { cardId, name: card.name, level: change.level });
    run.stats.spellsLearned++;
  }
  finishReward(run);
  return change;
}
export function skipReward(run) {
  if (run.phase !== 'reward') throw new Error('No reward pending');
  run.sparkBonus += 1; setHp(run, run.hp + 1); finishReward(run);
  return { kind: 'spark', amount: 1 };
}
function finishReward(run) {
  const boss = run.pending && run.pending.boss; run.pending = null;
  if (!boss) { run.phase = 'map'; return; }
  run.actHistory.push({ act: run.act, visited: run.visited.slice() });
  if (run.act + 1 >= ACT_COUNT) { run.phase = 'won'; return; }
  run.act++; run.map = generateMap(run.seed, { act: run.act }); run.current = null; run.visited = []; run.phase = 'map'; run.actIntro = run.act;
  journalNote(run, 'act', { act: run.act });
}

/** Wayshrine choice. `arg`: for 'inscribe' the spell id; for 'graftsmith' the absorbed index to sever. */
export function shrineChoice(run, choice, arg) {
  if (run.phase !== 'shrine' || !run.shrine) throw new Error('Not at a shrine');
  if (!run.shrine.options.includes(choice)) throw new Error('That offering is not available here');
  if (!SHRINES[choice].when(shrineView(run))) throw new Error('That offering cannot be used right now');
  const node = nodeById(run.map, run.current);
  const done = res => { run.shrine = null; return res; };
  switch (choice) {
    case 'restoration': setHp(run, maxHpOf(run)); run.wardNext = 3; run.phase = 'map'; return done({ kind: 'restoration' });
    case 'spark': run.sparkBonus += 3; run.sparkFonts = (run.sparkFonts || 0) + 1; setHp(run, run.hp + 3); run.phase = 'map'; return done({ kind: 'spark', amount: 3 });
    case 'arcane': run.manaBonus = Math.min(MAX_MANA_FONTS, (run.manaBonus || 0) + 1); run.phase = 'map'; return done({ kind: 'arcane' });
    case 'inscribe': {
      const e = run.spellbook.find(s => s.id === arg && s.level < MAX_SPELL_LEVEL); if (!e) throw new Error('Choose a spell that can be empowered');
      e.level++; run.phase = 'map'; return done({ kind: 'inscribe', cardId: e.id, level: e.level });
    }
    case 'offering': {
      setHp(run, run.hp - offeringCost(shrineView(run)));
      run.pending = { cards: generatePack(node.seed ^ 0xa11ce, { tier: 'shrine', ...packOpts(run) }), tier: 'shrine' };
      run.phase = 'reward'; return done({ kind: 'pack' });
    }
    case 'graftsmith': {
      const idx = Number(arg); const list = run.evo.absorbed;
      if (!Number.isInteger(idx) || idx < 0 || idx >= list.length) throw new Error('Choose a graft to sever');
      const keep = list.filter((_, i) => i !== idx).map(a => resolveCard(a.cardId));
      if (keep.some(c => !c)) throw new Error('A graft could not be resolved');
      const severed = list[idx]; journalNote(run, 'release', { cardId: severed.cardId, name: severed.name, by: 'graftsmith' });
      const maxBefore = maxHpOf(run);
      const rebuilt = rebuild(keep); run.evo = { ...rebuilt, colors: rebuilt.colors };
      setHp(run, run.hp - (maxBefore - maxHpOf(run)));
      run.pending = { cards: generatePack(node.seed ^ 0x6a5f, { tier: 'elite', ...packOpts(run), creaturesOnly: true }), tier: 'graftsmith', severed: severed.name };
      run.pending.cards = run.pending.cards.length ? run.pending.cards : [];
      run.phase = 'reward'; return done({ kind: 'graftsmith', severed: severed.name });
    }
  }
  throw new Error('Unknown shrine choice');
}
const eventView = run => ({ ...run, wounds: woundsOf(run), maxHp: maxHpOf(run) });

/** v0.6 special encounter choice. Deterministic, explicit costs, one-time. */
export function eventChoice(run, choice, arg) {
  if (run.phase !== 'event' || !run.event) throw new Error('No event here');
  const node = nodeById(run.map, run.current);
  const res = resolveEvent(run, run.event.id, choice, arg, { seed: node.seed, packOpts: packOpts(run), setHp: hp => setHp(run, hp), maxHp: () => maxHpOf(run) });
  run.eventsSeen.push(run.event.id); journalNote(run, 'event', { id: run.event.id, choice });
  run.event = null;
  if (!run.pending) run.phase = 'map'; else run.phase = 'reward';
  return res;
}

export { availableNodes, MAX_SPARK_FONTS, EVENTS };
