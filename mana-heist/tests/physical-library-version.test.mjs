import test from "node:test";
import assert from "node:assert/strict";
import {VERSION,PHYSICAL_LIBRARY_VERSION,initial,actions,reduce,key,completed} from "../src/engine.js";
import {solve,replay} from "../src/solver.js";
import {resolveAutomaticCasts} from "../src/auto-cast.js";
import {legalContinuation,validateHintRoute} from "../src/verified-hints.js";
import {LEVELS} from "../src/levels.js";
import {createReferenceCache,referenceFor} from "../src/readiness-audit.js";
const board=(version=PHYSICAL_LIBRARY_VERSION)=>({id:"mh-physical-preview",version,turnLimit:2,life:20,
 field:[{id:"f1",card:"fetchUR"},{id:"f2",card:"fetchUR"}],
 hand:[{id:"bounce",card:"bounceUG"}],library:[{id:"blue",card:"island"},{id:"red",card:"mountain"},{id:"shock",card:"shockUR"}],
 stages:[{name:"Blue-red ward",cost:{U:1,R:1}}]});
const find=(p,s,type,fields={})=>actions(p,s).find(a=>a.type===type&&Object.entries(fields).every(([k,v])=>a[k]===v));
function move(p,s,type,fields={}){const a=find(p,s,type,fields);assert.ok(a,JSON.stringify({type,fields}));const out=reduce(p,s,a);assert.ok(out.ok,out.error);return out.state;}
test("physical fetch consumes one instance, sacrifices source, preserves distinct choices and life",()=>{
 const p=board(),start=initial(p),snapshot=structuredClone(start);
 const one=move(p,start,"fetch",{id:"f1",targetId:"blue",shock:false});
 assert.deepEqual(start,snapshot); // immutable undo snapshot
 assert.deepEqual(one.libraryAvailable,["red","shock"]);
 assert.deepEqual(one.graveyard,["f1"]);assert.equal(one.life,19);
 assert.equal(find(p,one,"fetch",{targetId:"blue"}),undefined);
 assert.equal(reduce(p,one,{type:"fetch",id:"f2",targetId:"blue",shock:false}).ok,false);
 assert.ok(find(p,one,"fetch",{targetId:"red"}));
 const shocked=move(p,one,"fetch",{id:"f2",targetId:"shock",shock:true});
 assert.equal(shocked.life,16);assert.equal(shocked.spentLife,4);
 assert.equal(shocked.field.find(f=>f.id==="shock").tapped,false);
 assert.equal(move(p,one,"fetch",{id:"f2",targetId:"shock",shock:false}).field.find(f=>f.id==="shock").tapped,true);
 assert.notEqual(key(one),key({...one,libraryAvailable:["blue","red","shock"]}));
 assert.equal(key(one),key({...one,libraryAvailable:["shock","red"]}));
 assert.ok(find(p,start,"fetch",{id:"f2",targetId:"blue"}));
});
test("returning fetched card to hand does not restore library availability",()=>{
 const p=board(),one=move(p,initial(p),"fetch",{id:"f1",targetId:"blue"});
 const bounced=move(p,one,"play",{id:"bounce",returnId:"blue"});
 assert.ok(bounced.hand.includes("blue"));assert.ok(!bounced.libraryAvailable.includes("blue"));
 assert.equal(find(p,bounced,"fetch",{targetId:"blue"}),undefined);
 assert.ok(find(p,bounced,"fetch",{targetId:"red"}));
});
test("legacy version and replay remain explicit; candidate solver, hints and auto-cast work",()=>{
 const legacy=board(VERSION),s=initial(legacy),one=move(legacy,s,"fetch",{id:"f1",targetId:"blue"});
 assert.equal("libraryAvailable" in s,false);assert.ok(find(legacy,one,"fetch",{id:"f2",targetId:"blue"}));
 const candidate=board(),start=initial(candidate);
 assert.throws(()=>actions(candidate,s),/Physical library state required/);
 const proof=solve(candidate);assert.equal(proof.status,"solved");
 assert.ok(replay(candidate,proof.actions).ok);assert.ok(validateHintRoute(candidate,start,proof.actions));
 assert.equal(legalContinuation(candidate,start,proof).status,"solved");
 let state=start;
 for(const a of proof.actions){if(a.type==="cast")continue;const out=reduce(candidate,state,a);assert.ok(out.ok);state=resolveAutomaticCasts(candidate,out.state).state;if(completed(candidate,state))break;}
 assert.ok(completed(candidate,state));assert.deepEqual(initial(candidate),start);
});
function autoSearch(p,proof,limit=12000){
 let state=initial(p);
 for(const a of proof){if(a.type==="cast")continue;const out=reduce(p,state,a);if(!out.ok)break;state=resolveAutomaticCasts(p,out.state).state;if(completed(p,state))return "reference";}
 const start=resolveAutomaticCasts(p,initial(p)).state,queue=[start],seen=new Set([key(start)]);
 for(let i=0;i<queue.length;i++){
  if(completed(p,queue[i]))return "search";
  for(const a of actions(p,queue[i])){
   if(a.type==="cast")continue;
   const out=reduce(p,queue[i],a);assert.ok(out.ok);
   const next=resolveAutomaticCasts(p,out.state).state;if(completed(p,next))return "search";
   const k=key(next);if(seen.has(k))continue;
   if(seen.size>=limit)return "inconclusive";
   seen.add(k);queue.push(next);
  }
 }
 return "unsolvable";
}
test("all 500 old certificates replay under candidate; affected boards audited for automatic casting",{timeout:180000},()=>{
 const cache=createReferenceCache(),counts={reference:0,search:0,inconclusive:0,unsolvable:0},unresolved=[];
 let affected=0;
 for(const p of LEVELS){
  assert.equal(p.version,VERSION);const proof=referenceFor(p,cache).proof;
  assert.equal(proof?.status,"solved",p.id);
  const candidate={...p,version:PHYSICAL_LIBRARY_VERSION};
  assert.ok(replay(p,proof.actions).ok,p.id+" legacy replay");
  assert.ok(replay(candidate,proof.actions).ok,p.id+" candidate replay");
  if([...p.field,...p.hand].some(c=>c.card==="fetchUR"||c.card==="fetchBG")){
   affected++;const outcome=autoSearch(candidate,proof.actions);counts[outcome]++;
   if(outcome==="inconclusive"||outcome==="unsolvable")unresolved.push({id:p.id,outcome});
  }
 }
 console.log("PHYSICAL_LIBRARY_COMPATIBILITY "+JSON.stringify({certificates:LEVELS.length,affected,budgetPerSearch:12000,counts,unresolved}));
 assert.equal(LEVELS.length,500);assert.ok(affected>0);
 assert.equal(counts.unsolvable,0,JSON.stringify(unresolved));
 // Inconclusive is explicitly reported and blocks promotion, not a false pass.
});
