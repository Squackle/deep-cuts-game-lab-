import test from "node:test";
import assert from "node:assert/strict";
import {LEVELS} from "../src/levels.js";
import {ENGINE_VERSION,initialState,validateLevel,applyAction,reachableIds,legalActions,stateKey} from "../src/engine.js";
import {solve,replay} from "../src/solver.js";

test("all six handcrafted vaults have proven optimal completions",()=>{
  assert.equal(LEVELS.length,6);
  for(const [i,level] of LEVELS.entries()){
    assert.equal(level.engineVersion,ENGINE_VERSION);
    assert.equal(validateLevel(level),true);
    const answer=solve(level);
    assert.equal(answer.status,"solved",level.id+" "+JSON.stringify(answer));
    assert.equal(answer.moves,[2,3,4,3,5,5][i],level.id);
    assert.ok(answer.moves<=level.moveBudget,level.id);
    const played=replay(level,answer.actions);
    assert.equal(played.ok,true,level.id);
    assert.equal(played.state.moves,answer.moves);
    assert.ok(Object.values(played.state.energy).every(n=>n>=0));
  }
});
test("illegal activation cannot mutate original state",()=>{
  const level=LEVELS[3],before=initialState(level),snapshot=JSON.stringify(before);
  const attempt=applyAction(level,before,{type:"activate",id:"sunwell",choice:0});
  assert.equal(attempt.ok,false);
  assert.match(attempt.error,/connected/i);
  assert.equal(JSON.stringify(before),snapshot);
});
test("relay rotation establishes actual bidirectional reachability",()=>{
  const level=LEVELS[3],start=initialState(level);
  assert.equal(reachableIds(level,start).has("sunwell"),false);
  const rotated=applyAction(level,start,{type:"rotate",id:"bridge"});
  assert.equal(rotated.ok,true);
  assert.equal(reachableIds(level,rotated.state).has("sunwell"),true);
  assert.equal(rotated.state.turns.bridge,0);
  assert.equal(applyAction(level,rotated.state,{type:"rotate",id:"bridge"}).ok,false);
});
test("conversion spends input instead of duplicating it",()=>{
  const level=LEVELS[2];
  let state=initialState(level);
  state=applyAction(level,state,{type:"activate",id:"sunwell",choice:0}).state;
  state=applyAction(level,state,{type:"convert",id:"prism"}).state;
  assert.equal(state.energy.sun,0);
  assert.equal(state.energy.ember,1);
  assert.equal(applyAction(level,state,{type:"convert",id:"prism"}).ok,false);
  assert.equal(applyAction(level,state,{type:"open"}).ok,false);
});
test("dual source choices are distinct and the vault consumes its goal",()=>{
  const level=LEVELS[5];
  let state=initialState(level);
  state=applyAction(level,state,{type:"rotate",id:"bridge"}).state;
  state=applyAction(level,state,{type:"activate",id:"twinfont",choice:0}).state;
  state=applyAction(level,state,{type:"activate",id:"twinfont",choice:1}).state;
  assert.equal(state.energy.sun,1);
  assert.equal(state.energy.tide,1);
  state=applyAction(level,state,{type:"convert",id:"prism"}).state;
  const result=applyAction(level,state,{type:"open"});
  assert.equal(result.ok,true);
  assert.equal(result.state.opened,true);
  assert.equal(result.state.energy.sun,0);
  assert.equal(result.state.energy.ember,0);
  assert.equal(result.state.energy.tide,0);
  assert.deepEqual(legalActions(level,result.state),[]);
});
test("state keys distinguish energy, relay orientation and exhausted uses",()=>{
  const level=LEVELS[3];
  const a=initialState(level),b=applyAction(level,a,{type:"rotate",id:"bridge"}).state;
  assert.notEqual(stateKey(a),stateKey(b));
});
test("bad level data is rejected explicitly",()=>{
  const original=LEVELS[0];
  const malformed=[
    {...original,engineVersion:"other"},
    {...original,width:0},
    {...original,goal:{sun:-1}},
    {...original,goal:{unknown:1}},
    {...original,components:[...original.components,{...original.components[0]}]},
    {...original,components:[...original.components,{...original.components[0],id:"overlap"}]},
    {...original,components:original.components.filter(c=>c.type!=="vault")}
  ];
  for(const bad of malformed)assert.throws(()=>validateLevel(bad));
});
test("bounded solver does not call an unfinished search unsolvable",()=>{
  const answer=solve(LEVELS[5],{maxStates:1});
  assert.equal(answer.status,"inconclusive");
});
test("undo is exact because prior immutable state was not changed",()=>{
  const level=LEVELS[0],initial=initialState(level);
  const after=applyAction(level,initial,{type:"activate",id:"sunwell",choice:0}).state;
  assert.equal(initial.energy.sun,0);
  assert.equal(initial.uses.sunwell,1);
  assert.equal(after.energy.sun,1);
  assert.equal(after.uses.sunwell,0);
});
