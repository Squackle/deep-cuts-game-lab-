import test from "node:test";
import assert from "node:assert/strict";
import {newRun,start,step,turn,chooseMutation,DIRECTIONS,RULES_VERSION} from "../src/engine.js";
import {createLairRun,completeLairRun,LAIR_BOSSES} from "../src/lair.js";
import {replayScore} from "../src/replay-verification.js";

const key=p=>p.x+","+p.y;
const same=(a,b)=>a.x===b.x&&a.y===b.y;
const inside=(r,p)=>p.x>=0&&p.x<r.cols&&p.y>=0&&p.y<r.rows;
const opposite={up:"down",down:"up",left:"right",right:"left"};
const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const snapshot=r=>JSON.stringify(r,(_k,v)=>typeof v==="function"?undefined:v);

// A bounded, deterministic smoke-play policy, not an optimal player or a
// human difficulty model. No writes to game state outside public engine actions.
function steer(r,policy){
 if(r.turnQueue.length)return;
 const head=r.body[0],food=r.food;
 const blocked=new Set([...(r.growthDebt>0?r.body:r.body.slice(0,-1)),
  ...r.enemies.map(e=>e.pos),...r.hatchlings.map(h=>h.pos),
  ...r.terrain.map(t=>t.pos),...(r.encounter?.webs||[]).map(w=>w.pos)].map(key));
 const options=Object.entries(DIRECTIONS).filter(([d])=>d!==opposite[r.direction]).map(([d,v])=>{
  const p={x:head.x+v.x,y:head.y+v.y};
  if(!inside(r,p)||blocked.has(key(p))||(food&&same(p,food)&&r.body.some(b=>same(b,p))))return null;
  const exits=Object.values(DIRECTIONS).filter(w=>{
   const q={x:p.x+w.x,y:p.y+w.y};return inside(r,q)&&!blocked.has(key(q));
  }).length;
  const target=food||r.enemies[0]?.pos||{x:r.cols/2,y:r.rows/2};
  return {d,rank:exits*(policy===0?3:9)-distance(p,target)+(d===r.direction ? .25 : 0)};
 }).filter(Boolean).sort((a,b)=>b.rank-a.rank);
 if(options.length&&options[0].d!==r.direction)turn(r,options[0].d);
}
function validate(r,before,context){
 assert.ok(["running","draft","won","over"].includes(r.status),context);
 assert.ok(r.body.length>=3,context);
 assert.equal(new Set(r.body.map(key)).size,r.body.length,context+" duplicate segment");
 assert.ok(r.body.every(p=>inside(r,p)),context+" out-of-bounds body");
 assert.ok(r.enemies.every(e=>inside(r,e.pos)),context+" out-of-bounds prey");
 assert.ok(r.hatchlings.every(h=>inside(r,h.pos)),context+" out-of-bounds hatchling");
 assert.ok(!r.food||inside(r,r.food),context+" out-of-bounds orb");
 assert.ok(Number.isSafeInteger(r.score)&&r.score>=before.score,context+" invalid score");
 assert.ok(Number.isSafeInteger(r.earnedEnergy)&&r.earnedEnergy>=before.earnedEnergy,context+" invalid earned energy");
 assert.ok(Number.isSafeInteger(r.runTicks)&&r.runTicks>=before.runTicks,context+" invalid simulation clock");
 assert.ok(r.turnQueue.length<=2,context);
 if(r.mode==="classic"){assert.equal(r.enemies.length,0,context);assert.equal(r.encounter,null,context);}
 if(r.status==="draft"){assert.equal(r.draftOptions.length,3,context);assert.equal(new Set(r.draftOptions).size,3,context);}
 if(r.status==="won"||r.status==="over")assert.ok(r.endReason,context);
}
function simulate(make,policy,label,budget=400){
 const r=start(make());let calls=0;
 for(;calls<budget&&!["won","over"].includes(r.status);calls++){
  const before={score:r.score,earnedEnergy:r.earnedEnergy,runTicks:r.runTicks};
  if(r.status==="draft"){
   const choice=["W","G","B","U","R"].find(c=>r.draftOptions.includes(c));
   assert.ok(chooseMutation(r,choice),label);
  }else{steer(r,policy);step(r);if(r.lairBoss)completeLairRun(r);}
  validate(r,before,label+" call="+calls);
 }
 if(["won","over"].includes(r.status)){const terminal=snapshot(r);step(r);assert.equal(snapshot(r),terminal,label+" terminal state mutated");}
 return {state:snapshot(r),calls,score:r.score,moves:r.moves,brood:r.brood,kills:r.kills,evolutions:r.evolutionsChosen,status:r.status};
}
for(const mode of ["hunt","classic"])test("seeded simulation: "+mode+" preserves invariants and repeats exact state",t=>{
 assert.equal(RULES_VERSION,"hive-1.5.4");
 let total=0,points=0,brood=0,kills=0,evolutions=0;
 for(let seed=1;seed<=24;seed++){
  const make=()=>newRun({mode,seed:seed*7919});
  const label=mode+" seed="+seed;
  const a=simulate(make,seed%2,label),b=simulate(make,seed%2,label);
  assert.deepEqual(a,b,label+" deterministic divergence");
  total+=a.calls;points+=a.score;brood+=a.brood;kills+=a.kills;evolutions+=a.evolutions;
 }
 assert.ok(total>24, "smoke policy must exercise more than one frame per seed");
 t.diagnostic(JSON.stringify({seeds:24,simulationCalls:total,score:points,orbs:brood,captures:kills,evolutions}));
});
for(const boss of LAIR_BOSSES)test("seeded Lair simulation: "+boss.id+" remains reproducible and bounded",t=>{
 const make=()=>createLairRun(boss.id);
 const a=simulate(make,1,boss.id),b=simulate(make,1,boss.id);
 assert.deepEqual(a,b);
 t.diagnostic(JSON.stringify({boss:boss.id,calls:a.calls,moves:a.moves,score:a.score,status:a.status}));
});


for(const mode of ["hunt","classic"])test("recorded legal arcade inputs replay actual terminal score: "+mode,t=>{
 let scored=0;
 for(const seed of [7919,15838,23757,31676]){
  const r=start(newRun({mode,seed})),events=[];
  for(let calls=0;calls<6500&&!["over","won"].includes(r.status);calls++){
   if(r.status==="draft"){
    const choice=r.draftOptions[0];events.push([r.runTicks,"choose",choice]);assert.equal(chooseMutation(r,choice),true);continue;
   }
   // Exercise normal movement first, then let a legal run reach a terminal
   // boundary naturally. Never force death, a score, or a time counter.
   if(calls<400){const n=r.turnQueue.length;steer(r,seed%2);if(r.turnQueue.length>n)events.push([r.runTicks,"turn",r.turnQueue.at(-1)]);}
   step(r);
  }
  assert.ok(["over","won"].includes(r.status));
  const expected={score:r.score,kills:r.kills,evolutionsChosen:r.evolutionsChosen,ticks:r.runTicks,outcome:r.outcome};
  const validated=replayScore(seed,events,expected,mode);
  assert.equal(validated.ok,true,JSON.stringify(validated));
  assert.equal(replayScore(seed,events,{...expected,score:expected.score+1},mode).ok,false);
  if(r.score>0)scored++;
 }
 t.diagnostic(JSON.stringify({mode,runs:4,scored}));
});
