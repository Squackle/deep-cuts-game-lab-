/**
 * HIVE RUN — THE HATCHERY THEME
 * Original, code-composed 8-bit loop. No samples, downloads, library or
 * copyrighted melody. The existing requestAnimationFrame loop runs the audio
 * lookahead scheduler: no background timers and no page-load autoplay.
 */
export const THEME=Object.freeze({name:"The Hatchery Theme",bpm:108,stepsPerBar:16,bars:8});
export const TOTAL_STEPS=THEME.stepsPerBar*THEME.bars;
export const STEP_SECONDS=60/THEME.bpm/4;
const ROOTS=[40,36,38,35,40,36,43,38]; // E minor / C / D / B / E / C / G / D
const CHORDS=[
 [64,67,71,74], // E minor seven
 [60,64,67,71], // C major seven
 [62,66,69,74], // D major
 [59,63,66,69], // B7
 [64,67,71,76], // E minor
 [60,64,67,72], // C major
 [62,67,71,74], // G major
 [62,66,69,74]  // D major
];
// All 128 melody steps are authored for this original repeating theme;
// null steps intentionally leave breathing room between notes.
const LEAD=[
 [71,null,76,null,79,78,76,null,74,null,71,null,67,69,71,null],
 [72,null,76,null,79,null,76,74,72,null,71,null,67,null,64,null],
 [69,null,74,null,78,null,76,74,69,null,66,69,74,null,69,null],
 [71,null,75,null,78,null,75,71,69,null,66,null,63,66,71,null],
 [71,null,76,79,83,null,79,78,76,null,74,null,71,74,76,null],
 [72,null,76,null,79,81,79,null,76,null,72,null,71,67,64,null],
 [74,null,79,null,83,81,79,76,74,null,71,74,79,null,76,null],
 [78,null,81,null,78,74,71,null,69,null,66,null,71,null,74,null]
];
export function noteFrequency(midi){
 if(!Number.isFinite(midi))return 0;
 return 440*Math.pow(2,(midi-69)/12);
}
export function sequenceAt(index){
 // Wrapping supports uninterrupted looping and deterministic tests.
 const step=((Math.trunc(index)%TOTAL_STEPS)+TOTAL_STEPS)%TOTAL_STEPS;
 const bar=Math.floor(step/16),position=step%16,events=[];
 const lead=LEAD[bar][position];
 if(lead!=null)events.push({voice:"lead",note:lead,duration:position%4===0?2:1.4});
 if(position%2===0){
  const notes=CHORDS[bar],arp=notes[(Math.floor(position/2)+(bar%2))%4]+(bar===4?0:12);
  events.push({voice:"arp",note:arp,duration:1.1});
 }
 if(position%4===0)events.push({voice:"bass",note:ROOTS[bar]+(position===12?12:0),duration:3.2});
 if(position%4===0)events.push({voice:"kick",duration:1});
 if(position===4||position===12)events.push({voice:"snare",duration:.7});
 if(position%2===1)events.push({voice:"hat",duration:.5});
 return events;
}
export class HatcherySoundtrack{
 constructor(){
  this.context=null;this.output=null;this.playing=false;
  this.position=0;this.nextTime=0;this.noise=null;this.playedSteps=0;
 }
 start(context){
  if(!context||this.playing)return false;
  this.context=context;this.playing=true;this.nextTime=0;
  this.output=context.createGain();
  this.output.gain.value=.42; // A quiet, non-fatiguing layer under game SFX.
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
  if(!this.nextTime)this.nextTime=ctx.currentTime+.025;
  const until=ctx.currentTime+.19;
  let count=0;
  while(this.nextTime<until&&count<8){
   const time=this.nextTime;
   for(const ev of sequenceAt(this.position))this.schedule(ev,time);
   this.position=(this.position+1)%TOTAL_STEPS;
   this.nextTime+=STEP_SECONDS;count++;this.playedSteps++;
  }
  // On a resumed/busy tab, never attempt to schedule thousands of old steps.
  if(this.nextTime<ctx.currentTime)this.nextTime=ctx.currentTime+.025;
 }
 schedule(ev,time){
  if(!this.output||!this.context)return;
  try{
   if(ev.voice==="kick")this.kick(time);
   else if(ev.voice==="snare"||ev.voice==="hat")this.noiseHit(ev,time);
   else this.tone(ev,time);
  }catch(error){
   // Audio is optional. A failing device must not crash the game loop.
   console.warn("Soundtrack voice skipped",error);
  }
 }
 tone(ev,time){
  const ctx=this.context;
  const osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type=ev.voice==="lead"?"square":ev.voice==="bass"?"sawtooth":"triangle";
  osc.frequency.setValueAtTime(noteFrequency(ev.note),time);
  const volume=ev.voice==="lead"?.082:ev.voice==="bass"?.065:.037;
  const duration=Math.max(.055,STEP_SECONDS*ev.duration);
  gain.gain.setValueAtTime(.0001,time);
  gain.gain.linearRampToValueAtTime(volume,time+.007);
  gain.gain.setTargetAtTime(.0001,time+Math.max(.04,duration-.035),.018);
  osc.connect(gain);gain.connect(this.output);
  osc.start(time);osc.stop(time+duration+.085);
 }
 kick(time){
  const ctx=this.context,osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type="sine";
  osc.frequency.setValueAtTime(125,time);
  osc.frequency.exponentialRampToValueAtTime(46,time+.095);
  gain.gain.setValueAtTime(.13,time);
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
