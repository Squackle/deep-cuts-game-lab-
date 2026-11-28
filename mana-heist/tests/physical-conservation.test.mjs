import test from "node:test";import assert from "node:assert/strict";
import {VERSION,PHYSICAL_LIBRARY_VERSION,initial,actions,reduce,assertPhysicalLibraryState,key,completed} from "../src/engine.js";
const p={id:"mh-conservation",version:PHYSICAL_LIBRARY_VERSION,turnLimit:2,life:20,hand:[{id:"bounce",card:"bounceUG"},{id:"ritual",card:"ritual"}],field:[{id:"f",card:"fetchUR"},{id:"petal",card:"petal"},{id:"treasure",card:"treasure"},{id:"bloom",card:"bloom"},{id:"swamp",card:"swamp"}],library:[{id:"blue",card:"island"},{id:"red",card:"mountain"}],stages:[{name:"Ward",cost:{B:1,U:1}}]};
function move(s,pred){const a=actions(p,s).find(pred);assert.ok(a);const out=reduce(p,s,a);assert.ok(out.ok);assert.ok(assertPhysicalLibraryState(p,out.state));return out.state;}
test("missing physical IDs in any zone are rejected, including terminal state",()=>{
 const s=initial(p);for(const zone of ["libraryAvailable","hand","field"])assert.throws(()=>actions(p,{...s,[zone]:s[zone].slice(1)}),/Missing physical/);
 assert.throws(()=>actions(p,{...s,libraryAvailable:[],stage:1}),/Missing physical/);
 assert.throws(()=>actions(p,{...s,libraryAvailable:["red"],consumed:["blue"]}),/consumed physical/);
 assert.throws(()=>actions(p,{...s,consumed:["treasure"]}),/overlapping zones/);
});
test("all legal transition types preserve physical IDs; token disappears into consumed, cards go to graveyard",()=>{
 let s=initial(p),snap=structuredClone(s);
 s=move(s,a=>a.type==="fetch"&&a.targetId==="blue");assert.ok(s.graveyard.includes("f"));
 s=move(s,a=>a.type==="play"&&a.returnId==="blue");assert.ok(s.hand.includes("blue"));
 s=move(s,a=>a.type==="activate"&&a.id==="petal"&&a.output[0]==="U");assert.ok(s.graveyard.includes("petal"));
 s=move(s,a=>a.type==="activate"&&a.id==="treasure"&&a.output[0]==="B");assert.deepEqual(s.consumed,["treasure"]);
 s=move(s,a=>a.type==="activate"&&a.id==="bloom"&&a.output[0]==="B");assert.ok(s.graveyard.includes("bloom"));
 s=move(s,a=>a.type==="ritual");assert.ok(s.graveyard.includes("ritual"));
 s=move(s,a=>a.type==="end");s=move(s,a=>a.type==="play"&&a.id==="blue");s=move(s,a=>a.type==="tap"&&a.id==="blue");s=move(s,a=>a.type==="tap"&&a.id==="swamp");s=move(s,a=>a.type==="cast");assert.ok(completed(p,s));
 assert.throws(()=>actions(p,{...s,consumed:[]}),/Missing physical/);assert.throws(()=>actions(p,{...s,graveyard:s.graveyard.slice(1)}),/Missing physical/);
 assert.notEqual(key(s),key({...s,consumed:[]}));assert.deepEqual(initial(p),snap);
});
test("legacy snapshot and sacrifice accounting are unchanged",()=>{const legacy={...p,version:VERSION};const s=initial(legacy);assert.equal("consumed" in s,false);const a=actions(legacy,s).find(a=>a.type==="activate"&&a.id==="petal");const n=reduce(legacy,s,a).state;assert.equal(n.graveyard.includes("petal"),false);assert.equal("consumed" in n,false);});
