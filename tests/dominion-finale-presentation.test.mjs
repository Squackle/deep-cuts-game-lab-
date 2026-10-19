import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {victoryDetails,drawBroodTrailFinale,BROOD_FINALE_COLORS,CELEBRATED_OUTCOMES} from "../src/victory-scenes.js";
import {VictoryFanfare,VICTORY_FANFARES,midiHz} from "../src/victory-fanfare.js";
import {VICTORY_HUNT_DESKTOP_AVIF,VICTORY_HUNT_MOBILE_AVIF} from "../src/victory-art.js";
import {newRun,ENDINGS,RULES_VERSION} from "../src/engine.js";
import {createLairRun} from "../src/lair.js";

const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
function runWith(mode,outcome,status="won"){
 const r=newRun({seed:117,mode});r.status=status;r.outcome=outcome;r.score=14200;
 r.evolutionsChosen=12;r.kills=14;r.brood=240;return r;
}
function mockCanvas(){
 const rects=[];
 return {rects,ctx:{save(){},restore(){},set imageSmoothingEnabled(v){this.smoothing=v},
 fillRect(x,y,w,h){rects.push([x,y,w,h,this.fillStyle])},fillStyle:""}};
}
function fakeAudio(state="running"){
 const scheduled=[],disconnected=[];
 const gainNode=()=>({
  gain:{value:0,setValueAtTime(...args){scheduled.push(["set",...args])},
   linearRampToValueAtTime(...args){scheduled.push(["ramp",...args])},
   exponentialRampToValueAtTime(...args){scheduled.push(["fade",...args])}},
  connect(){return this},disconnect(){disconnected.push("gain")}
 });
 return {scheduled,disconnected,ctx:{state,currentTime:5,destination:{},
  createGain:gainNode,createOscillator:()=>({
   frequency:{setValueAtTime(...args){scheduled.push(["note",...args])}},
   connect(){return gainNode()},start(t){scheduled.push(["start",t])},
   stop(t){scheduled.push(["stop",t])},type:"square"
  })}};
}
test("Hunt celebration is for an actually earned final Broodmother victory only",()=>{
 const r=runWith("hunt",ENDINGS.BROODMOTHER_DEFEATED);
 assert.equal(victoryDetails(r)?.kind,"hunt");
 assert.equal(victoryDetails(r)?.title,"THE HIVE REIGNS");
 assert.equal(victoryDetails(r)?.countLabel,"CAPTURES");
 assert.equal(victoryDetails(r)?.count,14);
 assert.equal(victoryDetails({...r,lairBoss:"broodmother"}),null);
 assert.equal(victoryDetails({...r,status:"running"}),null);
 for(const kind of [null,ENDINGS.DEATH,ENDINGS.STEP_LIMIT,ENDINGS.LAIR_PRACTICE,ENDINGS.PERFECT_CLEAR])
  assert.equal(victoryDetails({...r,outcome:kind}),null,"Hunt must reject "+kind);
});
test("Brood Trail finale is earned only on authentic board fill, never step limit or Lair",()=>{
 const r=runWith("classic",ENDINGS.PERFECT_CLEAR);
 assert.equal(victoryDetails(r)?.kind,"classic");
 assert.equal(victoryDetails(r)?.title,"HIVE COMPLETE!");
 assert.equal(victoryDetails(r)?.countLabel,"ORBS");
 assert.equal(victoryDetails(r)?.count,240);
 for(const outcome of [ENDINGS.STEP_LIMIT,ENDINGS.BROODMOTHER_DEFEATED,ENDINGS.DEATH,ENDINGS.LAIR_PRACTICE,null])
  assert.equal(victoryDetails({...r,outcome}),null);
 const lair=createLairRun("broodmother");lair.status="won";lair.outcome=ENDINGS.LAIR_PRACTICE;
 assert.equal(victoryDetails(lair),null);
 assert.deepEqual(CELEBRATED_OUTCOMES,["broodmother_defeated","perfect_clear"]);
 assert.equal(RULES_VERSION,"hive-1.5.4");
});
test("Brood Trail canvas paints thousands of distinct pixel-art tiles and five-color segments",()=>{
 const {ctx,rects}=mockCanvas();
 assert.equal(drawBroodTrailFinale(ctx,600,false),true);
 assert.ok(rects.length>5000,"pixelated full-cave illustration has several independent layers");
 assert.ok(BROOD_FINALE_COLORS.every(color=>rects.some(r=>r[4]===color)));
 assert.ok(rects.some(r=>r[4]==="#fff3c6"),"eyes and sprite highlights");
 assert.ok(rects.every(r=>r.slice(0,4).every(Number.isFinite)));
 assert.equal(ctx.smoothing,false);
 assert.equal(drawBroodTrailFinale(null),false);
});
test("Reduced motion disables scene movement but never eliminates its celebratory artwork",()=>{
 const a=mockCanvas(),b=mockCanvas(),c=mockCanvas();
 drawBroodTrailFinale(a.ctx,150,true);
 drawBroodTrailFinale(b.ctx,98000,true);
 drawBroodTrailFinale(c.ctx,98000,false);
 assert.deepEqual(a.rects,b.rects,"pixel art must be unchanged over time in reduced-motion mode");
 assert.notDeepEqual(a.rects,c.rects,"ordinary mode animates the celebration");
});
test("Full-resolution approved Sliver artwork is copied into genuine arcade presentation only",()=>{
 for(const value of [VICTORY_HUNT_DESKTOP_AVIF,VICTORY_HUNT_MOBILE_AVIF]){
  assert.match(value,/^data:image\/avif;base64,/);
  const bytes=Buffer.from(value.split(",")[1],"base64");
  assert.equal(bytes.toString("ascii",4,8),"ftyp");
  assert.equal(bytes.toString("ascii",8,12),"avif");
  assert.ok(bytes.length>42000);
 }
 const art=read("../src/victory-art.js");
 assert.doesNotMatch(art,/from ["']\.\.\/director|createDirectorRun|DIRECTOR_ONLY|super-orb|cheat/i);
 const main=read("../src/main.js");
 assert.doesNotMatch(main,/from ["']\.\.\/director|director\/mode|spawnDirectorSuperOrb/);
 const publicPolicy=read("../docs/MAIN-SITE-PROMOTION.md");
 assert.match(publicPolicy,/director\/\*\*/);
});
test("Music fanfare is deliberate one-shot, melodic, and honors mute/unlocked audio",()=>{
 assert.equal(Object.keys(VICTORY_FANFARES).length,2);
 assert.notDeepEqual(VICTORY_FANFARES.perfect_clear,VICTORY_FANFARES.broodmother_defeated);
 assert.equal(Math.round(midiHz(69)),440);
 const audio=fakeAudio(),sting=new VictoryFanfare();
 assert.equal(sting.play(audio.ctx,"perfect_clear",false),false);
 assert.equal(audio.scheduled.length,0,"mute does not instantiate a sound node");
 assert.equal(sting.play({...audio.ctx,state:"suspended"},"perfect_clear",true),false);
 assert.equal(sting.play(audio.ctx,"death",true),false);
 assert.equal(sting.play(audio.ctx,"perfect_clear",true),true);
 assert.equal(sting.playing,true);assert.equal(sting.lastOutcome,"perfect_clear");
 assert.equal(audio.scheduled.filter(x=>x[0]==="start").length,20);
 assert.equal(sting.play(audio.ctx,"broodmother_defeated",true),true);
 assert.equal(sting.lastOutcome,"broodmother_defeated");
 sting.stop();
 assert.equal(sting.playing,false);
 assert.ok(audio.disconnected.length>=2,"stops disconnect audio for mute, replay and navigation");
});
test("Full-bleed responsive earned finale UI keeps score and controls outside painted art",()=>{
 const html=read("../index.html"),css=read("../styles.css"),main=read("../src/main.js");
 const required=["victoryOverlay","victoryHuntDesktop","victoryHuntMobile","victoryTrailCanvas",
 "victoryHeading","victoryStory","victoryScore","victoryCount","victoryEvolutions",
 "victoryPlayAgain","victoryReturn","victoryRewatch"];
 for(const id of required)assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/id="victoryOverlay"[^>]*role="dialog" aria-modal="true"/);
 assert.match(css,/\.dominion-victory\{\s*position:fixed;inset:0;z-index:3000/);
 assert.match(css,/\.dominion-victory-art img\{[^}]*object-fit:cover/s);
 assert.match(css,/@media\(max-width:700px\) and \(orientation:portrait\)/);
 assert.match(css,/env\(safe-area-inset-bottom/);
 assert.match(css,/\.dominion-victory-actions button\{[^}]*min-height:50px/s);
 assert.match(css,/\.dominion-victory--hunt \.dominion-victory-narrative\{/);
 assert.match(main,/showVictoryCelebration\(state\.run\)/);
 assert.match(main,/victoryDetails\(run\)/);
 assert.match(main,/victoryFanfare\.play\(state\.ctx,state\.run\.outcome,state\.musicOn&&!document\.hidden\)/);
 assert.match(main,/drawBroodTrailFinale\(ctx,Math\.max\(0,now-victoryOpenedAt\),reduced\)/);
 assert.match(main,/VICTORY_PAINT_INTERVAL_MS=1000\/24/);
 assert.match(main,/if\(lastVictoryDrawAt>=0&&\(reduced\|\|now-lastVictoryDrawAt<VICTORY_PAINT_INTERVAL_MS\)\)return/);
 assert.match(main,/\$\("victoryPlayAgain"\)\.addEventListener\("click"/);
 assert.match(main,/\$\("victoryReturn"\)\.addEventListener\("click"/);
 assert.match(main,/\$\("victoryRewatch"\)\.addEventListener\("click"/);
 assert.match(main,/if\(document\.hidden\)\{\s*victoryFanfare\.stop\(\)/);
 assert.match(main,/if\(!showVictoryCelebration\(state\.run\)\)\{/);
});
test("The regular arcade cannot show an earned finale while a run is active, over, limited or in Lair",()=>{
 for(const mode of ["hunt","classic"]){
  for(const status of ["ready","running","draft","paused","over"]){
   assert.equal(victoryDetails(runWith(mode,mode==="hunt"?ENDINGS.BROODMOTHER_DEFEATED:ENDINGS.PERFECT_CLEAR,status)),null);
  }
 }
});

test("Director can rehearse the same original Brood Trail finale without creating earned results",()=>{
 const html=read("../director/index.html"),js=read("../director/main.js"),css=read("../director/styles.css");
 assert.match(html,/id="directorClassicFinaleCanvas"/);
 assert.match(js,/import \{drawBroodTrailFinale\} from "\.\.\/src\/victory-scenes\.js"/);
 assert.match(js,/run\.status==="won"&&run\.mode==="classic"/);
 assert.match(js,/Math\.max\(0,performance\.now\(\)-finaleOpenedAt\)/);
 assert.match(css,/\.victory-screen--classic \.director-classic-finale-canvas/);
 assert.match(css,/\.victory-screen--classic \.victory-actions\{/);
 // In normal arcade only the terminal engine state, NOT a Director session, can open the full finale.
 const main=read("../src/main.js");
 assert.doesNotMatch(main,/showcaseDirectorVictory|createDirectorRun|advanceDirectorRun/);
});
