import {newRun,start,pause,turn,step,progress,MUTATIONS,COLORS,chooseMutation,effectiveTickMs,activeEffects} from "./engine.js";
import {loadCreatureArt,variantForSegment,WUBRG} from "./creature-sprites.js";
import {drawLevelBackground,loadLevelBackground,levelForStage} from "./level-background.js";
import {drawBroodPickup} from "./pickups.js";
import {HatcherySoundtrack,TRACKS,trackForEncounter} from "./soundtrack.js";
import {showMutationDraft,hideMutationDraft,drawMutationHud} from "./evolution-ui.js";
import {renderMutationEffects} from "./evolution-visuals.js";
import {drawPrey,drawCapture} from "./enemy-render.js";
import {LeaderboardClient} from "./leaderboard-client.js";
import {renderLeaderboard,updateSubmission} from "./leaderboard-ui.js";

/* HIVE RUN Alpha 0.3 — hunt, trap, evolve and a verified-replay leaderboard. */
const $=id=>document.getElementById(id);
const canvas=$("gameCanvas");
const context=canvas.getContext("2d",{alpha:false});
const CELLS=20,COLS=18,ROWS=22;
const WUBRG_COLORS=["#e7d8b4","#65a9d5","#7e6a88","#dd684a","#75ad7b"];
let creatureArt=null;
let arenaBackground=null;
let visualBurst=null,lastCapture=null,startingRun=false;
const leaderboard=new LeaderboardClient();
async function refreshLeaderboard(){
 try{
  renderLeaderboard($("leaderboardEntries"),await leaderboard.load());
  $("leaderboardStatus").textContent="TOP 25 · REPLAY-VERIFIED SCORES";
 }catch{$("leaderboardStatus").textContent="BOARD UNAVAILABLE · LOCAL HUNTS STILL WORK"}
}
const prefersReducedMotion=()=>window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches??false;
const STORE="deepcuts-hive-run-best-v2",SOUND_STORE="deepcuts-hive-run-audio-v1",MUSIC_STORE="deepcuts-hive-run-music-v1";
const soundtrack=new HatcherySoundtrack();
// Combat engine will invoke this on actual enemy/boss encounter transitions.
// Preview controls never claim that enemies or bosses already exist.
function setEncounterMusic(encounterType){
 soundtrack.setTrack(trackForEncounter(encounterType));
 syncSoundtrack();syncUI();
}
const state={run:newRun({cols:COLS,rows:ROWS}),best:0,audio:false,musicOn:false,ctx:null,
 lastFrame:0,accumulator:0,lastAnnouncement:"",pointer:null,ranked:false};
try{state.best=Math.max(0,Number(localStorage.getItem(STORE))||0);
 state.audio=localStorage.getItem(SOUND_STORE)==="on";
 state.musicOn=localStorage.getItem(MUSIC_STORE)==="on";
}catch{}
const padScore=n=>String(Math.floor(Math.max(0,n))).padStart(6,"0");
function syncUI(){
 const run=state.run;
 $("score").textContent=padScore(run.score);
 $("best").textContent=padScore(state.best);
 $("stage").textContent=String(run.stage).padStart(2,"0");
 $("killCount").textContent=String(run.kills).padStart(2,"0");
 $("enemyCount").textContent=String(run.enemies.length).padStart(2,"0");
 const p=progress(run);
 $("progress").textContent=run.status==="won"?"HIVE COMPLETE":
  run.status==="draft"?"CHOOSE YOUR EVOLUTION":("NEXT MUTATION IN "+p.untilNext+" ENERGY");
 $("evoCountdown").textContent=run.status==="draft"?"READY":p.energy+" / 5 EV";
 $("evoCount").textContent=run.evolutionsChosen+" "+(run.evolutionsChosen===1?"EVOLUTION":"EVOLUTIONS");
 drawMutationHud($("mutationInventory"),run);
 $("lastEvolution").textContent=run.lastMutation?"LAST: "+run.lastMutation.name.toUpperCase():"FIVE COLORS · FIVE POWERS";
 $("stateLabel").textContent=({ready:"AWAITING PLAYER",running:"IN MOTION",paused:"PAUSED",draft:"EVOLVING",over:"RUN ENDED",won:"HIVE COMPLETE"})[run.status];
 const playable=run.status==="running";
 $("pauseButton").disabled=!playable;
 $("pauseButton").textContent="Ⅱ PAUSE";
 $("soundButton").textContent=state.audio?"♪ SOUND ON":"♪ SOUND OFF";
 $("soundButton").setAttribute("aria-pressed",String(state.audio));
 $("musicButton").textContent=state.musicOn?"♫ MUSIC ON":"♫ MUSIC OFF";
 $("musicButton").setAttribute("aria-pressed",String(state.musicOn));
 $("soundStatus").textContent=state.musicOn?"♫ "+TRACKS[soundtrack.trackId].type.toUpperCase():state.audio?"FX ON":"AUDIO OFF";
 $("currentTrack").textContent=TRACKS[soundtrack.trackId].name+" · "+TRACKS[soundtrack.trackId].bpm+" BPM";
 document.querySelectorAll("[data-music-track]").forEach(button=>{
  const selected=button.dataset.musicTrack===soundtrack.trackId;
  button.setAttribute("aria-pressed",String(selected));
  button.classList.toggle("selected",selected);
  button.disabled=["draft","paused","over","won"].includes(run.status);
 });
}
function announce(message){
 if(message!==state.lastAnnouncement){
  $("gameAnnouncement").textContent=message;
  state.lastAnnouncement=message;
 }
}
function saveBest(){
 if(state.run.score<=state.best)return;
 state.best=state.run.score;
 try{localStorage.setItem(STORE,String(state.best))}catch{}
}
function getAudioContext(){
 try{
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  if(!AudioContextClass)return null;
  const audio=state.ctx??(state.ctx=new AudioContextClass());
  if(audio.state==="suspended")audio.resume().catch(()=>{});
  return audio;
 }catch{return null}
}
function syncSoundtrack(){
 const allowed=state.musicOn&&(state.run.status==="ready"||state.run.status==="running")&&!document.hidden;
 if(!allowed){soundtrack.stop();return}
 const audio=getAudioContext();
 if(audio)soundtrack.start(audio);
}
function playTone(hz,duration=0.09,volume=.025){
 if(!state.audio)return;
 try{
  const audio=getAudioContext();
  if(!audio)return;
  const oscillator=audio.createOscillator(),gain=audio.createGain();
  oscillator.type="square";oscillator.frequency.value=hz;
  gain.gain.setValueAtTime(volume,audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start();oscillator.stop(audio.currentTime+duration);
 }catch{}
}
function showOverlay(title,description,buttonLabel){
 $("overlayTitle").textContent=title;
 $("overlayDescription").textContent=description;
 $("primaryButton").textContent=buttonLabel;
 $("gameOverlay").hidden=false;
 $("submitShortcut").hidden=!["over","won"].includes(state.run.status)||!state.ranked;
}
function hideOverlay(){$("gameOverlay").hidden=true}
function showDraftScreen(){
 soundtrack.stop();
 showMutationDraft($("mutationOverlay"),$("mutationChoices"),state.run.draftOptions,selectMutation);
 syncUI();
 announce("Evolution ready. Choose one of three mutations after five earned energy.");
}
function selectMutation(color){
 if(state.run.status!=="draft"||!state.run.draftOptions.includes(color))return;
 leaderboard.action(state.run.runTicks,"choose",color);
 if(!chooseMutation(state.run,color))return;
 visualBurst={color,until:performance.now()+1150};
 hideMutationDraft($("mutationOverlay"));
 state.accumulator=0;state.lastFrame=0;state.pointer=null;
 setEncounterMusic("hunt");
 playTone({W:540,U:670,B:330,R:790,G:475}[color],.18,.045);
 announce(MUTATIONS[color].name+" acquired. "+MUTATIONS[color].short+".");
 canvas.focus({preventScroll:true});
}
async function begin(){
 if(startingRun)return;
 if(["ready","over","won"].includes(state.run.status)){
  startingRun=true;
  $("primaryButton").disabled=true;$("primaryButton").textContent="PREPARING HUNT...";
  try{
   const session=await leaderboard.start();
   state.ranked=session.ranked;
   state.run=newRun({cols:COLS,rows:ROWS,seed:session.seed});
   lastCapture=null;visualBurst=null;
   $("rankedNotice").textContent=session.ranked?"RANKED · REPLAY VERIFIED AFTER GAME OVER":"PRACTICE · RANKED SERVICE UNAVAILABLE";
  }finally{startingRun=false;$("primaryButton").disabled=false}
 }
 start(state.run);
 state.accumulator=0;state.lastFrame=0;state.pointer=null;
 hideOverlay();hideMutationDraft($("mutationOverlay"));
 updateSubmission($("submissionPanel"),null,false);
 setEncounterMusic("hunt");syncUI();
 announce("Hunt moving prey. Force them into your body to earn evolution energy.");
 canvas.focus({preventScroll:true});
}
function reset(){
 state.run=newRun({cols:COLS,rows:ROWS});
 leaderboard.session=null;leaderboard.events=[];
 state.ranked=false;lastCapture=null;visualBurst=null;
 state.accumulator=0;state.lastFrame=0;state.pointer=null;
 hideMutationDraft($("mutationOverlay"));
 showOverlay("READY TO HUNT?","Corner moving prey against your living trail. Each capture earns 3 energy; rare orbs give 1. Avoid your own body.","START HUNT ▶");
 updateSubmission($("submissionPanel"),null,false);
 $("rankedNotice").textContent="START A HUNT TO GET A RANKED SEED";
 soundtrack.setTrack("hatchery");syncSoundtrack();syncUI();draw();
 announce("New run ready. Select Start Run to play.");
}
function togglePause(){
 if(state.run.status==="running"){
  pause(state.run);state.pointer=null;
  showOverlay("RUN PAUSED","Your swarm will wait here until you're ready.","RESUME RUN ▶");
  announce("Game paused.");
 }else if(state.run.status==="paused"){
  start(state.run);hideOverlay();state.accumulator=0;state.lastFrame=0;
  announce("Game resumed.");
 }
 syncSoundtrack();syncUI();
}
function handleDirection(direction){
 if(state.run.status!=="running")return false;
 if(!turn(state.run,direction))return false;
 leaderboard.action(state.run.runTicks,"turn",direction);
 playTone(210,.02,.009);
 return true;
}
function drawCell(x,y,fill,inset=0){
 context.fillStyle=fill;
 context.fillRect(x*CELLS+inset,y*CELLS+inset,CELLS-2*inset,CELLS-2*inset);
}
// Forty-five deterministic, individually shaped anatomical plates.
// Pixel geometry is original: no converted or traced official MTG art.
const SEGMENT_TYPES=45;
const segmentCatalog=Array.from({length:SEGMENT_TYPES},(_,id)=>({
 id,armor:id%5,spine:Math.floor(id/5)%3,crest:Math.floor(id/15),
 glow:id%7===0,shade:id%3
}));
const pigment=["#88b9a0","#9bbd92","#78b5b5","#b0ab85","#86a7bc"];
function tilePixel(x,y,w,h,color){
 context.fillStyle=color;context.fillRect(Math.round(x),Math.round(y),w,h);
}
function orientation(from,to){
 if(!to)return "right";
 if(to.x>from.x)return "right";
 if(to.x<from.x)return "left";
 if(to.y>from.y)return "down";
 return "up";
}
function drawCreaturePiece(part,kind,id,heading){
 const baseX=part.x*CELLS,baseY=part.y*CELLS;
 const cfg=segmentCatalog[id%SEGMENT_TYPES];
 context.save();
 context.translate(baseX+10,baseY+10);
 context.rotate(({right:0,down:Math.PI/2,left:Math.PI,up:-Math.PI/2})[heading]);
 const px=(x,y,w,h,color)=>tilePixel(x-10,y-10,w,h,color);
 const shell=pigment[(cfg.armor+cfg.crest)%pigment.length];
 const dark="#29493f",edge="#d3d8b0",glint="#e5cf92";
 if(kind==="head"){
  // Distinctive long beaked profile, forward horn, crest and bright eye.
  px(2,6,12,9,dark);px(4,7,11,7,"#86b99d");
  px(12,8,6,3,edge);px(17,9,2,1,glint);
  px(5,3,4,4,"#a3c5a6");px(8,1,2,5,edge);
  px(9,9,3,2,"#172b27");px(10,9,1,1,"#ffe3a3");
  px(4,15,4,3,dark);px(2,16,3,2,edge);
 }else if(kind==="tail"){
  // Tapered hooked tail with two dark spurs.
  px(2,8,13,5,dark);px(3,9,11,3,shell);
  px(0,9,5,2,edge);px(12,7,3,3,"#c7d5a9");
  px(12,12,4,3,dark);px(15,13,3,2,edge);
 }else{
  // Spine count, dorsal crests, armor ribbing and palette vary across 45 types.
  px(1,6,18,9,dark);px(2,7,16,7,shell);
  px(3,9,14,3,pigment[cfg.shade]);
  for(let n=0;n<=cfg.spine;n++){
   const sx=4+n*5+(cfg.crest===2?1:0);
   px(sx,4-(n%2),3,4,cfg.crest===0?edge:glint);
   if(cfg.crest>0)px(sx+1,2-(n%2),1,3,"#e7dfbb");
  }
  if(cfg.armor===0||cfg.armor===3){px(6,7,2,7,dark);px(12,7,2,7,dark)}
  if(cfg.armor===1||cfg.armor===4){px(5,8,2,4,edge);px(11,8,2,4,edge)}
  if(cfg.armor===2){px(4,11,12,2,dark);px(8,7,4,3,glint)}
  if(cfg.glow){px(9,9,2,2,"#e9d991")}
  if(cfg.crest===1){px(5,15,3,3,dark);px(13,15,3,3,dark)}
  if(cfg.crest===2){px(3,14,4,4,edge);px(13,14,4,4,edge)}
 }
 context.restore();
}


function drawConnectedSpine(body){
 context.save();context.lineCap="round";context.lineJoin="round";
 for(let i=body.length-1;i>0;i--){
  const a=body[i],b=body[i-1],color=WUBRG_COLORS[Math.floor(variantForSegment(Math.max(0,i-1))/9)];
  const ax=a.x*CELLS+10,ay=a.y*CELLS+10,bx=b.x*CELLS+10,by=b.y*CELLS+10;
  context.beginPath();context.moveTo(ax,ay);context.lineTo(bx,by);
  context.strokeStyle="#0c1717";context.lineWidth=14;context.stroke();
  context.strokeStyle=color;context.lineWidth=9;context.stroke();
 }
 context.restore();
}
function drawArtCreature(part,kind,id,heading){
 const sprite=kind==="head"?creatureArt.head:kind==="tail"?creatureArt.tail:creatureArt.body[id];
 if(!sprite)return;
 const facing={right:0,down:Math.PI/2,left:Math.PI,up:-Math.PI/2}[heading];
 // The source art faces diagonally; rotate to face the actual travel heading.
 const artAngle=kind==="head"?Math.PI*3/4:Math.PI/4;
 const width=kind==="head"?37:kind==="tail"?32:27;
 const height=kind==="head"?48:kind==="tail"?42:27;
 context.save();context.translate(part.x*CELLS+10,part.y*CELLS+10);
 context.rotate(facing+artAngle);context.imageSmoothingEnabled=false;
 context.drawImage(sprite,-width/2,-height/2,width,height);
 context.restore();
}
function drawCreaturePreview(){
 const preview=$("creaturePreview");
 if(!preview||!creatureArt)return;
 const ctx=preview.getContext("2d");if(!ctx)return;
 ctx.imageSmoothingEnabled=false;ctx.fillStyle="#0b1a16";
 ctx.fillRect(0,0,preview.width,preview.height);
 WUBRG.forEach((symbol,row)=>{
  ctx.font="bold 18px ui-monospace,monospace";ctx.fillStyle=WUBRG_COLORS[row];
  ctx.fillText(symbol,13,33+row*34);
  for(let col=0;col<9;col++){
   const tile=creatureArt.body[row*9+col];
   ctx.drawImage(tile,49+col*29,8+row*34,27,27);
  }
 });
 ctx.fillStyle="#d3b78d";ctx.font="bold 10px ui-monospace,monospace";
 ctx.fillText("HEAD",350,15);ctx.fillText("TAIL",407,15);
 ctx.drawImage(creatureArt.head,345,25,44,57);
 ctx.drawImage(creatureArt.tail,398,25,46,58);
 ctx.font="9px ui-monospace,monospace";ctx.fillStyle="#b8c9b3";
 ctx.fillText("ONE ARM",344,99);ctx.fillText("FORKED",400,99);
}

function draw(){
 if(!context)return;
 const run=state.run;
 drawLevelBackground(context,canvas,arenaBackground,COLS,ROWS,CELLS);
 // The brood is a gameplay target; keep it conspicuous over busy art.
 if(run.food)drawBroodPickup(context,run.food,CELLS,performance.now());
 drawPrey(context,run.enemies,CELLS,performance.now(),prefersReducedMotion());
 // A single outlined spine connects the independently colored WUBRG plates.
 // Draw back-to-front so the pointed head stays visible over the neck.
 if(creatureArt)drawConnectedSpine(run.body);
 for(let i=run.body.length-1;i>=0;i--){
  const part=run.body[i],next=run.body[i+1];
  const heading=i===0?run.direction:orientation(next??run.body[i-1],part);
  const kind=i===0?"head":i===run.body.length-1?"tail":"body";
  const id=variantForSegment(Math.max(0,i-1));
  if(creatureArt)drawArtCreature(part,kind,id,heading);
  else drawCreaturePiece(part,kind,id,heading);
 }
 renderMutationEffects(context,run,CELLS,performance.now(),visualBurst,prefersReducedMotion());
 if(lastCapture)drawCapture(context,lastCapture.pos,CELLS,performance.now(),lastCapture.until,prefersReducedMotion());
 if(run.status==="over"){
  context.fillStyle="#dcb78b";
  const head=run.body[0];context.fillRect(head.x*CELLS+5,head.y*CELLS+5,10,10);
 }
}
function loop(time){
 let dt=0;
 if(state.lastFrame)dt=Math.min(time-state.lastFrame,250);
 state.lastFrame=time;
 if(state.run.status==="running"){
  state.accumulator+=dt;
  let catchUps=0;
  while(state.accumulator>=effectiveTickMs(state.run)&&catchUps<3&&state.run.status==="running"){
   const currentTick=effectiveTickMs(state.run);
   const prevBrood=state.run.brood,prevEvent=state.run.eventSerial,prevKills=state.run.kills;
   const enemyBefore=state.run.enemies.map(e=>({id:e.id,pos:{...e.pos}}));
   step(state.run);
   state.accumulator=Math.max(0,state.accumulator-currentTick);
   catchUps++;
   // Mutation duration indicators, shields and active effects update with each step.
   if(state.run.eventSerial!==prevEvent&&state.run.event?.type==="rescue"){
    visualBurst={color:state.run.event.color,until:performance.now()+1000};
    announce(state.run.event.name+" activated! Your hive survived.");
    playTone(state.run.event.color==="W"?760:285,.22,.04);
   }
   syncUI();
   if(state.run.kills>prevKills){
    const removed=enemyBefore.find(e=>!state.run.enemies.some(now=>now.id===e.id));
    if(removed)lastCapture={pos:removed.pos,until:performance.now()+620};
    playTone(740,.13,.04);saveBest();
    announce("Enemy captured! +3 evolution energy. Total captures "+state.run.kills+".");
   }else if(state.run.brood>prevBrood){
    playTone(480,.09,.028);saveBest();
    announce("Rare brood collected! +1 evolution energy.");
   }
   if(state.run.status==="draft"){
    showDraftScreen();
   }
   if(state.run.status==="over"||state.run.status==="won"){
    soundtrack.stop();
    saveBest();syncUI();
    playTone(state.run.status==="won"?720:135,.2,.03);
    const final=state.run.status==="won";
    showOverlay(final?"HIVE COMPLETE!":"GAME OVER",
     state.run.endReason+" Final score: "+state.run.score.toLocaleString()+". Best: "+state.best.toLocaleString()+".",
     "PLAY AGAIN ↺");
    updateSubmission($("submissionPanel"),state.run,state.ranked);
    $("finalRunSummary").textContent=state.run.kills+" captures · "+state.run.evolutionsChosen+" evolutions · "+state.run.score+" points";
    announce((final?"Win! ":"Game over. ")+state.run.endReason+" Final score "+state.run.score+". Submit your ranked replay below.");
   }
  }
  if(catchUps===3)state.accumulator=Math.min(state.accumulator,effectiveTickMs(state.run));
 }
 soundtrack.tick(); // tiny lookahead schedules original 8-bit notes on AudioContext clock.
 draw();
 requestAnimationFrame(loop);
}
$("primaryButton").addEventListener("click",begin);
$("leaderboardRefresh").addEventListener("click",refreshLeaderboard);
$("leaderboardForm").addEventListener("submit",async event=>{
 event.preventDefault();const button=$("submitScoreButton"),notice=$("scoreSubmitStatus");
 if(!state.ranked||!["over","won"].includes(state.run.status))return;
 button.disabled=true;notice.textContent="REPLAYING RUN ON SERVER...";
 try{
  const alias=$("playerAlias").value.trim();
  const handle=$("playerProfile").value.trim();
  const submitted=await leaderboard.submit(state.run,alias,handle);
  notice.textContent="RANKED! VERIFIED "+submitted.score+" POINTS · "+submitted.kills+" KILLS";
  state.ranked=false;$("submitShortcut").hidden=true;
  try{localStorage.setItem("hive-last-alias-v1",alias)}catch{}
  await refreshLeaderboard();
 }catch(error){notice.textContent=error.message||"Could not submit this run."}
 finally{button.disabled=true}
});
$("pauseButton").addEventListener("click",togglePause);
$("restartButton").addEventListener("click",reset);
$("soundButton").addEventListener("click",()=>{
 state.audio=!state.audio;
 try{localStorage.setItem(SOUND_STORE,state.audio?"on":"off")}catch{}
 syncUI();if(state.audio)playTone(520,.12);
});
document.querySelectorAll("[data-music-track]").forEach(button=>{
 button.addEventListener("click",()=>{
  if(["draft","paused","over","won"].includes(state.run.status))return;
  const id=button.dataset.musicTrack;
  if(!TRACKS[id])return;
  soundtrack.setTrack(id);
  // The preview click is a deliberate user gesture. No autoplay on page-load.
  state.musicOn=true;
  try{localStorage.setItem(MUSIC_STORE,"on")}catch{}
  syncSoundtrack();syncUI();
  announce("Now previewing "+TRACKS[id].name+", "+TRACKS[id].bpm+" beats per minute.");
 });
});
$("musicButton").addEventListener("click",()=>{
 state.musicOn=!state.musicOn;
 try{localStorage.setItem(MUSIC_STORE,state.musicOn?"on":"off")}catch{}
 syncSoundtrack();syncUI();
 announce(state.musicOn?TRACKS[soundtrack.trackId].name+" enabled. Original retro soundtrack playing.":"Background music muted.");
});
document.querySelectorAll("[data-direction]").forEach(b=>{
 const steer=()=>{
  handleDirection(b.getAttribute("data-direction"));
  canvas.focus({preventScroll:true});
 };
 // Turn on touch-down rather than waiting for a full press/release gesture.
 b.addEventListener("pointerdown",event=>{
  if(event.button!==0)return;
  steer();
 });
 // Keyboard and assistive-technology button activation remains supported.
 // Do not double-steer the synthetic click following a pointerdown.
 b.addEventListener("click",event=>{
  if(event.detail===0)steer();
 });
});
const keys={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",
 w:"up",s:"down",a:"left",d:"right",W:"up",S:"down",A:"left",D:"right"};
document.addEventListener("keydown",event=>{
 const focus=document.activeElement;
 if(focus?.tagName==="INPUT"||focus?.tagName==="TEXTAREA")return;
 if(state.run.status==="draft"&&["1","2","3"].includes(event.key)){
  event.preventDefault();
  selectMutation(state.run.draftOptions[Number(event.key)-1]);
  return;
 }
 if(Object.hasOwn(keys,event.key)){
  if(state.run.status==="running"){
   event.preventDefault();handleDirection(keys[event.key]);
  }
 }
 if(event.key==="Escape"&&state.run.status==="running"){event.preventDefault();togglePause()}
 if(event.key===" "&&focus===canvas&&["running","paused"].includes(state.run.status)){
  event.preventDefault();togglePause();
 }
});
// Recognize a swipe as the finger moves (not after lift-off).
// A short threshold prevents accidental taps; one turn per gesture keeps
// repeated pointermove events from creating unintended extra bends.
function swipeDirection(event){
 const pointer=state.pointer;
 if(!pointer||pointer.id!==event.pointerId||pointer.triggered||state.run.status!=="running")return;
 const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;
 if(Math.max(Math.abs(dx),Math.abs(dy))<12)return;
 const heading=Math.abs(dx)>Math.abs(dy)?(dx>0?"right":"left"):(dy>0?"down":"up");
 if(handleDirection(heading))pointer.triggered=true;
}
canvas.addEventListener("pointerdown",event=>{
 if(state.run.status!=="running"||state.pointer)return;
 state.pointer={x:event.clientX,y:event.clientY,id:event.pointerId,triggered:false};
 try{canvas.setPointerCapture(event.pointerId)}catch{}
});
canvas.addEventListener("pointermove",swipeDirection);
canvas.addEventListener("pointerup",event=>{
 swipeDirection(event); // Handles quick flicks without an intermediate move event.
 if(state.pointer?.id===event.pointerId)state.pointer=null;
});
canvas.addEventListener("pointercancel",event=>{
 if(state.pointer?.id===event.pointerId)state.pointer=null;
});
document.addEventListener("visibilitychange",()=>{
 if(document.hidden){
  if(state.run.status==="running")togglePause();
  soundtrack.stop(); // Also silence title-screen music in hidden tabs.
 }
 state.lastFrame=0;state.accumulator=0;
});
window.addEventListener("pagehide",()=>{
 if(state.run.status==="running")togglePause();
 soundtrack.stop();
 state.lastFrame=0;state.accumulator=0;
});
window.addEventListener("blur",()=>{
 if(state.run.status==="running")togglePause();
 soundtrack.stop();
 state.lastFrame=0;state.accumulator=0;
});
syncUI();draw();refreshLeaderboard();
try{$("playerAlias").value=localStorage.getItem("hive-last-alias-v1")||""}catch{}
// The Hatchery remains the sole arena during the first Predator release.
arenaBackground=loadLevelBackground(()=>draw());
loadCreatureArt().then(art=>{
 if(!art)return;
 creatureArt=art;
 drawCreaturePreview();draw();
});
requestAnimationFrame(loop);
