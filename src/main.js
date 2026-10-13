import {newRun,start,pause,turn,step,progress} from "./engine.js";

/* HIVE RUN test build 0.1. No third-party assets or frameworks. */
const $=id=>document.getElementById(id);
const canvas=$("gameCanvas");
const context=canvas.getContext("2d",{alpha:false});
const CELLS=20,COLS=18,ROWS=22;
const STORE="deepcuts-hive-run-best-v1",SOUND_STORE="deepcuts-hive-run-audio-v1";
const state={run:newRun({cols:COLS,rows:ROWS}),best:0,audio:false,ctx:null,
 lastFrame:0,accumulator:0,lastAnnouncement:"",pointer:null};
try{state.best=Math.max(0,Number(localStorage.getItem(STORE))||0);
 state.audio=localStorage.getItem(SOUND_STORE)==="on";
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
 $("soundStatus").textContent=state.audio?"SOUND ON":"SOUND OFF";
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
function playTone(hz,duration=0.09,volume=.025){
 if(!state.audio)return;
 try{
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  if(!AudioContextClass)return;
  const audio=state.ctx??(state.ctx=new AudioContextClass());
  if(audio.state==="suspended")audio.resume().catch(()=>{});
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
 state.accumulator=0;state.lastFrame=0;
 hideOverlay();
 syncUI();
 announce("Swarm moving. Swipe to steer or use arrow keys.");
 canvas.focus({preventScroll:true});
}
function reset(){
 state.run=newRun({cols:COLS,rows:ROWS});
 state.accumulator=0;state.lastFrame=0;
 showOverlay("READY TO SWARM?","Collect the glowing brood. Each pickup adds a new segment. Avoid walls and your own tail.","START RUN ▶");
 syncUI();draw();
 announce("New run ready. Select Start Run to play.");
}
function togglePause(){
 if(state.run.status==="running"){
  pause(state.run);
  showOverlay("RUN PAUSED","Your swarm will wait here until you're ready.","RESUME RUN ▶");
  announce("Game paused.");
 }else if(state.run.status==="paused"){
  start(state.run);hideOverlay();state.accumulator=0;state.lastFrame=0;
  announce("Game resumed.");
 }
 syncUI();
}
function handleDirection(direction){
 if(state.run.status==="paused"||state.run.status==="over"||state.run.status==="won")return;
 if(state.run.status==="ready")return; // Avoid surprise movement before starting.
 if(turn(state.run,direction))playTone(210,.02,.009);
}
function drawCell(x,y,fill,inset=0){
 context.fillStyle=fill;
 context.fillRect(x*CELLS+inset,y*CELLS+inset,CELLS-2*inset,CELLS-2*inset);
}
function draw(){
 if(!context)return;
 const run=state.run;
 context.fillStyle="#172d22";
 context.fillRect(0,0,canvas.width,canvas.height);
 // Subtle tiled background, original-art low-res pixel aesthetic.
 for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
  context.fillStyle=(x+y)%2===0?"#1b3427":"#1a3024";
  context.fillRect(x*CELLS+1,y*CELLS+1,CELLS-2,CELLS-2);
 }
 context.fillStyle="#365541";
 for(let x=0;x<COLS;x++){context.fillRect(x*CELLS,0,1,canvas.height)}
 for(let y=0;y<ROWS;y++){context.fillRect(0,y*CELLS,canvas.width,1)}
 // Collectible: golden diamond and contrasting inner pixel.
 if(run.food){
  const {x,y}=run.food,cx=x*CELLS+CELLS/2,cy=y*CELLS+CELLS/2;
  context.fillStyle="#806b39";context.fillRect(x*CELLS+2,y*CELLS+2,16,16);
  context.fillStyle="#e2ba73";
  context.beginPath();context.moveTo(cx,cy-8);context.lineTo(cx+8,cy);
  context.lineTo(cx,cy+8);context.lineTo(cx-8,cy);context.closePath();context.fill();
  context.fillStyle="#fff6c3";context.fillRect(cx-2,cy-4,4,4);
 }
 run.body.forEach((part,i)=>{
  if(i===0){
   drawCell(part.x,part.y,"#e0c98e",1);
   drawCell(part.x,part.y,"#a0bc91",4);
   // Bright lead segment with direction indicator eye.
   const d=run.direction;const eye=d==="right"?[14,7]:d==="left"?[5,7]:d==="up"?[8,4]:[8,14];
   context.fillStyle="#192b1f";context.fillRect(part.x*CELLS+eye[0],part.y*CELLS+eye[1],3,3);
  }else{
   drawCell(part.x,part.y,i%2?"#6f9873":"#567f62",2);
   context.fillStyle="#acd0a3";context.fillRect(part.x*CELLS+7,part.y*CELLS+7,6,6);
   context.fillStyle="#9cbf95";
   context.fillRect(part.x*CELLS+2,part.y*CELLS+2,3,3);
  }
 });
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
document.querySelectorAll("[data-direction]").forEach(b=>b.addEventListener("click",()=>{
 handleDirection(b.getAttribute("data-direction"));canvas.focus({preventScroll:true});
}));
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
canvas.addEventListener("pointerdown",event=>{
 if(state.run.status!=="running")return;
 state.pointer={x:event.clientX,y:event.clientY,id:event.pointerId};
 try{canvas.setPointerCapture(event.pointerId)}catch{}
});
canvas.addEventListener("pointerup",event=>{
 const p=state.pointer;state.pointer=null;
 if(!p||p.id!==event.pointerId||state.run.status!=="running")return;
 const dx=event.clientX-p.x,dy=event.clientY-p.y;
 if(Math.hypot(dx,dy)<18)return;
 handleDirection(Math.abs(dx)>Math.abs(dy)?(dx>0?"right":"left"):(dy>0?"down":"up"));
});
canvas.addEventListener("pointercancel",()=>{state.pointer=null});
document.addEventListener("visibilitychange",()=>{
 if(document.hidden&&state.run.status==="running")togglePause();
 state.lastFrame=0;state.accumulator=0;
});
window.addEventListener("pagehide",()=>{
 if(state.run.status==="running")togglePause();
 state.lastFrame=0;state.accumulator=0;
});
window.addEventListener("blur",()=>{
 if(state.run.status==="running")togglePause();
 state.lastFrame=0;state.accumulator=0;
});
syncUI();draw();
requestAnimationFrame(loop);
