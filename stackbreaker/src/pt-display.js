/*
 * Presentation only: distinguish additive stat changes from effects that
 * change a creature's base P/T. Does not change MTG game characteristics.
 * Scryfall card art and the printed P/T remain untouched for additive buffs.
 */
const signed = n => (n > 0 ? '+' : '') + String(n);
const finite = n => typeof n === 'number' && Number.isFinite(n);
function plusOneCounters(unit){
 const counters=unit?.counters;
 const explicit=unit?.plusOneCounters;
 if(Number.isInteger(explicit)&&explicit>=0)return explicit;
 if(counters&&typeof counters==='object'){
  const value=counters['+1/+1']??counters.plusOnePlusOne;
  if(Number.isInteger(value)&&value>=0)return value;
 }
 return 0;
}
export function presentCreaturePT(unit,printed,currentPower,currentToughness){
 if(!finite(printed?.power)||!finite(printed?.toughness)||
    !finite(currentPower)||!finite(currentToughness))
  throw new TypeError('P/T presentation requires numeric printed and effective P/T');
 const deltaPower=currentPower-printed.power,deltaToughness=currentToughness-printed.toughness;
 const changed=deltaPower!==0||deltaToughness!==0;
 // A future engine may explicitly supply base-setting metadata; P/T overlays
 // still reflect the engine-computed effective values, never invented ones.
 const baseSet=unit?.basePTSet===true||unit?.ptSet===true||
  finite(unit?.basePower)||finite(unit?.baseToughness);
 if(!changed&&!baseSet)return {kind:'printed',text:'',accessible:''};
 const counters=plusOneCounters(unit);
 const additivePower=(unit?.powerBoost||0)+counters;
 const additiveToughness=(unit?.toughnessBoost||0)+counters;
 const onlyAdditive=!baseSet&&deltaPower===additivePower&&deltaToughness===additiveToughness;
 if(onlyAdditive){
  const onlyCounters=counters>0&&!(unit?.powerBoost||0)&&!(unit?.toughnessBoost||0);
  const text=onlyCounters?counters+' × +1/+1':signed(deltaPower)+'/'+signed(deltaToughness);
  const accessible='Creature P/T modifier '+text+
   (counters>0&&!onlyCounters?' ('+counters+' +1/+1 counter'+(counters===1?'':'s')+')':'')+
   '. Current power and toughness '+currentPower+'/'+currentToughness+'. Printed card unchanged.';
  return {kind:'modifier',text,accessible};
 }
 return {
  kind:'replacement',text:currentPower+'/'+currentToughness,
  accessible:'Current power and toughness '+currentPower+'/'+currentToughness+
   ' (base-changing effect or non-additive change).'
 };
}
