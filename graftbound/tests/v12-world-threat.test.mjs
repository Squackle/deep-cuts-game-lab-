import test from 'node:test';
import assert from 'node:assert/strict';
import { newWorldThreat, settleWorldThreat, threatModifiers, WORLD_THREAT_MAX, applyWorldThreat } from '../src/engine/world-threat.js';
test('two genuine enemy-damage-free wins raise capped world threat', () => {
 let t=newWorldThreat();for(let i=0;i<40;i++)t=settleWorldThreat(t,{victory:true,enemyDamage:0,maxHealth:20});
 assert.equal(t.level,WORLD_THREAT_MAX);assert.equal(t.flawlessStreak,0);
});
test('minor hits hold and substantial enemy damage reduces threat; hazards do not lower it',()=>{
 let t={level:7,flawlessStreak:1};
 assert.deepEqual(settleWorldThreat(t,{victory:true,enemyDamage:1,maxHealth:20}),{level:7,flawlessStreak:0});
 assert.equal(settleWorldThreat(t,{victory:true,enemyDamage:4,maxHealth:20}).level,6);
 assert.equal(settleWorldThreat(t,{victory:true,enemyDamage:0,maxHealth:20,tutorial:true}).level,7);
});
test('strict threat limits; printed toughness unchanged',()=>{
 const m=threatModifiers({level:200}); assert.equal(m.shieldRate,0.24);assert.equal(m.peakPower,1);
 assert.ok(threatModifiers({level:99},{boss:true}).shieldRate<=0.1);
 const s={nodeType:'battle',units:[{side:'enemy',uid:2,power:2,toughness:4,maxHp:4,statuses:{}}]};
 applyWorldThreat(s,{level:12});assert.equal(s.units[0].toughness,4);assert.equal(s.units[0].statuses.shield,1);
});
