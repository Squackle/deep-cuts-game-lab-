import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {LEVELS} from "../src/levels.js";
import {LEARN_LEVELS} from "../src/expanded-learn.js";
import {SOURCES,modesFor} from "../src/mana-engine-v2.js";
import {CARDS,actions,initial,reduce,completed,validate} from "../src/engine.js";
import {referenceFor} from "../src/card-references.js";
import {solve,replay} from "../src/solver.js";

const choose=(level,state,predicate)=>{
 const a=actions(level,state).find(predicate);
 assert.ok(a,"Expected legal move on "+level.id+": "+JSON.stringify(state.pool));
 const r=reduce(level,state,a);assert.ok(r.ok,r.error);
 return r.state;
};

test("Fellwar Stone uses declared opponent-land colors, never colorless or invented colors",()=>{
 assert.equal(CARDS.fellwar.name,"Fellwar Stone");
 assert.equal(SOURCES.fellwar.dynamic,"fellwar");
 const s=LEARN_LEVELS[26];assert.equal(validate(s),true);
 assert.deepEqual(s.opponentLandColors,["W","B"]);
 let x=initial(s);
 assert.deepEqual(actions(s,x).filter(a=>a.id==="f0").map(a=>a.mode).sort(),["fellwar-B","fellwar-W"]);
 x=choose(s,x,a=>a.type==="activate"&&a.id==="f0"&&a.mode==="fellwar-W");
 x=choose(s,x,a=>a.type==="tap"&&a.id==="f1"&&a.color==="U");
 assert.equal(x.pool.W,1);assert.equal(x.pool.U,1);
 x=choose(s,x,a=>a.type==="cast");assert.ok(completed(s,x));
 const permanent={id:"stone",key:"fellwar",tapped:false};
 const board={permanents:[permanent]};
 const palette=modesFor({opponentLandColors:["U","C","B","U"]},board,permanent).map(m=>m.id);
 assert.deepEqual(palette,["fellwar-U","fellwar-B"],"duplicate options and true colorless excluded");
 assert.deepEqual(modesFor({},board,permanent),[],"no opponent-land evidence means no fabricated mana color");
 assert.throws(()=>validate({...s,opponentLandColors:["C"]}),/Invalid opponent land colors/);
});

test("Talisman of Dominance trades one unprevented damage for U or B, not for C",()=>{
 assert.equal(CARDS.talisman.name,"Talisman of Dominance");
 const level=LEARN_LEVELS[27];assert.equal(validate(level),true);
 assert.equal(level.life,2);
 let x=initial(level);
 assert.deepEqual(actions(level,x).filter(a=>a.id==="f0").map(a=>a.mode).sort(),
  ["talisman-B","talisman-C","talisman-U"]);
 x=choose(level,x,a=>a.type==="activate"&&a.id==="f0"&&a.mode==="talisman-B");
 assert.equal(x.life,1);assert.equal(x.spentLife,1);assert.equal(x.pool.B,1);
 x=choose(level,x,a=>a.type==="tap"&&a.id==="f1"&&a.color==="U");
 x=choose(level,x,a=>a.type==="tap"&&a.id==="f2"&&a.color==="C");
 x=choose(level,x,a=>a.type==="cast");assert.ok(completed(level,x));
 const oneLife=initial({...level,life:1});
 assert.deepEqual(actions({...level,life:1},oneLife).filter(a=>a.id==="f0").map(a=>a.mode),["talisman-C"],
  "game does not permit lethal self-damage in a teaching challenge");
 const colorless=choose(level,initial(level),a=>a.type==="activate"&&a.id==="f0"&&a.mode==="talisman-C");
 assert.equal(colorless.life,2);assert.equal(colorless.spentLife,0);assert.equal(colorless.pool.C,1);
});

test("both new lessons are solver-certified, preserve all 500 scored campaign IDs and saved progress", {timeout:20000},()=>{
 assert.equal(LEARN_LEVELS.length,28);assert.equal(LEVELS.length,500);
 assert.deepEqual(LEARN_LEVELS.slice(0,18).map(l=>l.id),LEVELS.slice(0,18).map(l=>l.id));
 assert.deepEqual(LEARN_LEVELS.slice(26).map(l=>l.id),["mh-learn-27","mh-learn-28"]);
 for(const level of LEARN_LEVELS.slice(26)){
  const proof=solve(level,{maxStates:30000});
  assert.equal(proof.status,"solved",level.id+" "+JSON.stringify(proof));
  assert.ok(replay(level,proof.actions).ok,level.id);
 }
 const ui=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
 assert.match(ui,/dc-mana-heist-landfall-v2/);
 assert.match(ui,/dc-mana-heist-variety-v1/);
 assert.match(ui,/OPPONENT LAND COLORS/);
 assert.ok(referenceFor("fellwar")?.image.includes("Fellwar%20Stone"));
 assert.ok(referenceFor("talisman")?.image.includes("Talisman%20of%20Dominance"));
});
