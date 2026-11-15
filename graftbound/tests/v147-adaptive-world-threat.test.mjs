import test from 'node:test';
import assert from 'node:assert/strict';
import {newWorldThreat,normalizedWorldThreat,settleWorldThreat,threatModifiers,effectiveThreatLevel,applyWorldThreat,WORLD_THREAT_MAX} from '../src/engine/world-threat.js';
import {newRun,enterNode,runStats} from '../src/engine/run.js';
import {generateMap} from '../src/engine/campaign.js';
import {strengthOf,expectedStrength} from '../src/engine/strength.js';
import {stepOf} from '../src/engine/power.js';
import {REINFORCE_CAP} from '../src/engine/encounters.js';
import {RULES_VERSION,RANKED_CHALLENGES,startRanked,replayRun} from '../src/engine/ranked.js';
import './helpers.mjs';

const win=(state,damage=0,hp=20)=>settleWorldThreat(state,{victory:true,enemyDamage:damage,maxHealth:hp});
test('a flawless victory escalates Global Threat immediately; level never exceeds 12',()=>{
  let t=newWorldThreat();
  assert.deepEqual(t,{level:0,flawlessStreak:0});
  assert.equal(win(t,0).level,1);
  for(let i=0;i<30;i++)t=win(t,0);
  assert.deepEqual(t,{level:WORLD_THREAT_MAX,flawlessStreak:0});
});
test('repeated trivial scratches no longer freeze threat, but serious wounds lower it',()=>{
  let t={level:3,flawlessStreak:0};
  t=win(t,1,20);assert.deepEqual(t,{level:3,flawlessStreak:1});
  t=win(t,2,20);assert.deepEqual(t,{level:4,flawlessStreak:0});
  t=win(t,3,20);assert.deepEqual(t,{level:4,flawlessStreak:0});
  t=win(t,4,20);assert.deepEqual(t,{level:3,flawlessStreak:0});
  assert.deepEqual(settleWorldThreat(t,{victory:true,enemyDamage:0,tutorial:true}),t);
  assert.deepEqual(settleWorldThreat(t,{victory:false,enemyDamage:0}),t);
  assert.deepEqual(normalizedWorldThreat({level:1000,flawlessStreak:50}),{level:12,flawlessStreak:1});
});
test('adaptive floor increases with surplus strength, never punishes weak builds or mutates saves',()=>{
  const saved={level:2,flawlessStreak:1}, before=JSON.stringify(saved);
  assert.equal(effectiveThreatLevel(saved,{strength:8,expected:30}),2);
  assert.equal(effectiveThreatLevel(saved,{strength:36,expected:30}),2);
  assert.equal(effectiveThreatLevel(saved,{strength:39,expected:30}),3);
  assert.equal(effectiveThreatLevel(saved,{strength:90,expected:30}),12);
  assert.equal(effectiveThreatLevel(saved,{strength:Infinity,expected:30}),2);
  assert.equal(JSON.stringify(saved),before);
});
test('higher threat adds bounded counter-reinforcements and more shields without changing printed toughness',()=>{
  const normal0=threatModifiers({level:0}),normal12=threatModifiers({level:12}),boss12=threatModifiers({level:12},{boss:true});
  assert.equal(normal0.shieldRate,0);
  assert.ok(normal12.shieldRate>threatModifiers({level:6}).shieldRate);
  assert.equal(normal12.reinforcement,2);assert.equal(boss12.reinforcement,0);
  assert.ok(boss12.shieldRate>0 && boss12.shieldRate<normal12.shieldRate);
  const units=[
    {uid:1,side:'player',power:20,toughness:20,hp:20,maxHp:20,statuses:{}},
    {uid:2,side:'enemy',power:2,toughness:7,hp:7,maxHp:7,statuses:{}}
  ];
  const battle={nodeType:'boss',units:structuredClone(units)};
  applyWorldThreat(battle,{level:12});
  assert.equal(battle.worldThreat,12);
  assert.equal(battle.units[1].toughness,7);
  assert.equal(battle.units[1].hp,7);
  assert.ok(battle.units[1].worldShield>=2);
  assert.equal(battle.units[0].statuses.shield,undefined);
  const zero={nodeType:'battle',units:structuredClone(units)};
  applyWorldThreat(zero,{level:0});
  assert.equal(zero.units[1].statuses.shield,undefined);
});
function prepareRun(seed,act=1){
  const run=newRun({seed,tutorial:false});
  run.act=act;run.map=generateMap(seed,{act});
  const target=run.map.nodes.find(n=>n.depth===2 && (n.type==='battle'||n.type==='elite'));
  assert.ok(target,'needs an ordinary Act II encounter');
  const parent=run.map.nodes.find(n=>n.depth===1&&n.next.includes(target.id));
  assert.ok(parent);
  run.current=parent.id;run.visited=[parent.id];run.phase='map';
  return {run,nodeId:target.id,depth:target.depth};
}
test('run encounters honor the global threat cap and apply a persistent pressure of 12',()=>{
  const {run,nodeId}=prepareRun(71);
  run.worldThreat.level=12;
  enterNode(run,nodeId);
  assert.equal(run.battle.worldThreat,12);
  assert.equal(run.battle.worldThreatBase,12);
  assert.equal(run.battle.worldThreatAdaptive,0);
  assert.equal(run.battle.reinforced,REINFORCE_CAP[1]);
  assert.ok(run.battle.units.filter(u=>u.side==='enemy').every(u=>u.worldShield>0));
});
test('strong grafts get encounter pressure even if a single scratch prevented stored threat growth',()=>{
  const {run,nodeId,depth}=prepareRun(72);
  run.evo.power=42;run.evo.toughness=38;
  const estimate=strengthOf(run.evo,{stats:runStats(run),spellbook:run.spellbook}).score;
  const expected=expectedStrength(stepOf(run.act,depth));
  assert.ok(estimate>expected+15);
  assert.equal(run.worldThreat.level,0);
  enterNode(run,nodeId);
  assert.ok(run.battle.worldThreat>=5,'high-offense hero must not face dormant threat');
  assert.ok(run.battle.worldThreatAdaptive>0);
  assert.equal(run.worldThreat.level,0,'active threat cannot mutate campaign base before a win');
  assert.ok(run.battle.units.filter(u=>u.side==='enemy').every(u=>u.worldShield>0));
  assert.ok(run.battle.reinforced<=REINFORCE_CAP[run.act]);
});
test('same run/seed produces byte-identical pressure and enemy starting lineup',()=>{
  const {run,nodeId}=prepareRun(73);
  run.worldThreat={level:9,flawlessStreak:1};
  const clone=structuredClone(run);
  enterNode(run,nodeId);enterNode(clone,nodeId);
  assert.equal(JSON.stringify(run.battle),JSON.stringify(clone.battle));
  assert.deepEqual(run.worldThreat,clone.worldThreat);
});
test('ranked replays are isolated from old Global Threat difficulty',()=>{
  assert.equal(RULES_VERSION,'graftbound-rules-1.3.7-beta');
  assert.equal(RANKED_CHALLENGES['gb-expedition-01'].revision,20);
  assert.equal(startRanked().ranked.rulesVersion,RULES_VERSION);
  assert.throws(()=>replayRun('gb-expedition-01',[],{revision:19}),/retired challenge/);
  assert.throws(()=>replayRun('gb-expedition-01',[],{rulesVersion:'graftbound-rules-1.3.6-beta'}),/Rules version mismatch/);
});
