// Versioned migration rehearsal; never writes or reinterprets the six legacy save namespaces.
import {LEVELS} from "./levels.js";
import {VERSION,PHYSICAL_LIBRARY_VERSION,initial,reduce,completed,assertPhysicalLibraryState} from "./engine.js";
export const CANDIDATE_SAVE_KEY="dc-mana-heist-physical-preview-v1";
export const affected=level=>[...level.hand,...level.field].some(c=>c.card==="fetchUR"||c.card==="fetchBG");
const freezeTree=value=>{if(value&&typeof value==="object"){for(const child of Object.values(value))freezeTree(child);Object.freeze(value);}return value;};
export const PHYSICAL_PREVIEW_BOARDS=Object.freeze(LEVELS.filter(affected).map(p=>freezeTree({...structuredClone(p),id:"mh-physical-"+p.id,sourceId:p.id,sourceVersion:VERSION,version:PHYSICAL_LIBRARY_VERSION,chapter:"PHYSICAL LIBRARY REHEARSAL",decision:{focus:"Complete "+p.title+" using only remaining physical reserve cards.",clue:"A fetched instance leaves the reserve permanently, even when returned to hand.",why:"Every card remained in a single zone or documented consumed state. This completion is not a historical campaign medal.",retry:"Try another legal fetch order or manual payment; compare the remaining reserve."}})));
const registry=new Map(PHYSICAL_PREVIEW_BOARDS.map(p=>[p.sourceId,p]));
// Exact definition identity, not a security hash. The candidate is local practice;
// stale definitions must not silently reinterpret earlier completion traces.
export function candidateBoardIdentity(p){return JSON.stringify([p.sourceId,p.version,p.revision||0,p.turnLimit,p.life,p.field,p.hand,p.library,p.stages,p.devotion||{},p.charges||{},p.commanderColors||null,p.opponentLandColors||null,p.opponentTappedLands||0]);}
export function candidateDefinition(id,version,revision=0){const p=registry.get(id);if(!p||version!==PHYSICAL_LIBRARY_VERSION||(p.revision||0)!==revision)throw Error("Unknown candidate identity");return p;}
function validateTrace(p,trace){
 if(!Array.isArray(trace)||trace.length<1||trace.length>512)throw Error("Invalid rehearsal trace length");
 let s=initial(p);for(const a of trace){const out=reduce(p,s,a);if(!out.ok)throw Error("Invalid rehearsal move");s=out.state;assertPhysicalLibraryState(p,s);}
 if(!completed(p,s))throw Error("Rehearsal trace did not win");
 return {sourceId:p.sourceId,version:p.version,revision:p.revision||0,boardIdentity:candidateBoardIdentity(p),trace:structuredClone(trace),turn:s.turn,spentLife:s.spentLife,actions:s.actions};
}
export function readCandidateProgress(raw){
 const result={};if(typeof raw!=="string"||raw.length>2_000_000)return result;
 let data;try{data=JSON.parse(raw);}catch{return result;}
 if(!data||typeof data!=="object"||Array.isArray(data))return result;
 for(const p of PHYSICAL_PREVIEW_BOARDS){const rec=Object.hasOwn(data,p.sourceId)?data[p.sourceId]:null;if(!rec)continue;
  try{if(rec.sourceId!==p.sourceId)continue;const exact=candidateDefinition(rec.sourceId,rec.version,rec.revision);if(rec.boardIdentity!==candidateBoardIdentity(exact))continue;result[p.sourceId]=validateTrace(exact,rec.trace);}catch{}
 }return result;
}
export function recordCandidateWin(records,level,trace){
 const p=candidateDefinition(level.sourceId,level.version,level.revision||0);
 if(level!==p)throw Error("Unrecognized candidate definition");
 const rec=validateTrace(p,trace),old=records[p.sourceId];
 const better=!old||rec.turn<old.turn||rec.turn===old.turn&&(rec.spentLife<old.spentLife||rec.spentLife===old.spentLife&&rec.actions<old.actions);
 return better?{...records,[p.sourceId]:rec}:records;
}
