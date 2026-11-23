import test from 'node:test';
import assert from 'node:assert/strict';
import {THEMES,INSTRUMENTS,chord,line,midi,pickMood,intensityFor,scheduleBar,createSfx,bark,voiceFor,VOICES,COMMANDER_VOICES,LINES} from '../sfx.mjs';

// A stand-in AudioContext that counts the nodes a bar creates.
function fakeContext(){
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(v){if(!(v>0))throw new Error("exp ramp to "+v);},setTargetAtTime(){}});
 const node=()=>({gain:param(),frequency:param(),detune:param(),Q:param(),pan:param(),type:"",buffer:null,connect(){},disconnect(){},start(){},stop(){}});
 const ac={sampleRate:8000,currentTime:0,started:0,createGain:node,createBiquadFilter:node,createStereoPanner:node,createBufferSource:node,
  createOscillator(){ac.started++;return node();},createBuffer:(c,len,sampleRate)=>({sampleRate,getChannelData:()=>new Float32Array(len)})};
 return ac;
}

test('every theme has 8 bars of 4 beats, playable chords and known instruments',()=>{
 for(const [id,t] of Object.entries(THEMES)){
  assert.equal(t.chords.length,8,id);assert.equal(t.melody.length,8,id);
  t.melody.forEach((m,i)=>assert.equal(line(m).total,4,id+" bar "+(i+1)));
  t.chords.forEach(c=>assert.equal(chord(c).length,3));
  for(const inst of [t.lead,...t.layers.map(l=>l.inst)])assert.ok(INSTRUMENTS[inst],id+" uses "+inst);
 }
});

test('notes and chords map to the right pitches',()=>{
 assert.equal(midi("A4"),69);assert.equal(midi("C#5"),73);assert.equal(midi("Bb4"),70);
 assert.deepEqual(chord("Dm"),[50,53,57]);assert.deepEqual(chord("A"),[45,49,52]);
});

test('music follows the game state',()=>{
 assert.equal(pickMood({title:true,phase:"active",boss:true}),"menu");
 assert.equal(pickMood({phase:"ready"}),"calm");
 assert.equal(pickMood({phase:"active"}),"battle");
 assert.equal(pickMood({phase:"active",boss:true}),"boss");
 assert.equal(pickMood({phase:"won"}),"end");assert.equal(pickMood({phase:"lost",boss:true}),"end");
 assert.deepEqual([1,9,10,19,20,40].map(intensityFor),[1,1,2,2,3,3]);
});

test('every theme schedules a bar at each intensity; later waves add layers',()=>{
 for(const id of Object.keys(THEMES))for(let bar=0;bar<8;bar++){const ac=fakeContext();const len=scheduleBar(ac,{},id,bar,0,1);assert.ok(len>1.5&&len<3.1,id);assert.ok(ac.started>5,id+" bar "+bar);}
 const count=n=>{const ac=fakeContext();scheduleBar(ac,{},"battle",0,0,n);return ac.started;};
 assert.ok(count(2)>count(1)&&count(3)>count(2));
});

test('works with no Web Audio and saves the player\'s choices',()=>{
 const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 const s=createSfx(storage);s.play("wave",{pan:.5});s.music(true);s.mood("boss",3);
 assert.equal(s.state.mood,"boss");s.mood("nonsense");assert.equal(s.state.mood,"calm");
 s.setMusic(false);assert.equal(createSfx(storage).prefs.music,false);s.music(false);
});

test('voice barks: every school and commander has a voice, every line speaks, and voices can be muted',()=>{
 for(const c of ["W","U","B","R","G"])assert.ok(voiceFor({color:c}).f0>0,c);
 assert.ok(voiceFor({color:"W",tier:4}).f0<voiceFor({color:"W",tier:1}).f0,"higher tiers sound deeper");
 assert.equal(voiceFor({commander:"krenko",tier:4}).f0,COMMANDER_VOICES.krenko.f0);
 assert.equal(voiceFor({color:"X"}).f0,VOICES.R.f0);
 for(const kind of Object.keys(LINES)){const ac=fakeContext();const len=bark(ac,0,voiceFor({commander:"urdragon"}),kind,{});assert.ok(len>.1&&len<1,kind);assert.ok(ac.started>=1&&ac.started<=4,kind);}
 const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 const s=createSfx(storage);assert.equal(s.prefs.voice,true);assert.equal(s.say({color:"G"},"build"),false);
 s.setVoice(false);assert.equal(createSfx(storage).prefs.voice,false);assert.equal(s.attackDue(),false);
});

test('fuller music: harmony, counter-melody and low strings join every theme',()=>{
 for(const t of Object.values(THEMES))assert.ok(t.layers.some(l=>["harmony","counter","cello"].includes(l.part)));
});
