import test from "node:test";
import assert from "node:assert/strict";
import {newRun,start,step,turn,chooseMutation,DIRECTIONS,ENDINGS} from "../src/engine.js";
import {replayScore} from "../src/replay-verification.js";
import {terrainBlocks} from "../src/environments.js";
const key=p=>p.x+","+p.y;
const reverse={up:"down",down:"up",left:"right",right:"left"};
const entries=Object.entries(DIRECTIONS);
const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const actionCode={up:"u",right:"r",down:"d",left:"l"};
const directions=Object.fromEntries(Object.entries(actionCode).map(([d,c])=>[c,d]));

// A visible-state-only route planner, not the seeded lookahead beam search.
// Follow the cyclic ordering of a serpentine grid, taking safe shortcuts
// towards reachable food. Terrain or emergency recovery can break the order;
// fall back to free-space search without modifying the gameplay state.
function buildCycle(r){
 assert.equal(r.rows%2,0);
 const route=[{x:0,y:0}];
 for(let y=0;y<r.rows;y++){
  for(let i=1;i<r.cols;i++)route.push({x:y%2?r.cols-i:i,y});
 }
 for(let y=r.rows-1;y>0;y--)route.push({x:0,y});
 assert.equal(route.length,r.cols*r.rows);
 assert.equal(new Set(route.map(key)).size,route.length);
 assert.ok(route.every((p,i)=>dist(p,route[(i+1)%route.length])===1));
 const map=()=>new Map(route.map((p,i)=>[key(p),i]));
 let index=map();
 if((index.get(key(r.body[0]))-index.get(key(r.body[1]))+route.length)%route.length!==1){route.reverse();index=map()}
 return {index,n:route.length};
}
function candidates(r){
 const head=r.body[0];
 return entries.filter(([d])=>d!==reverse[r.direction]).map(([d,v])=>({d,p:{x:head.x+v.x,y:head.y+v.y}})).filter(({p})=>{
  const eating=r.food&&key(p)===key(r.food);
  return p.x>=0&&p.y>=0&&p.x<r.cols&&p.y<r.rows&&!terrainBlocks(r,p)&&
   !(eating||r.growthDebt?r.body:r.body.slice(0,-1)).some(b=>key(b)===key(p));
 });
}
function explore(r,start,allowed=()=>true){
 const blocked=new Set(r.body.slice(1).map(key));
 for(const t of r.terrain)if(t.warningMs<=0)blocked.add(key(t.pos));
 blocked.delete(key(start));
 const queue=[start],seen=new Map([[key(start),{distance:0,first:null}]]);
 for(let i=0;i<queue.length;i++){
  const p=queue[i],prev=seen.get(key(p));
  for(const [d,v] of entries){
   const q={x:p.x+v.x,y:p.y+v.y},k=key(q);
   if(q.x<0||q.y<0||q.x>=r.cols||q.y>=r.rows||blocked.has(k)||seen.has(k)||!allowed(p,q,d))continue;
   seen.set(k,{distance:prev.distance+1,first:prev.first||d});queue.push(q);
  }
 }
 return seen;
}
function steer(r,cycle,reserve){
 const options=candidates(r);if(!options.length)return r.direction;
 const head=r.body[0],tail=r.body.at(-1),{index,n}=cycle;
 const ahead=(a,b)=>(index.get(key(b))-index.get(key(a))+n)%n;
 let span=0;
 for(let i=r.body.length-1;i>0;i--)span+=ahead(r.body[i],r.body[i-1]);
 const ordered=span<n,tailGap=ahead(head,tail);
 if(ordered&&tailGap>0){
  const limit=Math.max(1,tailGap-Math.max(1,Math.min(reserve,Math.floor((n-r.body.length)/9)))-r.growthDebt);
  const forward=options.filter(o=>ahead(head,o.p)>0&&ahead(head,o.p)<tailGap+(r.growthDebt?0:1));
  if(forward.length){
   const goal=r.food?ahead(head,r.food):0;
   if(goal>0&&goal<=limit){
    const paths=explore(r,head,(p,q,d)=>ahead(p,q)>0&&ahead(head,q)>ahead(head,p)&&ahead(head,q)<=goal&&
     (key(p)!==key(head)||d!==reverse[r.direction]));
    const best=paths.get(key(r.food));
    if(best&&forward.some(o=>o.d===best.first))return best.first;
   }
   return forward.sort((a,b)=>ahead(head,a.p)-ahead(head,b.p))[0].d;
  }
 }
 // Dynamic terrain can invalidate the fixed cycle. Use actual free cells
 // and avoid sacrificing tail access merely to collect the closest orb.
 const rank=o=>{
  const reached=explore(r,o.p),food=r.food?reached.get(key(r.food)):null;
  const nearTail=entries.some(([,v])=>reached.has(key({x:tail.x+v.x,y:tail.y+v.y})));
  return reached.size*4+(nearTail?60:0)-(food?food.distance*3:80+(r.food?dist(o.p,r.food):0));
 };
 return options.map(o=>({...o,rank:rank(o)})).sort((a,b)=>b.rank-a.rank)[0].d;
}
function run(seed,reserve){
 const r=start(newRun({seed,mode:"classic"})),cycle=buildCycle(r),actions=[],events=[];
 let maxBody=r.body.length;
 for(let i=0;i<6500&&!["won","over"].includes(r.status);i++){
  if(r.status==="draft"){
   const choice=["G","W","U","B","R"].find(c=>r.draftOptions.includes(c));
   events.push([r.runTicks,"choose",choice]);actions.push(choice);assert.equal(chooseMutation(r,choice),true);
  }else{
   const d=steer(r,cycle,reserve);
   if(d!==r.direction){assert.equal(turn(r,d),true);events.push([r.runTicks,"turn",d]);actions.push(actionCode[d])}
   else actions.push(".");
   step(r);
  }
  maxBody=Math.max(maxBody,r.body.length);
 }
 assert.ok(["won","over"].includes(r.status),"bounded visible-state run must reach a real terminal state");
 const expected={score:r.score,kills:r.kills,evolutionsChosen:r.evolutionsChosen,ticks:r.runTicks,outcome:r.outcome};
 const verification=replayScore(seed,events,expected,"classic");
 assert.equal(verification.ok,true,JSON.stringify(verification));
 if(r.status==="won")assert.equal(r.outcome,ENDINGS.PERFECT_CLEAR);
 return {seed,reserve,maxBody,orbs:r.brood,evolutions:r.evolutionsChosen,saves:r.saves,mutations:r.mutations,endReason:r.endReason,...expected,actions:actions.join("")};
}
test("Brood Trail visible-state cycle planner: reproducible full-arena terminals",t=>{
 let best=null;
 for(const [seed,reserve] of [[7919,8],[15838,8],[23757,4],[31676,12]]){
  const {actions,...summary}=run(seed,reserve);
  t.diagnostic("CYCLE "+JSON.stringify(summary));
  if(!best||summary.outcome===ENDINGS.PERFECT_CLEAR||summary.maxBody>best.maxBody){
   best={...summary,actions};
  }
  if(summary.outcome===ENDINGS.PERFECT_CLEAR)break;
 }
 assert.ok(best.maxBody>=12,"planner must exercise ordinary growth");
 t.diagnostic("CYCLE_WITNESS "+JSON.stringify(best));
});
