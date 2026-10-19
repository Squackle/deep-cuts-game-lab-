// Mana Heist guest save portability. Pure, exact-key, versioned JSON format.
// This is NOT an account backup, secure proof, leaderboard submission, or
// export of consent, analytics, personal data, device QA, or browser identity.
import {LEVELS} from "./levels.js";
import {validBest,normalizedBests} from "./campaign.js";
import {normalizedLearnProgress} from "./learn-track.js";
import {BONUS_TRIAL_STORAGE_KEY,normalizeBonusBests} from "./bonus-trials.js";
import {REMIX_KEY,validateRemixBests} from "./certified-remixes.js";

export const BACKUP_FORMAT="deep-cuts-mana-heist-guest-backup";
export const BACKUP_VERSION=1;
export const MAX_BACKUP_BYTES=262144;
export const SAVE_KEYS=Object.freeze({
 campaign:"dc-mana-heist-landfall-v2",
 capstones:"dc-mana-heist-capstones-v1",
 variety:"dc-mana-heist-variety-v1",
 remixes:REMIX_KEY,
 bonus:BONUS_TRIAL_STORAGE_KEY,
 learn:"dc-mana-heist-learn-v1"
});
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const object=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const stageIds={
 capstones:new Set(LEVELS.filter(l=>l.revision===1||l.revision===2).map(l=>l.id)),
 variety:new Set(LEVELS.filter(l=>l.revision===3||l.revision===4).map(l=>l.id))
};
const legalActionCount=a=>Number.isInteger(a)&&a>=1&&a<=10000?a:999;
function normalizeVersioned(raw,allowed){
 const bests={};
 if(!object(raw)||raw.v!==1||!object(raw.bests))return {v:1,bests};
 for(const level of LEVELS){
  if(!allowed.has(level.id))continue;
  const r=raw.bests[level.id];
  if(!validBest(r))continue;
  bests[level.id]={turn:r.turn,spentLife:r.spentLife,actions:legalActionCount(r.actions)};
 }
 return {v:1,bests};
}
function normalize(raw){
 const r=object(raw)?raw:{};
 const sourceCampaign=r.campaign;
 const base=object(sourceCampaign)&&sourceCampaign.v===2?sourceCampaign:{};
 const bests=normalizedBests(base.bests);
 const index=Number.isInteger(base.index)&&base.index>=0&&base.index<LEVELS.length?base.index:0;
 const learn=object(r.learn)&&r.learn.v===1?normalizedLearnProgress(r.learn):normalizedLearnProgress(null);
 return {
  campaign:{v:2,index,bests},
  capstones:normalizeVersioned(r.capstones,stageIds.capstones),
  variety:normalizeVersioned(r.variety,stageIds.variety),
  remixes:{v:1,bests:validateRemixBests(r.remixes)},
  bonus:{v:1,bests:normalizeBonusBests(r.bonus)},
  learn:{v:1,completed:learn.completed,last:learn.last}
 };
}
export function readGuestSaves(getItem){
 const source={};
 for(const [name,key] of Object.entries(SAVE_KEYS)){
  try{source[name]=JSON.parse(getItem(key)||"null");}catch{source[name]=null;}
 }
 return normalize(source);
}
export function createGuestBackup(saves){
 const sections=normalize(saves);
 return JSON.stringify({
  format:BACKUP_FORMAT,version:BACKUP_VERSION,
  notice:"Local guest progress only. No account, device QA, opt-in metrics, identity, timestamps, move logs or public leaderboard proof.",
  sections
 },null,2);
}
export function parseGuestBackup(text){
 if(typeof text!=="string"||text.length>MAX_BACKUP_BYTES||text.length<10)throw Error("Invalid or oversized Mana Heist backup.");
 let data;
 try{data=JSON.parse(text);}catch{throw Error("This file is not valid JSON.");}
 if(!object(data)||data.format!==BACKUP_FORMAT||data.version!==BACKUP_VERSION||!object(data.sections))
  throw Error("This is not a supported Mana Heist guest backup (version 1).");
 const names=Object.keys(SAVE_KEYS),actual=Object.keys(data.sections);
 if(actual.length!==names.length||actual.some(k=>!names.includes(k))||names.some(k=>!own(data.sections,k)))
  throw Error("Backup sections are incomplete or contain unsupported data.");
 for(const name of names){
  const section=data.sections[name],expected=name==="campaign"?2:1;
  if(!object(section)||section.v!==expected)throw Error("Invalid or incompatible "+name+" section.");
  if(name==="learn"){
   if(!Array.isArray(section.completed))throw Error("Invalid lesson progress.");
  }else if(!object(section.bests))throw Error("Invalid "+name+" records.");
 }
 return normalize(data.sections);
}
const better=(a,b,withActions=false)=>
 !b||a.turn<b.turn||
 (a.turn===b.turn&&(a.spentLife<b.spentLife||
  (withActions&&a.spentLife===b.spentLife&&(a.actions??999)<(b.actions??999))));
function mergedScores(current,incoming,withActions=false){
 const bests={...current.bests};let added=0,improved=0;
 for(const [id,r] of Object.entries(incoming.bests)){
  if(better(r,bests[id],withActions)){
   if(bests[id])improved++;else added++;
   bests[id]=r;
  }
 }
 return {bests,added,improved};
}
export function previewGuestRestore(currentSaves,incomingSaves){
 const old=normalize(currentSaves),next=normalize(incomingSaves);
 const result={},groups={};let totalAdded=0,totalImproved=0;
 for(const name of ["campaign","capstones","variety","remixes","bonus"]){
  const oldGroup=old[name],newGroup=next[name];
  const merged=mergedScores(oldGroup,newGroup,name!=="campaign");
  result[name]={...oldGroup,bests:merged.bests};
  groups[name]={added:merged.added,improved:merged.improved};
  totalAdded+=merged.added;totalImproved+=merged.improved;
 }
 // Preserve local location when actively used. Never erase completion when
 // importing an older backup, or treat an old v3 win as a current v4 score.
 if(!Object.keys(old.campaign.bests).length&&old.campaign.index===0)
  result.campaign.index=next.campaign.index;
 const done=[...new Set([...old.learn.completed,...next.learn.completed])].sort((a,b)=>a-b);
 const addedLessons=done.length-old.learn.completed.length;
 result.learn={v:1,completed:done,last:old.learn.completed.length||old.learn.last?old.learn.last:next.learn.last};
 return {sections:result,added:totalAdded,improved:totalImproved,addedLessons,groups,
  changed:totalAdded+totalImproved+addedLessons>0||
   result.campaign.index!==old.campaign.index||result.learn.last!==old.learn.last};
}
export function applyGuestRestore(storage,preview){
 if(!preview?.sections)throw Error("No validated backup selected.");
 // Restore is transactional on best effort (including quota failures).
 // NEVER clear unrelated localStorage such as playtest consent or QA results.
 const snapshot=new Map(),written=[];
 try{
  for(const [name,key] of Object.entries(SAVE_KEYS)){
   snapshot.set(key,storage.getItem(key));
   const value=JSON.stringify(preview.sections[name]);
   storage.setItem(key,value);written.push(key);
  }
 }catch(err){
  for(const key of written.reverse()){
   try{const old=snapshot.get(key);if(old===null)storage.removeItem(key);else storage.setItem(key,old);}catch{}
  }
  throw Error("Browser storage could not save the backup. Previous records were restored where possible.");
 }
 return true;
}
