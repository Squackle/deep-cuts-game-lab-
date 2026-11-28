import test from "node:test";
import assert from "node:assert/strict";
import {VERSION,initial,actions,reduce} from "../src/engine.js";
import {replayPhysicalReference} from "../src/readiness-audit.js";
const board=()=>({id:"mh-fetch-invariant",version:VERSION,turnLimit:1,life:20,hand:[],
 field:[{id:"f1",card:"fetchUR"},{id:"f2",card:"fetchUR"}],library:[{id:"blue",card:"island"},{id:"red",card:"mountain"}],
 stages:[{name:"Mixed ward",cost:{U:1,R:1}}]});
function take(level,state,predicate){
 const a=actions(level,state).find(predicate);
 assert.ok(a);const out=reduce(level,state,a);assert.ok(out.ok,out.error);
 return [out.state,a];
}
test("readiness audit rejects a second fetch of the same physical library card",()=>{
 const level=board(),s=initial(level);
 const [after,first]=take(level,s,a=>a.type==="fetch"&&a.id==="f1"&&a.targetId==="blue");
 const [,duplicate]=take(level,after,a=>a.type==="fetch"&&a.id==="f2"&&a.targetId==="blue");
 const result=replayPhysicalReference(level,[first,duplicate]);
 assert.equal(result.ok,false);assert.match(result.error,/already fetched: blue/);
 assert.equal(result.state.field.filter(f=>f.id==="blue").length,1);
});
test("readiness audit accepts distinct fetch targets and exact mana consumption",()=>{
 const level=board();let state=initial(level),trace=[];
 for(const predicate of [
 a=>a.type==="fetch"&&a.id==="f1"&&a.targetId==="blue",
 a=>a.type==="fetch"&&a.id==="f2"&&a.targetId==="red",
 a=>a.type==="tap"&&a.id==="blue",a=>a.type==="tap"&&a.id==="red",
 a=>a.type==="cast"
 ]){
  const [next,a]=take(level,state,predicate);state=next;trace.push(a);
 }
 const result=replayPhysicalReference(level,trace);
 assert.equal(result.ok,true);assert.equal(result.state.life,18);
 assert.deepEqual(result.state.manaUnits,[]);
});
