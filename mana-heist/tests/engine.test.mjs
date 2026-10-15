import test from "node:test";
import assert from "node:assert/strict";
import {LEVELS} from "../src/levels.js";
import {CARDS,COLORS,VERSION,validate,initial,actions,reduce,key,payOptions,completed,medal} from "../src/engine.js";
import {solve,replay} from "../src/solver.js";
test("every authored stage is valid, solvable, and replayable", {timeout:110000},()=>{
 assert.equal(LEVELS.length,250);
 let previous=0;
 for(const [i,l] of LEVELS.slice(0,18).entries()){
  assert.equal(l.version,VERSION);assert.equal(validate(l),true);
  const r=solve(l,{maxStates:400000});
  assert.equal(r.status,"solved",l.id+" "+JSON.stringify(r));
  assert.ok(r.turn<=l.turnLimit,l.id);
  assert.ok(r.actions.length>0);
  const sim=replay(l,r.actions);
  assert.equal(sim.ok,true,l.id);
  assert.equal(sim.state.turn,r.turn);
  assert.equal(sim.state.spentLife,r.spentLife);
  assert.equal(medal(l,sim.state,r),3);
  if(i===2)assert.ok(r.turn>=2);
  if(i>=10)assert.ok(r.actions.length>=3);
  previous+=r.explored;
  console.log(l.id,l.title,"turn",r.turn,"life cost",r.spentLife,"actions",r.steps,"states",r.explored);
 }
 console.log("Total expanded distinct states:",previous);
});
test("tapping lands is exclusive until end turn; mana empties between turns",()=>{
 const l=LEVELS[0],s=initial(l);
 const tap=actions(l,s).find(a=>a.type==="tap");
 const next=reduce(l,s,tap).state;
 assert.equal(next.pool.U,1);assert.ok(!actions(l,next).some(a=>a.type==="tap"));
 const t=initial(LEVELS[2]);
 const play=actions(LEVELS[2],t).find(a=>a.type==="play"&&a.id==="a");
 const withLand=reduce(LEVELS[2],t,play).state;
 assert.equal(withLand.played,1);
 assert.ok(!actions(LEVELS[2],withLand).some(a=>a.type==="play"));
 const t2=reduce(LEVELS[2],withLand,{type:"end"}).state;
 assert.equal(t2.played,0);assert.equal(t2.pool.U,0);
});
test("shock lands cost life only for an untapped entry",()=>{
 const l=LEVELS[5],s=initial(l);
 const tapped=reduce(l,s,{type:"play",id:"a",shock:false}).state;
 assert.equal(tapped.life,4);assert.equal(tapped.field[0].tapped,true);
 const fast=reduce(l,s,{type:"play",id:"a",shock:true}).state;
 assert.equal(fast.life,2);assert.equal(fast.field[0].tapped,false);
 assert.notEqual(key(tapped),key(fast));
});
test("colored pain-land mana costs one life, colorless does not",()=>{
 const l=LEVELS[7],s=initial(l);
 const played=reduce(l,s,{type:"play",id:"a",shock:false}).state;
 assert.equal(reduce(l,played,{type:"tap",id:"a",color:"B"}).state.life,1);
 assert.equal(reduce(l,played,{type:"tap",id:"a",color:"C"}).state.life,2);
});
test("mana payment enumerates genuine alternatives for generic costs",()=>{
 const pool={W:1,U:2,B:0,R:1,G:0,C:0};
 const pays=payOptions(pool,{U:1,N:2});
 assert.equal(pays.length,3);
 for(const pay of pays)assert.equal(Object.values(pay).reduce((a,b)=>a+b,0),3);
});
test("fetch sacrifices source and searches only eligible land types",()=>{
 const l=LEVELS[11],s=initial(l);
 const played=reduce(l,s,{type:"play",id:"a",shock:false}).state;
 const options=actions(l,played).filter(a=>a.type==="fetch");
 assert.equal(options.length,2);
 const got=reduce(l,played,options.find(a=>a.targetId==="c")).state;
 assert.equal(got.life,2);
 assert.deepEqual(got.field,[{id:"c",tapped:false}]);
});
test("failures do not mutate the previous state",()=>{
 const l=LEVELS[0],s=initial(l),before=JSON.stringify(s);
 const error=reduce(l,s,{type:"tap",id:"nobody",color:"U"});
 assert.equal(error.ok,false);
 assert.equal(JSON.stringify(s),before);
});
test("bad cards, duplicate IDs and invalid costs fail validation",()=>{
 const l=LEVELS[0];
 assert.throws(()=>validate({...l,version:"bad"}));
 assert.throws(()=>validate({...l,hand:[{id:"a",card:"mountain"}]}));
 assert.throws(()=>validate({...l,stages:[{name:"Bad",cost:{U:-1}}]}));
 assert.throws(()=>validate({...l,stages:[{name:"Bad",cost:{X:1}}]}));
});
test("solver hitting a small search bound is inconclusive, never unsolvable",()=>{
 assert.equal(solve(LEVELS[17],{maxStates:2}).status,"inconclusive");
});
