/*
 * Visual-only creature P/T presentation.
 * Current effective P/T always overlays the printed P/T if changed; separate
 * badges show known counters and stat boosts. The Scryfall image is unmodified.
 * This helper never changes rules state, creature damage, or legal actions.
 */
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const signed=n=>(n>0?'+':'')+String(n);
const counterCount=u=>{
 const explicit=u?.plusOneCounters;
 if(Number.isInteger(explicit)&&explicit>=0)return explicit;
 const counters=u?.counters;
 if(counters&&typeof counters==='object'){
  const n=counters['+1/+1']??counters.plusOnePlusOne;
  if(Number.isInteger(n)&&n>=0)return n;
 }
 return 0;
};
export function presentCreaturePT(unit,printed,currentPower,currentToughness){
 if(!finite(printed?.power)||!finite(printed?.toughness)||
    !finite(currentPower)||!finite(currentToughness))
  throw new TypeError('P/T presentation requires numeric printed and effective P/T');
 const u=unit||{};
 const dp=currentPower-printed.power,dt=currentToughness-printed.toughness;
 const counters=counterCount(u);
 const boostPower=finite(u.powerBoost)?u.powerBoost:0;
 const boostToughness=finite(u.toughnessBoost)?u.toughnessBoost:0;
 const baseSet=u.basePTSet===true||u.ptSet===true||
  finite(u.basePower)||finite(u.baseToughness);
 const badges=[];
 if(counters>0){
  badges.push({
   kind:'counter',
   text:counters===1?'+1/+1':counters+' × +1/+1',
   accessible:counters+' +1/+1 counter'+(counters===1?'':'s')
  });
 }
 // All badges are sourced from known state, never inferred from damage:
 // marked damage does not change toughness. In some engines counter bonuses
 // are already included in powerBoost/toughnessBoost; avoid double counting
 // in that case, using the final computed delta as authority.
 let bp=boostPower,bt=boostToughness;
 if(!baseSet&&counters>0){
  const separateCounters=dp===boostPower+counters&&dt===boostToughness+counters;
  const includedCounters=dp===boostPower&&dt===boostToughness;
  if(includedCounters&&!separateCounters){bp-=counters;bt-=counters;}
  else if(!separateCounters){bp=0;bt=0;}
 }
 if(bp!==0||bt!==0){
  badges.push({
   kind:'boost',text:signed(bp)+'/'+signed(bt),
   accessible:'P/T modifier '+signed(bp)+'/'+signed(bt)
  });
 }
 const modified=dp!==0||dt!==0||baseSet||badges.length>0;
 if(!modified)return {kind:'printed',text:'',accessible:'',badges:[],showCurrent:false};
 const current=currentPower+'/'+currentToughness;
 const reasons=badges.map(b=>b.accessible);
 return {
  kind:baseSet?'base-set':'modified',
  text:current,
  currentText:current,
  showCurrent:true,
  badges,
  accessible:'Current power and toughness '+current+
   (reasons.length?'. '+reasons.join('; '):'')+'.'
 };
}
