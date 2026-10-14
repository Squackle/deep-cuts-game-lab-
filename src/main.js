import {newRun,start,pause,turn,step,progress} from "./engine.js";
import {loadCreatureArt,variantForSegment,WUBRG} from "./creature-sprites.js";
import {drawLevelBackground,loadLevelBackground,levelForStage} from "./level-background.js";
import {drawBroodPickup} from "./pickups.js";
import {HatcherySoundtrack} from "./soundtrack.js";

/* HIVE RUN v0.1.6 — original Web Audio chiptune, Hatchery Theme. */
const $=id=>document.getElementById(id);
const canvas=$("gameCanvas");
const context=canvas.getContext("2d",{alpha:false});
const CELLS=20,COLS=18,ROWS=22;
const WUBRG_COLORS=["#e7d8b4","#65a9d5","#7e6a88","#dd684a","#75ad7b"];
let creatureArt=null;
let arenaBackground=null;
const STORE="deepcuts-hive-run-best-v1",SOUND_STORE="deepcuts-hive-run-audio-v1",MUSIC_STORE="deepcuts-hive-run-music-v1";
const soundtrack=new HatcherySoundtrack();
const state={run:newRun({cols:COLS,rows:ROWS}),best:0,audio:false,musicOn:false,ctx:null,
 lastFrame:0,accumulator:0,lastAnnouncement:"",pointer:null};
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
 const p=progress(run);
 $("progress").textContent=run.status==="won"?"HIVE COMPLETE":("NEXT STAGE IN "+p.untilNext+" BROOD");
 $("stateLabel").textContent=({ready:"AWAITING PLAYER",running:"IN MOTION",paused:"PAUSED",over:"RUN ENDED",won:"HIVE COMPLETE"})[run.status];
 const playable=run.status==="running";
 $("pauseButton").disabled=!playable;
 $("pauseButton").textContent="Ⅱ PAUSE";
 $("soundButton").textContent=state.audio?"♪ SOUND ON":"♪ SOUND OFF";
 $("soundButton").setAttribute("aria-pressed",String(state.audio));
 $("musicButton").textContent=state.musicOn?"♫ MUSIC ON":"♫ MUSIC OFF";
 $("musicButton").setAttribute("aria-pressed",String(state.musicOn));
 $("soundStatus").textContent=state.musicOn?"♫ HATCHERY THEME":state.audio?"FX ON":"AUDIO OFF";
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
}
function hideOverlay(){$("gameOverlay").hidden=true}
function begin(){
 if(state.run.status==="over"||state.run.status==="won")state.run=newRun({cols:COLS,rows:ROWS});
 start(state.run);
 state.accumulator=0;state.lastFrame=0;state.pointer=null;
 hideOverlay();
 syncSoundtrack();syncUI();
 announce("Swarm moving. Swipe to steer or use arrow keys.");
 canvas.focus({preventScroll:true});
}
function reset(){
 state.run=newRun({cols:COLS,rows:ROWS});
 state.accumulator=0;state.lastFrame=0;state.pointer=null;
 showOverlay("READY TO SWARM?","Collect the glowing brood. Each pickup adds a new segment. Avoid walls and your own tail.","START RUN ▶");
 syncSoundtrack();syncUI();draw();
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
  while(state.accumulator>=state.run.tickMs&&catchUps<3&&state.run.status==="running"){
   const prevBrood=state.run.brood,prevStage=state.run.stage;
   step(state.run);
   state.accumulator-=state.run.tickMs;
   catchUps++;
   if(state.run.brood>prevBrood){
    playTone(prevStage!==state.run.stage?600:420,prevStage!==state.run.stage?.18:.07);
    saveBest();
    announce("Brood collected! Score "+state.run.score+". Stage "+state.run.stage+".");
    syncUI();
   }
   if(state.run.status==="over"||state.run.status==="won"){
    soundtrack.stop();
    saveBest();syncUI();
    playTone(state.run.status==="won"?720:135,.2,.03);
    const final=state.run.status==="won";
    showOverlay(final?"HIVE COMPLETE!":"GAME OVER",
     state.run.endReason+" Final score: "+state.run.score.toLocaleString()+". Best: "+state.best.toLocaleString()+".",
     "PLAY AGAIN ↺");
    announce((final?"Win! ":"Game over. ")+state.run.endReason+" Final score "+state.run.score+".");
   }
  }
  if(catchUps===3)state.accumulator=Math.min(state.accumulator,state.run.tickMs);
 }
 soundtrack.tick(); // tiny lookahead schedules original 8-bit notes on AudioContext clock.
 draw();
 requestAnimationFrame(loop);
}
$("primaryButton").addEventListener("click",begin);
$("pauseButton").addEventListener("click",togglePause);
$("restartButton").addEventListener("click",reset);
$("soundButton").addEventListener("click",()=>{
 state.audio=!state.audio;
 try{localStorage.setItem(SOUND_STORE,state.audio?"on":"off")}catch{}
 syncUI();if(state.audio)playTone(520,.12);
});
$("musicButton").addEventListener("click",()=>{
 state.musicOn=!state.musicOn;
 try{localStorage.setItem(MUSIC_STORE,state.musicOn?"on":"off")}catch{}
 syncSoundtrack();syncUI();
 announce(state.musicOn?"Hatchery Theme enabled. Original retro soundtrack playing.":"Background music muted.");
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
syncUI();draw();
// The Hatchery is the sole playable location while numbered stages are speed tiers.
arenaBackground=loadLevelBackground(()=>draw());
loadCreatureArt().then(art=>{
 if(!art)return;
 creatureArt=art;
 drawCreaturePreview();draw();
});
requestAnimationFrame(loop);
