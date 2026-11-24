import test from "node:test";
import assert from "node:assert/strict";
import {start,step,turn,DIRECTIONS} from "../src/engine.js";
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
 if(action!==".")assert.equal(turn(r,action),true);
 step(r);completeLairRun(r);
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
function search(kind,{width=18,budget=600}={}){
 const initial=start(createLairRun(kind)),source=initial.random,tape=[];
 let frontier=[{run:initial,index:0,path:[]}],best=frontier[0];
 let expanded=0;
 for(let depth=0;depth<budget;depth++){
  const next=[],seen=new Set(),buckets=new Map();
  for(const p of frontier){
   const r=p.run;
   const frozen=r.encounter&&(r.encounter.introMs>0||r.encounter.stunMs>0||r.encounter.awaitSpawn);
   const actions=frozen?["."]:[".",...headings.filter(d=>d!==r.direction&&d!==inverse[r.direction])];
   for(const action of actions){
    const c=fork(p,tape,source);
    apply(c.run,action);expanded++;
    c.path=[...p.path,action];
    if(c.run.status==="won")return {best:c,expanded};
    if(c.run.status!=="running")continue;
    c.value=value(c.run);
    if(c.value>value(best.run))best=c;
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
 const {best,expanded}=search(boss.id);
 const replay=start(createLairRun(boss.id));
 for(const action of best.path)apply(replay,action);
 assert.equal(serial(replay),serial(best.run),"search path must replay from the authentic fixed seed");
 assert.ok(expanded>0);
 const phases=replay.status==="won"?ABILITIES[boss.id].phases:(replay.encounter?.phase||1)-1;
 if(replay.status==="won"){
  assert.equal(replay.outcome,"lair_practice");
  assert.equal(replay.lastEncounter.type,"defeat");
  assert.equal(replay.lastEncounter.kind,boss.id);
  assert.equal(replay.kills,1);
 }else assert.equal(replay.status,"running");
 t.diagnostic(JSON.stringify({boss:boss.id,expanded,steps:best.path.length,captures:phases,required:ABILITIES[boss.id].phases,outcome:replay.outcome||"budget_limited",score:replay.score}));
});
