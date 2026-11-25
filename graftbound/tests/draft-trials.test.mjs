import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ADDITIONS, createDraft, DRAFTS, PRINTINGS, testGraft} from '../dev/draft-trials.mjs';
import {deriveAppearance} from '../src/engine/appearance.js';
import {graftRating} from '../src/engine/power.js';
import {rewardCards} from '../src/cards/catalog.js';
import {botPlay} from './helpers.mjs';

test('eight distinct, unranked-only graft records fit their authored draft budgets', () => {
  assert.equal(rewardCards().length, 151);
  assert.equal(new Set(ADDITIONS.map(card => card.id)).size, 8);
  const choiceIds = new Set();
  for (const index of DRAFTS.keys()) {
    const draft = createDraft(index);
    assert.equal(draft.choices.length, 3);
    for (const card of draft.choices) {
      choiceIds.add(card.id);
      assert.ok(card.sourceInfo.set);
      assert.ok(card.sourceInfo.scryfallUri);
      assert.equal(Object.keys(card.keywords).length, PRINTINGS.find(p => p.name === card.name).keywords.length);
      assert.ok(draft.rating(card) <= draft.budget);
      const {battle, evo} = testGraft(draft, card.id);
      assert.ok(!battle.ranked);
      assert.equal(battle.units[0].keywords.flying, evo.keywords.flying);
      assert.equal(evo.absorbed.at(-1).cardId, card.id);
      const appearance = deriveAppearance(evo);
      assert.ok(Object.keys(appearance.slots).length || appearance.effects.length || evo.parts.bulk);
    }
  }
  assert.equal(choiceIds.size, 8);
  assert.equal(rewardCards().length, 159);
});

test('each costly tradeoff is playable with unchanged enemy simulation', () => {
  const early = createDraft(0);
  const later = createDraft(1);
  const late = createDraft(2);
  const [raptor, hound] = early.choices;
  assert.ok(early.rating(raptor) > early.rating(hound));
  assert.ok(later.rating(later.choices[1]) > graftRating(later.choices[1], early.evo), 'existing power raises Double Strike commitment');
  const sample = (draft, card) => {
    const {battle} = testGraft(draft, card.id);
    assert.equal(botPlay(battle, 20), 'won', card.name);
    assert.equal(battle.stats.kills, 3);
    return {damage: battle.stats.damageTaken, health: battle.units[0].hp, turns: battle.turn};
  };
  assert.ok(sample(early, hound).damage > sample(early, raptor).damage);
  assert.deepEqual(sample(later, later.choices[2]), sample(later, later.choices[2]));
  const [responder, thickPower, thickHealth] = late.choices;
  const damageBody = testGraft(late, thickPower.id).battle.units[0];
  const healthBody = testGraft(late, thickHealth.id).battle.units[0];
  assert.equal(damageBody.power - healthBody.power, 2);
  assert.equal(healthBody.maxHp - damageBody.maxHp, 2);
  for (const choice of [responder, thickPower, thickHealth]) assert.ok(sample(late, choice).damage >= 6);
});
