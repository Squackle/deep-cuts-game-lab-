import {ADVANCED_RULES_PREVIEW,makeTypedStackEntry,createPriorityWindow,
 putStackObject,passPriority,canonicalStackJson} from './advanced-foundation.js';
// Step 7: bounded, two-player priority teaching engine (not a universal Magic simulator).
// Rules: Wizards Comprehensive Rules 603.1-603.7, 117, 608, 702.21 (ward).
// A ward cost is paid when its TRIGGER resolves, never to make a target legal.
export const WARD_RULES_VERSION=ADVANCED_RULES_PREVIEW;
const actors=['player','opponent'],colors=['W','U','B','R','G','C'];
const clone=x=>structuredClone(x),check=(b,m)=>{if(!b)throw Error(m);};
const other=a=>a==='player'?'opponent':'player';
export const WARD_CARDS=Object.freeze({
 'Lightning Bolt':{type:'Instant',cost:{R:1},slots:['any'],effect:'bolt'},
 'Shock':{type:'Instant',cost:{R:1},slots:['any'],effect:'shock'},
 'Stifle':{type:'Instant',cost:{U:1},slots:['trigger'],effect:'stifle'},
 'Diabolic Edict':{type:'Instant',cost:{B:1,generic:1},slots:['player'],effect:'edict'},
 'Raise the Alarm':{type:'Instant',cost:{W:1,generic:1},slots:[],effect:'tokens'}
});
export const WARD_PERMANENTS=Object.freeze({
 'Waterfall Aerialist':{type:'creature',toughness:1,ward:{generic:2}},
 'Soul Warden':{type:'creature',toughness:1},
 'Impact Tremors':{type:'enchantment'},
 'Test of Endurance':{type:'enchantment'}
});
const isActor=x=>actors.includes(x);
function canTarget(s,item,rule,id){
 if(rule==='trigger')return s.stack.some(x=>x.id===id&&x.kind==='trigger');
 if(rule==='player')return isActor(id);
 if(rule==='any'&&isActor(id))return true;
 const p=s.permanents.find(x=>x.id===id&&x.zone==='battlefield');
 return !!p&&p.type==='creature'&&rule==='any'&&(!p.hexproof||p.controller===item.controller);
}
export function wardTargetOptions(s,item,slot=0){
 const card=WARD_CARDS[item.cardId];check(!!card,'Unsupported ward lesson spell');
 const type=card.slots[slot];check(!!type,'Invalid slot');
 return [...actors,...s.permanents.map(p=>p.id),...s.stack.map(x=>x.id)].filter(id=>canTarget(s,item,type,id));
}
function validTargets(s,item){
 const card=WARD_CARDS[item.cardId];check(!!card,'Unsupported spell');
 check(Array.isArray(item.targets)&&item.targets.length===card.slots.length,'Invalid target count');
 check(item.targets.every((id,i)=>typeof id==='string'&&canTarget(s,item,card.slots[i],id)),'Illegal spell target');
}
function pay(pool,cost){
 const next=Object.fromEntries(colors.map(c=>[c,pool[c]||0]));
 for(const c of colors){const n=cost[c]||0;check(next[c]>=n,'Not enough colored mana');next[c]-=n;}
 let generic=cost.generic||0;
 for(const c of ['C','W','U','B','R','G']){const n=Math.min(next[c],generic);next[c]-=n;generic-=n;}
 check(generic===0,'Not enough mana to pay the cost');
 return next;
}
export function canPayWard(s,cost,actor='player'){
 try{pay(s.mana[actor],cost);return true;}catch{return false;}
}
const emit=(s,type,subjectId,fields={})=>s.events.push({
 eventId:`${s.id}:${s.step}:${s.events.length}`,
 type,subjectId,actionIndex:s.step,...fields
});
function trigger(s,{source,controller,effect,detail,origin}){
 const t=makeTypedStackEntry({
  id:`trigger-${++s.triggerSerial}`,kind:'trigger',cardId:source.cardId,
  controller,sourceId:source.id,isCast:false,targets:[],chosenModes:[],
  xValue:0,originActionIndex:s.step,choices:{
   effect,...detail,origin,sourceLki:{id:source.id,cardId:source.cardId,
    controller:source.controller,zone:source.zone}
  }
 });
 emit(s,'trigger.created',t.id,{sourceId:source.id,effect,controller});
 return t;
}
// APNAP: active player's triggers go on the stack first; nonactive player's
// follow (and resolve first). Owner order is explicit whenever supplied.
function queue(s,items,order={}){
 const ordered=[];
 for(const actor of [s.activeActor,other(s.activeActor)]){
  const group=items.filter(x=>x.controller===actor);
  const requested=order[actor];
  if(requested!==undefined){
   check(Array.isArray(requested)&&requested.length===group.length
    &&new Set(requested).size===group.length
    &&requested.every(id=>group.some(x=>x.id===id)),'Illegal owner trigger ordering');
   ordered.push(...requested.map(id=>group.find(x=>x.id===id)));
  }else ordered.push(...group);
 }
 check(s.stack.length+ordered.length<=32,'Too many stacked triggers');
 for(const item of ordered){
  s.stack.push(item);s.priority.stack.push(makeTypedStackEntry(item));
 }
 return ordered;
}
function wardFor(s,spell){
 const seen=new Set(),out=[];
 for(const id of spell.targets){
  if(seen.has(id))continue;seen.add(id);
  const p=s.permanents.find(x=>x.id===id&&x.zone==='battlefield');
  if(!p||p.controller===spell.controller||!p.ward)continue;
  out.push(trigger(s,{source:p,controller:p.controller,effect:'ward',
   origin:spell.id,detail:{wardCost:clone(p.ward),protectedSpellId:spell.id}}));
  emit(s,'ward.triggered',spell.id,{permanentId:p.id,triggerId:out.at(-1).id});
 }
 return out;
}
function enterCreatures(s,creatures,order={}){
 const entered=[];
 for(const p of creatures){
  check(!s.permanents.some(x=>x.id===p.id),'Creature token id collision');
  s.permanents.push(p);entered.push(p);
  emit(s,'creature.entered',p.id,{controller:p.controller});
 }
 const fresh=[];
 for(const p of entered)for(const source of s.permanents){
  if(source.zone!=='battlefield'||source.id===p.id)continue;
  if(source.cardId==='Soul Warden')
   fresh.push(trigger(s,{source,controller:source.controller,effect:'gain-life',
    origin:p.id,detail:{recipient:source.controller,amount:1}}));
  if(source.cardId==='Impact Tremors'&&source.controller===p.controller)
   fresh.push(trigger(s,{source,controller:source.controller,effect:'damage-player',
    origin:p.id,detail:{recipient:other(source.controller),amount:1}}));
 }
 queue(s,fresh,order);
 return fresh;
}
function finish(s){
 if(s.life.player<=0){s.status='lost';return;}
 if(s.life.opponent<=0){s.status=s.objective.type==='defeatOpponent'?'won':'lost';return;}
 if(s.stack.length)return;
 const o=s.objective;
 const good=o.type==='destroyPermanent'
  ?s.permanents.find(x=>x.id===o.permanentId)?.zone==='graveyard'
  :o.type==='survive'?s.life.player>0
  :o.type==='wardPersists'?s.permanents.find(x=>x.id===o.sourceId)?.zone==='graveyard'
    &&s.events.some(x=>x.type==='ward.countered'&&x.subjectId===o.spellId)
  :o.type==='testEndurance'?s.wonByTest===true
  :false;
 s.status=good?'won':'lost';
}
function validState(s){
 check(s?.version===WARD_RULES_VERSION,'Wrong Step 7 rules version');
 check(typeof s.id==='string'&&/^[a-z0-9-]+$/.test(s.id),'Bad case ID');
 check(isActor(s.activeActor)&&isActor(s.currentActor),'Bad turn owners');
 check(Number.isInteger(s.life?.player)&&Number.isInteger(s.life?.opponent),'Invalid lives');
 check(s.mana&&actors.every(actor=>colors.every(c=>Number.isInteger(s.mana[actor]?.[c]||0)&&(s.mana[actor]?.[c]||0)>=0)),'Invalid mana');
 check(Array.isArray(s.permanents)&&Array.isArray(s.stack)&&Array.isArray(s.hand),'Invalid zones');
 const all=[...s.stack,...s.hand,...s.permanents],ids=all.map(x=>x.id);
 check(ids.every(x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,60}$/i.test(x))&&new Set(ids).size===ids.length,'Duplicate or invalid ids');
 check(s.stack.length<=24&&s.hand.length<=8&&s.permanents.length<=16,'Zone limit');
 for(const p of s.permanents){
  check(isActor(p.controller)&&p.zone==='battlefield'&&!!WARD_PERMANENTS[p.cardId],'Unsupported starting permanent');
  check(p.type===WARD_PERMANENTS[p.cardId].type,'Permanent type mismatch');
  check(JSON.stringify(p.ward??null)===JSON.stringify(WARD_PERMANENTS[p.cardId].ward??null),'Incorrect ward Oracle cost');
 }
 for(const h of s.hand)check(!!WARD_CARDS[h.cardId]&&h.controller==='player','Unsupported response card');
 for(const item of s.stack){makeTypedStackEntry(item);check(!!WARD_CARDS[item.cardId]&&item.kind==='spell','Unsupported starting stack entry');validTargets(s,item);}
 check(['destroyPermanent','survive','wardPersists','defeatOpponent','testEndurance'].includes(s.objective?.type),'Bad objective');
}
export function createWardGame(scenario){
 const s=clone(scenario);validState(s);
 s.status='playing';s.step=0;s.triggerSerial=0;s.tokenSerial=0;s.events=[];s.history=[];s.wonByTest=false;
 s.priority=createPriorityWindow({activeActor:s.activeActor,currentActor:s.currentActor,
  passedBy:s.passedBy??[],stack:s.stack});
 if(s.seedWardFromTop){
  check(s.stack.length===1,'Only a single seeded pending spell supported');
  queue(s,wardFor(s,s.stack[0]));
 }
 return s;
}
export function castWard(s0,handId,{targets=[],triggerOrder={}}={}){
 check(s0.status==='playing'&&s0.step<100,'No casting window');
 const h=s0.hand.find(x=>x.id===handId);
 check(!!h,'Card not in hand');
 const s=clone(s0),card=WARD_CARDS[h.cardId];
 const spell=makeTypedStackEntry({id:h.id,kind:'spell',cardId:h.cardId,
  controller:'player',isCast:true,targets:clone(targets),originActionIndex:s.step+1});
 validTargets(s,spell);
 const mana=pay(s.mana.player,card.cost);
 // Atomic: all legality/cost checks above, then change state.
 s.mana.player=mana;s.hand=s.hand.filter(x=>x.id!==handId);
 s.priority=putStackObject(s.priority,'player',spell);
 s.stack.push(spell);s.step++;
 emit(s,'spell.cast',spell.id,{cardId:spell.cardId});
 queue(s,wardFor(s,spell),triggerOrder);
 s.history.push({action:'cast',handId,targets:clone(targets),triggerOrder:clone(triggerOrder)});
 return s;
}
function damage(s,to,points,source){
 if(isActor(to)){s.life[to]-=points;emit(s,'damage.dealt',source,{to,amount:points});return;}
 const p=s.permanents.find(x=>x.id===to);
 if(p&&p.zone==='battlefield'){
  p.damage=(p.damage||0)+points;
  emit(s,'damage.dealt',source,{to,amount:points});
  if(p.damage>=p.toughness){
   p.zone='graveyard';emit(s,'permanent.died',p.id,{reason:'lethal-damage'});
  }
 }
}
function resolveTop(s,item,{payWard,triggerOrder}){
 if(item.kind==='trigger'){
  const c=item.choices;
  if(c.effect==='ward'){
   const i=s.stack.findIndex(x=>x.id===c.protectedSpellId);
   if(i>=0){
    const protectedSpell=s.stack[i],payer=protectedSpell.controller;
    if(payWard&&payer==='player'){
     s.mana.player=pay(s.mana.player,c.wardCost);
     emit(s,'ward.paid',protectedSpell.id,{triggerId:item.id,cost:c.wardCost});
    }else if(!payWard||payer==='opponent'){
     s.stack.splice(i,1);
     emit(s,'ward.countered',protectedSpell.id,{by:item.id,sourceId:item.sourceId});
     emit(s,'spell.countered',protectedSpell.id,{by:item.id,reason:'ward'});
    }
   }
  }else if(c.effect==='gain-life'){
   s.life[c.recipient]+=c.amount;
   emit(s,'life.gained',item.id,{who:c.recipient,amount:c.amount});
  }else if(c.effect==='damage-player'){
   damage(s,c.recipient,c.amount,item.id);
  }else if(c.effect==='test-endurance'){
   if(s.life[c.recipient]>=50){
    s.wonByTest=c.recipient==='player';
    emit(s,'intervening-if.succeeded',item.id,{recipient:c.recipient});
   }else emit(s,'intervening-if.failed',item.id,{recipient:c.recipient});
  }else throw Error('Unknown trigger effect');
  emit(s,'trigger.resolved',item.id,{effect:c.effect});
  return;
 }
 const spec=WARD_CARDS[item.cardId];
 const alive=item.targets.map((id,i)=>canTarget(s,item,spec.slots[i],id));
 if(item.targets.length&&alive.every(x=>!x)){
  emit(s,'spell.fizzled',item.id);return;
 }
 if(spec.effect==='bolt'||spec.effect==='shock'){
  if(alive[0])damage(s,item.targets[0],spec.effect==='bolt'?3:2,item.id);
 }else if(spec.effect==='stifle'){
  const index=s.stack.findIndex(x=>x.id===item.targets[0]&&x.kind==='trigger');
  if(index>=0){const [target]=s.stack.splice(index,1);
   emit(s,'trigger.countered',target.id,{by:item.id,sourceId:target.sourceId});}
 }else if(spec.effect==='edict'){
  // Curated one-creature target-player cases: opponent makes the only legal
  // sacrifice. Do not imply this is a general opponent-choice simulation.
  const victim=s.permanents.find(p=>p.controller===item.targets[0]&&p.type==='creature'&&p.zone==='battlefield');
  if(victim){victim.zone='graveyard';emit(s,'permanent.sacrificed',victim.id,{by:item.id});}
 }else if(spec.effect==='tokens'){
  const tokens=Array.from({length:2},()=>({id:`soldier-${++s.tokenSerial}`,
   cardId:'Soldier Token',type:'creature',controller:item.controller,
   zone:'battlefield',toughness:1,damage:0}));
  enterCreatures(s,tokens,triggerOrder);
 }else throw Error('Unsupported spell resolution');
 emit(s,'spell.resolved',item.id);
}
export function resolveWard(s0,{payWard=false,triggerOrder={}}={}){
 check(s0.status==='playing'&&s0.stack.length>0&&s0.step<100,'Nothing to resolve');
 check(typeof payWard==='boolean','Ward decision must be boolean');
 const item=s0.stack.at(-1);
 if(payWard)check(item.kind==='trigger'&&item.choices.effect==='ward'
  &&s0.stack.some(x=>x.id===item.choices.protectedSpellId)
  &&s0.stack.find(x=>x.id===item.choices.protectedSpellId)?.controller==='player'
  &&canPayWard(s0,item.choices.wardCost),'Cannot pay this ward cost');
 const s=clone(s0);
 let outcome;
 // Explicit two-player priority passes: when opponent has priority,
 // scripted opponent passes first. Resolve one object for two passes.
 for(let tries=0;tries<2;tries++){
  const who=s.priority.currentActor;
  const r=passPriority(s.priority,who);
  s.priority=r.state;outcome=r.outcome;
  if(outcome.type==='resolve-top')break;
 }
 check(outcome?.type==='resolve-top'&&outcome.item.id===item.id,'Priority/stack divergence');
 s.stack.pop();s.step++;
 resolveTop(s,item,{payWard,triggerOrder});
 // Reconcile ability counters/ward counters/new triggered objects with the
 // typed shared priority module; never convert abilities into spell casts.
 s.priority.stack=s.stack.map(makeTypedStackEntry);
 check(canonicalStackJson(s.priority.stack)===canonicalStackJson(s.stack.map(makeTypedStackEntry)),
  'Priority snapshot mismatch');
 finish(s);
 if(s.status==='playing'){
  const pass=passPriority(s.priority,s.activeActor);
  check(pass.outcome.type==='awaiting-opponent','Scripted active actor priority failed');
  s.priority=pass.state;
 }
 s.history.push({action:'resolve',payWard,triggerOrder:clone(triggerOrder)});
 return s;
}
export function beginWardUpkeep(s0,actor){
 check(s0.status==='playing'&&s0.activeActor===actor,'Wrong upkeep actor');
 const s=clone(s0),items=[];
 for(const p of s.permanents){
  if(p.cardId!=='Test of Endurance'||p.controller!==actor||p.zone!=='battlefield')continue;
  if(s.life[actor]<50)continue; // intervening-if checks AT trigger time
  items.push(trigger(s,{source:p,controller:actor,effect:'test-endurance',
   origin:'upkeep',detail:{recipient:actor}}));
 }
 queue(s,items);
 return s;
}
export function replayWard(scenario,actions){
 check(Array.isArray(actions)&&actions.length<=100,'Replay length cap');
 let s=createWardGame(scenario);
 for(const a of actions){
  check(a&&typeof a==='object','Invalid replay action');
  if(a.action==='cast')s=castWard(s,a.handId,{targets:a.targets,triggerOrder:a.triggerOrder});
  else if(a.action==='resolve')s=resolveWard(s,{payWard:a.payWard,triggerOrder:a.triggerOrder});
  else if(a.action==='upkeep')s=beginWardUpkeep(s,a.actor);
  else throw Error('Unsupported ward replay action');
 }
 return s;
}
