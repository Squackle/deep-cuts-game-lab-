import {CARDS,RULES_VERSION} from './cards.js';
import masteryCatalog from '../data/mastery-catalog.json' with {type:'json'};
// Game Lab only. This records observed engine transitions for LOCAL / UNVERIFIED
// mastery previews. It NEVER signs results, awards public profile items, or uses VFX.
export const MASTERY_STORAGE_KEY='dc-stackbreaker-mastery-local-v1';
export const MASTERY_CATALOG=masteryCatalog;
const clone=value=>JSON.parse(JSON.stringify(value));
const compatibleId=id=>/^(?:sb-\d{2}|sg-\d{3})$/.test(String(id||''));
const keyFor=(id,revision=1)=>id+'@'+revision;
export function emptyMasteryLedger(){
 return {schemaVersion:1,catalogVersion:1,localUnverified:true,wins:{}};
}
export function emptyMasteryRun(){
 return {schemaVersion:1,transitionCount:0,events:[],clean:true};
}
const event=(idx,events,type,subjectId,causeId,extra={})=>{
 const eventIndex=events.length;
 events.push({eventId:idx+':'+eventIndex,actionIndex:idx,eventIndex,
  type,subjectId:String(subjectId??''),causeId:String(causeId??''),...extra});
};
export function observeMasteryTransition(before,after,actionIndex=0){
 if(before?.status!=='playing'||!after||!Number.isSafeInteger(actionIndex)||actionIndex<0)return [];
 if(JSON.stringify(before)===JSON.stringify(after))return [];
 const result=[],cause=after.stack?.at(-1)?.id||before.stack?.at(-1)?.id||'action';
 event(actionIndex,result,'action.accepted',before.id,cause);
 if(after.step>before.step&&after.used?.length===before.used?.length)
  event(actionIndex,result,'priority.passed',before.id,'pass');
 const oldLand=new Map((before.lands||[]).map(x=>[x.id,x]));
 for(const item of after.lands||[]){
  const old=oldLand.get(item.id);
  if(!old){event(actionIndex,result,'land.played',item.id,item.id);continue;}
  if(!old.tapped&&item.tapped)event(actionIndex,result,'mana.tapped',item.id,item.id);
 }
 const oldStack=new Map((before.stack||[]).map(x=>[x.id,x]));
 for(const item of after.stack||[])if(!oldStack.has(item.id)&&item.controller==='player'){
  event(actionIndex,result,item.spell===false?'ability.activated':'spell.cast',item.id,item.id,{card:item.card});
 }
 const oldTop=before.stack?.at(-1);
 const removedTop=oldTop&&!after.stack?.some(x=>x.id===oldTop.id);
 if(removedTop){
  event(actionIndex,result,'spell.resolved',oldTop.id,oldTop.id,{card:oldTop.card,spell:oldTop.spell!==false});
  const c=CARDS[oldTop.card];
  const target=before.stack.find(x=>x.id===oldTop.targetId);
  if(c?.effect==='counter'&&target&&!after.stack.some(x=>x.id===target.id))
   event(actionIndex,result,'spell.countered',target.id,oldTop.id,{card:target.card});
 }
 const beforeUnits=new Map((before.units||[]).map(x=>[x.id,x]));
 for(const x of after.units||[]){
  const prior=beforeUnits.get(x.id);
  if(!prior){if(x.zone==='battlefield')event(actionIndex,result,'permanent.entered',x.id,cause,{card:x.card});continue;}
  if(prior.zone!==x.zone)event(actionIndex,result,'permanent.zone_changed',x.id,cause,{from:prior.zone,to:x.zone,card:x.card});
  if((!prior.hexproof&&x.hexproof)||(!prior.indestructible&&x.indestructible))
   event(actionIndex,result,'protection.granted',x.id,cause);
  if((x.powerBoost||0)!==(prior.powerBoost||0)||(x.toughnessBoost||0)!==(prior.toughnessBoost||0))
   event(actionIndex,result,'stats.changed',x.id,cause);
 }
 for(const player of ['player','opponent']){
  const delta=(after.life?.[player]||0)-(before.life?.[player]||0);
  if(delta)event(actionIndex,result,'life.changed',player,cause,{delta});
 }
 if(after.status==='won')event(actionIndex,result,'puzzle.completed',before.id,'objective',{outcome:'won'});
 return result;
}
export function appendMasteryTransition(run,before,after){
 const safe=run||emptyMasteryRun(),events=observeMasteryTransition(before,after,safe.transitionCount);
 if(!events.length)return safe;
 return {...safe,transitionCount:safe.transitionCount+1,events:[...safe.events,...events]};
}
export function markMasteryRunUnclean(run){return {...(run||emptyMasteryRun()),clean:false};}
export function masteryRunIsValid(run){
 if(!run||run.schemaVersion!==1||!Array.isArray(run.events))return false;
 return run.events.every(e=>e&&typeof e.type==='string'&&
  Number.isSafeInteger(e.actionIndex)&&Number.isSafeInteger(e.eventIndex));
}
export function completeMasteryWin(ledger,scenario,after,run,scenarios){
 if(after?.status!=='won'||!scenario||!compatibleId(scenario.id)||
   scenario.version!==RULES_VERSION||!masteryRunIsValid(run)||
   !run.events.some(e=>e.type==='puzzle.completed'&&e.subjectId===scenario.id))
  return {ledger,added:false,newUnlocks:[]};
 const initial=ledger||emptyMasteryLedger();
 const id=keyFor(scenario.id,1);
 const old=initial.wins[id];
 const types=new Set(run.events.map(e=>e.type));
 const withCounter=types.has('spell.countered');
 const withProtection=types.has('protection.granted');
 const withLifeGain=run.events.some(e=>e.type==='life.changed'&&e.delta>0);
 const withExile=run.events.some(e=>e.type==='permanent.zone_changed'&&e.to==='exile');
 const par=scenario.par||2;
 const stars=(after.used?.length||0)<=par?3:(after.used?.length||0)===par+1?2:1;
 const scenarioIndex=scenarios.findIndex(s=>s.id===scenario.id);
 if(scenarioIndex<0)return {ledger,added:false,newUnlocks:[]};
 const record={
  id:scenario.id,revision:1,rulesVersion:RULES_VERSION,
  worldIndex:Math.floor(scenarioIndex/10),
  galaxyIndex:Math.floor(scenarioIndex/50),
  maxStars:Math.max(old?.maxStars||0,stars),
  clean:!!(old?.clean||run.clean),
  counter:!!(old?.counter||withCounter),
  protection:!!(old?.protection||withProtection),
  lifegain:!!(old?.lifegain||withLifeGain),
  exile:!!(old?.exile||withExile)
 };
 const updated={...initial,wins:{...initial.wins,[id]:record}};
 const prior=evaluateMastery(initial,MASTERY_CATALOG);
 const current=evaluateMastery(updated,MASTERY_CATALOG);
 const newUnlocks=current.filter((a,i)=>a.unlocked&&!prior[i].unlocked).map(a=>a.id);
 return {ledger:updated,added:!old,newUnlocks};
}
export function evaluateMastery(ledger,catalog=MASTERY_CATALOG){
 const wins=Object.values(ledger?.wins||{}).filter(w=>w&&compatibleId(w.id)&&w.rulesVersion===RULES_VERSION);
 const distinct=new Map(wins.map(w=>[keyFor(w.id,w.revision),w]));
 const records=[...distinct.values()];
 const worldCounts=new Map();
 for(const r of records)worldCounts.set(r.worldIndex,(worldCounts.get(r.worldIndex)||0)+1);
 const completedWorlds=[...worldCounts].filter(([world,count])=>Number.isInteger(world)&&count>=10).map(([world])=>world);
 const metrics={
  'classic-win':records.length,
  'distinct-classic-wins':records.length,
  'completed-worlds':completedWorlds.length,
  'galaxies-with-completion':new Set(completedWorlds.map(world=>Math.floor(world/5))).size,
  'distinct-clean-wins':records.filter(x=>x.clean).length,
  'three-star-classic-wins':records.filter(x=>x.maxStars>=3).length,
  'distinct-solved-with-counter':records.filter(x=>x.counter).length,
  'distinct-solved-with-protection':records.filter(x=>x.protection).length,
  'distinct-solved-with-lifegain':records.filter(x=>x.lifegain).length,
  'distinct-solved-with-exile':records.filter(x=>x.exile).length
 };
 return catalog.achievements.map(a=>{
  const eligible=!a.engineGate&&!a.requiresServerVerification&&a.status==='local-eligible';
  const count=eligible?Math.min(a.threshold,metrics[a.metric]||0):0;
  return {id:a.id,name:a.name,description:a.description,
   reward:a.reward,threshold:a.threshold,progress:count,
   unlocked:eligible&&count>=a.threshold,
   lockedReason:eligible?null:a.requiresServerVerification?'Needs server-verified Daily wins':'Advanced rules not yet implemented',
   localUnverified:true};
 });
}
export function safeMasteryLoad(raw){
 if(!raw||raw.schemaVersion!==1||raw.catalogVersion!==1||raw.localUnverified!==true||
  !raw.wins||typeof raw.wins!=='object'||Array.isArray(raw.wins))return emptyMasteryLedger();
 const wins={};
 for(const [key,value] of Object.entries(raw.wins).slice(0,250)){
  if(!value||!compatibleId(value.id)||key!==keyFor(value.id,value.revision)||
   value.revision!==1||value.rulesVersion!==RULES_VERSION||
   !Number.isInteger(value.worldIndex)||value.worldIndex<0||value.worldIndex>=25||
   !Number.isInteger(value.galaxyIndex)||value.galaxyIndex<0||value.galaxyIndex>=5||
   !Number.isInteger(value.maxStars)||value.maxStars<1||value.maxStars>3)continue;
  wins[key]={id:value.id,revision:1,rulesVersion:RULES_VERSION,
   worldIndex:value.worldIndex,galaxyIndex:value.galaxyIndex,maxStars:value.maxStars,
   clean:value.clean===true,counter:value.counter===true,
   protection:value.protection===true,lifegain:value.lifegain===true,exile:value.exile===true};
 }
 return {...emptyMasteryLedger(),wins};
}
export function readLocalMastery(store){
 try{return safeMasteryLoad(JSON.parse(store.getItem(MASTERY_STORAGE_KEY)||'null'));}
 catch{return emptyMasteryLedger();}
}
export function writeLocalMastery(store,ledger){
 try{store.setItem(MASTERY_STORAGE_KEY,JSON.stringify(safeMasteryLoad(ledger)));return true;}
 catch{return false;}
}
