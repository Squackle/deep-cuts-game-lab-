/** Rules for Magic equipment and one-encounter Auras. Original numbers live in curated card facts.
 * The physical gear inventory belongs to the run; battlefield attachments to individual creatures. */
import { resolveCard } from '../cards/catalog.js';
export const EQUIPMENT_SLOTS=2;
const owned=run=>Array.isArray(run.equipmentInventory)?run.equipmentInventory:[];
export function equipItem(run,id,slot){
 if(run.phase==='battle')throw new Error('Use in-combat equipment actions to change gear');
 if(!Number.isInteger(slot)||slot<0||slot>=EQUIPMENT_SLOTS)throw new Error('Invalid equipment slot');
 if(id!==null&&(!owned(run).includes(id)||resolveCard(id)?.kind!=='equipment'))throw new Error('Equipment not owned');
 const next=[...(run.equippedEquipment||[null,null])];
 if(id){for(let i=0;i<next.length;i++)if(next[i]===id)next[i]=null;}
 next[slot]=id;run.equippedEquipment=next;return next;
}
export function giveEquipment(run,id){
 if(resolveCard(id)?.kind!=='equipment')throw new Error('Not Equipment');
 if(!Array.isArray(run.equipmentInventory))run.equipmentInventory=[];
 if(!run.equipmentInventory.includes(id))run.equipmentInventory.push(id);
 if(!Array.isArray(run.equippedEquipment))run.equippedEquipment=[null,null];
 const first=run.equippedEquipment.findIndex(x=>!x);
 if(first>=0)run.equippedEquipment[first]=id;
 return id;
}
function card(id){const c=resolveCard(id);if(!c||!['aura','equipment'].includes(c.kind))throw new Error('Unsupported attachment');return c;}
/** Apply/remove a modifier. Preserve original keywords separately so overlapping sources never cancel each other. */
function rebuildKeywords(unit){
 if(!unit.baseAttachmentKeywords)unit.baseAttachmentKeywords={...(unit.keywords||{})};
 unit.keywords={...unit.baseAttachmentKeywords};
 for(const id of [...(unit.equipment||[]),...(unit.auras||[])]) for(const k of Object.keys(card(id).keywords||{}))unit.keywords[k]=1;
}
function modify(unit,id,sign){
 const c=card(id);
 const p=sign*(c.powerBonus||0),t=sign*(c.toughnessBonus||0);
 unit.power=Math.max(0,unit.power+p);unit.toughness=Math.max(0,unit.toughness+t);
 unit.maxHp=Math.max(0,unit.maxHp+t);unit.hp=Math.min(unit.maxHp,Math.max(0,unit.hp+(t>0?t:Math.min(0,t))));
 unit.move=Math.max(0,unit.move+sign*(c.moveBonus||0));
 rebuildKeywords(unit);
}
export function attachEquipment(unit,id){
 if(card(id).kind!=='equipment')throw new Error('Not Equipment');
 unit.equipment=unit.equipment||[];
 if(unit.equipment.includes(id))return unit;
 if(unit.equipment.length>= (unit.hero?EQUIPMENT_SLOTS:1))throw new Error('Creature equipment slots full');
 if(!unit.baseAttachmentKeywords)unit.baseAttachmentKeywords={...(unit.keywords||{})};
 unit.equipment.push(id);modify(unit,id,1);return unit;
}
export function detachEquipment(unit,id){
 const idx=(unit.equipment||[]).indexOf(id);if(idx<0)return false;
 unit.equipment.splice(idx,1);modify(unit,id,-1);return true;
}
export function attachAura(unit,id){
 if(card(id).kind!=='aura')throw new Error('Not Aura');
 unit.auras=unit.auras||[];
 if(unit.auras.includes(id))throw new Error('Aura is already attached');
 if(!unit.baseAttachmentKeywords)unit.baseAttachmentKeywords={...(unit.keywords||{})};
 unit.auras.push(id);modify(unit,id,1);return unit;
}
export function detachAura(unit,id){
 const idx=(unit.auras||[]).indexOf(id);if(idx<0)return false;
 unit.auras.splice(idx,1);modify(unit,id,-1);return true;
}
export function attachRunEquipment(run,unit){
 for(const id of run.equippedEquipment||[])if(id)attachEquipment(unit,id);
 return unit;
}
export const hasGear=(unit,id)=>!!unit.equipment?.includes(id);
export const hasAura=(unit,id)=>!!unit.auras?.includes(id);
