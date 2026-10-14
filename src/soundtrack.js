import {BIOMES} from "./environments.js";
/**
 * HIVE RUN — ORIGINAL FOUR-THEME ARCADE SOUNDTRACK
 * Composed for this game in JS: no samples, external streams or imported tunes.
 * Web Audio step scheduler runs in the existing requestAnimationFrame loop.
 * Music never autoplays; it requires the Music control or track-preview tap.
 */
export const THEME=Object.freeze({name:"The Hatchery Theme",bpm:108,stepsPerBar:16,bars:8});
export const TOTAL_STEPS=128;
export const STEP_SECONDS=60/THEME.bpm/4;
const HATCHERY_LEAD=[
 [71,null,76,null,79,78,76,null,74,null,71,null,67,69,71,null],
 [72,null,76,null,79,null,76,74,72,null,71,null,67,null,64,null],
 [69,null,74,null,78,null,76,74,69,null,66,69,74,null,69,null],
 [71,null,75,null,78,null,75,71,69,null,66,null,63,66,71,null],
 [71,null,76,79,83,null,79,78,76,null,74,null,71,74,76,null],
 [72,null,76,null,79,81,79,null,76,null,72,null,71,67,64,null],
 [74,null,79,null,83,81,79,76,74,null,71,74,79,null,76,null],
 [78,null,81,null,78,74,71,null,69,null,66,null,71,null,74,null]
];
const HATCHERY_CHORDS=[
 [64,67,71,74],[60,64,67,71],[62,66,69,74],[59,63,66,69],
 [64,67,71,76],[60,64,67,72],[62,67,71,74],[62,66,69,74]
];
const HATCHERY_ROOTS=[40,36,38,35,40,36,43,38];
// Hunt: rapid E-Phrygian 8-bit arpeggios and restless, syncopated bass.
const HUNT_LEAD=[
 [76,null,77,79,null,76,74,null,72,74,76,null,71,null,74,null],
 [74,null,72,null,71,74,76,null,77,null,74,72,71,null,69,null],
 [76,79,null,76,77,null,74,72,71,null,72,74,76,null,71,null],
 [69,null,71,72,74,72,null,69,67,null,69,71,72,null,74,null],
 [76,null,79,null,81,79,77,null,76,74,null,72,74,76,77,null],
 [79,null,77,76,74,null,72,null,71,72,74,null,76,null,74,null],
 [76,77,79,null,76,null,74,72,71,null,74,null,77,76,74,null],
 [72,null,74,76,77,null,76,74,71,72,74,null,71,null,64,null]
];
const HUNT_CHORDS=[
 [64,65,69,71],[62,65,69,72],[60,64,67,71],[59,62,65,69],
 [64,67,71,76],[62,65,69,74],[60,65,69,72],[59,62,65,71]
];
const HUNT_ROOTS=[40,38,36,35,40,38,36,35];
// Miniboss: jagged B-minor chromatic pursuit, driving paired kick/snare.
const MINI_LEAD=[
 [71,74,null,77,76,74,null,71,70,null,71,74,77,null,74,null],
 [74,77,79,null,77,74,72,null,71,72,74,null,70,null,71,null],
 [76,77,null,81,79,77,null,74,72,null,74,77,79,null,76,null],
 [74,null,71,70,71,74,77,null,79,77,74,null,71,null,70,null],
 [83,null,81,79,77,79,81,null,77,null,74,76,77,null,74,null],
 [79,77,76,null,74,72,71,null,70,71,74,null,77,null,74,null],
 [76,79,77,null,74,71,70,null,71,null,74,77,79,77,74,null],
 [71,74,77,79,77,74,72,71,70,null,71,null,74,null,71,null]
];
const MINI_CHORDS=[
 [59,62,65,69],[55,59,62,66],[57,60,64,67],[58,62,65,69],
 [59,62,66,71],[55,58,62,65],[57,60,64,69],[58,62,65,70]
];
const MINI_ROOTS=[35,31,33,34,35,31,33,34];
// Boss: slower-sounding half-time phrases over fast, heavy double-time pulse.
const BOSS_LEAD=[
 [64,null,null,65,67,null,70,null,71,null,67,null,65,64,null,null],
 [67,null,70,null,71,74,71,null,70,null,67,65,64,null,62,null],
 [65,null,67,70,71,null,74,null,76,null,74,71,70,null,67,null],
 [71,null,70,67,65,null,64,null,62,64,65,null,67,null,70,null],
 [76,null,77,79,82,null,79,null,77,null,76,74,71,70,71,null],
 [74,null,77,null,79,null,77,74,70,71,74,null,70,null,67,null],
 [71,74,77,null,76,null,74,70,71,null,67,65,64,null,62,null],
 [64,null,67,70,71,null,74,77,76,null,71,70,64,null,null,null]
];
const BOSS_CHORDS=[
 [52,55,58,64],[50,53,57,62],[48,52,55,60],[47,51,54,59],
 [52,58,64,67],[50,53,58,62],[48,52,58,64],[47,52,55,59]
];
const BOSS_ROOTS=[28,26,24,23,28,26,24,23];

export const TRACKS=Object.freeze({
 hatchery:Object.freeze({id:"hatchery",name:"The Hatchery Theme",type:"Exploration",bpm:108,description:"Eerie arcade melody and warm cave ambience",lead:HATCHERY_LEAD,chords:HATCHERY_CHORDS,roots:HATCHERY_ROOTS,volume:.42}),
 hunt:Object.freeze({id:"hunt",name:"Skitter Chase",type:"Enemy hunts",bpm:124,description:"Restless chiptune chase, rolling arpeggios and snappy drums",lead:HUNT_LEAD,chords:HUNT_CHORDS,roots:HUNT_ROOTS,volume:.38}),
 miniboss:Object.freeze({id:"miniboss",name:"Stalker's Pursuit",type:"Miniboss",bpm:142,description:"Urgent dueling melodies and sharp percussion",lead:MINI_LEAD,chords:MINI_CHORDS,roots:MINI_ROOTS,volume:.39}),
 boss:Object.freeze({id:"boss",name:"Warden of the Hive",type:"Boss",bpm:156,description:"Heavy half-time threat, dark bass and dramatic chiptune lead",lead:BOSS_LEAD,chords:BOSS_CHORDS,roots:BOSS_ROOTS,volume:.36})
});
export const TRACK_IDS=Object.freeze(Object.keys(TRACKS));
export const ENCOUNTER_TRACK=Object.freeze({ready:"hatchery",exploration:"hatchery",hunt:"hunt",enemy:"hunt",normal:"hunt",miniboss:"miniboss",boss:"boss"});
export function trackForEncounter(kind){return ENCOUNTER_TRACK[kind]||"hatchery"}
export function noteFrequency(midi){
 if(!Number.isFinite(midi))return 0;
 return 440*Math.pow(2,(midi-69)/12);
}
const fraction=n=>((Math.trunc(n)%TOTAL_STEPS)+TOTAL_STEPS)%TOTAL_STEPS;
export function sequenceAt(index,trackId="hatchery"){
 const track=TRACKS[trackId];
 if(!track)throw Error("Unknown soundtrack track: "+trackId);
 const tick=fraction(index),bar=Math.floor(tick/16),position=tick%16,events=[];
 const lead=track.lead[bar][position];
 if(lead!==null){
  events.push({voice:"lead",note:lead,duration:trackId==="boss"?2.8:position%4===0?2:1.3});
 }
 // Each track shares 8-bit instrumentation but differs in rhythm and voicing.
 if(position%2===0){
  const arpIndex=(Math.floor(position/2)+(bar%2))%4;
  const note=track.chords[bar][arpIndex]+(trackId==="hatchery"&&bar!==4?12:0);
  events.push({voice:"arp",note,duration:trackId==="miniboss"?.78:1.1});
 }
 const bassPulse=trackId==="boss"?position%8===0:position%4===0;
 if(bassPulse)events.push({voice:"bass",note:track.roots[bar]+(position===12?12:0),duration:trackId==="boss"?6.1:3.2});
 if(position%4===0 || (trackId==="boss"&&(position===6||position===14)))
  events.push({voice:"kick",duration:1});
 if(position===4||position===12||(trackId==="miniboss"&&position===8))
  events.push({voice:"snare",duration:.7});
 if(position%2===1||((trackId==="miniboss"||trackId==="boss")&&position%4===2))
  events.push({voice:"hat",duration:.45});
 return events;
}
export class HatcherySoundtrack{
 constructor(){
  this.context=null;this.output=null;this.playing=false;
  this.trackId="hatchery";this.position=0;this.nextTime=0;
  this.noise=null;this.playedSteps=0;this.level=1;
 }
 setLevel(level){this.level=Math.max(1,Math.min(4,level));}
 setTrack(id){
  if(!Object.hasOwn(TRACKS,id))return false;
  if(id===this.trackId)return true;
  const ctx=this.context,wasPlaying=this.playing;
  this.stop();this.trackId=id;this.position=0;this.nextTime=0;
  if(wasPlaying&&ctx)this.start(ctx);
  return true;
 }
 start(context){
  if(!context||this.playing)return false;
  this.context=context;this.playing=true;this.nextTime=0;
  this.output=context.createGain();
  this.output.gain.value=TRACKS[this.trackId].volume;
  this.output.connect(context.destination);
  return true;
 }
 stop(){
  this.playing=false;this.nextTime=0;
  if(this.output){
   try{this.output.disconnect()}catch{}
   this.output=null;
  }
 }
 dispose(){this.stop();this.context=null;this.noise=null}
 tick(){
  const ctx=this.context;
  if(!this.playing||!ctx||ctx.state!=="running"||!this.output)return;
  const stepSeconds=60/(BIOMES[this.level-1].bpm+(this.trackId==="boss"?12:this.trackId==="miniboss"?6:0))/4;
  if(!this.nextTime)this.nextTime=ctx.currentTime+.025;
  const until=ctx.currentTime+.19;
  let count=0;
  while(this.nextTime<until&&count<8){
   const time=this.nextTime;
   for(const ev of sequenceAt(this.position,this.trackId)){
    if(this.level===1&&(ev.voice==="hat"||ev.voice==="snare"))continue;
    if(this.level===2&&ev.voice==="hat"&&this.position%4!==1)continue;
    this.schedule(ev,time,stepSeconds);
   }
   this.position=(this.position+1)%TOTAL_STEPS;
   this.nextTime+=stepSeconds;count++;this.playedSteps++;
  }
  if(this.nextTime<ctx.currentTime)this.nextTime=ctx.currentTime+.025;
 }
 schedule(ev,time,stepSeconds=STEP_SECONDS){
  if(!this.output||!this.context)return;
  try{
   if(ev.voice==="kick")this.kick(time);
   else if(ev.voice==="snare"||ev.voice==="hat")this.noiseHit(ev,time);
   else this.tone(ev,time,stepSeconds);
  }catch(error){
   // Optional audio must not crash the arcade simulation.
   console.warn("Soundtrack voice skipped",error);
  }
 }
 tone(ev,time,stepSeconds=STEP_SECONDS){
  const ctx=this.context;
  const osc=ctx.createOscillator(),gain=ctx.createGain();
  const boss=this.trackId==="boss",mini=this.trackId==="miniboss";
  osc.type=ev.voice==="lead"?(boss?"sawtooth":"square"):
   ev.voice==="bass"?"sawtooth":"triangle";
  osc.frequency.setValueAtTime(noteFrequency(ev.note),time);
  const volume=ev.voice==="lead"?(boss?.067:mini?.077:.082):
   ev.voice==="bass"?(boss?.076:.065):.037;
  const duration=Math.max(.055,stepSeconds*ev.duration);
  gain.gain.setValueAtTime(.0001,time);
  gain.gain.linearRampToValueAtTime(volume,time+.007);
  gain.gain.setTargetAtTime(.0001,time+Math.max(.04,duration-.035),.018);
  osc.connect(gain);gain.connect(this.output);
  osc.start(time);osc.stop(time+duration+.085);
 }
 kick(time){
  const ctx=this.context,osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type="sine";
  osc.frequency.setValueAtTime(this.trackId==="boss"?148:125,time);
  osc.frequency.exponentialRampToValueAtTime(46,time+.095);
  gain.gain.setValueAtTime(this.trackId==="boss"?.15:.13,time);
  gain.gain.exponentialRampToValueAtTime(.0001,time+.125);
  osc.connect(gain);gain.connect(this.output);
  osc.start(time);osc.stop(time+.13);
 }
 ensureNoise(){
  if(this.noise)return this.noise;
  const ctx=this.context,buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.17),ctx.sampleRate);
  const data=buffer.getChannelData(0);
  let seed=91843;
  for(let i=0;i<data.length;i++){
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;
   data[i]=(seed/2147483648)-1;
  }
  this.noise=buffer;return buffer;
 }
 noiseHit(ev,time){
  const ctx=this.context,source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  const hat=ev.voice==="hat";
  source.buffer=this.ensureNoise();
  filter.type="highpass";filter.frequency.value=hat?6500:2200;
  gain.gain.setValueAtTime(hat?.018:.045,time);
  const duration=hat?.042:.098;
  gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  source.connect(filter);filter.connect(gain);gain.connect(this.output);
  source.start(time);source.stop(time+duration+.015);
 }
}
