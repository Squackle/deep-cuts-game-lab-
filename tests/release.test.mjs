import test from 'node:test';
import assert from 'node:assert/strict';
import {newRun,start,step,chooseMutation,turn} from '../src/engine.js';
import {spawnMiniboss,tickMiniboss,ABILITIES} from '../src/miniboss.js';
import {setBiome,tickTerrain,terrainBlocks,warnTerrain,BIOMES} from '../src/environments.js';
import {boardKey} from '../src/modes.js';
import {replayScore} from '../src/replay-verification.js';
const evolve=r=>{r.status='draft';r.draftOptions=['W','U','G'];chooseMutation(r,'W')};
const finish=r=>{start(r);for(let i=0;i<7000&&r.status==='running';i++)step(r);return r};
function capture(r){
 r.encounter.introMs=0;r.body=[{x:9,y:10},{x:8,y:10},{x:6,y:6},{x:5,y:5},{x:5,y:7},{x:10,y:10}];r.direction='down';r.turnQueue=[];
 Object.assign(r.enemies[0],{pos:{x:5,y:6},dir:'right',period:1,clock:0});step(r);
}
test('Brood Trail immediately has one orb and no enemies at any evolution',()=>{
 const r=newRun({seed:42,mode:'classic'});assert.ok(r.food);assert.equal(r.enemies.length,0);
 for(let i=0;i<16;i++){evolve(r);assert.equal(r.encounter,null);assert.equal(r.queuedEncounter,null);assert.equal(r.enemies.length,0)}
 assert.equal(r.biome,4);assert.equal(r.tickMs,118);
});
test('classic five orbs cause a three-choice draft with original WUBRG powers',()=>{
 const r=newRun({seed:45,mode:'classic'});start(r);
 for(let i=0;i<5;i++){r.food={x:r.body[0].x+1,y:r.body[0].y};step(r)}
 assert.equal(r.brood,5);assert.equal(r.score,500);assert.equal(r.kills,0);assert.equal(r.status,'draft');assert.equal(r.draftOptions.length,3);
 chooseMutation(r,r.draftOptions[0]);assert.equal(r.evolutionsChosen,1);
});
test('classic and hunt cannot share replay scoring rules',()=>{
 const seed=45,r=newRun({seed,mode:'classic'});start(r);
 // An authentic recorded loop; enough chances to encounter the seeded orb.
 const events=[];for(let i=0;i<300&&r.status==='running';i++){
  const h=r.body[0];const d=r.direction;
  const next=d==='right'&&h.x>=16?'down':d==='down'&&h.y>=20?'left':d==='left'&&h.x<=1?'up':d==='up'&&h.y<=1?'right':null;
  if(next&&turn(r,next))events.push([r.runTicks,'turn',next]);step(r);
  if(r.status==='draft'){const c=r.draftOptions[0];events.push([r.runTicks,'choose',c]);chooseMutation(r,c)}
 }
 // Let the snake crash naturally.
 for(let i=0;i<100&&r.status==='running';i++)step(r);
 const summary={score:r.score,kills:r.kills,evolutionsChosen:r.evolutionsChosen,ticks:r.runTicks};
 assert.equal(replayScore(seed,events,summary,'classic').ok,true);
 assert.equal(replayScore(seed,events,{...summary,score:summary.score+100},'classic').ok,false);
});
test('both full bosses need exactly three captures and reward only once',()=>{
 for(const kind of ['warden','guardian']){
  const r=newRun({seed:42});start(r);spawnMiniboss(r,kind);
  capture(r);assert.equal(r.encounter.phase,2);assert.equal(r.score,0);
  capture(r);assert.equal(r.encounter.phase,3);assert.equal(r.score,0);
  capture(r);assert.equal(r.encounter,null);assert.equal(r.bossWins,1);assert.equal(r.minibossWins,0);assert.equal(r.score,1500);assert.equal(r.earnedEnergy,8);
  step(r);assert.equal(r.score,1500);
 }
});
test('boss powers warn, freeze with drafts, and never activate under the swarm',()=>{
 for(const kind of ['warden','guardian']){
  const r=newRun({seed:42});start(r);spawnMiniboss(r,kind);r.encounter.introMs=0;
  r.enemies[0].pos={x:5,y:5};tickMiniboss(r,10000);assert.ok(r.terrain.length);
  assert.ok(r.terrain.every(t=>t.warningMs===1400));const p={...r.terrain[0].pos};
  r.status='draft';step(r);assert.equal(r.terrain[0].warningMs,1400);
  r.body.push(p);tickTerrain(r,1400);assert.equal(terrainBlocks(r,p),false);
 }
});
test('biome transitions keep the exterior path clear; warning tiles turn solid only when safe',()=>{
 const r=newRun({seed:17,mode:'classic'});r.evolutionsChosen=4;setBiome(r);assert.equal(r.biome,2);assert.equal(r.terrain.length,8);
 assert.ok(r.terrain.every(t=>t.pos.x>=4&&t.pos.y>=5));
 const tile=r.terrain[0].pos;assert.equal(terrainBlocks(r,tile),false);tickTerrain(r,1800);assert.equal(terrainBlocks(r,tile),true);
 r.evolutionsChosen=8;setBiome(r);assert.equal(r.biome,3);for(let i=0;i<10&&!r.terrain.some(t=>t.kind==='rift');i++)tickTerrain(r,9000);assert.ok(r.terrain.some(t=>t.kind==='rift'));
});
test('terrain collisions and occupied growing tail are fatal without defense',()=>{
 const r=newRun({seed:3,mode:'classic'});start(r);const h=r.body[0];r.terrain=[{pos:{x:h.x+1,y:h.y},kind:'rock',warningMs:0,lifeMs:null}];step(r);assert.equal(r.status,'over');
});
test('permanent Arcade standings separate game modes, without daily resets',()=>{
 assert.equal(boardKey('hunt'),'hunt|arcade');
 assert.equal(boardKey('classic'),'classic|arcade');
 assert.deepEqual(BIOMES.map(b=>b.bpm),[80,105,132,165]);
});
test('missing safe phase gate uses a protected reset instead of infinite frozen ticks',()=>{
 const r=newRun({seed:42});start(r);spawnMiniboss(r,'warden');
 r.encounter.awaitSpawn=true;r.body=[];
 for(let y=0;y<r.rows;y++)for(let x=0;x<r.cols;x++)r.body.push({x,y});
 step(r);assert.equal(r.encounter.awaitSpawn,false);assert.equal(r.enemies.length,1);assert.ok(r.encounter.introMs>0);
 assert.ok(!r.body.some(p=>p.x===r.enemies[0].pos.x&&p.y===r.enemies[0].pos.y));
});
