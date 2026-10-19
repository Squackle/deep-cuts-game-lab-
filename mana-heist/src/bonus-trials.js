// Optional scored Lab side-vaults: independent from 500 campaign IDs, medals,
// and original 28 unscored lesson-completion records. No player accounts.
import {VERSION} from "./engine.js";
const card=(id,name)=>({id,card:name});
export const BONUS_TRIALS=Object.freeze([
 {
  id:"mh-bonus-01",version:VERSION,chapter:"THE BORROWED VAULT",rank:3,
  title:"THE BORROWED GATE",
  briefing:"One turn and two wards. The rival land palette lets Fellwar Stone produce white or black, but not both at once. Choose white for the first seal. Then pay the Talisman's black damage toll and use Wastes for true colorless.",
  turnLimit:1,life:2,field:[card("f0","fellwar"),card("f1","island"),card("f2","talisman"),card("f3","relic")],
  hand:[],library:[],opponentLandColors:["W","B"],
  stages:[{name:"The White Cipher",cost:{W:1,U:1}},{name:"The Black Toll",cost:{B:1,C:1}}]
 },
 {
  id:"mh-bonus-02",version:VERSION,chapter:"THE BORROWED VAULT",rank:4,
  title:"THE TALISMAN'S TWO TURNS",
  briefing:"Two wards, two turns. The rival lands offer only red and green through Fellwar Stone. In turn one, take colorless from the Talisman safely. In turn two, take black instead and survive on one life. Mana empties between turns.",
  turnLimit:2,life:2,field:[card("f0","fellwar"),card("f1","talisman"),card("f2","island")],
  hand:[],library:[],opponentLandColors:["R","G"],
  stages:[{name:"The Safe Toll",cost:{R:1,C:1}},{name:"The Dangerous Color",cost:{B:1,U:1}}]
 }
]);
export const BONUS_TRIAL_STORAGE_KEY="dc-mana-heist-bonus-trials-v1";
export function normalizeBonusBests(raw){
 const out={};
 if(!raw||raw.v!==1||!raw.bests||typeof raw.bests!=="object"||Array.isArray(raw.bests))return out;
 for(const t of BONUS_TRIALS){
  const r=raw.bests[t.id];
  if(r&&Number.isInteger(r.turn)&&r.turn>=1&&r.turn<=t.turnLimit&&
     Number.isInteger(r.spentLife)&&r.spentLife>=0&&r.spentLife<t.life&&
     Number.isInteger(r.actions)&&r.actions>=2&&r.actions<=100&&
     Number.isInteger(r.stars)&&r.stars>=1&&r.stars<=3){
   out[t.id]={turn:r.turn,spentLife:r.spentLife,actions:r.actions,stars:r.stars};
  }
 }
 return out;
}
export function betterBonusScore(next,old){
 return !old||next.turn<old.turn||
  (next.turn===old.turn&&next.spentLife<old.spentLife)||
  (next.turn===old.turn&&next.spentLife===old.spentLife&&next.actions<old.actions);
}
