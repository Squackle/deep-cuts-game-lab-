import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {newRun,RULES_VERSION} from "../src/engine.js";
import {BURGER_PIXELS,BURGER_COLORS,drawSuperBurger} from "../director/super-burger-art.js";
import {HIVE_FINALE_WEBP} from "../director/finale-art.js";
import {createDirectorRun,spawnDirectorSuperOrb,consumeDirectorSuperOrb,advanceDirectorRun,DIRECTOR_SUPER_ORB_SEGMENTS} from "../director/mode.js";
const read=(p)=>readFileSync(new URL(p,import.meta.url),"utf8");

test("Director-only keyboard cheat spawns an edible 10-segment super orb in both games",()=>{
 assert.equal(DIRECTOR_SUPER_ORB_SEGMENTS,10);
 for(const mode of ["hunt","classic"]){
  const run=createDirectorRun({mode,phase:"first"});
  const before=run.body.length,score=run.score;
  const pos=spawnDirectorSuperOrb(run);
  assert.ok(pos&&Number.isInteger(pos.x)&&Number.isInteger(pos.y));
  assert.deepEqual(pos,run.directorBurger);
  assert.ok(!run.body.some(p=>p.x===pos.x&&p.y===pos.y),"burger cannot spawn inside the swarm");
  assert.ok(!run.enemies.some(e=>e.pos.x===pos.x&&e.pos.y===pos.y),"burger cannot obscure a boss");
  assert.ok(!run.terrain.some(t=>t.pos.x===pos.x&&t.pos.y===pos.y),"burger cannot hide in solid terrain");
  assert.equal(run.score,score);
  assert.equal(run.body.length,before,"the orb is a collectible, not a direct length cheat");
  assert.equal(run.directorBurgerCollected,0);
 }
});
test("Eating the pixel cheeseburger grants exactly ten pending tail segments, not points",()=>{
 const run=createDirectorRun({mode:"hunt",phase:"first"}),head=run.body[0];
 run.enemies=[];run.encounter=null;run.terrain=[];run.food=null;
 run.body=[{x:8,y:9},{x:7,y:9},{x:6,y:9}];
 run.direction="right";run.turnQueue=[];run.directorBurger={x:9,y:9};
 run.growthDebt=0;run.effects.shield=0;run.effects.molt=0;
 const score=run.score;
 advanceDirectorRun(run,{invulnerable:false});
 assert.equal(run.status,"running");
 assert.deepEqual(run.body[0],{x:9,y:9});
 assert.equal(run.growthDebt,DIRECTOR_SUPER_ORB_SEGMENTS);
 assert.equal(run.directorBurger,null);
 assert.equal(run.directorBurgerCollected,1);
 assert.equal(run.score,score);
 assert.equal(consumeDirectorSuperOrb(run),false,"cannot farm an eaten cheeseburger");
});
test("Only true Director sessions can summon burgers or bypass production rules",()=>{
 const ranked=newRun({seed:11,mode:"hunt"});
 assert.equal(spawnDirectorSuperOrb(ranked),null);
 assert.equal(consumeDirectorSuperOrb(ranked),false);
 assert.equal(ranked.directorBurger,undefined);
 const finished=createDirectorRun({phase:"victory"});
 assert.equal(spawnDirectorSuperOrb(finished),null);
 assert.equal(finished.directorBurger,null);
 assert.equal(RULES_VERSION,"hive-1.5.4");
});
test("Repeated key presses relocate one orb rather than stack infinite invisible rewards",()=>{
 const run=createDirectorRun({mode:"classic",phase:"first"});
 const a=spawnDirectorSuperOrb(run),b=spawnDirectorSuperOrb(run);
 assert.ok(a&&b);
 assert.equal(run.directorBurgerCollected,0);
 assert.deepEqual(run.directorBurger,b);
 assert.equal(run.growthDebt,0);
});
test("Spawning with a full board fails safely and paused/finished games do not spawn",()=>{
 const run=createDirectorRun({mode:"classic",phase:"first"});
 const before=run.directorBurger;
 run.body=[];
 for(let y=1;y<run.rows-1;y++)for(let x=1;x<run.cols-1;x++)run.body.push({x,y});
 assert.equal(spawnDirectorSuperOrb(run),null);
 assert.equal(run.directorBurger,before);
 run.status="over";assert.equal(spawnDirectorSuperOrb(run),null);
});
test("Tiny burger drawing is original palette pixel art with visible bun, lettuce and cheese",()=>{
 assert.equal(BURGER_PIXELS.length,16);
 for(const row of BURGER_PIXELS){
  assert.equal(row.length,16);
  for(const c of row)assert.ok(c==="."||Object.hasOwn(BURGER_COLORS,c));
 }
 const seen=[];
 const ctx={save(){},restore(){},fillRect(x,y,w,h){seen.push({x,y,w,h,color:this.fillStyle})},set imageSmoothingEnabled(x){},fillStyle:""};
 assert.equal(drawSuperBurger(ctx,0,0,24),true);
 assert.ok(seen.length>60);
 assert.ok(seen.some(p=>p.color==="#e7c543"),"distinct yellow cheese layer");
 assert.ok(seen.some(p=>p.color==="#62ba52"),"distinct lettuce layer");
 assert.ok(seen.some(p=>p.color==="#e6a34c"),"golden bun");
});
test("Scythe-arm giant Sliver victory preview art is actual embedded pixelated WebP, offline",()=>{
 assert.match(HIVE_FINALE_WEBP,/^data:image\/webp;base64,/);
 const bytes=Buffer.from(HIVE_FINALE_WEBP.split(",")[1],"base64");
 assert.equal(bytes.toString("ascii",0,4),"RIFF");
 assert.equal(bytes.toString("ascii",8,12),"WEBP");
 assert.ok(bytes.length>2500);
 assert.equal(createHash("sha256").update(bytes).digest("hex"),
 "b84ec3c8567695bd6ea471b2ef630cf02fa63b6788f7f3a825eab7729f3ffc34");
});
test("Cheat legend is beside arena, mobile-ready, open to more codes, and key 1 spawns",()=>{
 const html=read("../director/index.html"),js=read("../director/main.js"),css=read("../director/styles.css");
 assert.match(html,/id="directorCheatList"/);
 assert.match(html,/id="directorBurgerCheat"/);
 assert.match(html,/id="directorBurgerPreview"/);
 assert.match(html,/id="directorCheatMessage"/);
 assert.match(html,/MORE TEST ABILITIES CAN GO HERE/);
 assert.ok(html.indexOf('class="game-panel"')<html.indexOf('class="cheat-panel"'));
 assert.match(js,/if\(e\.key==="1"&&!e\.repeat\)/);
 assert.match(js,/spawnDirectorSuperOrb\(run\)/);
 assert.match(js,/drawSuperBurger\(ctx/);
 assert.match(js,/HIVE_FINALE_WEBP/);
 assert.match(css,/\.director-grid\{grid-template-columns:minmax\(225px,295px\) minmax\(0,470px\) minmax\(215px,255px\)/);
 assert.match(css,/\.victory-screen\{position:fixed/);
});
