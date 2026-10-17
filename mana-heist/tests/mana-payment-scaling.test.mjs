import test from "node:test";
import assert from "node:assert/strict";
import {payments} from "../src/mana-engine-v2.js";
import {actions,initial,validate,VERSION} from "../src/engine.js";
import {LEVELS} from "../src/levels.js";
import {certifyCapstone} from "../src/capstone-certificates.js";

test("fourteen identical black requirements select combinations, never factorial permutations",()=>{
 const pool=Array.from({length:16},(_,i)=>({id:"b"+String(i).padStart(2,"0"),color:"B",source:"Coffers",restriction:null}));
 const a=payments(pool,{B:14},{kind:"spell",spellType:"sorcery"});
 assert.equal(a.length,120,"C(16,14) unique sets of source mana");
 const ids=new Set(a.map(x=>x.join(",")));
 assert.equal(ids.size,a.length,"no equivalent permutations");
 assert.ok(a.every(x=>x.length===14));
 assert.deepEqual(payments(pool,{B:17},{kind:"spell",spellType:"sorcery"}),[]);
});
test("restricted mana cannot pay generic activation fee even in large pools",()=>{
 const black=Array.from({length:12},(_,i)=>({id:"r"+i,color:"B",source:"Ancient Ziggurat",restriction:"creature"}));
 assert.deepEqual(payments(black,{N:2},{kind:"activation"}),[]);
 assert.equal(payments(black,{B:2},{kind:"spell",spellType:"creature"}).length,66);
});
test("main engine offers one generic fee option per actual color combination, not per Coffers unit",()=>{
 const l={id:"mh-big-black-demo",version:VERSION,title:"Many",rank:5,chapter:"QA",briefing:"QA",life:20,turnLimit:1,
  field:[{id:"s0",card:"swamp"},{id:"c",card:"coffers"},{id:"u",card:"urborg"},{id:"r",card:"solring"},{id:"s1",card:"swamp"},{id:"s2",card:"swamp"},{id:"s3",card:"swamp"},{id:"s4",card:"swamp"}],
  hand:[],library:[],stages:[{name:"Pay",cost:{B:5}}]};
 assert.ok(validate(l));let s=initial(l);
 const ring=actions(l,s).find(a=>a.type==="activate"&&a.id==="r");
 s=(awaitAction(l,s,ring));
 const coffers=actions(l,s).filter(a=>a.type==="activate"&&a.id==="c");
 assert.equal(coffers.length,1,"2 identical colorless mana can only be paid one color pattern");
 const n=awaitAction(l,s,coffers[0]);
 assert.ok(n.pool.B>=7);
});
function awaitAction(l,s,a){const {reduce}=awaitableEngine;return reduce(l,s,a).state;}
// static import used to avoid runtime async and keep tests fully deterministic
import * as awaitableEngine from "../src/engine.js";
test("all thirty revised puzzles have legal certificates and preserve existing stage ids",()=>{
 const special=LEVELS.filter(l=>l.revision===1);
 assert.equal(special.length,30);
 assert.equal(new Set(LEVELS.map(l=>l.id)).size,250);
 assert.ok(LEVELS[249].field.length===12);
 for(const puzzle of special){
  const proof=certifyCapstone(puzzle);
  assert.equal(proof.status,"solved",puzzle.id);
  assert.match(proof.certification,/optimum not independently proven/);
 }
});
