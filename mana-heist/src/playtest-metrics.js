// Optional, anonymous-in-the-export local playtest metrics for Mana Heist.
// No automatic opt-in, network calls, identifiers, timestamps or action traces.
// Source revisions matter: old puzzle scores must never merge into new boards.
export const PLAYTEST_KEY="dc-mana-heist-playtest-v1";
export const PLAYTEST_OPT_KEY="dc-mana-heist-playtest-optin-v1";
const validId=id=>typeof id==="string"&&/^mh-(?:[0-9]{2,3}|learn-[0-9]{2}|bonus-[0-9]{2})$/.test(id);
const capped=(v,max=10000)=>Number.isInteger(v)&&v>=0&&v<=max?v:0;
export const blankPlaytest=()=>({v:1,puzzles:{}});
const record=()=>({attempts:0,wins:0,exits:0,restarts:0,undos:0,failedCasts:0,seconds:0,ratings:[0,0,0,0,0]});
export function normalizePlaytest(raw){
 const out=blankPlaytest();
 if(!raw||raw.v!==1||!raw.puzzles||typeof raw.puzzles!=="object"||Array.isArray(raw.puzzles))return out;
 for(const [key,r] of Object.entries(raw.puzzles).slice(0,550)){
  const match=/^(mh-(?:[0-9]{2,3}|learn-[0-9]{2}|bonus-[0-9]{2}))@([0-9])$/.exec(key);
  if(!match||!validId(match[1])||!r||typeof r!=="object"||Array.isArray(r))continue;
  const stats=record();
  for(const field of ["attempts","wins","exits","restarts","undos","failedCasts","seconds"])stats[field]=capped(r[field],field==="seconds"?36000000:10000);
  if(stats.wins>stats.attempts||stats.exits+stats.restarts+stats.wins>stats.attempts)continue;
  if(Array.isArray(r.ratings)&&r.ratings.length===5)stats.ratings=r.ratings.map(x=>capped(x));
  if(stats.ratings.reduce((a,b)=>a+b,0)>stats.wins)stats.ratings=[0,0,0,0,0];
  out.puzzles[key]=stats;
 }
 return out;
}
export const playtestPuzzleKey=level=>validId(level?.id)&&Number.isInteger(level?.revision||0)&&level.revision>=0&&level.revision<=9?
 level.id+"@"+(level.revision||0):null;
export function beginPlaytest(level,now){
 const key=playtestPuzzleKey(level);
 return key&&Number.isFinite(now)?{key,started:now,undos:0,restarts:0,failedCasts:0,actions:0}:null;
}
export function countPlaytestEvent(attempt,event){
 if(!attempt||!["undo","failedCast","action"].includes(event))return attempt;
 const out={...attempt};
 if(event==="undo")out.undos=Math.min(10000,out.undos+1);
 if(event==="failedCast")out.failedCasts=Math.min(10000,out.failedCasts+1);
 if(event==="action")out.actions=Math.min(10000,out.actions+1);
 return out;
}
export function finishPlaytest(data,attempt,status,now){
 if(!attempt||!["win","exit","restart"].includes(status))return normalizePlaytest(data);
 const out=normalizePlaytest(data),old=out.puzzles[attempt.key]||record();
 const seconds=Number.isFinite(now)?Math.min(3600,Math.max(0,Math.round((now-attempt.started)/1000))):0;
 out.puzzles[attempt.key]={
  ...old,attempts:Math.min(10000,old.attempts+1),
  wins:Math.min(10000,old.wins+(status==="win"?1:0)),
  exits:Math.min(10000,old.exits+(status==="exit"?1:0)),
  restarts:Math.min(10000,old.restarts+(status==="restart"?1:0)),
  undos:Math.min(10000,old.undos+attempt.undos),
  failedCasts:Math.min(10000,old.failedCasts+attempt.failedCasts),
  seconds:Math.min(36000000,old.seconds+seconds)
 };
 return out;
}
export function ratePlaytest(data,key,score){
 const out=normalizePlaytest(data),r=out.puzzles[key];
 if(!r||!Number.isInteger(score)||score<1||score>5)return out;
 if(r.ratings.reduce((a,b)=>a+b,0)>=r.wins)return out;
 r.ratings[score-1]++;
 return out;
}
export function exportPlaytest(data){
 const normalized=normalizePlaytest(data);
 const entries=Object.entries(normalized.puzzles).sort(([a],[b])=>a.localeCompare(b))
  .map(([puzzle,stats])=>({puzzle,...stats}));
 return JSON.stringify({
  format:"Mana Heist Game Lab — local opt-in playtest summary",version:1,
  notice:"Counts are voluntary playtest samples, not representative player difficulty or verified human trials. No personal identity, timestamps or move histories are included.",
  sampleAttempts:entries.reduce((a,e)=>a+e.attempts,0),
  vaults:entries
 },null,2);
}
