import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {BASE_LEVELS,LEVELS} from "../src/levels.js";
import {CARDS,actions,initial,reduce,completed,validate,key} from "../src/engine.js";
import {chooseAutomaticCast} from "../src/auto-cast.js";
const land=(id,card)=>({id,card});
const spell=(cost,spellType)=>[{name:"Validate mana path",cost,...(spellType?{spellType}:{})}];
function puzzle(id,field,stages,opts={}){
 return {...BASE_LEVELS[0],id:"mh-integration-"+id,chapter:"MANA ENGINE INTEGRATION",title:id,
  turnLimit:opts.turnLimit||1,life:opts.life||20,
  hand:[],field:field.map(([id,card])=>land(id,card)),library:[],stages:stages,
  ...opts};
}
function play(level,sequence){
 let s=initial(level);
 for(const move of sequence){
  const matches=actions(level,s).filter(a=>move(a,s));
  assert.ok(matches.length,level.id+" missing expected action: "+JSON.stringify({pool:s.pool,field:s.field,turn:s.turn}));
  const result=reduce(level,s,matches[0]);
  assert.equal(result.ok,true,result.error);
  s=result.state;
 }
 return s;
}
const tap=id=>a=>a.type==="tap"&&a.id===id;
const activate=(id,mode)=>a=>a.type==="activate"&&a.id===id&&(!mode||a.mode===mode);
const cast=a=>a.type==="cast";

test("main Mana Heist engine recognizes the added authentic lands and mana artifacts",()=>{
 for(const id of ["signet","bluffs","solring","coffers","urborg","nykthos","lotus","ziggurat","treasure","petal","confluence","command"]){
  assert.ok(CARDS[id],id+" not in main campaign");
  assert.ok(CARDS[id].v2,id+" not bridged into shared rules kernel");
 }
 assert.equal(LEVELS.length,250);
 assert.equal(LEVELS.slice(0,18).filter(x=>x.field.some(f=>f.id==="mana2")).length,0);
 assert.ok(LEVELS.some(x=>x.field.some(f=>f.card==="signet"||f.card==="bluffs")));
 const main=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
 assert.match(main,/a.type==="activate"/);
 assert.match(main,/action.type==="activate"/);
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 assert.doesNotMatch(html,/href="\.\/mana-engine-test\.html"/);
});
test("existing bounce land adds G and U from exactly one tap",()=>{
 const l=puzzle("bounce",[["a","bounceUG"]],spell({U:1,G:1}));
 const s=play(l,[tap("a"),cast]);
 assert.equal(s.pool.U,0);assert.equal(s.pool.G,0);
 assert.ok(completed(l,s));
});
test("Azorius Signet consumes 1 colorless to generate W and U with unspent Island U",()=>{
 const l=puzzle("signet",[["a","relic"],["b","island"],["c","signet"]],spell({W:1,U:2}));
 let s=initial(l);
 assert.equal(actions(l,s).some(activate("c","filter")),false);
 s=play(l,[tap("a"),activate("c","filter"),tap("b"),cast]);
 assert.ok(completed(l,s));assert.equal(s.pool.C,0);
});
test("Cascade Bluffs spends blue before outputting two simultaneous blue mana",()=>{
 const l=puzzle("bluffs",[["a","island"],["b","mountain"],["c","bluffs"],["d","solring"]],spell({U:2,R:1,C:1}));
 const s=play(l,[tap("a"),activate("c","filter-U-0"),tap("b"),activate("d","sol"),cast]);
 assert.ok(completed(l,s));assert.equal(s.pool.C,1);
});
test("Urborg makes Coffers itself and other lands Swamps; Coffers pays 2 and adds correct B",()=>{
 const l=puzzle("coffers",[["a","swamp"],["b","swamp"],["c","coffers"],["d","urborg"],["e","solring"]],spell({B:4}));
 const s=play(l,[activate("e","sol"),activate("c","coffers"),cast]);
 assert.ok(completed(l,s));
});
test("Ancient Ziggurat creature-only mana cannot cast ward sorcery or power the Signet",()=>{
 const creature=puzzle("creature",[["a","ziggurat"],["b","relic"],["c","signet"]],spell({G:1,W:1,U:1},"creature"));
 const s=play(creature,[activate("a","ziggurat-G"),tap("b"),activate("c","filter"),cast]);
 assert.ok(completed(creature,s));
 const sorcery=puzzle("sorcery",[["a","ziggurat"],["b","island"],["c","forest"]],spell({G:1,U:1}));
 const a=play(sorcery,[activate("a","ziggurat-G"),tap("b")]);
 assert.equal(actions(sorcery,a).some(cast),false);
 assert.equal(actions(sorcery,a).some(tap("c")),true);
 const afterForest=reduce(sorcery,a,actions(sorcery,a).find(tap("c"))).state;
 const done=reduce(sorcery,afterForest,actions(sorcery,afterForest).find(cast));
 assert.ok(done.ok);
 assert.ok(completed(sorcery,done.state));
 assert.equal(done.state.pool.G,1,"restricted G unit should remain in the pool, not be spent on a sorcery");
});
test("sacrifice-based Treasure and Petal disappear from the battlefield after use",()=>{
 const l=puzzle("sacrifice",[["a","petal"],["b","treasure"],["c","island"],["d","mountain"]],spell({W:1,G:1,U:1,R:1}));
 const s=play(l,[activate("a","petal-W"),activate("b","treasure-G"),tap("c"),tap("d"),cast]);
 assert.ok(completed(l,s));assert.ok(!s.field.some(f=>f.id==="a"||f.id==="b"));
});
test("multi-unit mana sources and paid activations preserve Undo-safe previous state",()=>{
 const l=puzzle("undo",[["a","solring"],["b","signet"]],spell({W:1,U:1}));
 const old=initial(l),before=JSON.stringify(old),move=actions(l,old).find(activate("a","sol"));
 const after=reduce(l,old,move).state;
 assert.deepEqual(after.pool,{W:0,U:0,B:0,R:0,G:0,C:2});
 assert.equal(JSON.stringify(old),before);
 assert.notEqual(key(after),key(old));
 assert.ok(completed(l,play(l,[activate("a","sol"),activate("b","filter"),cast])));
});
test("existing 250-stage save identifiers, baseline replay and first eighteen tutorials remain stable",()=>{
 for(const [i,l] of LEVELS.entries()){
  assert.equal(validate(l),true,l.id);
  assert.equal(l.id,i<18?"mh-"+String(i+1).padStart(2,"0"):"mh-"+String(i+1).padStart(3,"0"));
 }
});
