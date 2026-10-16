import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ENGINE_VERSION,PHASES,SOURCES,initial,legalActions,apply,complete,effectiveTypes,payments,solve,stateKey} from "../src/mana-engine-v2.js";
import {ENGINE_SCENARIOS} from "../src/mana-lab-scenarios.js";
const get=id=>ENGINE_SCENARIOS.find(s=>s.id===id);
function step(s,state,predicate){
 const action=legalActions(s,state).find(predicate);
 assert.ok(action,"Expected legal action; pool="+state.pool.map(x=>x.color).join("")+" phase="+state.phase);
 const result=apply(s,state,action);assert.equal(result.ok,true,result.error);
 return result.state;
}
const activate=(id,mode)=>a=>a.type==="activate"&&a.source===id&&(!mode||a.mode===mode);
const cast=a=>a.type==="cast";

test("isolated 2.0 mana engine is independent of the legacy save/version",()=>{
 assert.equal(ENGINE_VERSION,"mh-mana-lab-2.0.0");
 assert.ok(ENGINE_SCENARIOS.length>=10);
 assert.equal(new Set(ENGINE_SCENARIOS.map(s=>s.id)).size,ENGINE_SCENARIOS.length);
 assert.deepEqual(PHASES,["main1","combat","main2","end"]);
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 assert.match(html,/href="\.\/mana-engine-test\.html"/);
 assert.match(readFileSync(new URL("../mana-engine-test.html",import.meta.url),"utf8"),/id="manaPool"/);
 assert.match(readFileSync(new URL("../src/engine.js",import.meta.url),"utf8"),/mh-landfall-0\.2\.0/);
});

test("conversion chain: pay Wastes to activate Azorius Signet; blue Island finishes WUU",()=>{
 const s=get("p02-01");let x=initial(s);
 assert.ok(!legalActions(s,x).some(activate("c","filter")));
 x=step(s,x,activate("a"));assert.deepEqual(x.pool.map(m=>m.color),["C"]);
 x=step(s,x,activate("c","filter"));assert.deepEqual(x.pool.map(m=>m.color),["W","U"]);
 x=step(s,x,activate("b"));x=step(s,x,cast);assert.ok(complete(s,x));
 assert.equal(x.pool.length,0);
});
test("Cascade Bluffs filter consumes one blue and produces two blue simultaneously",()=>{
 const s=get("p02-02");let x=initial(s);
 x=step(s,x,activate("a"));
 x=step(s,x,activate("c","filter-U-0"));
 assert.deepEqual(x.pool.map(m=>m.color),["U","U"]);
 assert.equal(x.permanents.find(p=>p.id==="c").tapped,true);
 x=step(s,x,activate("b"));
 x=step(s,x,activate("d"));
 x=step(s,x,cast);assert.ok(complete(s,x));
});
test("Cabal Coffers counts ALL Swamps including Urborg and itself, after paying two mana",()=>{
 const s=get("p02-03");let x=initial(s);
 const coffers=x.permanents.find(p=>p.key==="coffers");
 assert.ok(effectiveTypes(x,coffers).includes("Swamp"));
 assert.ok(effectiveTypes(x,x.permanents.find(p=>p.key==="urborg")).includes("Swamp"));
 x=step(s,x,activate("e","sol"));
 x=step(s,x,activate("c","coffers"));
 assert.equal(x.pool.filter(m=>m.color==="B").length,4);
 x=step(s,x,cast);assert.ok(complete(s,x));
});
test("Lotus Field outputs triple ONE chosen color; Simic Growth Chamber correctly outputs both G and U",()=>{
 const s=get("p02-04");let x=initial(s);
 x=step(s,x,activate("a","lotus-U"));
 assert.deepEqual(x.pool.map(m=>m.color),["U","U","U"]);
 x=step(s,x,activate("b"));x=step(s,x,cast);assert.ok(complete(s,x));
 const custom={id:"simic-demo",sources:[{id:"sim",key:"simic"}],goals:[{name:"Double",cost:{U:1,G:1},spellType:"sorcery"}]};
 let y=initial(custom);y=step(custom,y,activate("sim","tap-pair"));
 assert.deepEqual(y.pool.map(m=>m.color),["G","U"]);
});
test("restricted mana can pay a creature spell, but NOT an artifact activation or a noncreature instant",()=>{
 const s=get("p02-05");let x=initial(s);
 x=step(s,x,activate("a","ziggurat-G"));
 assert.equal(x.pool[0].restriction,"creature");
 assert.deepEqual(payments(x.pool,{N:1},{kind:"activation"}),[]);
 assert.ok(!legalActions(s,x).some(activate("c","filter")));
 x=step(s,x,activate("b"));x=step(s,x,activate("c","filter"));x=step(s,x,cast);
 assert.ok(complete(s,x));
 const other=get("p02-06");let y=initial(other);y=step(other,y,activate("a","ziggurat-G"));y=step(other,y,activate("c"));
 assert.equal(legalActions(other,y).filter(cast).length,0);
 y=step(other,y,activate("b"));y=step(other,y,cast);assert.ok(complete(other,y));
 assert.equal(y.pool.length,1,"restricted green remains unusable for the instant");
});
test("devotion powered Nykthos must pay two, then produce fixed green devotion five",()=>{
 const s=get("p02-07");let x=initial(s);x=step(s,x,activate("d","sol"));x=step(s,x,activate("a","devotion-G"));
 assert.equal(x.pool.length,5);assert.ok(x.pool.every(m=>m.color==="G"));
 x=step(s,x,cast);assert.ok(complete(s,x));
});
test("advancing a phase empties floating mana, but does not untap sources",()=>{
 const s=get("p02-08");let x=initial(s);x=step(s,x,activate("a","sol"));
 assert.equal(x.pool.length,2);
 x=step(s,x,a=>a.type==="advance");
 assert.equal(x.phase,"combat");assert.equal(x.pool.length,0);
 assert.equal(x.permanents.find(p=>p.id==="a").tapped,true);
 x=step(s,x,a=>a.type==="advance");
 assert.equal(x.phase,"main2");
 assert.ok(!legalActions(s,x).some(activate("a","sol")));
 assert.ok(!legalActions(s,x).some(cast));
 let y=initial(s);y=step(s,y,a=>a.type==="advance");
 y=step(s,y,a=>a.type==="advance");
 y=step(s,y,activate("a","sol"));y=step(s,y,cast);assert.ok(complete(s,y));
});
test("Treasure taps and sacrifices; Lotus Petal sacrifices without tapping; cannot reuse either",()=>{
 const s=get("p02-09");let x=initial(s);
 x=step(s,x,activate("a","petal-W"));
 assert.equal(x.permanents.some(p=>p.id==="a"),false);
 x=step(s,x,activate("b","treasure-G"));
 assert.equal(x.permanents.some(p=>p.id==="b"),false);
 x=step(s,x,activate("c"));x=step(s,x,activate("d"));
 x=step(s,x,cast);assert.ok(complete(s,x));
});
test("two conversions in the same turn: six-source late-mana board",()=>{
 const s=get("p02-10");let x=initial(s);
 x=step(s,x,activate("a"));x=step(s,x,activate("d","filter"));
 x=step(s,x,activate("b"));x=step(s,x,activate("e","filter-U-0"));
 x=step(s,x,activate("c"));x=step(s,x,activate("f"));
 x=step(s,x,cast);assert.ok(complete(s,x));
});
test("generic can pay from colors, but true colorless symbol requires C",()=>{
 const u=[{id:"u1",color:"U",restriction:null},{id:"c1",color:"C",restriction:null}];
 assert.equal(payments(u,{N:1}).length,2);
 assert.deepEqual(payments(u,{C:1}),[["c1"]]);
 assert.equal(payments([u[0]],{C:1}).length,0);
 assert.equal(payments([u[1]],{U:1}).length,0);
});
test("mutations are pure, illegal/forged action rejected, state key preserves restricted mana type",()=>{
 const s=get("p02-01"),a=initial(s),snapshot=JSON.stringify(a);
 const move=legalActions(s,a).find(activate("a"));
 const b=apply(s,a,move);
 assert.equal(b.ok,true);assert.equal(JSON.stringify(a),snapshot);
 assert.equal(apply(s,a,{type:"cast",spend:[]}).ok,false);
 assert.notEqual(stateKey(b.state),stateKey(a));
 const unrestricted={...b.state,pool:b.state.pool.map(m=>({...m,restriction:"creature"}))};
 assert.notEqual(stateKey(b.state),stateKey(unrestricted));
});
test("bounded solver proves initial conversion puzzle with legal replay, returns explicit status",()=>{
 const s=get("p02-01"),result=solve(s,{maxStates:10000});
 assert.equal(result.status,"solved");
 let state=initial(s);
 for(const action of result.steps){const r=apply(s,state,action);assert.equal(r.ok,true);state=r.state;}
 assert.ok(complete(s,state));
});
