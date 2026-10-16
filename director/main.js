/** Standalone Hive Run Game Lab development console. Never bundled in public arcade. */
import {turn,start,pause,effectiveTickMs,chooseMutation} from "../src/engine.js";
import {BIOMES,drawTerrain} from "../src/environments.js";
import {loadLevelBackground,drawLevelBackground} from "../src/level-background.js";
import {loadCreatureArt,variantForSegment} from "../src/creature-sprites.js";
import {drawBossPixelIcon,drawMiniboss,drawWebs,drawBurrowWarning} from "../src/boss-art.js";
import {drawBroodmotherHatchlings} from "../src/broodmother-hatchlings.js";
import {drawPlayerLocator} from "../src/player-visibility.js";
import {drawBroodPickup} from "../src/pickups.js";
import {createDirectorRun,jumpDirectorPhase,showcaseDirectorVictory,advanceDirectorRun,directorStatus,spawnDirectorSuperOrb} from "./mode.js";
import {drawSuperBurger} from "./super-burger-art.js";
import {HIVE_FINALE_WEBP} from "./finale-art.js";
const $=id=>document.getElementById(id);
const canvas=$("directorCanvas"),ctx=canvas.getContext("2d",{alpha:false}),CELL=20;
let art=null,bg=null,run=null,last=0,accumulator=0,paused=false,lastStatus="";
const cheatPreview=$("directorBurgerPreview").getContext("2d");
drawSuperBurger(cheatPreview,0,0,32,0);
function syncCheatUI(){
 const enabled=!!run&&run.status==="running"&&!paused;
 $("directorBurgerCheat").disabled=!enabled;
 $("directorCheatMessage").textContent=run?.directorNotice||"PRESS 1 TO SPAWN";
}
function summonBurger(){
 if(!run||paused||run.status!=="running")return false;
 const pos=spawnDirectorSuperOrb(run);
 if(!pos){$("directorCheatMessage").textContent="NO OPEN TILE · TRY AGAIN";return false}
 syncCheatUI();draw();return true;
}
const config=()=>({mode:$("directorGame").value,boss:$("directorBoss").value,phase:$("directorPhase").value});
function setStatus(message){if(lastStatus!==message){$("directorStatus").textContent=message;lastStatus=message}}
function update(){
 if(!run)return;
 $("directorScore").textContent=String(run.score).padStart(6,"0");
 $("directorEvolution").textContent=String(run.evolutionsChosen).padStart(2,"0");
 $("directorStage").textContent=run.encounter?run.encounter.phase+" / "+run.encounter.phases:"—";
 $("directorLocation").textContent=BIOMES[run.biome-1]?.name||"THE HATCHERY";
 $("directorSkip").disabled=run.mode!=="hunt"||!run.encounter||run.status!=="running";
 $("directorPause").disabled=!["paused","running"].includes(run.status);
 $("directorPause").textContent=paused?"▶ RESUME":"Ⅱ PAUSE";
 syncCheatUI();
 if(run.status==="won"){
  $("directorVictoryTitle").textContent=run.mode==="classic"?"HIVE COMPLETE!":"THE HIVE REIGNS";
  $("directorVictoryDetails").textContent=run.mode==="classic"?
   "The last square is claimed. Every corner of the burrow belongs to the swarm.":
   "The burrow can no longer contain your swarm. The village trembles before its new sovereign.";
  $("directorVictory").style.setProperty("--director-finale-art",run.mode==="hunt"?
    'url("'+HIVE_FINALE_WEBP+'")':
    "linear-gradient(145deg,#96754b,#30204f,#112a2d)");
  $("directorVictory").hidden=false;
 }else $("directorVictory").hidden=true;
 setStatus(directorStatus(run)+(paused?" · PAUSED":""));
}
function startScene(){
 run=createDirectorRun(config());paused=false;last=0;accumulator=0;
 $("bossOptions").hidden=run.mode==="classic";
 update();draw();
 canvas.focus({preventScroll:true});
}
function showFinale(){
 if(!run?.directorSession)return;
 showcaseDirectorVictory(run);paused=false;last=0;accumulator=0;
 update();draw();
}
function drawSwarm(){
 const body=run.body;
 for(let i=body.length-1;i>=0;i--){
  const p=body[i],px=p.x*CELL+CELL/2,py=p.y*CELL+CELL/2;
  if(art){
   const sprite=i===0?art.head:i===body.length-1?art.tail:art.body[variantForSegment(i-1)];
   const next=body[i+1],prev=body[i-1];
   const heading=i===0?run.direction:
    prev?(Math.abs(prev.x-p.x)>0?(prev.x>p.x?"right":"left"):(prev.y>p.y?"down":"up")):run.direction;
   const angle={right:0,down:Math.PI/2,left:Math.PI,up:-Math.PI/2}[heading];
   const first=i===0,last=i===body.length-1;
   const w=first?37:last?32:27,h=first?48:last?42:27;
   ctx.save();ctx.translate(px,py);ctx.rotate(angle+(first?Math.PI*3/4:Math.PI/4));
   ctx.imageSmoothingEnabled=false;ctx.drawImage(sprite,-w/2,-h/2,w,h);ctx.restore();
  }else{
   ctx.fillStyle=i===0?"#ffe0a2":["#ced2b6","#7199b8","#b18fbd","#d7765e","#86b88b"][i%5];
   ctx.fillRect(p.x*CELL+3,p.y*CELL+3,CELL-6,CELL-6);
  }
 }
}
function draw(){
 if(!run)return;
 drawLevelBackground(ctx,canvas,bg,run.cols,run.rows,CELL,run.biome);
 drawTerrain(ctx,run,CELL);
 if(run.food)drawBroodPickup(ctx,run.food,CELL,performance.now());
 if(run.encounter){
  drawWebs(ctx,run.encounter.webs,CELL);
  drawMiniboss(ctx,run.enemies,CELL,run.encounter.phase);
  drawBurrowWarning(ctx,run.encounter.telegraph,CELL);
 }
 drawBroodmotherHatchlings(ctx,run,CELL,performance.now());
 if(run.directorBurger){
  const p=run.directorBurger;
  drawSuperBurger(ctx,p.x*CELL-2,p.y*CELL-3,24,performance.now());
 }
 drawPlayerLocator(ctx,run.body[0],run.direction,CELL,"below");
 drawSwarm();
 drawPlayerLocator(ctx,run.body[0],run.direction,CELL,"above");
}
function loop(time){
 if(!last)last=time;
 const dt=Math.min(250,Math.max(0,time-last));last=time;
 if(run&&run.status==="running"&&!paused){
  accumulator+=dt;
  let iterations=0;
  while(iterations<3&&run.status==="running"){
   const interval=effectiveTickMs(run)*($("directorSlow").checked?2:1);
   if(accumulator<interval)break;
   advanceDirectorRun(run,{invulnerable:$("directorInvulnerable").checked});
   if(run.status==="draft"&&run.draftOptions.length){
    // Rehearsal-specific automatic draft choice. Never a scored player decision.
    chooseMutation(run,run.draftOptions[0]);
   }
   accumulator-=interval;iterations++;
  }
  if(iterations===3)accumulator=Math.min(accumulator,effectiveTickMs(run));
  update();
 }
 draw();requestAnimationFrame(loop);
}
function changeGame(){
 const classic=$("directorGame").value==="classic";
 $("bossOptions").hidden=classic;
 $("directorSkip").disabled=classic;
 if(classic&&$("directorPhase").value==="final")$("directorPhase").value="victory";
}
$("directorGame").addEventListener("change",changeGame);
$("directorStart").addEventListener("click",startScene);
$("directorWin").addEventListener("click",showFinale);
$("directorVictoryReplay").addEventListener("click",()=>{
 $("directorVictory").hidden=true;
 requestAnimationFrame(()=>showFinale());
});
$("directorVictoryExit").addEventListener("click",startScene);
$("directorBurgerCheat").addEventListener("click",()=>{summonBurger();canvas.focus({preventScroll:true})});
$("directorReset").addEventListener("click",startScene);
$("directorSkip").addEventListener("click",()=>{if(jumpDirectorPhase(run)){update();draw()}});
$("directorPause").addEventListener("click",()=>{
 if(!run||!["paused","running"].includes(run.status))return;
 if(paused){paused=false;start(run);last=0;accumulator=0}
 else{paused=true;pause(run)}
 update();
});
const keys={ArrowUp:"up",ArrowRight:"right",ArrowDown:"down",ArrowLeft:"left",
 w:"up",a:"left",s:"down",d:"right",W:"up",A:"left",S:"down",D:"right"};
function steer(direction){
 if(!run||run.status!=="running"||paused)return false;
 if(!turn(run,direction))return false;
 draw();return true;
}
document.addEventListener("keydown",e=>{
 if(["INPUT","SELECT","TEXTAREA","BUTTON"].includes(e.target?.tagName))return;
 if(e.key==="1"&&!e.repeat){e.preventDefault();summonBurger();return}
 if(Object.hasOwn(keys,e.key)){e.preventDefault();steer(keys[e.key]);}
});
for(const button of document.querySelectorAll("[data-turn]"))
 button.addEventListener("click",()=>{steer(button.dataset.turn);canvas.focus({preventScroll:true})});
let startPoint=null;
canvas.addEventListener("pointerdown",e=>{
 startPoint={x:e.clientX,y:e.clientY,id:e.pointerId};
 try{canvas.setPointerCapture(e.pointerId)}catch{}
});
canvas.addEventListener("pointerup",e=>{
 if(!startPoint||startPoint.id!==e.pointerId)return;
 const dx=e.clientX-startPoint.x,dy=e.clientY-startPoint.y;
 startPoint=null;
 if(Math.hypot(dx,dy)<20)return;
 steer(Math.abs(dx)>Math.abs(dy)?(dx>0?"right":"left"):(dy>0?"down":"up"));
});
canvas.addEventListener("pointercancel",()=>{startPoint=null});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&run?.status==="running"){paused=true;pause(run);update()}last=0;accumulator=0});
bg=loadLevelBackground(()=>draw());
loadCreatureArt().then(result=>{art=result;draw()}).catch(()=>{});
changeGame();startScene();requestAnimationFrame(loop);
