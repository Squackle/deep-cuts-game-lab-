/** Original short Web Audio arcade fanfare, played once after an EARNED victory.
 * No timers, fetch, samples or persistent state. Muting and tab hiding cancel it.
 */
export const VICTORY_FANFARES=Object.freeze({
 perfect_clear:Object.freeze([60,64,67,72,76,79,84,88,91,96]),
 broodmother_defeated:Object.freeze([53,60,65,69,72,77,81,84,89,96])
});
export const midiHz=n=>440*2**((n-69)/12);
export class VictoryFanfare{
 constructor(){this.bus=null;this.oscillators=[];this.playing=false;this.lastOutcome=null;}
 stop(){
  for(const o of this.oscillators){try{o.stop()}catch{}}
  this.oscillators=[];
  if(this.bus){try{this.bus.disconnect()}catch{}}
  this.bus=null;this.playing=false;
 }
 play(context,outcome,enabled=true){
  this.stop();
  if(!enabled||!context||context.state!=="running"||!Object.hasOwn(VICTORY_FANFARES,outcome))return false;
  try{
   const bus=context.createGain();
   bus.gain.value=.19;bus.connect(context.destination);
   this.bus=bus;this.lastOutcome=outcome;
   const song=VICTORY_FANFARES[outcome],unit=outcome==="perfect_clear"?.19:.22,start=context.currentTime+.035;
   for(let i=0;i<song.length;i++){
    const note=song[i],now=start+i*unit,len=i===song.length-1?unit*3:unit*.91;
    for(const [offset,volume,wave] of [[0,.20,"square"],[-12,.11,"triangle"]]){
     const osc=context.createOscillator(),gain=context.createGain();
     osc.type=wave;osc.frequency.setValueAtTime(midiHz(note+offset),now);
     gain.gain.setValueAtTime(.0001,now);
     gain.gain.linearRampToValueAtTime(volume,now+.024);
     gain.gain.exponentialRampToValueAtTime(.0001,now+len);
     osc.connect(gain).connect(bus);osc.start(now);osc.stop(now+len+.015);
     this.oscillators.push(osc);
    }
   }
   this.playing=true;
   return true;
  }catch{this.stop();return false}
 }
}
