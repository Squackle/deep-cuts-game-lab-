import {test} from "node:test";
import assert from "node:assert/strict";
import {createEngine} from "../engine.mjs";

// A fixed scripted player: builds round-robin, upgrades when rich, casts every card it can, calls some waves early.
const KINDS=["pyre","arcanum","legion","grove","judgment","storm","hex","thorn","necropolis","goblin","beast","mirror","chapel","foundry","library"];
function act(g,i){const s=g.state;
 for(const p of g.map.pads){if(s.rubble[p.id]&&s.mana>s.rubble[p.id]+150)g.command({type:"clear",pad:p.id});
  if(!s.towers[p.id]&&!s.rubble[p.id]){const k=KINDS[(p.id+i)%KINDS.length];if(s.mana>=g.roster[k].cost+40)g.command({type:"build",pad:p.id,kind:k});}}
 for(const t of Object.values(s.towers)){const c=g.upgradeCost(t);if(c!==null&&s.mana>c*1.5)g.command({type:"upgrade",pad:t.id,branch:t.tier===2?(t.id%2?"A":"B"):undefined});}
 for(let h=s.hand.length-1;h>=0;h--){const spec=g.cards[s.hand[h]],e=s.enemies[0],tw=Object.values(s.towers).sort((a,b)=>a.id-b.id);
  g.command({type:"cast",index:h,...(spec.target==="ground"?(e?g.pointAt(e.progress):{x:500,y:300}):spec.target==="tower"?{pad:(tw.find(t=>g.roster[t.kind].kind==="troops")||tw[0])?.id}:{})});}
 if(s.commander&&s.phase==="active"&&s.tick%50===0)g.command({type:"ability"});
}
// Plays to `waves`; with `saveEvery`, the run is saved and resumed into a fresh engine every that many ticks.
function play({seed,map,commander,waves,early=false,saveEvery=0}){
 let g=createEngine(seed,"campaign",map);if(commander)g.command({type:"commander",id:commander});let i=0;
 for(let n=0;n<200000;n++){const s=g.state;if(s.phase==="lost"||s.phase==="won"||(s.wave>=waves&&s.phase==="ready"))break;
  if(s.phase==="ready"){act(g,i++);g.command({type:"wave"});continue;}
  if(s.tick%20===0)act(g,i);if(early&&s.wave<waves&&s.tick%150===0)g.command({type:"early"});g.step();
  if(saveEvery&&g.state.tick%saveEvery===0){const save=JSON.parse(JSON.stringify(g.snapshot())),h=createEngine(1,save.state.initialMode,save.state.mapId);assert.ok(h.restore(save),"restore at tick "+g.state.tick);g=h;}}
 return g.playtestReport();
}

// Regression: a resumed run lost the link between each boss on the road and its boss-log entry, so the copied
// battle stats never recorded that boss's outcome and its time kept counting up.
test("a run saved and resumed mid-wave plays out and reports exactly like an unbroken run",()=>{
 for(const sc of [{seed:1,map:"hollow",commander:"krenko",waves:15},{seed:7,map:"confluence",commander:"edgar",waves:12,early:true},{seed:42,map:"frostfen",commander:"urdragon",waves:10},{seed:9,map:"pass",commander:"talrand",waves:10},{seed:5,map:"caldera",commander:"krenko",waves:10}]){
  const straight=play(sc),resumed=play({...sc,saveEvery:97});
  assert.ok(straight.bossLog.length>=2&&straight.bossLog.every(b=>b.outcome),"bosses reached and finished in "+sc.map);
  assert.deepEqual(resumed.bossLog,straight.bossLog,"boss log after resuming on "+sc.map);
  assert.deepEqual(resumed,straight,"whole report after resuming on "+sc.map);
 }
});

test("a boss saved mid-fight is still tracked in the boss log after resuming",()=>{
 const g=createEngine(1,"sandbox","hollow");assert.ok(g.command({type:"sandboxEnemy",enemy:"grimgut",count:1}));g.step();
 const h=createEngine(1,"sandbox","hollow");assert.ok(h.restore(JSON.parse(JSON.stringify(g.snapshot()))));
 const boss=h.state.enemies.find(e=>e.kind==="grimgut");assert.equal(boss.bossRec,h.state.bossLog[0],"same record");
 boss.hp=1;boss.progress=h.map.distance+5;h.step();
 assert.equal(h.playtestReport().bossLog[0].outcome,"leaked");
});

test("malformed saved collections never mutate a live run; invalid resources are rejected",()=>{
 const g=createEngine(31,"sandbox","hollow");
 assert.ok(g.command({type:"sandboxEnemy",enemy:"grimgut",count:1}));g.step();
 const baseline=JSON.stringify(g.snapshot().state);
 const changes=[
  ["bossLog object",s=>{s.bossLog={};}],
  ["null boss record",s=>{s.bossLog=[null];}],
  ["waveHistory object",s=>{s.waveHistory={};}],
  ["queue object",s=>{s.queue={};}],
  ["hand object",s=>{s.hand={};}],
  ["stats array",s=>{s.stats=[];}],
  ["towers array",s=>{s.towers=[];}],
  ["rubble null",s=>{s.rubble=null;}],
  ["negative wave",s=>{s.wave=-1;}],
  ["fractional tick",s=>{s.tick=.5;}],
  ["negative mana",s=>{s.mana=-1;}]
 ];
 for(const [label,change] of changes){
  const bad=JSON.parse(JSON.stringify(g.snapshot()));change(bad.state);
  assert.equal(g.restore(bad),false,label+" must be rejected");
  assert.equal(JSON.stringify(g.snapshot().state),baseline,label+" must not partially mutate the run");
 }
 assert.ok(g.restore(JSON.parse(JSON.stringify(g.snapshot()))),"a valid saved battle still restores");
 g.step();assert.ok(Number.isFinite(g.state.tick));
});

test("fixed-seed combat has identical outcomes after checkpoints across maps and unranked modes",()=>{
 for(const [map,mode,seed] of [
  ["hollow","campaign",11],["confluence","campaign",13],["frostfen","campaign",17],
  ["pass","campaign",19],["caldera","campaign",23],["hollow","endless",29],["caldera","sandbox",31]
 ]){
  const g=createEngine(seed,mode,map);
  assert.ok(g.command({type:"build",pad:0,kind:"judgment"}),map+" build");
  assert.ok(g.command({type:"wave"}),map+" wave");
  let h=null;
  for(let t=0;t<380;t++){
   g.step();if(t===117){const saved=JSON.parse(JSON.stringify(g.snapshot()));h=createEngine(1,mode,map);assert.ok(h.restore(saved),map+" restore");}
   if(h)h.step();
  }
  // h was resumed after g's step at checkpoint: h must advance from the same tick, not one extra tick.
  assert.equal(h.state.tick,g.state.tick+1,map+" replay offset");
  const h2=createEngine(1,mode,map);assert.ok(h2.restore(JSON.parse(JSON.stringify(g.snapshot()))),map+" final restore");
  for(let t=0;t<30;t++){g.step();h2.step();}
  assert.deepEqual(h2.playtestReport(),g.playtestReport(),map+"/"+mode+" deterministic continuation");
 }
});
