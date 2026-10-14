import test from "node:test";
import assert from "node:assert/strict";
import {THEME,TRACKS,TRACK_IDS,TOTAL_STEPS,STEP_SECONDS,sequenceAt,trackForEncounter,HatcherySoundtrack} from "../src/soundtrack.js";

test("four original themes have different tempo, names and distinct melodic signatures",()=>{
 assert.deepEqual(TRACK_IDS,["hatchery","hunt","miniboss","boss"]);
 assert.equal(TRACKS.hatchery.bpm,108);
 assert.equal(TRACKS.hunt.bpm,124);
 assert.equal(TRACKS.miniboss.bpm,142);
 assert.equal(TRACKS.boss.bpm,156);
 assert.equal(new Set(TRACK_IDS.map(id=>TRACKS[id].name)).size,4);
 assert.ok(TOTAL_STEPS===128&&STEP_SECONDS>0);
 const signatures=TRACK_IDS.map(id=>Array.from({length:16},(_,i)=>sequenceAt(i,id).find(e=>e.voice==="lead")?.note??-1).join(","));
 assert.equal(new Set(signatures).size,4);
});
test("all theme patterns have safe 128-step looping and six real voices",()=>{
 for(const track of TRACK_IDS){
  const voices=new Set;
  for(let step=0;step<TOTAL_STEPS;step++){
   const events=sequenceAt(step,track);
   assert.deepEqual(events,sequenceAt(step+TOTAL_STEPS,track));
   for(const event of events){
    voices.add(event.voice);
    if(Number.isFinite(event.note))assert.ok(event.note>=20&&event.note<=96,"MIDI note outside safe bass-to-high-arp range: "+event.note);
    assert.ok(event.duration>.1);
   }
  }
  for(const voice of ["lead","arp","bass","kick","hat","snare"])assert.ok(voices.has(voice),track+": "+voice);
 }
 assert.throws(()=>sequenceAt(0,"invalid"),/Unknown soundtrack/);
});
test("encounter kinds map only to allowed original compositions",()=>{
 for(const [kind,track] of [["ready","hatchery"],["exploration","hatchery"],["normal","hunt"],["enemy","hunt"],["hunt","hunt"],["miniboss","miniboss"],["boss","boss"],["unknown","hatchery"]])
  assert.equal(trackForEncounter(kind),track);
});
test("changing track resets sequence and scheduling and never duplicates playback",()=>{
 const ctx={state:"running",currentTime:1,destination:{},createGain(){return {gain:{value:0},connect(){},disconnect(){}}}};
 const song=new HatcherySoundtrack();const calls=[];
 song.start(ctx);song.schedule=(e)=>calls.push(e.voice);
 song.tick();
 assert.ok(calls.length>0);
 assert.ok(song.position>0);
 assert.equal(song.setTrack("miniboss"),true);
 assert.equal(song.trackId,"miniboss");
 assert.equal(song.position,0);
 assert.equal(song.playing,true);
 assert.equal(song.setTrack("invalid"),false);
 assert.equal(song.trackId,"miniboss");
 const prev=song.output;
 assert.equal(song.setTrack("miniboss"),true);
 assert.equal(song.output,prev,"selecting same theme must not duplicate audio graph");
 song.stop();
 assert.equal(song.playing,false);
 assert.equal(song.setTrack("boss"),true);
 assert.equal(song.playing,false,"muted music must stay muted after encounter change");
 song.dispose();
});
test("all tracks render unique audio note counts with stable absolute MIDI notes",()=>{
 const fingerprints=TRACK_IDS.map(id=>Array.from({length:TOTAL_STEPS},(_,i)=>sequenceAt(i,id).map(ev=>ev.voice+":"+(ev.note??".")).join("|")).join(","));
 assert.equal(new Set(fingerprints).size,4);
});
