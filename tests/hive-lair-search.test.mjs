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
function search(make,{width=18,budget=600,evaluate=value,bucketKey=null}={}){
 const initial=start(make()),source=initial.random,tape=[];
 let frontier=[{run:initial,index:0,path:null,value:evaluate(initial)}],best=frontier[0];
 const result=()=>{
  const path=[];for(let link=best.path;link;link=link.previous)path.push(link.action);
  return {best:{...best,path:path.reverse()},expanded};
 };
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
    c.path={previous:p.path,action};
    if(c.run.status==="won"){best=c;return result();}
    if(!["running","draft"].includes(c.run.status))continue;
    c.value=evaluate(c.run);
    if(c.value>best.value)best=c;
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
   const bucket=bucketKey?bucketKey(r):key(r.body[0])+"|"+(e?key(e.pos)+"|"+e.dir:"-");
   const count=buckets.get(bucket)||0;
   if(count>=2)continue;
   buckets.set(bucket,count+1);frontier.push(c);
   if(frontier.length>=width)break;
  }
  if(!frontier.length)break;
 }
 return result();
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

/** Evaluate the real snake state using free-space connectivity rather than
 * Manhattan distance alone. A tail that is about to move is traversable
 * for planning; no state modifications are made to the actual engine.
 */
function classicValue(r){
 if(r.status==="won")return 1e12;
 const w=r.cols,h=r.rows,n=w*h,head=r.body[0],tail=r.body.at(-1);
 const id=p=>p.y*w+p.x,blocked=new Uint8Array(n),seen=new Int16Array(n);
 seen.fill(-1);
 for(const b of (r.growthDebt>0?r.body.slice(1):r.body.slice(1,-1)))blocked[id(b)]=1;
 for(const t of r.terrain)if(t.warningMs<=0)blocked[id(t.pos)]=1;
 const queue=new Int32Array(n);let count=1;
 queue[0]=id(head);seen[id(head)]=0;
 for(let i=0;i<count;i++){
  const at=queue[i],x=at%w,y=Math.floor(at/w);
  for(const next of [x?at-1:-1,x<w-1?at+1:-1,y?at-w:-1,y<h-1?at+w:-1]){
   if(next<0||blocked[next]||seen[next]>=0)continue;
   seen[next]=seen[at]+1;queue[count++]=next;
  }
 }
 const foodDistance=r.food?seen[id(r.food)]:0;
 const tailAdjacent=Object.values(DIRECTIONS).some(v=>{
  const q=offset(tail,v);return q.x>=0&&q.x<w&&q.y>=0&&q.y<h&&seen[id(q)]>=0;
 });
 const occupied=new Set(r.body.map(key));
 const rocks=new Set(r.terrain.filter(t=>t.kind==="rock"&&t.lifeMs===null).map(t=>key(t.pos)));
 const covered=new Set([...occupied,...rocks]).size;
 const length=r.body.length+r.growthDebt*.75;
 const free=n-r.body.length;
 // Progress dominates; steer toward reachable food while keeping access
 // to the tail and penalizing fragmentation of the remaining open area.
 return length*10000+covered*800+r.brood*20+r.evolutionsChosen*100+
  r.effects.shield*40+r.effects.greenPickups*30-r.effects.molt*15+
  (tailAdjacent?45:0)+Math.min(count,free)*2-
  (foodDistance>=0?foodDistance*8:100+md(head,r.food||tail)*4);
}
const classicBucket=r=>key(r.body[0])+"|"+r.direction+"|"+key(r.body.at(-1));
function replayClassic(make,path){
 const r=start(make()),events=[];
 for(const action of path){
  if(action.startsWith("choose:"))events.push([r.runTicks,"choose",action.slice(7)]);
  else if(action!==".")events.push([r.runTicks,"turn",action]);
  apply(r,action);
 }
 return {r,events};
}
test("Brood Trail compact board: search for genuine board-fill victory",t=>{
 let won=false,maxBody=0;
 for(const seed of [7919,29,42,103]){
  const make=()=>newRun({mode:"classic",seed,cols:8,rows:8});
  const {best,expanded}=search(make,{width:64,budget:1100,evaluate:classicValue,bucketKey:classicBucket});
  const {r}=replayClassic(make,best.path);
  assert.equal(serial(r),serial(best.run));
  const rocks=new Set(r.terrain.filter(t=>t.kind==="rock"&&t.lifeMs===null).map(t=>key(t.pos)));
  const coverage=new Set([...r.body.map(key),...rocks]).size;
  maxBody=Math.max(maxBody,r.body.length);
  t.diagnostic(JSON.stringify({seed,board:"8x8",expanded,actions:best.path.length,body:r.body.length,rockTiles:rocks.size,coverage,growthDebt:r.growthDebt,orbs:r.brood,evolutions:r.evolutionsChosen,outcome:r.outcome||"budget_limited",score:r.score}));
  if(r.status==="won"){
   assert.equal(r.outcome,ENDINGS.PERFECT_CLEAR);
   assert.equal(coverage,r.cols*r.rows);
   won=true;break;
  }
 }
 assert.ok(won||maxBody>=40,"search must exercise long-body collision and growth");
});
test("Brood Trail full arena: bounded growth and authentic replay",t=>{
 const seed=7919,make=()=>newRun({mode:"classic",seed});
 const {best,expanded}=search(make,{width:20,budget:1800,evaluate:classicValue,bucketKey:classicBucket});
 const {r,events}=replayClassic(make,best.path);
 assert.equal(serial(r),serial(best.run));
 t.diagnostic(JSON.stringify({seed,board:"18x22",expanded,actions:best.path.length,body:r.body.length,orbs:r.brood,evolutions:r.evolutionsChosen,outcome:r.outcome||"budget_limited",score:r.score}));
 assert.ok(r.brood>=10,"search must exceed the opening growth stage");
 if(r.status==="won")assert.equal(r.outcome,ENDINGS.PERFECT_CLEAR);
 // If the bounded search stops short, finish the actual run through normal
 // inputs so the verifier must accept a real terminal trace, not a snapshot.
 for(let i=0;i<6500&&!["won","over"].includes(r.status);i++){
  if(r.status==="draft"){
   const color=r.draftOptions[0];events.push([r.runTicks,"choose",color]);
   assert.equal(chooseMutation(r,color),true);
  }else step(r);
 }
 assert.ok(["won","over"].includes(r.status));
 const expected={score:r.score,kills:r.kills,evolutionsChosen:r.evolutionsChosen,ticks:r.runTicks,outcome:r.outcome};
 const verified=replayScore(seed,events,expected,"classic");
 assert.equal(verified.ok,true,JSON.stringify(verified));
 assert.equal(replayScore(seed,events,{...expected,score:expected.score+1},"classic").ok,false);
 t.diagnostic(JSON.stringify({terminal:r.outcome,ticks:r.runTicks,score:r.score,verified:verified.ok}));
});
