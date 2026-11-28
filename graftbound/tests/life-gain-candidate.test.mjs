import test from 'node:test';
import assert from 'node:assert/strict';
import { arena, evoWith } from './helpers.mjs';
import { cast, player } from '../src/engine/combat.js';
import { resolveComboEvents } from '../src/engine/combo-triggers.js';

// Regression evidence for revision 30, not an endorsement of this behavior.
// The experiment does not register any new card or modify active rules.
test('revision 30 ordinary healing fails to reach the Pridemate life-gain trigger; isolated candidate proves the missing event',()=>{
 const s=arena(['P..','..g'],{g:'grub'},{evo:evoWith('mtg:ajani-s-pridemate'),spellbook:[{id:'mtg:healing-salve',level:1}]});
 const hero=player(s);assert.ok(s.traits.includes('pridemate'));
 hero.hp=hero.maxHp-1;s.p.mana=10;
 const power=hero.power;
 const events=cast(s,'mtg:healing-salve',hero.x,hero.y,1,'heal');
 const gain=events.find(e=>e.t==='heal'&&e.uid===hero.uid);
 assert.ok(gain&&gain.amount>0);
 assert.equal(hero.power,power,'document current ranked behavior, do not change revision 30');
 assert.ok(!events.some(e=>e.t==='comboLifeGain'&&e.uid===hero.uid));
 // Candidate life-gain-v2: explicit positive ordinary gain event, consumed once.
 const next=structuredClone(s),candidate=[{t:'comboLifeGain',uid:hero.uid,amount:gain.amount,kind:gain.kind}];
 resolveComboEvents(next,candidate);
 assert.equal(player(next).power,power+1);
 resolveComboEvents(next,candidate);
 assert.equal(player(next).power,power+1,'same event must not double-trigger');
 assert.equal(hero.power,power,'candidate never mutates the active revision');
 console.log('Life gain gap: confirmed ordinary Healing Salve restores HP but does not trigger Pridemate under revision 30');
});
