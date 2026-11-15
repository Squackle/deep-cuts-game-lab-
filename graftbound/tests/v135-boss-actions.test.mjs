import test from 'node:test';
import assert from 'node:assert/strict';
import {arena} from './helpers.mjs';
import {endTurn,player,enemies,intents} from '../src/engine/combat.js';
import {planEnemy,bossPhaseOf} from '../src/engine/ai.js';
import {BOSS_BY_ID} from '../src/data/legendary.js';
import {manhattan} from '../src/core/grid.js';

const BOSSES=Object.keys(BOSS_BY_ID);
const mk=id=>{
 const s=arena(['.........','.........','....B....','.........','....P....','.........'],{B:id});
 const h=player(s);h.toughness=30;h.hp=h.maxHp=100;
 return s;
};
const boss=(s,id)=>enemies(s).find(u=>u.defId===id);
test('all six legendary bosses advance toward the player rather than standing still',()=>{
 for(const id of BOSSES){
  const s=mk(id),b=boss(s,id),before=manhattan(b,player(s));
  const plan=planEnemy(s,b);
  assert.ok(plan.to,id+' chooses a destination');
  assert.ok(manhattan(plan.to,player(s))<before,id+' closes the gap');
  const ev=endTurn(s);
  assert.ok(ev.some(x=>x.t==='move'&&x.uid===b.uid),id+' actually moves in combat');
  assert.deepEqual([b.x,b.y],[plan.to.x,plan.to.y],id+' move matches preview');
 }
});
test('all six legendary bosses have reachable melee attacks and deal real combat damage',()=>{
 for(const id of BOSSES){
  const s=mk(id),b=boss(s,id);
  if(id==='krenko')b.cycle=1; // untapped combat turn, not its {T} summon turn
  const plan=planEnemy(s,b);
  const atk=plan.actions.find(a=>a.type==='attack');
  assert.ok(atk,id+' has an attack action after moving adjacent');
  assert.equal(atk.target,player(s).uid,id+' attacks the player when it is the nearest threat');
  const before=player(s).hp;
  const ev=endTurn(s);
  assert.ok(ev.some(x=>x.t==='attack'&&x.uid===b.uid),id+' emits an actual attack event');
  assert.ok(player(s).hp<before,id+' attack changes HP');
 }
});
test('Nemata can summon a Saproling and make a normal melee attack in one turn',()=>{
 const s=mk('nemata'),b=boss(s,'nemata');
 const ev=endTurn(s);
 assert.ok(ev.some(x=>x.t==='summon'&&x.defId==='saproling'&&x.by===b.uid));
 assert.ok(ev.some(x=>x.t==='attack'&&x.uid===b.uid));
 assert.ok(ev.some(x=>x.t==='move'&&x.uid===b.uid));
});
test('Krenko alternates printed tapped token activation with untapped movement and attacks',()=>{
 const s=mk('krenko'),b=boss(s,'krenko');
 const first=endTurn(s);
 assert.ok(first.some(x=>x.t==='summon'&&x.defId==='goblin'));
 assert.equal(first.some(x=>x.t==='attack'&&x.uid===b.uid),false,'cannot attack after tapping to summon');
 assert.equal(b.tapped,true);
 // Boss cadence advances to the combat phase on the next enemy turn.
 const second=endTurn(s);
 assert.ok(second.some(x=>x.t==='attack'&&x.uid===b.uid),'untapped turn attacks');
 assert.equal(second.some(x=>x.t==='summon'&&x.by===b.uid&&x.defId==='goblin'),false);
});
test('legendary bosses also engage nearby summoned Soldiers rather than ignoring them',()=>{
 for(const id of BOSSES){
  const s=mk(id),b=boss(s,id),h=player(s);
  const ally={uid:s.nextUid++,name:'Soldier',defId:'sproutling',side:'player',hero:false,x:4,y:3,
    hp:30,maxHp:30,power:2,toughness:30,move:2,keywords:{},statuses:{}};
  s.units.push(ally);
  if(id==='krenko')b.cycle=1;
  const plan=planEnemy(s,b),action=plan.actions.find(a=>a.type==='attack');
  assert.ok(action,id+' can attack a nearby Soldier');
  assert.equal(action.target,ally.uid,id+' targets nearest ally');
  assert.equal(manhattan(b,h),2);
 }
});
test('rooted or stunned bosses do not bypass movement and stun restrictions',()=>{
 const s=mk('nemata'),b=boss(s,'nemata');
 b.statuses.rooted=1;
 assert.equal(planEnemy(s,b).to,null);
 b.statuses.stunned=1;
 assert.deepEqual(planEnemy(s,b).actions.map(x=>x.type),['stunned']);
 const ev=endTurn(s);
 assert.ok(!ev.some(x=>x.t==='move'&&x.uid===b.uid));
 assert.ok(!ev.some(x=>x.t==='attack'&&x.uid===b.uid));
});
test('boss intent is deterministic and reflects planned attacks and summons',()=>{
 for(const id of BOSSES){
  const s=mk(id),b=boss(s,id);
  const a=planEnemy(s,b);
  assert.deepEqual(a,planEnemy(s,b),id+' deterministic plan');
  assert.ok(intents(s).some(x=>x.uid===b.uid),id+' visible intent');
  assert.ok(bossPhaseOf(b)>=1);
 }
});
