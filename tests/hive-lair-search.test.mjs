import test from "node:test";
import assert from "node:assert/strict";
import {newRun,start,step,turn,chooseMutation,DIRECTIONS,ENDINGS} from "../src/engine.js";
import {replayScore} from "../src/replay-verification.js";
import {createLairRun,completeLairRun,LAIR_BOSSES} from "../src/lair.js";
import {ABILITIES} from "../src/miniboss.js";
import {safePreyTile} from "../src/enemies.js";

// Test-only search over legal actions. No seeded engine state, enemy position,
// charge, phase, score, or collision is forced. A random tape allows each
// speculative branch to consume the identical seed stream independently.
const inverse={up:"down",down:"up",left:"right",right:"left"};
const key=p=>p.x+","+p.y;
const md=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const offset=(p,v)=>({x:p.x+v.x,y:p.y+v.y});
const serial=r=>JSON.stringify(r,(_k,v)=>typeof v==="function"?undefined:v);
const headings=Object.keys(DIRECTIONS);
function fork(parent,tape,source){
 const {random,...data}=parent.run;
 const child={run:structuredClone(data),index:parent.index,path:parent.path};
 child.run.random=()=>{
  if(child.index===tape.length)tape.push(source());
  return tape[child.index++];
 };
 return child;
}
function apply(r,action){
 if(action.startsWith("choose:")){assert.equal(chooseMutation(r,action.slice(7)),true);return;}
 if(action!==".")assert.equal(turn(r,action),true);
 step(r);if(r.lairBoss)completeLairRun(r);
}
function value(r){
 if(r.status==="won")return 1e9;
 const e=r.enemies[0],head=r.body[0];
 const phase=r.encounter?.phase||1;
 if(!e)return phase*100000;
 const exits=headings.filter(d=>d!==inverse[e.dir]).map(d=>offset(e.pos,DIRECTIONS[d]));
 const viable=exits.filter(p=>safePreyTile(r,p,e.id));
 const blocked=exits.length-viable.length;
 const playerBlocks=exits.filter(p=>r.body.some(b=>key(b)===key(p))).length;
 const nearest=viable.length?Math.min(...viable.map(p=>md(head,p))):0;
 const edge=Math.min(e.pos.x,r.cols-1-e.pos.x,e.pos.y,r.rows-1-e.pos.y);
 // Prefer cutting off escape routes to chasing the creature's occupied tile.
 return phase*100000+r.score*20+blocked*24+playerBlocks*32-nearest*5-md(head,e.pos)*2-edge*3+r.mercy*12;
}
function huntValue(r){
 if(r.status==="won")return 1e12;
 const head=r.body[0];
 const progress=r.evolutionsChosen*1e6+(r.bossWins+r.minibossWins)*1e5+(r.encounter?.phase||0)*1e4+r.earnedEnergy*1000;
 const defenses=(r.effects.shield+r.effects.molt)*18+r.mercy*12;
 if(!r.enemies.length)return progress+defenses-(r.food?md(head,r.food)*5:0);
 const trap=Math.max(...r.enemies.map(e=>{
  const exits=headings.filter(d=>d!==inverse[e.dir]).map(d=>offset(e.pos,DIRECTIONS[d]));
  const viable=exits.filter(p=>safePreyTile(r,p,e.id));
  const blocked=exits.length-viable.length;
  const playerBlocks=exits.filter(p=>r.body.some(b=>key(b)===key(p))).length;
  const nearest=viable.length?Math.min(...viable.map(p=>md(head,p))):0;
  const edge=Math.min(e.pos.x,r.cols-1-e.pos.x,e.pos.y,r.rows-1-e.pos.y);
  return blocked*24+playerBlocks*32-nearest*5-md(head,e.pos)*2-edge*3;
 }));
 return progress+defenses+trap-(r.food?md(head,r.food)*.25:0);
}
function search(make,{width=18,budget=600,evaluate=value}={}){
 const initial=start(make()),source=initial.random,tape=[];
 let frontier=[{run:initial,index:0,path:[]}],best=frontier[0];
 let expanded=0;
 for(let depth=0;depth<budget;depth++){
  const next=[],seen=new Set(),buckets=new Map();
  for(const p of frontier){
   const r=p.run;
   const frozen=r.encounter&&(r.encounter.introMs>0||r.encounter.stunMs>0||r.encounter.awaitSpawn);
   const actions=r.status==="draft"?r.draftOptions.map(color=>"choose:"+color):frozen?["."]:[".",...headings.filter(d=>d!==r.direction&&d!==inverse[r.direction])];
   for(const action of actions){
    const c=fork(p,tape,source);
    apply(c.run,action);expanded++;
    c.path=[...p.path,action];
    if(c.run.status==="won")return {best:c,expanded};
    if(!["running","draft"].includes(c.run.status))continue;
    c.value=evaluate(c.run);
    if(c.value>evaluate(best.run))best=c;
    const rr=c.run;
    // Keep materially distinct simulation states; do not deduplicate solely
    // by head location (body, enemy clocks and RNG offset affect next steps).
    const fingerprint=serial(rr)+"|"+c.index;
    if(seen.has(fingerprint))continue;
    seen.add(fingerprint);next.push(c);
   }
  }
  next.sort((a,b)=>b.value-a.value);
  frontier=[];
  for(const c of next){
   const r=c.run,e=r.enemies[0];
   const bucket=key(r.body[0])+"|"+(e?key(e.pos)+"|"+e.dir:"-");
   const count=buckets.get(bucket)||0;
   if(count>=2)continue;
   buckets.set(bucket,count+1);frontier.push(c);
   if(frontier.length>=width)break;
  }
  if(!frontier.length)break;
 }
 return {best,expanded};
}
for(const boss of LAIR_BOSSES)test("legal-action search and clean replay: "+boss.id,t=>{
 const {best,expanded}=search(()=>createLairRun(boss.id));
 const replay=start(createLairRun(boss.id));
 for(const action of best.path)apply(replay,action);
 assert.equal(serial(replay),serial(best.run),"search path must replay from the authentic fixed seed");
 assert.ok(expanded>0);
 assert.equal(replay.status,"won","fixed practice seed must remain winnable within the search budget");
 const phases=ABILITIES[boss.id].phases;
 assert.equal(replay.outcome,"lair_practice");
 assert.equal(replay.lastEncounter.type,"defeat");
 assert.equal(replay.lastEncounter.kind,boss.id);
 assert.equal(replay.kills,1);
 t.diagnostic(JSON.stringify({boss:boss.id,expanded,steps:best.path.length,captures:phases,required:ABILITIES[boss.id].phases,outcome:replay.outcome||"budget_limited",score:replay.score}));
});

// Full Hunt starts at the original seed, never a prepared boss state. The
// terminal score must be accepted by the same verifier used for recorded input.
test("full seeded Predator Hunt campaign and authentic terminal replay",t=>{
 const seed=7919,make=()=>newRun({mode:"hunt",seed});
 const {best,expanded}=search(make,{width:24,budget:1400,evaluate:huntValue});
 const replay=start(make()),events=[];
 for(const action of best.path){
  if(action.startsWith("choose:"))events.push([replay.runTicks,"choose",action.slice(7)]);
  else if(action!==".")events.push([replay.runTicks,"turn",action]);
  apply(replay,action);
 }
 assert.equal(serial(replay),serial(best.run));
 t.diagnostic(JSON.stringify({seed,expanded,steps:best.path.length,evolutions:replay.evolutionsChosen,captures:replay.kills,bossWins:replay.bossWins,minibossWins:replay.minibossWins,outcome:replay.outcome||"budget_limited",score:replay.score}));
 assert.equal(replay.status,"won","known seed must reach the final encounter through legal inputs");
 assert.equal(replay.outcome,ENDINGS.BROODMOTHER_DEFEATED);
 assert.ok(replay.evolutionsChosen>=12);
 const expected={score:replay.score,kills:replay.kills,evolutionsChosen:replay.evolutionsChosen,ticks:replay.runTicks,outcome:replay.outcome};
 assert.equal(replayScore(seed,events,expected,"hunt").ok,true);
 assert.equal(replayScore(seed,events,{...expected,outcome:ENDINGS.PERFECT_CLEAR},"hunt").ok,false);
});
