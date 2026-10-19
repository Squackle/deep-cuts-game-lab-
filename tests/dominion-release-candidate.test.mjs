import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {newRun,start,step,RULES_VERSION,HUNT_SWARM_LENGTH,ENDINGS,isPerfectClear} from "../src/engine.js";
import {victoryDetails,drawBroodTrailFinale} from "../src/victory-scenes.js";
import {createDirectorRun,showcaseDirectorVictory} from "../director/mode.js";
import {ABILITIES} from "../src/miniboss.js";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");

test("Release candidate freezes owner-approved Hunt baseline and Dominion deterministic rule version",()=>{
 assert.equal(RULES_VERSION,"hive-1.5.4");
 assert.equal(HUNT_SWARM_LENGTH,7);
 const hunt=newRun({mode:"hunt",seed:144}),classic=newRun({mode:"classic",seed:144});
 assert.equal(hunt.body.length,7);assert.equal(classic.body.length,7);
 start(hunt);start(classic);
 hunt.enemies=[];classic.enemies=[];
 hunt.food={x:hunt.body[0].x+1,y:hunt.body[0].y};
 classic.food={x:classic.body[0].x+1,y:classic.body[0].y};
 const beforeHunt=hunt.body.length,beforeClassic=classic.body.length;
 step(hunt);step(classic);
 assert.equal(hunt.growthDebt,0);
 assert.equal(classic.growthDebt,1);
 step(hunt);step(classic);
 assert.equal(hunt.body.length,beforeHunt);
 assert.equal(classic.body.length,beforeClassic+1);
 assert.equal(Object.keys(ABILITIES).length,5,"No additional boss is approved");
});
test("Only genuine Arcade terminal victories show their matching cinematic scenes",()=>{
 for(const mode of ["hunt","classic"]){
  for(const outcome of Object.values(ENDINGS)){
   const run=newRun({mode,seed:155});
   run.status="won";run.outcome=outcome;
   const should=(mode==="hunt"&&outcome==="broodmother_defeated")||
     (mode==="classic"&&outcome==="perfect_clear");
   assert.equal(Boolean(victoryDetails(run)),should,mode+"/"+outcome);
   run.status="over";
   assert.equal(victoryDetails(run),null);
  }
 }
});
test("Director's preview remains unranked and separate from authentic awardable outcomes",()=>{
 const d=createDirectorRun({mode:"hunt",boss:"broodmother",phase:"victory"});
 assert.ok(d.directorSession);assert.equal(d.status,"won");
 assert.equal(victoryDetails(d),null,"forced preview has no authoritative outcome");
 const classic=createDirectorRun({mode:"classic",boss:"broodmother",phase:"victory"});
 assert.ok(classic.directorSession);assert.equal(victoryDetails(classic),null);
 const arcade=read("../src/main.js"),director=read("../director/mode.js");
 assert.doesNotMatch(arcade,/from ["']\.\.\/director|import .*director\/mode|super-burger/);
 assert.match(director,/DIRECTOR_ONLY=true/);
});
test("Victory controls remain keyboard, touchscreen, ESC and assistive-technology friendly",()=>{
 const html=read("../index.html"),js=read("../src/main.js"),css=read("../styles.css");
 assert.match(html,/id="victoryOverlay"[^>]*role="dialog" aria-modal="true"/);
 assert.match(html,/aria-labelledby="victoryHeading" aria-describedby="victoryStory"/);
 assert.match(js,/if\(victoryVisible\(\)\)\{\s*if\(event\.key==="Tab"\)/);
 assert.match(js,/if\(event\.key==="Escape"\)/);
 assert.match(js,/\$\("primaryButton"\)\.focus\(\{preventScroll:true\}\)/);
 assert.match(js,/\$\("victoryPlayAgain"\)\.addEventListener/);
 assert.match(js,/\$\("victoryReturn"\)\.addEventListener/);
 assert.match(js,/\$\("victoryRewatch"\)\.addEventListener/);
 assert.match(css,/\.dominion-victory-actions button\{[^}]*min-height:50px/s);
 assert.match(css,/@media\(max-width:700px\) and \(orientation:portrait\)/);
 assert.match(css,/@media\(max-width:900px\) and \(orientation:landscape\)/);
 assert.match(css,/@media\(max-width:360px\)/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test("Mobile pixel celebration never runs at unlocked screen refresh; reduced motion is static",()=>{
 const js=read("../src/main.js");
 assert.match(js,/VICTORY_PAINT_INTERVAL_MS=1000\/24/);
 assert.match(js,/if\(lastVictoryDrawAt>=0&&\(reduced\|\|now-lastVictoryDrawAt<VICTORY_PAINT_INTERVAL_MS\)\)return/);
 assert.match(js,/lastVictoryDrawAt=-Infinity/);
 assert.match(js,/drawBroodTrailFinale\(ctx,Math\.max\(0,now-victoryOpenedAt\),reduced\)/);
 let a=0,b=0;const ctx={
  save(){},restore(){},set imageSmoothingEnabled(x){},
  set fillStyle(x){this.currentColor=x},get fillStyle(){return this.currentColor},
  fillRect(){a++}
 };
 assert.equal(drawBroodTrailFinale(ctx,30000,true),true);
 const c={...ctx,fillRect(){b++}};drawBroodTrailFinale(c,0,true);
 assert.equal(a,b,"reduced-motion artwork is completely deterministic");
 assert.ok(a>5000);
});
test("Victory soundtrack honors preference, browser permissions, mute and background tab",()=>{
 const src=read("../src/main.js");
 assert.match(src,/victoryFanfare\.play\(state\.ctx,state\.run\.outcome,state\.musicOn&&!document\.hidden\)/);
 assert.match(src,/if\(!state\.musicOn\)victoryFanfare\.stop\(\)/);
 assert.match(src,/if\(document\.hidden\)\{\s*victoryFanfare\.stop\(\)/);
 assert.match(src,/window\.addEventListener\("pagehide",\(\)=>\{\s*victoryFanfare\.stop\(\)/);
 assert.match(src,/window\.addEventListener\("blur",\(\)=>\{\s*victoryFanfare\.stop\(\)/);
});
test("No public score submission or leaderboard is accidentally added to standalone test build",()=>{
 const html=read("../index.html"),js=read("../src/main.js");
 assert.match(html,/NO ONLINE RANKING|NO ONLINE LEADERBOARD|SOLO EXPERIMENT/i);
 assert.doesNotMatch(js,/\/api\/leaderboard|fetch\(.*submit|HIVE_DB/);
 assert.match(read("../docs/MAIN-SITE-PROMOTION.md"),/director\/\*\*/);
});
test("Production promotion is gated by explicit owner decision and score replay integrity",()=>{
 const plan=read("../docs/HIVE-RUN-DOMINION-IMPLEMENTATION-PLAN.md");
 assert.match(plan,/Task 4/);
 assert.match(plan,/owner approval|owner authorization/i);
 assert.match(plan,/hive-1\.3/);
 assert.match(plan,/server-side replay verification/);
 assert.match(plan,/historical/i);
});
