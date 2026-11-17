import test from 'node:test';
import assert from 'node:assert/strict';
import {arena} from './helpers.mjs';
import {endTurn,player,enemies,BATTLE_VERSION} from '../src/engine/combat.js';
import {RULES_VERSION,RANKED_CHALLENGES,startRanked,replayRun} from '../src/engine/ranked.js';

function summonFriendly(s,{x,y,hp=20,power=2,toughness=20,move=2}){
  const unit={uid:s.nextUid++,side:'player',hero:false,defId:'sproutling',
    name:'Soldier',x,y,hp,maxHp:hp,power,toughness,move,keywords:{},statuses:{}};
  s.units.push(unit);return unit;
}
test('the foe phase takes enemy actions before all living allied summons',()=>{
  const s=arena(['g.....g','.......','.......','.......','...P...'],{g:'wolf'});
  player(s).hp=100;player(s).maxHp=100;player(s).toughness=100;
  const a=summonFriendly(s,{x:2,y:2,hp:50,toughness:50,power:0});
  const b=summonFriendly(s,{x:4,y:2,hp:50,toughness:50,power:0});
  const enemyIds=enemies(s).map(u=>u.uid);
  const ev=endTurn(s);
  const acting=ev.filter(e=>e.t==='enemyTurn').map(e=>e.uid);
  assert.deepEqual(acting,[...enemyIds,a.uid,b.uid],
    'foes take their turns first, then allied summons in stable UID order');
  assert.ok(ev.some(e=>e.t==='turn'&&e.phase==='enemy'));
  assert.ok(['player','won'].includes(s.phase),'enemy/ally phase resolves normally or ends on victory');
});
test('an allied summon cannot preemptively kill a foe before that foe acts',()=>{
  const s=arena(['.....','..g..','.....','..P..','.....'],{g:'alpha'});
  const foe=enemies(s)[0];
  player(s).hp=100;player(s).maxHp=100;player(s).toughness=100;
  const ally=summonFriendly(s,{x:2,y:2,hp:50,toughness:50,power:100});
  const ev=endTurn(s);
  const turns=ev.filter(e=>e.t==='enemyTurn').map(e=>e.uid);
  assert.deepEqual(turns,[foe.uid,ally.uid]);
  assert.ok(ev.some(e=>e.t==='attack'&&e.uid===foe.uid),
    'the enemy gets a combat action even if a strong ally finishes it afterward');
  assert.ok(ev.some(e=>e.t==='attack'&&e.uid===ally.uid),
    'a surviving ally still attacks after the foe');
});
test('an ally defeated by the enemy phase cannot move, attack or take a turn afterward',()=>{
  const s=arena(['.....','..g..','.....','..P..','.....'],{g:'wolf'});
  const foe=enemies(s)[0];
  player(s).hp=100;player(s).maxHp=100;player(s).toughness=100;
  const ally=summonFriendly(s,{x:2,y:2,hp:1,toughness:1,power:100});
  const ev=endTurn(s);
  assert.ok(ev.some(e=>e.t==='enemyTurn'&&e.uid===foe.uid));
  assert.equal(ally.hp<=0,true,'the enemy defeated the closest Soldier');
  assert.equal(ev.some(e=>e.t==='enemyTurn'&&e.uid===ally.uid),false);
  assert.equal(ev.some(e=>e.t==='move'&&e.uid===ally.uid),false);
  assert.equal(ev.some(e=>e.t==='attack'&&e.uid===ally.uid),false);
});
test('ally buffs expire after their own opportunity to act, never before the enemy turn',()=>{
  const s=arena(['.....','..g..','.....','..P..','.....'],{g:'alpha'});
  const foe=enemies(s)[0];
  player(s).hp=100;player(s).maxHp=100;player(s).toughness=100;
  const ally=summonFriendly(s,{x:2,y:2,hp:80,toughness:80,power:2});
  ally.statuses.empowered=4;
  const ev=endTurn(s);
  const foeTurn=ev.findIndex(e=>e.t==='enemyTurn'&&e.uid===foe.uid);
  const allyTurn=ev.findIndex(e=>e.t==='enemyTurn'&&e.uid===ally.uid);
  const expiration=ev.findIndex(e=>e.t==='status'&&e.uid===ally.uid&&e.status==='empowered'&&e.value===0);
  assert.ok(foeTurn>=0&&allyTurn>foeTurn);
  assert.ok(expiration>allyTurn,'friendly buff expires only after the ally action');
  assert.equal(ally.statuses.empowered,0);
});
test('this battle-rule change increments the replay fingerprint and retires the old challenge revision',()=>{
  assert.equal(BATTLE_VERSION,11);
  assert.equal(RULES_VERSION,'graftbound-rules-1.8.0-beta');
  assert.equal(RANKED_CHALLENGES['gb-expedition-01'].revision,27);
  assert.equal(startRanked().ranked.rulesVersion,RULES_VERSION);
  assert.throws(()=>replayRun('gb-expedition-01',[],{revision:18}),/Unknown or retired challenge/);
  assert.throws(()=>replayRun('gb-expedition-01',[],{rulesVersion:'graftbound-rules-1.3.5-beta'}),/Rules version mismatch/);
});
