import {MASTERY_CATALOG,evaluateMastery} from './mastery.js';

// Entirely local Game Lab appearance preferences. Never turns preview wins into
// an authenticated website grant or changes any game-state transition.
export const COSMETIC_STORAGE_KEY='dc-stackbreaker-cosmetics-local-v1';
export const COSMETIC_TYPES=['title','frame','vfx'];
const REWARD_TYPE={title:'titles',frame:'frames',vfx:'vfx'};
const DEFAULT_EQUIP={title:null,frame:null,vfx:null};
const labels={
 'first-responder':'First Responder',apprentice:'Apprentice',tactician:'Tactician',
 veteran:'Veteran',explorer:'Explorer',conqueror:'Conqueror',
 'clean-stack':'Clean Stack',countermage:'Countermage',
 'stack-surgeon':'Stack Surgeon','modal-master':'Modal Master',
 'trigger-technician':'Trigger Technician','replacement-scholar':'Replacement Scholar',
 'daily-adept':'Daily Adept',white:'White · Radiance',
 blue:'Blue · Arcana',black:'Black · Shadow',red:'Red · Flame',
 green:'Green · Verdance',prismatic:'Prismatic · Fivefold',gold:'Gold · Daily'
};
export const COSMETIC_META=Object.freeze(labels);
export function cosmeticChoices(type,catalog=MASTERY_CATALOG){
 if(!COSMETIC_TYPES.includes(type))return [];
 const earned=catalog.achievements.filter(a=>a.reward?.type===type).map(a=>({
  id:a.reward.id,achievementId:a.id,achievementName:a.name,
  name:labels[a.reward.id]||a.reward.id
 }));
 // Red has no grant in the frozen 24-achievement catalog; it is a plainly
 // labeled starter frame rather than a fabricated milestone reward.
 if(type==='frame')return [...earned,{id:'red',achievementId:null,
  achievementName:'Starter frame',name:labels.red,starter:true}];
 if(type==='vfx')return [...earned,{id:'black',achievementId:null,
  achievementName:'Starter spell effect',name:labels.black,starter:true}];
 return earned;
}
export function emptyCosmeticEquip(){
 return {schemaVersion:1,localUnverified:true,title:null,frame:null,vfx:null};
}
function grantedIds(ledger,catalog=MASTERY_CATALOG){
 return new Set(evaluateMastery(ledger,catalog).filter(a=>a.unlocked).map(a=>a.id));
}
export function hasCosmeticGrant(ledger,type,id,catalog=MASTERY_CATALOG){
 if(!COSMETIC_TYPES.includes(type)||typeof id!=='string'||!id)return false;
 if(type==='frame'&&id==='red')return true; // disclosed free starter frame
 if(type==='vfx'&&id==='black')return true; // disclosed free starter FX
 const entry=catalog.achievements.find(a=>a.reward?.type===type&&a.reward?.id===id);
 return !!entry&&grantedIds(ledger,catalog).has(entry.id);
}
// Every equipped value is re-validated against *current* real engine-derived
// local ledger criteria. Tampered/stale/locked IDs fall back to the base style.
export function sanitizeCosmeticEquip(raw,ledger,catalog=MASTERY_CATALOG){
 const clean=emptyCosmeticEquip();
 if(!raw||raw.schemaVersion!==1||raw.localUnverified!==true)return clean;
 for(const type of COSMETIC_TYPES){
  if(raw[type]===null||raw[type]===undefined)continue;
  if(hasCosmeticGrant(ledger,type,raw[type],catalog))clean[type]=raw[type];
 }
 return clean;
}
export function equipLocalCosmetic(raw,ledger,type,id,catalog=MASTERY_CATALOG){
 const previous=sanitizeCosmeticEquip(raw,ledger,catalog);
 if(!COSMETIC_TYPES.includes(type))return {ok:false,reason:'Unknown cosmetic category',equip:previous};
 if(id!==null&&!hasCosmeticGrant(ledger,type,id,catalog))
  return {ok:false,reason:'Cosmetic not unlocked locally',equip:previous};
 return {ok:true,reason:'LOCAL / UNVERIFIED preview saved',
  equip:{...previous,[type]:id}};
}
export function readCosmeticEquip(store,ledger){
 try{return sanitizeCosmeticEquip(JSON.parse(store.getItem(COSMETIC_STORAGE_KEY)||'null'),ledger);}
 catch{return emptyCosmeticEquip();}
}
export function writeCosmeticEquip(store,equip,ledger){
 try{
  const allowed=sanitizeCosmeticEquip(equip,ledger);
  store.setItem(COSMETIC_STORAGE_KEY,JSON.stringify(allowed));
  return true;
 }catch{return false;}
}
export function effectiveCosmeticEquip(raw,ledger){
 return sanitizeCosmeticEquip(raw,ledger);
}
export function cosmeticAppearanceOnly(equip){
 // Fixed, inert rendering data only. No effect cards, mana, turn order,
 // targets, rules version, scenario, scoring or outcome fields are touched.
 const clean=equip||DEFAULT_EQUIP;
 return {
  label:clean.title&&labels[clean.title]||'Unranked Duelist',
  frame:clean.frame||'none',
  vfx:clean.vfx||'none',
  localUnverified:true
 };
}
