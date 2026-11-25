import {poolRecord} from '../src/cards/real-pool.js';
import {registerReferenceCards, resolveCard} from '../src/cards/catalog.js';
import {toGameCard} from '../src/cards/compatibility.js';
import {installReferenceSet} from '../src/cards/reference-set.js';
import {T} from '../src/core/grid.js';
import {createBattle} from '../src/engine/combat.js';
import {absorb, deriveStats, newEvolution} from '../src/engine/evolution.js';
import {cardPool} from '../src/engine/rewards.js';
import {creatureBudget, graftRating, powerRating} from '../src/engine/power.js';

export const DRAFT_VERSION = 'r34-graft-draft-preview1';

const printing = (name, set, number, mana_cost, cmc, type_line, power, toughness, color_identity, rarity, keywords) =>
  ({name, set, number, mana_cost, cmc, type_line, power, toughness, color_identity, rarity, keywords});

export const PRINTINGS = [
  printing('Battlefield Raptor', 'khm', '3', '{W}', 1, 'Creature — Bird', '1', '2', ['W'], 'common', ['Flying', 'First strike']),
  printing('Banehound', 'war', '77', '{B}', 1, 'Creature — Nightmare Dog', '1', '1', ['B'], 'common', ['Lifelink', 'Haste']),
  printing('Vampire of the Dire Moon', 'm20', '120', '{B}', 1, 'Creature — Vampire', '1', '1', ['B'], 'uncommon', ['Lifelink', 'Deathtouch']),
  printing('Aerial Responder', 'kld', '2', '{1}{W}{W}', 3, 'Creature — Dwarf Soldier', '2', '3', ['W'], 'uncommon', ['Flying', 'Lifelink', 'Vigilance']),
  printing('Skyhunter Skirmisher', '5dn', '16', '{1}{W}{W}', 3, 'Creature — Cat Knight', '1', '1', ['W'], 'uncommon', ['Flying', 'Double strike']),
  printing('Swiftblade Vindicator', 'grn', '203', '{R}{W}', 2, 'Creature — Human Soldier', '1', '1', ['R', 'W'], 'rare', ['Vigilance', 'Trample', 'Double strike']),
  printing('Colossapede', 'akh', '161', '{4}{G}', 5, 'Creature — Insect', '5', '5', ['G'], 'common', []),
  printing('Pheres-Band Centaurs', 'ths', '171', '{4}{G}', 5, 'Creature — Centaur Warrior', '3', '7', ['G'], 'common', []),
];

function adaptPrinting(entry) {
  const adapted = toGameCard({...poolRecord(entry), set: entry.set,
    scryfallUri: `https://scryfall.com/card/${entry.set}/${entry.number}`});
  if (!adapted.ok) throw Error(entry.name + ': ' + adapted.reasons.join(', '));
  return {...adapted.card, rating: powerRating(adapted.card)};
}

export const ADDITIONS = PRINTINGS.map(adaptPrinting);

export const DRAFTS = [
  {
    name: 'First commitment', step: 6, tier: 'battle',
    keeps: [], choices: [0, 1, 2],
    enemies: [['hound', 4, 1], ['archer', 5, 0], ['grub', 4, 3]],
  },
  {
    name: 'Power looking for a home', step: 15, tier: 'battle',
    keeps: ['mtg:alpine-grizzly'], choices: [3, 4, 5],
    enemies: [['ashbrute', 3, 2], ['harpooner', 4, 0], ['emberseer', 5, 3]],
  },
  {
    name: 'The glass or the bulwark', step: 19, tier: 'elite',
    keeps: ['mtg:fencing-ace', 'mtg:grizzly-bears'], choices: [3, 6, 7],
    enemies: [['ashbrute', 4, 1], ['nullwarden', 5, 3], ['shardling', 5, 0]],
  },
];

export function createDraft(index) {
  const profile = DRAFTS[index];
  if (!profile) throw Error('Unknown draft');
  installReferenceSet();
  registerReferenceCards(ADDITIONS);
  const evo = profile.keeps.reduce((current, id) => absorb(current, resolveCard(id)).evo, newEvolution());
  const legal = new Set(cardPool({step: profile.step, tier: profile.tier, evo}).map(card => card.id));
  const choices = profile.choices.map(i => ADDITIONS[i]);
  if (choices.some(card => !legal.has(card.id))) throw Error('Draft card outside the encounter budget');
  return {profile, evo, choices, budget: creatureBudget(profile.step, profile.tier), rating: card => graftRating(card, evo)};
}

export function testGraft(draft, cardId) {
  const card = draft.choices.find(option => option.id === cardId);
  if (!card) throw Error('Choose a card from this pack');
  const {evo} = absorb(draft.evo, card);
  const w = 6, h = 5, terrain = Array(w * h).fill(T.FLOOR);
  terrain[1 * w + 2] = T.ROCK;
  terrain[2 * w + 2] = T.BRAMBLE;
  terrain[3 * w + 2] = T.ROCK;
  const encounter = {
    name: draft.profile.name, w, h, terrain, playerStart: {x: 0, y: 2},
    enemies: draft.profile.enemies.map(([defId, x, y]) => ({defId, x, y})),
  };
  const battle = createBattle({evo, stats: deriveStats(evo), spellbook: [], encounter,
    seed: 0xb17, act: Math.floor(draft.profile.step / 8)});
  return {battle, evo};
}
