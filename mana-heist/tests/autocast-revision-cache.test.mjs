import test from "node:test";
import assert from "node:assert/strict";
import {VERSION,initial,actions,reduce,completed} from "../src/engine.js";
import {chooseAutomaticCast,resolveAutomaticCasts} from "../src/auto-cast.js";

function board(color,revision){
 return {id:"mh-cache-regression",version:VERSION,revision,turnLimit:1,life:20,hand:[],library:[],
  field:[{id:"blue",card:"island"},{id:"red",card:"mountain"}],
  stages:[{name:"Generic ward",cost:{N:1}},{name:"Final ward",cost:{[color]:1}}]};
}
function charged(level){
 let state=initial(level);
 for(const id of ["blue","red"]){
  const tap=actions(level,state).find(a=>a.type==="tap"&&a.id===id);
  const next=reduce(level,state,tap);
  assert.equal(next.ok,true);
  state=next.state;
 }
 return state;
}

test("auto-cast does not reuse a legal but losing cached allocation across revisions",()=>{
 const blue=board("U",1),red=board("R",2);
 const a=charged(blue),b=charged(red);
 assert.equal(chooseAutomaticCast(blue,a).spend.R,1);
 assert.equal(chooseAutomaticCast(red,b).spend.U,1);
 assert.equal(completed(red,resolveAutomaticCasts(red,b).state),true);
 assert.equal(completed(blue,resolveAutomaticCasts(blue,a).state),true);
});
