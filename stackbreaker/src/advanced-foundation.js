// Stackbreaker Step 5: independent, deterministic typed stack/priority foundation.
// Does not alter the Classic 0.3 resolver, gameplay saves, or authoritative scoring.
// Official Magic Comprehensive Rules effective 2026-09-25: 115, 117.1-117.5,
// 405, 601.2, 603.3, 608.2, 707.10. This is a LIMITED two-player training model.
export const ADVANCED_RULES_PREVIEW='sb-mtg-training-0.4.0-preview';
export const STACK_SCHEMA_VERSION=1;
export const MAX_STACK_OBJECTS=32;
export const MAX_PRIORITY_ACTIONS=140;
export const STACK_KINDS=Object.freeze(['spell','ability','trigger','copy']);
const ACTORS=Object.freeze(['player','opponent']);
const idPattern=/^[a-z][a-z0-9-]{0,64}$/i;
const plainObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const demand=(ok,msg)=>{if(!ok)throw Error(msg);};
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const keys=(o)=>Object.keys(o).sort();
const jsonClone=x=>JSON.parse(JSON.stringify(x));
const NESTING_LIMIT=20;
function assertJson(v,depth=0){
 demand(depth<=NESTING_LIMIT,'JSON nesting limit');
 if(v===null||typeof v==='string'||typeof v==='boolean')return;
 if(typeof v==='number'){demand(Number.isFinite(v),'Nonfinite number');return;}
 if(Array.isArray(v)){demand(v.length<=64,'JSON array limit');for(const x of v)assertJson(x,depth+1);return;}
 demand(plainObject(v),'Only plain JSON objects are permitted');
 const names=keys(v);demand(names.length<=64,'Too many JSON properties');
 for(const k of names){demand(k!=='__proto__'&&k!=='constructor'&&k!=='prototype','Reserved JSON key');assertJson(v[k],depth+1);}
}
// Canonical JSON is deterministic for content ordering but NOT a cryptographic proof.
// A future website service must verify signed-in ownership and independently replay.
export function canonicalStackJson(value){
 assertJson(value);
 const ordered=(v)=>Array.isArray(v)?v.map(ordered):
  plainObject(v)?Object.fromEntries(keys(v).map(k=>[k,ordered(v[k])])):v;
 return JSON.stringify(ordered(value));
}
export function makeTypedStackEntry(raw){
 demand(plainObject(raw),'Stack entry must be an object');
 const {id,kind,cardId,controller,sourceId=null,isCast=kind==='spell',
  chosenModes=[],targets=[],xValue=0,choices={},originActionIndex=0}=raw;
 demand(typeof id==='string'&&idPattern.test(id),'Invalid entry ID');
 demand(STACK_KINDS.includes(kind),'Unsupported stack kind');
 demand(typeof cardId==='string'&&cardId.length>0&&cardId.length<=110,'Invalid card ID');
 demand(ACTORS.includes(controller),'Invalid controller');
 demand(sourceId===null||(typeof sourceId==='string'&&idPattern.test(sourceId)),'Invalid source ID');
 demand(typeof isCast==='boolean','Invalid cast flag');
 demand((kind==='spell'&&isCast)||(kind!=='spell'&&!isCast),'Cast and noncast kinds must remain distinct');
 demand(Array.isArray(chosenModes)&&chosenModes.length<=4&&chosenModes.every(m=>typeof m==='string'&&idPattern.test(m)),'Invalid chosen modes');
 demand(Array.isArray(targets)&&targets.length<=8&&targets.every(t=>typeof t==='string'&&idPattern.test(t)),'Invalid target list');
 demand(Number.isInteger(xValue)&&xValue>=0&&xValue<=99,'Invalid X value');
 demand(plainObject(choices),'Invalid choices');assertJson(choices);
 demand(Number.isInteger(originActionIndex)&&originActionIndex>=0&&originActionIndex<=MAX_PRIORITY_ACTIONS,'Invalid action index');
 // Explicit whitelist: targetId is deliberately NOT stored in advanced rules.
 demand(!own(raw,'targetId'),'Classic targetId is a compatibility projection, not advanced state');
 return {id,kind,cardId,controller,sourceId,isCast,chosenModes:[...chosenModes],
  targets:[...targets],xValue,choices:jsonClone(choices),originActionIndex};
}
export function fromClassicStackEntry(legacy,{actionIndex=0}={}){
 demand(plainObject(legacy),'Legacy stack entry must be an object');
 const spell=legacy.spell!==false;
 return makeTypedStackEntry({
   id:legacy.id,kind:spell?'spell':'ability',cardId:legacy.card,
   controller:legacy.controller,sourceId:legacy.sourceId??null,isCast:spell,
   chosenModes:[],targets:legacy.targetId==null?[]:[legacy.targetId],xValue:0,
   choices:{},originActionIndex:actionIndex
 });
}
export function classicTargetProjection(entry){
 const normalized=makeTypedStackEntry(entry);
 return normalized.targets.length===1?normalized.targets[0]:null;
}
export function fromClassicScenario(scenario){
 demand(plainObject(scenario)&&Array.isArray(scenario.stack),'Invalid Classic scenario');
 return scenario.stack.map(item=>fromClassicStackEntry(item));
}
// A card's rules data must explicitly describe slots and cross-slot restrictions.
// `legalTarget` is supplied by the versioned card/board adapter. It is not inferred
// from display artwork or arbitrary string matching.
export function validateModeAndTargets(cardSpec,{chosenModes=[],targets=[]},legalTarget){
 demand(plainObject(cardSpec),'Missing card choice specification');
 demand(Array.isArray(chosenModes)&&Array.isArray(targets),'Missing cast choices');
 demand(typeof legalTarget==='function','Missing target legality callback');
 const modes=cardSpec.modes;
 let slots=cardSpec.targetSlots;
 if(modes){
   demand(plainObject(modes),'Invalid modal card specification');
   demand(chosenModes.length===1&&own(modes,chosenModes[0]),'Unknown or missing selected mode');
   slots=modes[chosenModes[0]].targetSlots;
 }else demand(chosenModes.length===0,'Modes are not available on this card');
 demand(Array.isArray(slots)&&slots.length<=8,'Unsupported target slots');
 demand(targets.length===slots.length,'Wrong number of targets');
 for(let i=0;i<targets.length;i++){
   const target=targets[i],slot=slots[i];
   demand(typeof slot==='string'&&idPattern.test(slot),'Invalid slot');
   demand(typeof target==='string'&&idPattern.test(target),'Invalid target');
   demand(legalTarget(slot,target,i,targets)===true,'Illegal spell target');
 }
 // Group IDs on the same card mean those targets must be different, e.g. Arc Trail.
 const distinct=cardSpec.distinctSlotGroups??[];
 demand(Array.isArray(distinct),'Invalid distinct-target rules');
 for(const group of distinct){
   demand(Array.isArray(group)&&group.length>=2&&group.every(i=>Number.isInteger(i)&&i>=0&&i<slots.length),'Invalid distinct-target group');
   demand(new Set(group.map(i=>targets[i])).size===group.length,'Those targets must differ');
 }
 return {chosenModes:[...chosenModes],targets:[...targets]};
}
function uniqueIds(stack){
 demand(stack.length<=MAX_STACK_OBJECTS,'Stack size limit');
 const ids=stack.map(x=>x.id);
 demand(new Set(ids).size===ids.length,'Duplicate stack object IDs');
}
function normalizedStack(stack){
 demand(Array.isArray(stack),'Stack must be an array');
 const next=stack.map(makeTypedStackEntry);
 uniqueIds(next);return next;
}
function requireWindow(w){
 demand(plainObject(w)&&w.schemaVersion===STACK_SCHEMA_VERSION,'Wrong stack schema');
 demand(w.rulesVersion===ADVANCED_RULES_PREVIEW,'Wrong advanced rules version');
 demand(ACTORS.includes(w.activeActor)&&ACTORS.includes(w.currentActor),'Invalid priority actors');
 demand(w.status==='playing'||w.status==='ended','Invalid window status');
 demand(Array.isArray(w.passedBy)&&w.passedBy.length<=1&&w.passedBy.every(x=>ACTORS.includes(x)),'Invalid pass chain');
 demand(!w.passedBy.length||w.passedBy[0]!==w.currentActor,'Invalid pass order');
 demand(Number.isInteger(w.step)&&w.step>=0&&w.step<=MAX_PRIORITY_ACTIONS,'Priority action limit');
 normalizedStack(w.stack);
 demand(Array.isArray(w.lastEvents)&&w.lastEvents.length<=8,'Invalid event record');
 assertJson(w.lastEvents);
}
export function createPriorityWindow({activeActor='opponent',currentActor='player',stack=[],passedBy=[]}={}){
 const result={schemaVersion:STACK_SCHEMA_VERSION,rulesVersion:ADVANCED_RULES_PREVIEW,
  activeActor,currentActor,passedBy:[...passedBy],stack:normalizedStack(stack),
  status:'playing',step:0,lastEvents:[]};
 requireWindow(result);return result;
}
function requireTurn(w,actor){
 requireWindow(w);
 demand(w.status==='playing','Priority window already ended');
 demand(ACTORS.includes(actor)&&w.currentActor===actor,'Player does not have priority');
 demand(w.step<MAX_PRIORITY_ACTIONS,'Priority action cap reached');
}
export function putStackObject(w0,actor,newObject){
 requireTurn(w0,actor);
 const item=makeTypedStackEntry(newObject);
 demand(item.controller===actor,'Only the controller can cast or activate this object');
 demand(w0.stack.length<MAX_STACK_OBJECTS,'Stack full');
 demand(!w0.stack.some(x=>x.id===item.id),'Duplicate stack object ID');
 const w=jsonClone(w0);w.stack.push(item);w.passedBy=[];w.step++;
 w.lastEvents=[{type:item.isCast?'spell.cast':'stack.object.added',subjectId:item.id,actor,actionIndex:w.step}];
 // After casting, the player who had priority gets it again (117.3c).
 w.currentActor=actor;return w;
}
export function passPriority(w0,actor){
 requireTurn(w0,actor);const w=jsonClone(w0);
 w.step++;
 const prior=w.passedBy[0];
 if(prior&&prior!==actor){
   w.passedBy=[];w.currentActor=w.activeActor;
   if(w.stack.length){
     const resolving=w.stack.pop();
     const event={type:'stack.resolve-ready',subjectId:resolving.id,actor,actionIndex:w.step};
     w.lastEvents=[event];
     // Effect resolution belongs to the next gameplay layer; 117.4 only supplies order.
     return {state:w,outcome:{type:'resolve-top',item:resolving}};
   }
   w.status='ended';
   w.lastEvents=[{type:'priority.window-ended',actor,actionIndex:w.step}];
   return {state:w,outcome:{type:'window-ended'}};
 }
 w.passedBy=[actor];
 w.currentActor=actor==='player'?'opponent':'player';
 w.lastEvents=[{type:'priority.passed',actor,actionIndex:w.step}];
 return {state:w,outcome:{type:'awaiting-opponent'}};
}
// Each action is independent and revalidated, with no in-flight UI promises.
export function replayPriorityWindow(seed,actions){
 demand(Array.isArray(actions)&&actions.length<=MAX_PRIORITY_ACTIONS,'Invalid replay length');
 let state=createPriorityWindow(seed),outcomes=[];
 for(const action of actions){
   demand(plainObject(action),'Malformed replay action');
   if(action.type==='pass'){
     const r=passPriority(state,action.actor);state=r.state;outcomes.push(r.outcome);
   }else if(action.type==='put'){
     state=putStackObject(state,action.actor,action.entry);
     outcomes.push({type:'added',itemId:action.entry.id});
   }else throw Error('Unknown priority action');
 }
 return {state,outcomes};
}
export function serializePriorityWindow(state){
 requireWindow(state);
 return canonicalStackJson(state);
}
export function deserializePriorityWindow(raw){
 demand(typeof raw==='string'&&raw.length<=65536,'Serialized state size limit');
 let parsed;
 try{parsed=JSON.parse(raw);}catch{throw Error('Invalid serialized JSON');}
 requireWindow(parsed);
 // Make stale or extra properties an error, not a silent schema migration.
 const keysExact=['activeActor','currentActor','lastEvents','passedBy','rulesVersion','schemaVersion','stack','status','step'];
 demand(JSON.stringify(keys(parsed))===JSON.stringify(keysExact.sort()),'Unknown window fields');
 for(const item of parsed.stack){
   const canonical=makeTypedStackEntry(item);
   demand(JSON.stringify(keys(item))===JSON.stringify(keys(canonical)),'Unknown stack fields');
 }
 return jsonClone(parsed);
}
