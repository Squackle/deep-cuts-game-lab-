// Sound effects and a quiet music loop, synthesized with Web Audio. No audio files.
// Starts only after a tap (browsers require it). Mute and music choices are saved per browser.
const KEY="archemancy.sound.v1";
export function createSfx(storage=null){
 let ac=null,master=null,musicGain=null,musicTimer=0,step=0;const last={};
 let prefs={sound:true,music:true};try{prefs={...prefs,...JSON.parse(storage?.getItem(KEY)||"{}")};}catch{}
 const save=()=>{try{storage?.setItem(KEY,JSON.stringify(prefs));}catch{}};
 function ensure(){if(ac)return ac;const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)return null;ac=new AC();master=ac.createGain();master.gain.value=prefs.sound?.55:0;master.connect(ac.destination);musicGain=ac.createGain();musicGain.gain.value=prefs.music?.16:0;musicGain.connect(master);return ac;}
 function tone(freq,dur,{type="sine",vol=.3,attack=.005,slide=0,delay=0,dest=null}={}){if(!ac)return;const t=ac.currentTime+delay,o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*slide),t+dur);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(dest||master);o.start(t);o.stop(t+dur+.02);}
 function noise(dur,{vol=.25,freq=900,q=1,delay=0}={}){if(!ac)return;const t=ac.currentTime+delay,len=Math.ceil(ac.sampleRate*dur),buf=ac.createBuffer(1,len,ac.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);const src=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();src.buffer=buf;f.type="bandpass";f.frequency.value=freq;f.Q.value=q;g.gain.value=vol;src.connect(f);f.connect(g);g.connect(master);src.start(t);}
 const sounds={
  click:()=>tone(660,.06,{type:"triangle",vol:.12}),
  build:()=>{noise(.18,{vol:.35,freq:300});tone(140,.22,{type:"triangle",vol:.3,slide:.6});},
  upgrade:()=>{[523,659,784].forEach((f,i)=>tone(f,.25,{type:"triangle",vol:.16,delay:i*.07}));},
  sell:()=>{tone(880,.12,{type:"square",vol:.06});tone(1175,.16,{type:"square",vol:.06,delay:.06});},
  hit:()=>noise(.05,{vol:.06,freq:2400,q:2}),
  kill:()=>{noise(.09,{vol:.12,freq:1200});tone(1320,.08,{type:"triangle",vol:.05});},
  coin:()=>tone(1568,.09,{type:"triangle",vol:.05}),
  leak:()=>{tone(110,.35,{type:"sawtooth",vol:.2,slide:.5});noise(.25,{vol:.2,freq:200});},
  wave:()=>{tone(196,.5,{type:"sawtooth",vol:.12,attack:.05});tone(294,.6,{type:"sawtooth",vol:.1,attack:.05,delay:.18});},
  boss:()=>{tone(98,1.1,{type:"sawtooth",vol:.2,attack:.08,slide:.9});tone(147,1.1,{type:"sawtooth",vol:.14,attack:.08,delay:.3});noise(.6,{vol:.15,freq:150,delay:.1});},
  bossDown:()=>{[392,523,659,784,1047].forEach((f,i)=>tone(f,.35,{type:"triangle",vol:.14,delay:i*.08}));},
  cast:()=>{noise(.3,{vol:.12,freq:1800,q:.7});tone(440,.3,{type:"sine",vol:.12,slide:2});},
  ability:()=>tone(330,.4,{type:"square",vol:.07,slide:.7}),
  victory:()=>{[523,659,784,1047,784,1047].forEach((f,i)=>tone(f,.4,{type:"triangle",vol:.16,delay:i*.14}));},
  defeat:()=>{[392,349,311,262].forEach((f,i)=>tone(f,.55,{type:"sawtooth",vol:.1,delay:i*.22}));},
  star:()=>tone(1760,.25,{type:"triangle",vol:.12})
 };
 const gaps={hit:45,kill:60,coin:70,leak:150,ability:300};
 function play(name){if(!prefs.sound||!ensure())return;if(ac.state==="suspended")ac.resume();const now=performance.now();if(gaps[name]&&now-(last[name]||0)<gaps[name])return;last[name]=now;sounds[name]?.();}
 // A slow, quiet pentatonic loop over a low drone.
 const scale=[220,247,294,330,392,440,494,587];
 function music(on){clearInterval(musicTimer);if(!on||!prefs.music||!prefs.sound||!ensure())return;musicTimer=setInterval(()=>{if(ac.state!=="running")return;const bar=Math.floor(step/8),beat=step%8;if(beat===0)tone([110,98,131,87][bar%4],3.6,{type:"sine",vol:.35,attack:.6,dest:musicGain});if(beat%2===0||Math.random()<.3)tone(scale[(step*5+bar*3)%scale.length]*(Math.random()<.2?2:1),.9,{type:"triangle",vol:.12,attack:.02,dest:musicGain});step++;},450);}
 function setSound(on){prefs.sound=on;save();ensure();if(master)master.gain.value=on?.55:0;if(!on)music(false);}
 function setMusic(on){prefs.music=on;save();ensure();if(musicGain)musicGain.gain.value=on?.16:0;}
 function unlock(){if(ensure()&&ac.state==="suspended")ac.resume();}
 return {play,music,setSound,setMusic,unlock,get prefs(){return {...prefs};}};
}
