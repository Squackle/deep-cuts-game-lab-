// Step 8 bounded damage replacement/prevention tutorial engine.
// Wizards Comprehensive Rules 614–616; preview-only, no account scores.
import {ADVANCED_RULES_PREVIEW} from './advanced-foundation.js';
export const PREVENTION_RULES_VERSION=ADVANCED_RULES_PREVIEW;

const clone=x=>structuredClone(x);
const insist=(yes,msg)=>{if(!yes)throw Error(msg);};
const actors=['player','opponent'];
const cardEffects={'Furnace of Rath':'double','Dictate of the Twin Gods':'double','Healing Salve':'prevent','Pariah':'redirect'};
export const replacementEffects=Object.freeze(cardEffects);
const controllerFor=(s,id)=>{
 if(actors.includes(id))return id;
 const permanent=s.permanents.find(p=>p.id===id&&p.zone==='battlefield');
 insist(!!permanent,'Unknown damage recipient');
 return permanent.controller;
};
export function createReplacementGame(caseFile){
 const s=clone(caseFile);
 insist(s?.version===PREVENTION_RULES_VERSION,'Wrong rules version');
 insist(typeof s.id==='string'&&/^rp-[0-9]{3}$/.test(s.id),'Invalid case id');
 insist(Number.isInteger(s.life?.player)&&s.life.player>0&&Number.isInteger(s.life?.opponent)&&s.life.opponent>0,'Invalid life');
 insist(Array.isArray(s.permanents)&&s.permanents.length<=4,'Invalid permanents');
 for(const p of s.permanents)insist(typeof p.id==='string'&&['player','opponent'].includes(p.controller)&&p.zone==='battlefield'&&Number.isInteger(p.toughness)&&p.toughness>0,'Invalid creature');
 insist(Number.isInteger(s.damage?.amount)&&s.damage.amount>0&&s.damage.amount<=20,'Invalid damage amount');
 controllerFor(s,s.damage.target);
 insist(Array.isArray(s.effects)&&s.effects.length>=2&&s.effects.length<=4,'Invalid effects');
 insist(new Set(s.effects.map(e=>e.id)).size===s.effects.length,'Duplicate effects');
 for(const e of s.effects){
  insist(typeof e.id==='string'&&cardEffects[e.card]===e.kind,'Unsupported card effect');
  if(e.kind==='prevent')insist(Number.isInteger(e.remaining)&&e.remaining>=1&&e.remaining<=20&&typeof e.target==='string','Invalid shield');
  if(e.kind==='redirect')insist(e.from==='player'&&s.permanents.some(p=>p.id===e.to),'Invalid redirect');
 }
 insist(['survive','keepCreature'].includes(s.objective?.type),'Invalid objective');
 s.status='playing';s.step=0;s.history=[];s.events=[];
 s.pending={...s.damage,applied:[],originalAmount:s.damage.amount};
 s.effects=s.effects.map(e=>({...e,used:false}));
 delete s.solution;
 return s;
}
const active=(s,e)=>{
 if(e.used||s.pending.amount<=0)return false;
 if(e.kind==='double')return true;
 if(e.kind==='prevent')return e.target===s.pending.target&&e.remaining>0;
 if(e.kind==='redirect')return e.from===s.pending.target;
 return false;
};
export const applicableEffects=s=>s.status==='playing'?s.effects.filter(e=>active(s,e))
 .map(e=>({id:e.id,card:e.card,kind:e.kind})):[];
export const replacementChooser=s=>s.status==='playing'?controllerFor(s,s.pending.target):null;
const event=(s,type,other={})=>s.events.push({type,step:s.step,ordinal:s.events.length,...other});
