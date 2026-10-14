import {BIOMES,drawTerrain} from "./environments.js";
import {MODES,boardKey,chicagoDay} from "./modes.js";
import {newRun,start,pause,turn,step,progress,MUTATIONS,COLORS,chooseMutation,effectiveTickMs,activeEffects} from "./engine.js";
import {loadCreatureArt,variantForSegment} from "./creature-sprites.js";
import {drawLevelBackground,loadLevelBackground,levelForStage} from "./level-background.js";
import {drawBroodPickup} from "./pickups.js";
import {HatcherySoundtrack,TRACKS,trackForEncounter} from "./soundtrack.js";
import {canPlayMusic,resumeFromGesture} from "./audio-activation.js";
import {drawPlayerLocator,drawQueuedTurn} from "./player-visibility.js";
import {drawTrapHints} from "./trap-assist.js";
import {KEY_DIRECTIONS,keyboardDirection,mutationSelectionIndex,isTouchMutationSelection,resumeHeading} from "./input-controls.js";
import {showMutationDraft,hideMutationDraft,drawMutationHud} from "./evolution-ui.js";
import {renderMutationEffects} from "./evolution-visuals.js";
import {drawPrey,drawCapture} from "./enemy-render.js";
import {drawAbilityMeter,drawMiniboss,drawWebs,drawBurrowWarning} from "./boss-art.js";
import {abilityState,ABILITIES} from "./miniboss.js";
import {BRIEFINGS,BossBriefingGate} from "./boss-briefing.js";
import {createGameOnlyMode} from "./game-only.js";
import {createSoloSession} from "./solo-session.js";
import {createSessionBest} from "./session-best.js";

/* HIVE RUN Alpha 0.4 — hand-authored pixel-art minibosses and encounter powers. */
const $=id=>document.getElementById(id);
const canvas=$("gameCanvas");
const context=canvas.getContext("2d",{alpha:false});
const gameOnly=createGameOnlyMode({doc:document,win:window,root:$("game"),button:$("fullscreenButton")});
const CELLS=20,COLS=18,ROWS=22;
const WUBRG_COLORS=["#e7d8b4","#65a9d5","#7e6a88","#dd684a","#75ad7b"];
let creatureArt=null;
let arenaBackground=null;
let visualBurst=null,lastCapture=null,startingRun=false,lastEncounterSeen=null;
let awaitingMutationResume=false;
const sessionBests=createSessionBest();
// Game state diagnostics remain hidden. Inspect local DOM/game state using developer tools.
const prefersReducedMotion=()=>window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches??false;
let selectedMode="hunt",selectedChallenge="arcade";
try{selectedMode=localStorage.getItem("hive-mode-v1")==="classic"?"classic":"hunt"}catch{}
$("gameMode").value=selectedMode;
const STORE="deepcuts-hive-run-best-v4",SOUND_STORE="deepcuts-hive-run-audio-v1",MUSIC_STORE="deepcuts-hive-run-music-v1";
const soundtrack=new HatcherySoundtrack();
const bossGate=new BossBriefingGate();
// Encounter director selects music automatically; no player-facing track previews.
function setEncounterMusic(encounterType){
 soundtrack.setTrack(trackForEncounter(encounterType));
 syncSoundtrack();syncUI();
}
const state={run:newRun({cols:COLS,rows:ROWS,mode:selectedMode}),best:0,sessionBest:0,audio:false,musicOn:false,ctx:null,
 lastFrame:0,accumulator:0,lastAnnouncement:"",pointer:null};
try{state.best=Math.max(0,Number(localStorage.getItem(bestKey()))||0);
 state.audio=localStorage.getItem(SOUND_STORE)==="on";
 state.musicOn=localStorage.getItem(MUSIC_STORE)==="on";
}catch{}
function bestKey(){return STORE+"|"+boardKey(selectedMode,selectedChallenge,state?.day||chicagoDay())}
function loadBest(){try{state.best=Math.max(0,Number(localStorage.getItem(bestKey()))||0)}catch{state.best=0}state.sessionBest=sessionBests.get(bestKey())}
function musicForRun(){
 const r=state.run;soundtrack.setLevel(r.biome);
 return r.encounter?(r.encounter.phases===3?"boss":"miniboss"):r.mode==="classic"?["hatchery","hunt","miniboss","boss"][r.biome-1]:"hunt";
}
const padScore=n=>String(Math.floor(Math.max(0,n))).padStart(6,"0");
function syncUI(){
 const run=state.run;
 $("score").textContent=padScore(run.score);
 $("best").textContent=padScore(state.sessionBest);
 $("biomeLabel").textContent="◈ "+BIOMES[run.biome-1].name;
 $("stage").textContent=String(run.evolutionsChosen).padStart(2,"0");
 $("killCount").textContent=String(run.mode==="classic"?run.brood:run.kills).padStart(2,"0");
 $("enemyCount").textContent=String(run.mode==="classic"?run.body.length:run.enemies.length).padStart(2,"0");
 $("collectionLabel").textContent=run.mode==="classic"?"ORBS":"CAPTURES";
 $("populationLabel").textContent=run.mode==="classic"?"SWARM LENGTH":"PREY ON BOARD";
 $("playerAids").hidden=run.mode==="classic";
 $("mercyStatus").textContent=run.mercy>0?"◆ INSTINCT READY · 1 FREE PREY DODGE":"◆ INSTINCT USED";
 $("trapHelp").textContent=run.encounter?"◇ BOSS · NO TRAP HINTS":
  run.evolutionsChosen<3?"◇ AMBER = LIMITED ESCAPES":"◇ TRAP TRAINING COMPLETE";
 const p=progress(run);
 $("progress").textContent=run.status==="won"?"HIVE COMPLETE":
  run.status==="draft"?"CHOOSE YOUR EVOLUTION":("NEXT MUTATION IN "+p.untilNext+" ENERGY");
 $("evoCountdown").textContent=run.status==="draft"?"READY":p.energy+" / 5 EV";
 $("evoCount").textContent=run.evolutionsChosen+" "+(run.evolutionsChosen===1?"EVOLUTION":"EVOLUTIONS");
 drawMutationHud($("mutationInventory"),run);
 $("lastEvolution").textContent=run.lastMutation?"LAST: "+run.lastMutation.name.toUpperCase():"FIVE COLORS · FIVE POWERS";
 $("stateLabel").textContent=bossGate.phase==="briefing"?"BOSS DOSSIER · PAUSED":
  bossGate.phase==="countdown"?"REGROUP · "+bossGate.seconds:
  ({ready:"AWAITING PLAYER",running:"IN MOTION",paused:"PAUSED",draft:"EVOLVING",over:"RUN ENDED",won:"HIVE COMPLETE"})[run.status];
 const playable=run.status==="running";
 $("pauseButton").disabled=!playable||bossGate.blocking;
 $("pauseButton").textContent="Ⅱ PAUSE";
 $("soundButton").textContent=state.audio?"♪ SOUND ON":"♪ SOUND OFF";
 $("soundButton").setAttribute("aria-pressed",String(state.audio));
 $("musicButton").textContent=state.musicOn?"♫ MUSIC ON":"♫ MUSIC OFF";
 $("musicButton").setAttribute("aria-pressed",String(state.musicOn));
 $("soundStatus").textContent=state.musicOn?(state.ctx?.state==="running"?"♫ "+TRACKS[soundtrack.trackId].type.toUpperCase():"♫ TAP TO ENABLE MUSIC"):state.audio?"FX ON":"AUDIO OFF";
 const ability=abilityState(run),panel=$("abilityPanel"),banner=$("encounterBanner");
 panel.hidden=!ability;
 if(ability){
  drawAbilityMeter($("abilityIcon"),ability.kind,ability.charge);
  const spec=ABILITIES[ability.kind];
  panel.setAttribute("aria-label",spec.name+", "+spec.ability+
   (ability.ready?", ready":", charging, "+Math.ceil(ability.remainingMs/1000)+" seconds remaining")+
   ", phase "+ability.phase+" of "+ability.phases);
  $("encounterName").textContent=spec.name;
  $("encounterPhase").textContent="PHASE "+ability.phase+" / "+ability.phases;
  $("abilityStatus").textContent=ability.ready?"READY":Math.ceil(ability.remainingMs/1000)+"s";
  banner.textContent=ability.introMs>0?
   spec.name+" · "+(ability.phase===1?"INCOMING":"NEXT PHASE")+" · "+Math.ceil(ability.introMs/280):
   ability.stunMs>0?"WEBBED · "+(ability.stunMs/1000).toFixed(1)+"s":"";
  banner.hidden=!banner.textContent;
 }else {banner.hidden=run.biomeNoticeMs<=0;banner.textContent=run.biomeNoticeMs>0?BIOMES[run.biome-1].name+" · WATCH FOR MARKED TERRAIN":"";}
 $("encounterBadge").hidden=!ability;
}
function announce(message){
 if(message!==state.lastAnnouncement){
  $("gameAnnouncement").textContent=message;
  state.lastAnnouncement=message;
 }
}
function saveBest(){
 state.sessionBest=sessionBests.record(bestKey(),state.run.score);
 if(state.run.score<=state.best)return;
 state.best=state.run.score;
 try{localStorage.setItem(bestKey(),String(state.best))}catch{}
}
// Restore music preferences without attempting background autoplay.
// The first genuine click or keyboard gesture unlocks desktop Web Audio.
function getAudioContext(){
 try{
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  if(!AudioContextClass)return null;
  if(state.ctx?.state==="closed")state.ctx=null;
  if(state.ctx)return state.ctx;
  const created=new AudioContextClass();
  state.ctx=created;
  created.addEventListener?.("statechange",()=>{
   if(state.ctx!==created)return;
   syncSoundtrack();syncUI();
  });
  return created;
 }catch{return null}
}
function syncSoundtrack(){
 if(!canPlayMusic(state.musicOn,state.run.status,document.hidden)){
  soundtrack.stop();return;
 }
 if(bossGate.blocking||awaitingMutationResume){soundtrack.stop();return}
 const audio=state.ctx;
 if(audio?.state==="running")soundtrack.start(audio);
 else soundtrack.stop();
}
function wakeAudio(){
 if(!state.musicOn&&!state.audio)return;
 const audio=getAudioContext();
 if(!audio)return;
 resumeFromGesture(audio,()=>{
  if(state.ctx!==audio)return;
  syncSoundtrack();syncUI();
 });
 syncSoundtrack();syncUI();
}
function playTone(hz,duration=0.09,volume=.025){
 if(!state.audio)return;
 try{
  const audio=getAudioContext();
  if(!audio)return;
  if(audio.state!=="running"){wakeAudio();return}
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
 $("modeMenu").hidden=state.run.status==="paused";
}
function hideOverlay(){$("gameOverlay").hidden=true}
/** Once per encounter, not per phase: a presentation-only pause. */
function showBossBriefing(){
 const run=state.run;
 if(run.status!=="running"||run.mode!=="hunt"||!bossGate.begin(run.encounter))return false;
 const info=BRIEFINGS[run.encounter.kind];
 $("bossBriefingName").textContent=info.name;
 $("bossBriefingTitle").textContent=info.title;
 $("bossBriefingTag").textContent=info.tag;
 $("bossBriefingRank").textContent=info.rank;
 $("bossBriefingPhases").textContent=info.captures+" CAPTURES TO DEFEAT";
 $("bossBriefingTips").textContent=info.tip;
 const list=$("bossBriefingMechanics");list.replaceChildren();
 for(const description of info.mechanics){
  const item=document.createElement("li");item.textContent=description;list.appendChild(item);
 }
 drawAbilityMeter($("bossBriefingIcon"),run.encounter.kind,0);
 $("bossBriefing").style.setProperty("--boss-ink",info.accent);
 $("bossBriefing").hidden=false;$("bossCountdown").hidden=true;
 state.accumulator=0;state.lastFrame=0;state.pointer=null;
 soundtrack.stop();syncUI();
 $("bossBriefingResume").focus({preventScroll:true});
 announce(info.name+" incoming. The hive is paused; review the dossier and begin when ready.");
 return true;
}
function reopenBossBriefing(){
 if(!bossGate.interrupt())return false;
 $("bossCountdown").hidden=true;$("bossBriefing").hidden=false;
 state.accumulator=0;state.lastFrame=0;state.pointer=null;
 soundtrack.stop();syncUI();
 $("bossBriefingResume").focus({preventScroll:true});
 announce("The encounter was held. Begin the regroup countdown again when ready.");
 return true;
}
function resetBossBriefing(){
 bossGate.reset();$("bossBriefing").hidden=true;$("bossCountdown").hidden=true;
}
function beginBossCountdown(){
 if(!bossGate.resume(performance.now()))return;
 $("bossBriefing").hidden=true;$("bossCountdown").hidden=false;
 $("bossCountdownNumber").textContent="3";
 state.lastFrame=0;state.accumulator=0;state.pointer=null;
 soundtrack.stop();syncUI();
 $("bossCountdown").focus({preventScroll:true});
 announce("Encounter resumes in three seconds.");
}
$("bossBriefingResume").addEventListener("click",beginBossCountdown);
function showDraftScreen(){
 soundtrack.stop();
 showMutationDraft($("mutationOverlay"),$("mutationChoices"),state.run.draftOptions,selectMutation,state.run.mode);
 syncUI();
 announce("Evolution ready. Choose one of three mutations after five earned energy.");
}
function selectMutation(color,inputEvent){
 if(state.run.status!=="draft"||!state.run.draftOptions.includes(color))return;
 if(!chooseMutation(state.run,color))return;
 visualBurst={color,until:performance.now()+1150};
 hideMutationDraft($("mutationOverlay"));
 if(state.run.status==="draft"){showDraftScreen();return}
 state.accumulator=0;state.lastFrame=0;state.pointer=null;
 setEncounterMusic(musicForRun());
 playTone({W:540,U:670,B:330,R:790,G:475}[color],.18,.045);
 if(state.run.encounter){
  announce(ABILITIES[state.run.encounter.kind].name+" approaching! "+state.run.encounter.phases+" captures to win.");
  playTone(244,.18,.04);
 }else announce(MUTATIONS[color].name+" acquired. "+MUTATIONS[color].short+".");
 if(!showBossBriefing()){
  const coarse=window.matchMedia?.("(pointer:coarse)")?.matches??false;
  if(!isTouchMutationSelection(inputEvent,coarse)){
   awaitingMutationResume=true;
   $("mutationResume").hidden=false;
   soundtrack.stop();
   announce("Mutation chosen. Press an arrow key or W A S D to resume. Your swarm is frozen.");
  }
  syncUI();canvas.focus({preventScroll:true});
 }
}
function clearMutationResume(){
 awaitingMutationResume=false;$("mutationResume").hidden=true;
 state.lastFrame=0;state.accumulator=0;state.pointer=null;
}
function resumeMutationByKey(key){
 if(!awaitingMutationResume)return false;
 if(!resumeHeading(state.run,key,heading=>turn(state.run,heading)))return false;
 clearMutationResume();
 canvas.focus({preventScroll:true});
 setEncounterMusic(musicForRun());syncUI();draw();
 announce("Swarm moving. Keep an escape route open.");
 return true;
}
function begin(){
 if(startingRun||bossGate.blocking||awaitingMutationResume)return;
 wakeAudio();
 if(["ready","over","won"].includes(state.run.status)){
  const session=createSoloSession(selectedMode,selectedChallenge);
  state.day=session.day;loadBest();
  state.run=newRun({cols:COLS,rows:ROWS,seed:session.seed,mode:selectedMode});
  resetBossBriefing();
  lastCapture=null;visualBurst=null;lastEncounterSeen=null;
  $("rankedNotice").textContent=session.day?"SOLO DAILY SEED · LOCAL RECORDS ONLY":"SOLO EXPERIMENT · NO ONLINE RANKING";
 }
 start(state.run);
 clearMutationResume();
 hideOverlay();hideMutationDraft($("mutationOverlay"));
 setEncounterMusic(musicForRun());syncUI();
 announce(MODES[selectedMode].description);
 canvas.focus({preventScroll:true});
}
function reset(){
 if(startingRun)return;
 resetBossBriefing();clearMutationResume();
 state.run=newRun({cols:COLS,rows:ROWS,mode:selectedMode});
 state.day="";loadBest();
 lastCapture=null;visualBurst=null;lastEncounterSeen=null;
 state.accumulator=0;state.lastFrame=0;state.pointer=null;
 hideMutationDraft($("mutationOverlay"));
 showOverlay(MODES[selectedMode].name.toUpperCase(),MODES[selectedMode].description,"START "+MODES[selectedMode].verb+" ▶");
 $("rankedNotice").textContent=selectedChallenge==="daily"?"SOLO DAILY SEED · RESETS MIDNIGHT CENTRAL":"SOLO EXPERIMENT · LOCAL RECORDS ONLY";
 soundtrack.setTrack("hatchery");syncSoundtrack();syncUI();draw();
 announce("New local test ready. Select Start Run to play.");
}
function togglePause(){
 if(bossGate.blocking||awaitingMutationResume)return;
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
 if(bossGate.blocking||awaitingMutationResume||state.run.status!=="running")return false;
 if(!turn(state.run,direction))return false;
 // Draw in the same keydown/pointer event: players see their buffered turn
 // immediately rather than waiting for a movement tick or animation frame.
 draw();
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
function draw(){
 if(!context)return;
 const run=state.run;
 drawLevelBackground(context,canvas,arenaBackground,COLS,ROWS,CELLS,run.biome);
 drawTerrain(context,run,CELLS);
 // The brood is a gameplay target; keep it conspicuous over busy art.
 if(run.food)drawBroodPickup(context,run.food,CELLS,performance.now());
 if(run.encounter)drawWebs(context,run.encounter.webs,CELLS);
 drawPrey(context,run.enemies,CELLS,performance.now(),prefersReducedMotion());
 drawTrapHints(context,run,CELLS);
 if(run.encounter){
  drawMiniboss(context,run.enemies,CELLS,run.encounter.phase);
  drawBurrowWarning(context,run.encounter.telegraph,CELLS);
 }
 // The head tile is framed independently from the detailed creature sprite.
 drawPlayerLocator(context,run.body[0],run.direction,CELLS,"below");
 // A single outlined spine connects the independently colored WUBRG plates.
 // Draw back-to-front so the pointed head stays visible over the neck.
 if(creatureArt)drawConnectedSpine(run.body);
 for(let i=run.body.length-1;i>=0;i--){
  const part=run.body[i],next=run.body[i+1];
  const heading=i===0?(run.turnQueue[0]??run.direction):orientation(next??run.body[i-1],part);
  const kind=i===0?"head":i===run.body.length-1?"tail":"body";
  const id=variantForSegment(Math.max(0,i-1));
  if(creatureArt)drawArtCreature(part,kind,id,heading);
  else drawCreaturePiece(part,kind,id,heading);
 }
 drawPlayerLocator(context,run.body[0],run.turnQueue[0]??run.direction,CELLS,"above");
 drawQueuedTurn(context,run.body[0],run.turnQueue[0],COLS,ROWS,CELLS);
 renderMutationEffects(context,run,CELLS,performance.now(),visualBurst,prefersReducedMotion());
 if(lastCapture)drawCapture(context,lastCapture.pos,CELLS,performance.now(),lastCapture.until,prefersReducedMotion());
 if(run.status==="over"){
  context.fillStyle="#dcb78b";
  const head=run.body[0];context.fillRect(head.x*CELLS+5,head.y*CELLS+5,10,10);
 }
}
function loop(time){
 // The dossier and countdown are UI-only: game time and ranked replay freeze.
 if(bossGate.blocking){
  if(bossGate.phase==="countdown"){
   const finished=bossGate.advance(time);
   if(finished){
    $("bossCountdown").hidden=true;
    state.lastFrame=0;state.accumulator=0;state.pointer=null;
    canvas.focus({preventScroll:true});
    setEncounterMusic(musicForRun());syncUI();
    announce("Encounter active. Keep your escape route open.");
   }else{
    const value=String(bossGate.seconds);
    if($("bossCountdownNumber").textContent!==value){
     $("bossCountdownNumber").textContent=value;syncUI();
    }
   }
  }
  draw();requestAnimationFrame(loop);return;
 }
 if(awaitingMutationResume){
  state.lastFrame=0;state.accumulator=0;
  draw();requestAnimationFrame(loop);return;
 }
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
   const encounterMoment=state.run.lastEncounter;
   if(encounterMoment){
    const id=encounterMoment.kind+"/"+encounterMoment.type+"/"+encounterMoment.phase+"/"+encounterMoment.tick;
    if(lastEncounterSeen!==id){
     lastEncounterSeen=id;
     lastCapture={pos:encounterMoment.at,until:performance.now()+850};
     if(encounterMoment.type==="phase"){
      announce(ABILITIES[encounterMoment.kind].name+" captured! Phase "+encounterMoment.phase+".");
      playTone(490,.22,.055);
     }else{
      announce(ABILITIES[encounterMoment.kind].name+" DEFEATED! "+(ABILITIES[encounterMoment.kind].phases===3?"+8 energy and +1500 base score.":"+5 energy and +750 base score."));
      playTone(790,.30,.06);
     }
    }
   }
   if(state.run.kills>prevKills){
    const removed=enemyBefore.find(e=>!state.run.enemies.some(now=>now.id===e.id));
    if(removed)lastCapture={pos:removed.pos,until:performance.now()+620};
    playTone(740,.13,.04);saveBest();
    if(!encounterMoment||encounterMoment.type!=="defeat"||encounterMoment.tick!==state.run.runTicks)
     announce("Enemy captured! +3 evolution energy. Total captures "+state.run.kills+".");
   }else if(state.run.brood>prevBrood){
    playTone(480,.09,.028);saveBest();
    announce("Brood collected! +1 evolution energy.");
   }
   if(state.run.status==="draft")showDraftScreen();
   // A queued boss can spawn from an engine step rather than mutation choice.
   if(state.run.status==="running"&&showBossBriefing())break;
   // Maintain miniboss soundtrack throughout its multi-capture phases;
   // first cue follows the safe warning, never preview high-tier music.
   const nextTrack=musicForRun();
   if(soundtrack.trackId!==nextTrack&&state.run.status==="running")setEncounterMusic(nextTrack);
   if(state.run.status==="over"||state.run.status==="won"){
    soundtrack.stop();
    saveBest();syncUI();
    playTone(state.run.status==="won"?720:135,.2,.03);
    const final=state.run.status==="won";
    showOverlay(final?"HIVE COMPLETE!":"GAME OVER",
     state.run.endReason+" Final score: "+state.run.score.toLocaleString()+". Session best: "+state.sessionBest.toLocaleString()+".",
     "PLAY AGAIN ↺");
    announce((final?"Win! ":"Game over. ")+state.run.endReason+" Final score "+state.run.score+". Saved on this device only.");
   }
  }
  if(catchUps===3)state.accumulator=Math.min(state.accumulator,effectiveTickMs(state.run));
 }
 soundtrack.tick(); // tiny lookahead schedules original 8-bit notes on AudioContext clock.
 draw();
 requestAnimationFrame(loop);
}
// Unlock on direct interaction; an async score request is too late for autoplay rules.
document.addEventListener("pointerdown",wakeAudio,{capture:true,passive:true});
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
 if(state.musicOn)wakeAudio();
 syncSoundtrack();syncUI();
 announce(state.musicOn?(state.ctx?.state==="running"?TRACKS[soundtrack.trackId].name+" playing.":"Music enabled. Use a game control to allow desktop audio."):"Background music muted.");
});
document.addEventListener("keydown",event=>{
 if(bossGate.blocking){
  if(event.key==="Tab"&&bossGate.phase==="briefing"){
   event.preventDefault();$("bossBriefingResume").focus({preventScroll:true});
  }else if(Object.hasOwn(KEY_DIRECTIONS,event.key)||event.key==="Escape"||event.key==="Tab"||
   (event.key===" "&&document.activeElement!==$("bossBriefingResume"))){
   event.preventDefault();
  }
  return;
 }
 const focus=document.activeElement;
 if(["INPUT","TEXTAREA","SELECT"].includes(focus?.tagName))return;
 if(!event.repeat)wakeAudio();
 if(state.run.status==="draft"){
  const index=mutationSelectionIndex(event.key,event.repeat);
  if(index!==null){event.preventDefault();selectMutation(state.run.draftOptions[index]);}
  else if(Object.hasOwn(KEY_DIRECTIONS,event.key))event.preventDefault();
  return;
 }
 if(awaitingMutationResume){
  if(Object.hasOwn(KEY_DIRECTIONS,event.key)){
   event.preventDefault();
   if(!event.repeat)resumeMutationByKey(event.key);
  }
  return;
 }
 if(Object.hasOwn(KEY_DIRECTIONS,event.key)&&state.run.status==="running"){
  event.preventDefault(); // Stop page scroll, including repeated arrow presses.
  const requested=keyboardDirection(event.key,event.repeat);
  if(requested)handleDirection(requested);
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
 if(event.cancelable&&event.pointerType==="touch")event.preventDefault();
 state.pointer={x:event.clientX,y:event.clientY,id:event.pointerId,triggered:false};
 try{canvas.setPointerCapture(event.pointerId)}catch{}
});
canvas.addEventListener("pointermove",event=>{
 if(event.cancelable&&event.pointerType==="touch")event.preventDefault();
 swipeDirection(event);
});
canvas.addEventListener("pointerup",event=>{
 if(event.cancelable&&event.pointerType==="touch")event.preventDefault();
 swipeDirection(event); // Handles quick flicks without an intermediate move event.
 if(state.pointer?.id===event.pointerId)state.pointer=null;
});
canvas.addEventListener("pointercancel",event=>{
 if(state.pointer?.id===event.pointerId)state.pointer=null;
});
document.addEventListener("visibilitychange",()=>{
 if(document.hidden){
  if(bossGate.blocking)reopenBossBriefing();
   else if(state.run.status==="running"&&!awaitingMutationResume)togglePause();
  soundtrack.stop(); // Also silence title-screen music in hidden tabs.
 }else syncSoundtrack();
 syncUI();state.lastFrame=0;state.accumulator=0;
});
window.addEventListener("focus",()=>{
 if(!document.hidden){syncSoundtrack();syncUI()}
});
window.addEventListener("pagehide",()=>{
 if(bossGate.blocking)reopenBossBriefing();
 else if(state.run.status==="running"&&!awaitingMutationResume)togglePause();
 soundtrack.stop();
 state.lastFrame=0;state.accumulator=0;
});
window.addEventListener("blur",()=>{
 if(bossGate.blocking)reopenBossBriefing();
 else if(state.run.status==="running"&&!awaitingMutationResume)togglePause();
 soundtrack.stop();
 state.lastFrame=0;state.accumulator=0;
});
$("gameMode").addEventListener("change",()=>{
 selectedMode=$("gameMode").value;try{localStorage.setItem("hive-mode-v1",selectedMode)}catch{}
 reset();
});
$("gameChallenge").addEventListener("change",()=>{selectedChallenge=$("gameChallenge").value;reset()});
reset();
// The Hatchery remains the sole arena during the first Predator release.
arenaBackground=loadLevelBackground(()=>draw());
loadCreatureArt().then(art=>{
 if(!art)return;
 creatureArt=art;
 draw();
});
requestAnimationFrame(loop);
