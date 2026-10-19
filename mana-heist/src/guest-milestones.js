// P13: Guest-only milestones derived from EXISTING valid save records.
// No new storage, profile bling, verified ranks, analytics, or network calls.
import {LEVELS} from "./levels.js";
import {validBest} from "./campaign.js";
import {LEARN_COUNT} from "./learn-track.js";
import {BONUS_TRIALS} from "./bonus-trials.js";
import {REMIXED_IDS} from "./certified-remixes.js";

export const GUEST_MILESTONES=Object.freeze([
 {id:"first-vault",name:"FIRST SPARK",meaning:"Crack a scored campaign vault"},
 {id:"ten-vaults",name:"LOCKPICK",meaning:"Crack 10 scored vaults"},
 {id:"galaxy",name:"STARBOUND",meaning:"Crack 50 scored vaults"},
 {id:"halfway",name:"MIDPOINT MASTER",meaning:"Crack 250 scored vaults"},
 {id:"full-campaign",name:"COSMIC HEIST",meaning:"Crack all 500 scored vaults"},
 {id:"all-lessons",name:"MANA SCHOLAR",meaning:"Finish all 28 Learn Mana exercises"},
 {id:"bonus-both",name:"RISK TAKER",meaning:"Finish both scored bonus trials"},
 {id:"remix-five",name:"FIVE STRATEGIES",meaning:"Solve all five version-four galaxy remixes"}
]);
export function guestMilestones({bests={},learnCompleted=[],bonusBests={},remixBests={}}={}){
 const cleared=LEVELS.reduce((n,level)=>n+(validBest(bests[level.id])?1:0),0);
 const lessons=new Set((Array.isArray(learnCompleted)?learnCompleted:[]).filter(i=>Number.isInteger(i)&&i>=0&&i<LEARN_COUNT)).size;
 const trials=BONUS_TRIALS.reduce((n,t)=>n+(bonusBests[t.id]?.stars>=1?1:0),0);
 const remixes=REMIXED_IDS.reduce((n,id)=>n+(validBest(remixBests[id])?1:0),0);
 const passes={
  "first-vault":cleared>=1,"ten-vaults":cleared>=10,"galaxy":cleared>=50,
  "halfway":cleared>=250,"full-campaign":cleared===500,
  "all-lessons":lessons===LEARN_COUNT,"bonus-both":trials===BONUS_TRIALS.length,
  "remix-five":remixes===REMIXED_IDS.length
 };
 return {cleared,lessons,trials,remixes,badges:GUEST_MILESTONES.map(({id,name,meaning})=>({id,name,meaning,earned:passes[id]}))};
}
