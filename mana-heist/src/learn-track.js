// Initial Learn Mana track reuses the 18 existing authored puzzle scenarios.
// A full lesson curriculum remains a separate future package. No game rules here.
export const LEARN_GROUPS=Object.freeze([
 {id:"first-steps",title:"First Steps",summary:"Lands, mana, playing a land and casting spells.",indices:[0,1,2]},
 {id:"two-colors",title:"Color Choices",summary:"Dual lands, colored requirements and shock entries.",indices:[3,4,5]},
 {id:"the-cost",title:"Life & Costs",summary:"Pain lands, check lands, generic mana and color planning.",indices:[6,7,8,9,10]},
 {id:"find-the-mana",title:"Search & Sequencing",summary:"Fetch lands, timing and untapping.",indices:[11,12,13,14]},
 {id:"mastery",title:"Mana Mastery",summary:"Bounce lands and harder combinations.",indices:[15,16,17]},
 {id:"mana-artifacts",title:"Beyond Lands",summary:"Sol Ring, Signets, rituals and paid conversion.",indices:[18,19,20,21,22]},
 {id:"mana-engines",title:"Commander Mana Engines",summary:"Restricted mana, Coffers and Lotus Field.",indices:[23,24,25]},
 {id:"opponent-and-pain",title:"Borrowed Mana & Risk",summary:"Opponent-dependent mana and artifact damage decisions.",indices:[26,27]}
]);
export const LEARN_COUNT=28;
export function isLearnLevel(i){return Number.isInteger(i)&&i>=0&&i<LEARN_COUNT;}
export function normalizedLearnProgress(raw){
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return {completed:[],last:0};
 const done=Array.isArray(raw.completed)?[...new Set(raw.completed.filter(isLearnLevel))].sort((a,b)=>a-b):[];
 return {completed:done,last:isLearnLevel(raw.last)?raw.last:0};
}
export function nextLearnIndex(index){
 if(!isLearnLevel(index))return 0;
 return index===LEARN_COUNT-1?null:index+1;
}
