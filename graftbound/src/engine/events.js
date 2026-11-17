// v0.6 special encounters: data-driven, deterministic, one-time, explicit costs. No randomness at resolution.
import { makeRng, int } from '../core/rng.js';
import { generatePack } from './rewards.js';
import { rebuild } from './evolution.js';
import { resolveCard } from '../cards/catalog.js';
import { journalNote } from './journal.js';
import { grantHandSlot, handCapacity, MAX_HAND_CAPACITY } from './loadout.js';

export const EVENT_COST = { archivistHp: 0.25, trialHp: 0.3, wellSpark: 3 };
const pct = (run, f) => Math.max(2, Math.ceil(run.maxHp * f));
export const EVENTS = {
  mnemonicShrine: { name: 'The Mnemonic Shrine', glyph: '✧',
    text: 'Seven inscriptions circle a stone heart. A vacant eighth rune glimmers just beyond their reach.', when: run => handCapacity(run) < MAX_HAND_CAPACITY,
    choices: [
      { id: 'expand', label: 'Inscribe another memory', text: run => `Gain +1 active spell slot permanently for this adventure (${handCapacity(run)} → ${handCapacity(run) + 1}; maximum ${MAX_HAND_CAPACITY}). No spells are discarded.`, when: run => handCapacity(run) < MAX_HAND_CAPACITY },
      { id: 'spark', label: 'Harvest the rune', text: () => 'Gain +2 Maximum Health and heal 2 health instead of increasing capacity.', when: () => true },
      { id: 'leave', label: 'Leave untouched', text: () => 'Nothing changes.', when: () => true },
    ] },
  echoingCauldron: { name: 'The Echoing Cauldron', glyph: '❂',
    text: 'A brass vessel remembers every flame lit inside it. The embers ask for a permanent price.', when: () => true,
    choices: [
      { id: 'offer', label: 'Offer a wound', text: run => `Lose ${pct(run, 0.2)} health (cannot reduce you below 1) and gain +2 maximum mana for the adventure.`, when: run => run.hp > pct(run, 0.2) },
      { id: 'shield', label: 'Take the cooled ash', text: () => 'Gain a 4-point ward for your next battle.', when: () => true },
      { id: 'leave', label: 'Let it fade', text: () => 'Nothing changes.', when: () => true },
    ] },
  archivist: { name: 'The Wandering Archivist', glyph: '✒',
    text: 'A hooded scribe with an inkstained ledger. "Every spell is a page. I trade pages."', when: () => true,
    choices: [
      { id: 'trade', label: 'Trade a page', text: () => 'Give the Archivist one spell from your spellbook (it is removed). Then choose one of three spells from a stronger, spells-only pack.', when: run => run.spellbook.length >= 1, arg: 'spell' },
      { id: 'buy', label: 'Buy a sealed folio', text: run => `Pay ${pct(run, EVENT_COST.archivistHp)} health (a wound) for a reward pack.`, when: run => run.hp > pct(run, EVENT_COST.archivistHp) },
      { id: 'leave', label: 'Walk on', text: () => 'Nothing changes.', when: () => true },
    ] },
  graftExchange: { name: 'The Graft Exchange', glyph: '⇄',
    text: 'A circle of rusted surgeon\u2019s hooks. Something old can be cut away so something new can grow.', when: run => run.evo.absorbed.length >= 1,
    choices: [
      { id: 'exchange', label: 'Exchange a graft', text: () => 'Release one graft (its power, toughness and abilities are removed — shown before you confirm), then choose a replacement from a creature-only pack.', when: run => run.evo.absorbed.length >= 1, arg: 'graft' },
      { id: 'leave', label: 'Leave the hooks', text: () => 'Nothing changes.', when: () => true },
    ] },
  cursedWell: { name: 'The Cursed Well', glyph: '◒',
    text: 'Black water that hums with stolen mana. It always takes its price first.', when: run => (run.wellDrunk || 0) < 1,
    choices: [
      { id: 'drink', label: 'Drink deeply', text: () => `Permanently lose ${EVENT_COST.wellSpark} Maximum Health (maximum health) and gain +1 maximum mana and +1 starting mana for the rest of the adventure.`, when: run => run.maxHp > EVENT_COST.wellSpark + 2 },
      { id: 'leave', label: 'Do not drink', text: () => 'Nothing changes.', when: () => true },
    ] },
  // v1.7.0 rare Mystery: an ambush that skips ONLY the hero's battle-entry setup in the next ordinary battle.
  stalkersThicket: { name: 'The Stalkers\u2019 Thicket', glyph: '⚠', rare: true,
    text: 'Something has been pacing you through the undergrowth. If you press on, it strikes before your grafts can wake.',
    when: run => (run.act || 0) >= 1 && !run.ambushNext,
    choices: [
      { id: 'pressOn', label: 'Press on into the ambush', text: () => 'Your NEXT ordinary battle or elite (never a boss) is an ambush: your grafts\u2019 battle-start setup does not fire at deployment — no starting tokens, opening draws, opening shields, starting Treasure or counters. Everything triggers normally after that. Surviving it upgrades that reward pack to elite tier.', when: () => true },
      { id: 'detour', label: 'Take the long way round', text: run => `Lose ${pct(run, 0.1)} health (a wound; cannot drop you below 1). No ambush.`, when: run => run.hp > pct(run, 0.1) },
    ] },
  forgottenTrial: { name: 'The Forgotten Trial', glyph: '⚖',
    text: 'An altar asks for blood before it opens its reliquary.', when: () => true,
    choices: [
      { id: 'sacrifice', label: 'Bleed on the altar', text: run => `Take a ${pct(run, EVENT_COST.trialHp)}-health wound (cannot drop you below 1), then open an elite-tier reward pack.`, when: run => run.hp > pct(run, EVENT_COST.trialHp) },
      { id: 'leave', label: 'Refuse the trial', text: () => 'Nothing changes.', when: () => true },
    ] },
};
export const EVENT_IDS = Object.keys(EVENTS);

export function rollEvent(run, seed) {
  const seen = new Set(run.eventsSeen || []);
  // v1.7.0: rare events are offered only on a 1-in-4 deterministic roll from the node seed.
  const rareOk = int(makeRng((seed ^ 0xa3b5) >>> 0), 4) === 0;
  const ok = EVENT_IDS.filter(id => !seen.has(id) && EVENTS[id].when(run) && (!EVENTS[id].rare || rareOk));
  const list = ok.length ? ok : EVENT_IDS.filter(id => EVENTS[id].when(run) && !EVENTS[id].rare);
  return list[int(makeRng((seed ^ 0xe7e7) >>> 0), list.length)] || 'forgottenTrial';
}
export function eventChoices(run, id) { return EVENTS[id].choices.map(c => ({ ...c, text: c.text(run), available: !!c.when(run) })); }

export function resolveEvent(run, id, choice, arg, { seed, packOpts, setHp, maxHp }) {
  const ev = EVENTS[id]; if (!ev) throw new Error('Unknown event');
  const view = { ...run, maxHp: maxHp() };
  const c = ev.choices.find(x => x.id === choice); if (!c) throw new Error('Not a choice here');
  if (!c.when(view)) throw new Error('That choice is not available right now');
  switch (id + ':' + choice) {
    case 'mnemonicShrine:expand': return { kind: 'handCapacity', capacity: grantHandSlot(run) };
    case 'mnemonicShrine:spark': run.sparkBonus += 2; setHp(run.hp + 2); return { kind: 'spark', amount: 2 };
    case 'echoingCauldron:offer': setHp(run.hp - pct(view, 0.2)); run.manaBonus = (run.manaBonus || 0) + 2; return { kind: 'arcaneMana', amount: 2 };
    case 'echoingCauldron:shield': run.wardNext = (run.wardNext || 0) + 4; return { kind: 'ward', amount: 4 };
    case 'archivist:trade': {
      const i = run.spellbook.findIndex(s => s.id === arg); if (i < 0) throw new Error('Choose one of your spells');
      const [gone] = run.spellbook.splice(i, 1); run.equippedSpellIds = (run.equippedSpellIds || []).filter(id => id !== gone.id); setHp(run.hp);
      const cards = generatePack(seed ^ 0xa4c1, { tier: 'elite', ...packOpts, spellbook: run.spellbook, only: 'spell' }).filter(x => x !== gone.id);
      run.pending = { cards, tier: 'archivist', traded: resolveCard(gone.id).name }; return { kind: 'trade', gave: gone.id };
    }
    case 'archivist:buy': setHp(run.hp - pct(view, EVENT_COST.archivistHp)); run.pending = { cards: generatePack(seed ^ 0xb0c5, { tier: 'battle', ...packOpts }), tier: 'shrine' }; return { kind: 'pack' };
    case 'graftExchange:exchange': {
      const idx = Number(arg); const list = run.evo.absorbed;
      if (!Number.isInteger(idx) || idx < 0 || idx >= list.length) throw new Error('Choose a graft to release');
      const before = maxHp(); const released = list[idx];
      run.evo = rebuild(list.filter((_, k) => k !== idx).map(a => resolveCard(a.cardId)));
      setHp(run.hp - (before - maxHp()));
      journalNote(run, 'release', { cardId: released.cardId, name: released.name, by: 'exchange' });
      run.pending = { cards: generatePack(seed ^ 0x6e7c, { tier: 'battle', ...packOpts, evo: run.evo, only: 'creature' }), tier: 'graftsmith', severed: released.name };
      return { kind: 'exchange', released: released.name };
    }
    case 'cursedWell:drink': run.sparkBonus -= EVENT_COST.wellSpark; run.wellDrunk = (run.wellDrunk || 0) + 1; run.manaBonus = (run.manaBonus || 0) + 1; setHp(Math.min(run.hp, maxHp())); return { kind: 'well' };
    case 'forgottenTrial:sacrifice': setHp(run.hp - pct(view, EVENT_COST.trialHp)); run.pending = { cards: generatePack(seed ^ 0x71a1, { tier: 'elite', ...packOpts }), tier: 'elite' }; return { kind: 'trial' };
    case 'stalkersThicket:pressOn': run.ambushNext = true; return { kind: 'ambush' };
    case 'stalkersThicket:detour': setHp(run.hp - pct(view, 0.1)); return { kind: 'detour' };
    default: return { kind: 'leave' };
  }
}
