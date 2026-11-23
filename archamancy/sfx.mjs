// ARCHEMANCY sound: an original orchestral-style score and sound effects, synthesized with Web Audio. No audio files.
// Starts only after a tap (browsers require it). Mute and music choices are saved per browser.
//
// Music follows the game (see pickMood): a title theme on the menu, a light theme while you build, battle drums
// during a wave (more layers join at waves 10 and 20), a heavier boss theme while a boss is on the road, and
// silence under the victory or defeat fanfare. Themes change on the next bar line, so the switch stays in time.
const KEY="archemancy.sound.v1";
const NOTE={C:0,"C#":1,Db:1,D:2,"D#":3,Eb:3,E:4,F:5,"F#":6,Gb:6,G:7,"G#":8,Ab:8,A:9,"A#":10,Bb:10,B:11};
export const hz=m=>440*2**((m-69)/12);
export function midi(name){const m=/^([A-G](?:#|b)?)(-?\d)$/.exec(name);if(!m)throw new Error("Bad note "+name);return NOTE[m[1]]+12*(+m[2]+1);}
// "Dm" → [D3,F3,A3]; "Bb" → [Bb2,D3,F3]. Roots sit between A2 and G#3.
export function chord(name){const m=/^([A-G](?:#|b)?)(m?)$/.exec(name);if(!m)throw new Error("Bad chord "+name);let r=NOTE[m[1]]+48;if(r>56)r-=12;return [r,r+(m[2]?3:4),r+7];}
// "A4:1.5 D5:.5 r:1" → [{m,beat,len}] with beats counted from the start of the line.
export function line(text){let beat=0;const out=[];for(const tok of text.trim().split(/\s+/)){const [n,l]=tok.split(":"),len=+l;if(!(len>0))throw new Error("Bad length "+tok);if(n!=="r")out.push({m:midi(n),beat,len});beat+=len;}out.total=beat;return out;}

// Original themes (composed for ARCHEMANCY). Each has 8 bars of 4 beats; melodies are one bar per string.
// Layers with `from` only play at that battle intensity or above.
export const THEMES={
 menu:{name:"The Spellbook Opens",bpm:80,chords:["Dm","Bb","F","C","Dm","Bb","Gm","A"],
  lead:"horn",melody:["A4:1.5 D5:.5 E5:1 F5:1","D5:2 r:1 C5:.5 Bb4:.5","A4:1.5 C5:.5 F5:1 E5:.5 D5:.5","E5:3 r:1","A4:1.5 D5:.5 E5:1 F5:1","G5:1.5 F5:.5 D5:1 Bb4:1","C5:1 D5:1 Bb4:1 G4:1","A4:2 E4:1 C#5:1"],
  layers:[{part:"pad",inst:"strings",vol:.09},{part:"arp",inst:"harp",vol:.11,step:.5},{part:"bass",inst:"bass",vol:.14,beats:[0]},{part:"drum",inst:"timp",vol:.2,hits:{0:[0],4:[0]}}]},
 calm:{name:"Between the Waves",bpm:96,chords:["F","C","Dm","Bb","F","C","Bb","C"],
  lead:"flute",melody:["C5:1 F5:1 G5:.5 A5:.5 G5:1","E5:2 C5:1 r:1","D5:1 F5:1 A5:1 G5:.5 F5:.5","D5:3 r:1","C5:1 F5:1 G5:.5 A5:.5 Bb5:1","G5:2 E5:1 C5:1","D5:1 F5:.5 E5:.5 D5:1 Bb4:1","C5:3 r:1"],
  layers:[{part:"pad",inst:"strings",vol:.05},{part:"arp",inst:"harp",vol:.1,step:1},{part:"bass",inst:"pizz",vol:.16,beats:[0,2]},{part:"drum",inst:"shaker",vol:.05,pattern:"..x...x...x...x."}]},
 battle:{name:"Hold the Line",bpm:138,chords:["Dm","Dm","Bb","C","Dm","Dm","Gm","A"],
  lead:"brass",melody:["D5:1.5 A4:.5 D5:.5 E5:.5 F5:1","E5:1 D5:1 A4:2","F5:1.5 D5:.5 F5:.5 G5:.5 A5:1","G5:2 E5:1 C5:1","D5:1.5 A4:.5 D5:.5 E5:.5 F5:1","A5:1 G5:.5 F5:.5 E5:1 D5:1","Bb4:1 D5:1 G5:1 F5:.5 E5:.5","E5:2 C#5:1 A4:1"],
  layers:[{part:"ostinato",inst:"spic",vol:.07},{part:"bass",inst:"lowbrass",vol:.12,beats:[0,2]},{part:"drum",inst:"timp",vol:.24,pattern:"x.......x.....x."},{part:"drum",inst:"snare",vol:.09,pattern:"....x.......x..x"},
   {part:"pad",inst:"choir",vol:.06,from:2},{part:"drum",inst:"snare",vol:.06,pattern:"..x...x...x.xxxx",from:2},{part:"double",inst:"brass",vol:.05,from:3},{part:"drum",inst:"cymbal",vol:.08,hits:{0:[0],4:[0]},from:3}]},
 boss:{name:"The Tyrant Walks",bpm:112,chords:["Cm","Db","Cm","Db","Ab","Bb","Cm","G"],
  lead:"lowbrass",melody:["C4:1.5 C4:.5 Eb4:1 G4:1","Ab4:1.5 G4:.5 F4:1 Db4:1","C4:1.5 C4:.5 Eb4:1 G4:1","Ab4:1 Bb4:1 Ab4:1 G4:1","C5:2 Bb4:1 Ab4:1","D5:2 C5:1 Bb4:1","Eb5:1.5 D5:.5 C5:1 G4:1","G4:2 B4:1 D5:1"],
  layers:[{part:"pad",inst:"choir",vol:.09},{part:"tremolo",inst:"spic",vol:.035},{part:"bass",inst:"bass",vol:.16,beats:[0,1.5,2,3.5]},{part:"drum",inst:"tom",vol:.22,pattern:"x..x..x.x..x..x."},{part:"drum",inst:"timp",vol:.26,pattern:"x.......x......."},{part:"drum",inst:"cymbal",vol:.07,hits:{0:[0],4:[0]}},{part:"double",inst:"brass",vol:.06}]}
};
for(const t of Object.values(THEMES))t.lines=t.melody.map(line);

export function pickMood({title=false,phase="ready",boss=false}={}){if(title)return "menu";if(phase==="won"||phase==="lost")return "end";if(phase==="active")return boss?"boss":"battle";return "calm";}
export const intensityFor=wave=>wave>=20?3:wave>=10?2:1;

// ---- Instruments. Every voice is a few oscillators or a noise burst through a filter and an envelope. ----
let noiseBuf=null;
function noiseBuffer(ac){if(noiseBuf&&noiseBuf.sampleRate===ac.sampleRate)return noiseBuf;const len=ac.sampleRate*2,b=ac.createBuffer(1,len,ac.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;return noiseBuf=b;}
function out(ac,dest,pan){if(!pan||!ac.createStereoPanner)return dest;const p=ac.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan));p.connect(dest);return p;}
function env(ac,t,dur,vol,attack,release,dest){const g=ac.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+attack);g.gain.setValueAtTime(vol,t+Math.max(attack,dur-release));g.gain.exponentialRampToValueAtTime(.0001,t+dur+release);g.connect(dest);return g;}
function oscs(ac,t,stop,f,types,detunes,dest,{vib=0,slide=0,slideTime=0}={}){let lfo=null;if(vib){lfo=ac.createOscillator();const lg=ac.createGain();lfo.frequency.value=5.2;lg.gain.value=vib;lfo.connect(lg);lfo.start(t);lfo.stop(stop);lfo.lg=lg;}
 types.forEach((type,i)=>{const o=ac.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f*slide),t+slideTime);o.detune.value=detunes[i]||0;if(lfo)lfo.lg.connect(o.detune);o.connect(dest);o.start(t);o.stop(stop);});}
function filt(ac,type,freq,q,dest){const f=ac.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;f.connect(dest);return f;}
function noiseHit(ac,t,dur,vol,type,freq,q,dest){const s=ac.createBufferSource();s.buffer=noiseBuffer(ac);const g=ac.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);g.connect(dest);s.connect(filt(ac,type,freq,q,g));s.start(t,Math.random()*1.5);s.stop(t+dur+.05);}
export const INSTRUMENTS={
 strings(ac,t,f,dur,vol,d){const g=env(ac,t,dur,vol,Math.min(.35,dur*.4),.45,d);oscs(ac,t,t+dur+.5,f,["sawtooth","sawtooth","sawtooth"],[-9,0,10],filt(ac,"lowpass",1700,.7,g),{vib:5});},
 choir(ac,t,f,dur,vol,d){const g=env(ac,t,dur,vol,Math.min(.5,dur*.4),.6,d),lp=filt(ac,"lowpass",1500,.5,g);const bp=filt(ac,"bandpass",750,.9,lp);oscs(ac,t,t+dur+.65,f,["sawtooth","sawtooth","triangle"],[-13,12,0],bp,{vib:7});},
 brass(ac,t,f,dur,vol,d){const g=env(ac,t,dur,vol,.05,.16,d),lp=ac.createBiquadFilter();lp.type="lowpass";lp.Q.value=1.4;lp.frequency.setValueAtTime(350,t);lp.frequency.linearRampToValueAtTime(2600,t+.07);lp.frequency.exponentialRampToValueAtTime(1300,t+.4);lp.connect(g);oscs(ac,t,t+dur+.2,f,["sawtooth","sawtooth"],[-6,7],lp,{vib:dur>.6?4:0});},
 horn(ac,t,f,dur,vol,d){const g=env(ac,t,dur,vol,.08,.25,d);oscs(ac,t,t+dur+.3,f,["sawtooth","triangle"],[-4,4],filt(ac,"lowpass",950,.8,g),{vib:dur>.6?4:0});},
 lowbrass(ac,t,f,dur,vol,d){const g=env(ac,t,dur,vol,.04,.15,d),lp=ac.createBiquadFilter();lp.type="lowpass";lp.Q.value=2;lp.frequency.setValueAtTime(220,t);lp.frequency.linearRampToValueAtTime(1100,t+.06);lp.frequency.exponentialRampToValueAtTime(600,t+.5);lp.connect(g);oscs(ac,t,t+dur+.2,f,["sawtooth","sawtooth","square"],[-8,8,-1200],lp);},
 flute(ac,t,f,dur,vol,d){const g=env(ac,t,dur,vol,.07,.12,d);oscs(ac,t,t+dur+.15,f,["sine","triangle"],[0,2],filt(ac,"lowpass",3200,.5,g),{vib:dur>.5?9:3});noiseHit(ac,t,.09,vol*.25,"bandpass",f*2,2,d);},
 harp(ac,t,f,dur,vol,d){const g=ac.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+1.6);g.connect(d);oscs(ac,t,t+1.7,f,["triangle","sine"],[0,1200],filt(ac,"lowpass",2600,.3,g));},
 pizz(ac,t,f,dur,vol,d){const g=ac.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+.45);g.connect(d);oscs(ac,t,t+.5,f,["triangle","sawtooth"],[0,3],filt(ac,"lowpass",900,1,g));},
 spic(ac,t,f,dur,vol,d){const g=env(ac,t,Math.min(dur,.12),vol,.008,.08,d);oscs(ac,t,t+.3,f,["sawtooth","sawtooth"],[-7,7],filt(ac,"lowpass",2300,.8,g));},
 bass(ac,t,f,dur,vol,d){const g=env(ac,t,dur,vol,.02,.2,d);oscs(ac,t,t+dur+.25,f,["triangle","sawtooth"],[0,-3],filt(ac,"lowpass",520,1,g));},
 bell(ac,t,f,dur,vol,d){[[1,1],[2.76,.4],[5.4,.2]].forEach(([k,v])=>{const g=ac.createGain();g.gain.setValueAtTime(vol*v,t);g.gain.exponentialRampToValueAtTime(.0001,t+1.4/k+.2);g.connect(d);oscs(ac,t,t+1.6,f*k,["sine"],[0],g);});},
 timp(ac,t,f,dur,vol,d){const g=ac.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+.9);g.connect(d);oscs(ac,t,t+1,f,["sine","triangle"],[0,0],g,{slide:.86,slideTime:.35});noiseHit(ac,t,.12,vol*.5,"lowpass",420,.7,d);},
 tom(ac,t,f,dur,vol,d){const g=ac.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+.5);g.connect(d);oscs(ac,t,t+.55,85,["sine"],[0],g,{slide:.55,slideTime:.3});noiseHit(ac,t,.15,vol*.7,"bandpass",320,1,d);},
 snare(ac,t,f,dur,vol,d){noiseHit(ac,t,.16,vol,"bandpass",2300,.8,d);const g=ac.createGain();g.gain.setValueAtTime(vol*.6,t);g.gain.exponentialRampToValueAtTime(.0001,t+.09);g.connect(d);oscs(ac,t,t+.1,190,["triangle"],[0],g);},
 shaker(ac,t,f,dur,vol,d){noiseHit(ac,t,.05,vol,"highpass",7000,.7,d);},
 cymbal(ac,t,f,dur,vol,d){noiseHit(ac,t,1.6,vol,"highpass",5500,.5,d);noiseHit(ac,t,.5,vol*.6,"bandpass",9000,1,d);}
};
function voice(ac,inst,t,m,dur,vol,dest,pan=0){INSTRUMENTS[inst](ac,t,hz(m),dur,vol,out(ac,dest,pan));}

// Schedule one bar of a theme starting at time t. Used live and by the offline renderer (tests, previews).
export function scheduleBar(ac,dest,theme,bar,t,intensity=1){
 const T=typeof theme==="string"?THEMES[theme]:theme,beat=60/T.bpm,b=bar%T.chords.length,ch=chord(T.chords[b]);
 for(const n of T.lines[b])voice(ac,T.lead,t+n.beat*beat,n.m,n.len*beat*.95,T.lead==="lowbrass"?.13:T.lead==="flute"?.1:.09,dest,.12);
 for(const L of T.layers){if(L.from&&intensity<L.from)continue;const v=L.vol;
  if(L.part==="pad")ch.forEach((m,i)=>voice(ac,L.inst,t,m+12,beat*4,v,dest,(i-1)*.35));
  else if(L.part==="arp"){const tones=[...ch.map(m=>m+12),ch[0]+24,ch[1]+24];for(let s=0,i=0;s<4;s+=L.step,i++)voice(ac,L.inst,t+s*beat,tones[[0,1,2,3,4,3,2,1][i%8]],beat*L.step,v,dest,-.3+.15*(i%4));}
  else if(L.part==="bass")for(const s of L.beats)voice(ac,L.inst,t+s*beat,ch[0]-12,beat*(L.beats.length>2?.5:L.beats.length>1?1.8:3.8),v,dest);
  else if(L.part==="ostinato")for(let s=0;s<8;s++)voice(ac,L.inst,t+s*beat/2,[ch[0],ch[0]+12,ch[2],ch[0]+12][s%4],beat/2,v*(s%2?.7:1),dest,-.25);
  else if(L.part==="tremolo")for(let s=0;s<16;s++)voice(ac,L.inst,t+s*beat/4,ch[s%8<4?1:2]+12,beat/4,v*(s%4?.6:1),dest,.3);
  else if(L.part==="double")for(const n of T.lines[b])voice(ac,L.inst,t+n.beat*beat,n.m+(T.lead==="lowbrass"?12:-12),n.len*beat*.95,v,dest,-.12);
  else if(L.part==="drum"){const hits=L.hits?(L.hits[b]||[]):[...L.pattern].flatMap((c,i)=>c==="x"?[i/4]:[]);for(const s of hits)voice(ac,L.inst,t+s*beat,L.inst==="timp"?ch[0]-12:0,beat,v,dest);}}
 return beat*4;
}
export function reverb(ac,seconds=2.4){const len=Math.floor(ac.sampleRate*seconds),b=ac.createBuffer(2,len,ac.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2);}const r=ac.createConvolver();r.buffer=b;return r;}

export function createSfx(storage=null){
 let ac=null,master=null,dry=null,musicGain=null,musicBus=null,timer=0,enabled=false,mood="menu",moodNow=null,intensity=1,bar=0,nextBar=0;const last={};
 let prefs={sound:true,music:true};try{prefs={...prefs,...JSON.parse(storage?.getItem(KEY)||"{}")};}catch{}
 const save=()=>{try{storage?.setItem(KEY,JSON.stringify(prefs));}catch{}};
 function ensure(){if(ac)return ac;const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)return null;ac=new AC();
  const comp=ac.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;comp.connect(ac.destination);
  master=ac.createGain();master.gain.value=prefs.sound?.6:0;master.connect(comp);
  const room=reverb(ac),wet=ac.createGain();wet.gain.value=.32;room.connect(wet);wet.connect(master);
  dry=ac.createGain();dry.connect(master);const sfxSend=ac.createGain();sfxSend.gain.value=.25;dry.connect(sfxSend);sfxSend.connect(room);
  musicGain=ac.createGain();musicGain.gain.value=prefs.music?.4:0;musicGain.connect(master);const musicSend=ac.createGain();musicSend.gain.value=.7;musicGain.connect(musicSend);musicSend.connect(room);
  return ac;}
 // Short sounds. `o.pan` (−1 left … 1 right) places a sound where it happened on the battlefield.
 const play1=(inst,m,dur,vol,o,delay=0)=>INSTRUMENTS[inst](ac,ac.currentTime+delay,hz(m),dur,vol,out(ac,dry,o?.pan||0));
 function tone(freq,dur,{type="sine",vol=.3,attack=.005,slide=0,delay=0}={},o){const t=ac.currentTime+delay,osc=ac.createOscillator(),g=ac.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,t);if(slide)osc.frequency.exponentialRampToValueAtTime(Math.max(30,freq*slide),t+dur);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+dur);osc.connect(g);g.connect(out(ac,dry,o?.pan||0));osc.start(t);osc.stop(t+dur+.02);}
 function noise(dur,{vol=.25,freq=900,q=1,delay=0}={},o){noiseHit(ac,ac.currentTime+delay,dur,vol,"bandpass",freq,q,out(ac,dry,o?.pan||0));}
 const fanfare=(notes,inst,vol,step,o)=>notes.forEach((n,i)=>n&&play1(inst,midi(n),step*1.6,vol,o,i*step));
 const sounds={
  click:o=>tone(660,.06,{type:"triangle",vol:.12},o),
  build:o=>{noise(.18,{vol:.35,freq:300},o);play1("timp",midi("D2"),.4,.3,o);play1("pizz",midi("A3"),.2,.15,o,.05);},
  upgrade:o=>{["D5","F5","A5","D6"].forEach((n,i)=>play1("harp",midi(n),.3,.13,o,i*.05));play1("bell",midi("A6"),.3,.04,o,.2);},
  smash:o=>{noise(.22,{vol:.3,freq:160},o);tone(70,.25,{type:"sine",vol:.35,slide:.6},o);},
  shot_arcane:o=>tone(880,.12,{type:"sine",vol:.05,slide:1.6},o),
  shot_strike:o=>{tone(520,.08,{type:"triangle",vol:.06,slide:.5},o);noise(.04,{vol:.05,freq:3000,q:3},o);},
  shot_splash:o=>{noise(.25,{vol:.14,freq:220},o);tone(90,.2,{type:"sine",vol:.14,slide:.5},o);},
  shot_chain:o=>{noise(.12,{vol:.08,freq:4000,q:.6},o);tone(1400,.08,{type:"square",vol:.025,slide:.6},o);},
  shot_hex:o=>tone(180,.25,{type:"sawtooth",vol:.035,slide:1.4},o),
  shot_root:o=>{noise(.15,{vol:.07,freq:500,q:4},o);},
  shot_mirror:o=>{tone(1320,.15,{type:"sine",vol:.04},o);tone(1760,.15,{type:"sine",vol:.03,delay:.04},o);},
  // Barracks fighters, the commander and the chapel each have their own sound (fx.mjs sends these on a strike).
  melee_legion:o=>{noise(.06,{vol:.07,freq:3600,q:5},o);tone(1900,.09,{type:"triangle",vol:.03,slide:.9},o);},
  melee_necropolis:o=>{noise(.03,{vol:.08,freq:1500,q:8},o);noise(.03,{vol:.06,freq:1100,q:8,delay:.05},o);},
  melee_goblin:o=>{tone(900,.07,{type:"square",vol:.022,slide:1.5},o);noise(.04,{vol:.05,freq:2200,q:2},o);},
  melee_beast:o=>{noise(.18,{vol:.09,freq:260,q:3},o);tone(110,.16,{type:"sawtooth",vol:.035,slide:.7},o);},
  melee_token:o=>{noise(.05,{vol:.06,freq:1800,q:3},o);},
  melee_commander:o=>{noise(.08,{vol:.09,freq:2600,q:4},o);tone(330,.12,{type:"triangle",vol:.06,slide:.6},o);},
  heal:o=>{play1("bell",midi("E6"),.18,.025,o);play1("bell",midi("B6"),.18,.02,o,.05);},
  sell:o=>{play1("bell",midi("E6"),.2,.05,o);play1("bell",midi("A6"),.2,.05,o,.07);},
  hit:o=>noise(.05,{vol:.06,freq:2400,q:2},o),
  kill:o=>{noise(.09,{vol:.12,freq:1200},o);tone(1320,.08,{type:"triangle",vol:.05},o);},
  coin:o=>play1("bell",midi("G6"),.1,.04,o),
  harvest:o=>{play1("bell",midi("D6"),.2,.05,o);play1("bell",midi("A6"),.2,.04,o,.06);},
  harvestBig:o=>["D6","F#6","A6","D7"].forEach((n,i)=>play1("bell",midi(n),.2,.04,o,i*.05)),
  leak:o=>{play1("lowbrass",midi("D2"),.5,.16,o);noise(.25,{vol:.2,freq:200},o);},
  // Horn call when a wave starts; a low brass and drum roll when a boss arrives.
  wave:o=>{fanfare(["A3","D4",null,"A4"],"horn",.14,.16,o);play1("timp",midi("D2"),.5,.25,o);},
  boss:o=>{fanfare(["C3","Db3","C3"],"lowbrass",.2,.3,o);for(let i=0;i<10;i++)play1("timp",midi("C2"),.2,.08+.02*i,o,i*.07);play1("choir",midi("G4"),1.4,.07,o,.2);play1("cymbal",0,1,.1,o,.7);},
  bossDown:o=>{fanfare(["G4","C5","E5","G5"],"brass",.13,.1,o);play1("timp",midi("C2"),.5,.3,o,.3);play1("cymbal",0,1,.08,o,.3);},
  cast:o=>{noise(.3,{vol:.1,freq:1800,q:.7},o);play1("choir",midi("A4"),.5,.06,o);play1("bell",midi("E6"),.4,.04,o,.05);},
  ability:o=>{play1("brass",midi("D4"),.3,.1,o);play1("brass",midi("A4"),.4,.09,o,.12);},
  victory:o=>{fanfare(["D4","F#4","A4","D5",null,"A4","D5"],"brass",.15,.15,o);["D3","F#3","A3"].forEach(n=>play1("strings",midi(n)+12,1.8,.07,o,.9));play1("timp",midi("D2"),.5,.3,o,.9);play1("cymbal",0,1,.12,o,.9);},
  defeat:o=>{["A3","F3","D3","C#3"].forEach((n,i)=>play1("strings",midi(n),.7,.09,o,i*.35));play1("lowbrass",midi("D2"),2,.12,o,1);play1("timp",midi("D2"),.6,.25,o,1);},
  star:o=>play1("bell",midi("A6"),.25,.07,o)
 };
 const gaps={shot_arcane:90,shot_strike:80,shot_splash:140,shot_chain:110,shot_hex:160,shot_root:160,shot_mirror:120,melee_legion:110,melee_necropolis:110,melee_goblin:110,melee_beast:150,melee_token:120,melee_commander:120,heal:350,smash:120,hit:45,kill:60,coin:70,harvest:180,harvestBig:260,leak:150,ability:300};
 function play(name,o){if(!prefs.sound||!ensure())return;if(ac.state==="suspended")ac.resume();const now=performance.now();if(gaps[name]&&now-(last[name]||0)<gaps[name])return;last[name]=now;sounds[name]?.(o);}
 // ---- Music scheduler: looks a little ahead and queues whole bars, switching theme on a bar line. ----
 function fadeBus(){if(!musicBus)return;const b=musicBus,t=ac.currentTime;b.gain.setTargetAtTime(0,t,.25);setTimeout(()=>{try{b.disconnect();}catch{}},2500);musicBus=null;}
 function tick(){if(!ac||ac.state!=="running")return;const playing=enabled&&prefs.music&&prefs.sound;
  if(!playing||mood==="end"){if(musicBus)fadeBus();moodNow=null;return;}
  const now=ac.currentTime;if(!musicBus||nextBar<now-.1){if(!musicBus){musicBus=ac.createGain();musicBus.connect(musicGain);}nextBar=now+.08;}
  while(nextBar<now+.35){if(mood!==moodNow){moodNow=mood;bar=0;}nextBar+=scheduleBar(ac,musicBus,moodNow,bar++,nextBar,intensity);}
 }
 function music(on){enabled=on;clearInterval(timer);timer=0;if(!on){if(ac)fadeBus();return;}if(!prefs.music||!prefs.sound||!ensure())return;timer=setInterval(tick,60);tick();}
 function setMood(name,level=1){mood=THEMES[name]||name==="end"?name:"calm";intensity=level;}
 function setSound(on){prefs.sound=on;save();ensure();if(master)master.gain.value=on?.6:0;if(!on)music(false);}
 function setMusic(on){prefs.music=on;save();ensure();if(musicGain)musicGain.gain.value=on?.4:0;}
 function unlock(){if(ensure()&&ac.state==="suspended")ac.resume();}
 return {play,music,mood:setMood,setSound,setMusic,unlock,get prefs(){return {...prefs};},get state(){return {mood,playing:moodNow,intensity,enabled};}};
}
