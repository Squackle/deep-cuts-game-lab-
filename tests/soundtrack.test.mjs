import test from "node:test";
import assert from "node:assert/strict";
import {THEME,TOTAL_STEPS,STEP_SECONDS,noteFrequency,sequenceAt,HatcherySoundtrack} from "../src/soundtrack.js";

test("original retro theme is complete, deterministic and loops in exactly eight bars",()=>{
 assert.equal(THEME.bpm,108);
 assert.equal(THEME.bars,8);
 assert.equal(TOTAL_STEPS,128);
 assert.ok(STEP_SECONDS>.12&&STEP_SECONDS<.15);
 for(let index=0;index<TOTAL_STEPS;index++){
  const sequence=sequenceAt(index);
  assert.deepEqual(sequence,sequenceAt(index+TOTAL_STEPS));
  assert.ok(sequence.some(e=>e.voice==="arp"||e.voice==="hat"||e.voice==="kick"),"some accompaniment on every step");
 }
});
test("music contains multiple pitched and percussion voices with correct frequency",()=>{
 const events=Array.from({length:TOTAL_STEPS},(_,i)=>sequenceAt(i)).flat();
 for(const voice of ["lead","arp","bass","kick","snare","hat"])
  assert.ok(events.some(e=>e.voice===voice),voice+" must appear in original music");
 assert.equal(noteFrequency(69),440);
 assert.ok(Math.abs(noteFrequency(60)-261.62556)<.02);
 assert.equal(noteFrequency(NaN),0);
});
test("the music module handles mute/pause before audio unlock safely",()=>{
 const song=new HatcherySoundtrack();
 assert.equal(song.playing,false);
 assert.equal(song.start(null),false);
 assert.doesNotThrow(()=>song.tick());
 song.stop();song.dispose();
 assert.equal(song.playing,false);
});
test("playback schedules on audio-clock time and preserves place after pause",()=>{
 const scheduled=[];
 const audio={state:"running",currentTime:0,destination:{},
  createGain(){return {gain:{value:0},connect(){},disconnect(){}}}};
 const song=new HatcherySoundtrack();
 assert.equal(song.start(audio),true);
 song.schedule=()=>{scheduled.push(song.position)};
 song.tick();
 assert.ok(scheduled.length>1);
 const old= song.position;
 song.stop();
 assert.equal(song.playing,false);
 assert.equal(song.position,old);
 assert.equal(song.start(audio),true);
 audio.currentTime=1;
 song.tick();
 assert.ok(song.position!==old);
 song.dispose();
});
