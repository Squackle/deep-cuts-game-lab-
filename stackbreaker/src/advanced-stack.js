import {ADVANCED_RULES_PREVIEW,makeTypedStackEntry,fromClassicStackEntry,classicTargetProjection,validateModeAndTargets,createPriorityWindow,putStackObject,passPriority,canonicalStackJson} from './advanced-foundation.js';
// Stackbreaker copy/retarget reducer built ON Step 5's typed priority foundation.
// Isolated from the Classic 0.3 resolver.
// A deliberately bounded TWO-player response-window subset, not a complete Magic engine.
// Rules references: Wizards Comprehensive Rules 115.7, 601.2, 608.2b, 707.2, 707.10, 707.10c.
export const ADVANCED_PREVIEW_VERSION = ADVANCED_RULES_PREVIEW;
export const ADVANCED_CARDS = Object.freeze({
  'Twincast': {type:'Instant', cost:{U:2}, effect:'copy', modes:null, targets:['instantOrSorcerySpell']},
  'Redirect': {type:'Instant', cost:{U:2}, effect:'retarget', modes:null, targets:['spell']},
  'Lightning Bolt': {type:'Instant', cost:{R:1}, effect:'bolt', modes:null, targets:['any']},
  'Arc Trail': {type:'Sorcery', cost:{generic:1,R:1}, effect:'arcTrail', modes:null, targets:['any','anotherAny']},
  'Counterspell': {type:'Instant', cost:{U:2}, effect:'counter', modes:null, targets:['spell']},
  'Grizzly Bears': {type:'Creature', cost:{generic:1,G:1}, effect:'creature', modes:null, targets:[]},
  'Abrade': {type:'Instant', cost:{generic:1,R:1}, effect:'abrade', modes:{
    creature:{targets:['creature']}, artifact:{targets:['artifact']}
  }}
});
const colors=['W','U','B','R','G','C'];
const copy = value => structuredClone(value);
const assert = (condition,message) => {if(!condition)throw Error(message);};
const who = id => id==='player'||id==='opponent';
export function targetRules(item) {
  const card=ADVANCED_CARDS[item.cardId];assert(!!card,'Unknown spell card');
  if(card.modes) {
    assert(Array.isArray(item.chosenModes)&&item.chosenModes.length===1&&Object.hasOwn(card.modes,item.chosenModes[0]),'A single valid mode is required');
    return card.modes[item.chosenModes[0]].targets;
  }
  assert(!item.chosenModes?.length,'This card does not have modes');
  return card.targets;
}
function targetLegal(s,item,id,type) {
  if(type==='spell'||type==='instantOrSorcerySpell') {
    const ref=s.stack.find(x=>x.id===id&&x.id!==item.id);
    if(!ref)return false;
    if(type==='spell')return true; // A spell copy is still a spell on the stack.
    return ['Instant','Sorcery'].includes(ADVANCED_CARDS[ref.cardId]?.type);
  }
  if((type==='any'||type==='anotherAny')&&who(id))return true;
  const p=s.permanents.find(x=>x.id===id&&x.zone==='battlefield');
  if(!p)return false;
  if((type==='creature'||type==='anotherAny'||type==='any')&&p.type!=='creature')return false;
  if(type==='artifact'&&p.type!=='artifact')return false;
  if(p.hexproof&&p.controller!==item.controller)return false;
  return true;
}
function targetSetLegal(s,item,targets,{previous=null}={}) {
  const specs=targetRules(item);
  if(!Array.isArray(targets)||targets.length!==specs.length||targets.some(x=>typeof x!=='string'))return false;
  // Arc Trail's second target must be different. Evaluate the complete new target
  // set, not intermediate choices, so swapping Arc Trail targets is legal (115.7e).
  try{
    const card=ADVANCED_CARDS[item.cardId];
    const spec=card.modes
      ? {modes:Object.fromEntries(Object.entries(card.modes).map(([name,mode])=>[name,{targetSlots:mode.targets}])),
          distinctSlotGroups:[]}
      : {targetSlots:card.targets,distinctSlotGroups:specs.includes('anotherAny')?[[0,1]]:[]};
    validateModeAndTargets(spec,{chosenModes:item.chosenModes??[],targets},(slot,id,i)=>{
      // Unchanged old targets can remain even when currently illegal (115.7d).
      // Any newly chosen target is legal for the spell's controller.
      return previous?.[i]===id||targetLegal(s,item,id,slot);
    });
    return true;
  }catch{return false;}
}
export function advancedTargetOptions(s,item,slot=0) {
  const specs=targetRules(item),type=specs[slot];assert(!!type,'Unknown target slot');
  const all=[...['player','opponent'],...s.permanents.map(x=>x.id),...s.stack.map(x=>x.id)];
  return all.filter(id=>targetLegal(s,item,id,type));
}
export function projectClassicTargetId(item){return classicTargetProjection(item);}
export function adaptClassicStackEntry(entry){return fromClassicStackEntry(entry);}
function validateState(s) {
  assert(s?.version===ADVANCED_PREVIEW_VERSION,'Wrong advanced preview version');
  assert(s.life&&Number.isInteger(s.life.player)&&Number.isInteger(s.life.opponent),'Invalid lives');
  assert(s.mana&&colors.every(c=>Number.isInteger(s.mana[c]||0)&&(s.mana[c]||0)>=0),'Invalid mana pool');
  assert(Array.isArray(s.stack)&&Array.isArray(s.hand)&&Array.isArray(s.permanents),'Invalid zones');
  assert(s.stack.length<=32&&s.hand.length<=10,'Preview zone limit');
  const ids=[...s.stack,...s.hand,...s.permanents].map(x=>x.id);
  assert(ids.every(x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,60}$/i.test(x))&&new Set(ids).size===ids.length,'Bad or duplicate object IDs');
  for(const p of s.permanents)assert(who(p.controller)&&['creature','artifact'].includes(p.type)&&['battlefield','graveyard'].includes(p.zone),'Invalid permanent');
  for(const x of s.stack) {
    assert(who(x.controller)&&!!ADVANCED_CARDS[x.cardId]&&['spell','copy'].includes(x.kind),'Unsupported stack entry');
    assert(x.kind!=='copy'||x.isCast===false,'A spell copy is NOT cast');
    makeTypedStackEntry(x);
    assert(targetSetLegal(s,x,x.targets),'Invalid starting stack targets');
  }
  for(const x of s.hand)assert(!!ADVANCED_CARDS[x.cardId]&&ADVANCED_CARDS[x.cardId].type==='Instant','Unsupported preview hand card');
  assert(['win','survive','destroyArtifacts','protectCreature'].includes(s.objective?.type),'Unsupported preview objective');
}
export function createAdvancedGame(scenario) {
  const s=copy(scenario);
  validateState(s);
  s.step=0;s.copySerial=0;s.status='playing';s.events=[];s.log=['Opponent has passed priority.'];s.history=[];
  s.priority=createPriorityWindow({
    activeActor:'opponent',currentActor:'player',passedBy:['opponent'],
    stack:s.stack.map(makeTypedStackEntry)
  });
  return s;
}
function addEvent(s,type,subjectId,other={}) {
  s.events.push({eventId:`${s.id}:${s.step}:${s.events.length}`,actionIndex:s.step,
    eventIndex:s.events.length,type,subjectId,...other});
}
function closeIfFinished(s) {
  if(s.life.player<=0){s.status='lost';return;}
  if(s.life.opponent<=0){s.status=s.objective.type==='win'?'won':'lost';return;}
  if(s.stack.length)return;
  const objective=s.objective;
  const won=objective.type==='survive'?
    s.life.player>0:
    objective.type==='win'?s.life.opponent<=0:
    objective.type==='destroyArtifacts'?objective.ids.every(id=>s.permanents.find(p=>p.id===id)?.zone==='graveyard'):
    s.permanents.find(p=>p.id===objective.id)?.zone==='battlefield';
  s.status=won?'won':'lost';
}
function pay(s,cost) {
  const pool=Object.fromEntries(colors.map(c=>[c,s.mana[c]||0]));
  for(const c of colors){const n=cost[c]||0;assert(pool[c]>=n,'Not enough colored mana');pool[c]-=n;}
  let g=cost.generic||0;
  for(const c of ['C','W','U','B','R','G']){const n=Math.min(pool[c],g);pool[c]-=n;g-=n;}
  assert(g===0,'Not enough generic mana');
  return pool;
}
export function castAdvanced(s0,handId,{targets=[],chosenModes=[],xValue=0}={}) {
  assert(s0.status==='playing','Game has ended');
  assert(s0.step<80&&s0.stack.length<32,'Action budget reached');
  const a=s0.hand.find(x=>x.id===handId);
  assert(!!a,'Spell not available in your hand');
  const card=ADVANCED_CARDS[a.cardId];
  assert(card.type==='Instant','Only instant-speed responses are supported');
  assert(xValue===0,'X-cost spells are not castable in this preview');
  const item={id:a.id,kind:'spell',cardId:a.cardId,controller:'player',sourceId:null,
    isCast:true,chosenModes:copy(chosenModes),targets:copy(targets),xValue,choices:{},originActionIndex:s0.step+1};
  assert(targetSetLegal(s0,item,targets),'Illegal spell target/mode');
  const s=copy(s0),after=pay(s,card.cost);
  s.mana=after;s.hand=s.hand.filter(x=>x.id!==handId);
  // Step 5 priority contract: caster retains priority, and the pass chain resets.
  s.priority=putStackObject(s.priority,'player',item);
  s.stack.push(item);s.step++;
  addEvent(s,'spell.cast',item.id,{cardId:item.cardId});
  s.history.push({action:'cast',handId,targets:copy(targets),chosenModes:copy(chosenModes),xValue});
  s.log.push(`You cast ${item.cardId}; choose priority pass to resolve.`);
  return s;
}
function validateNewTargets(s,spell,newTargets) {
  assert(targetSetLegal(s,spell,newTargets,{previous:spell.targets}),'Illegal replacement targets');
}
function doChangeTargets(s,spell,newTargets) {
  if(newTargets==null)return;
  validateNewTargets(s,spell,newTargets);
  const before=copy(spell.targets);
  spell.targets=copy(newTargets);
  if(JSON.stringify(before)!==JSON.stringify(newTargets))
    addEvent(s,'spell.targets.changed',spell.id,{before,after:copy(newTargets)});
}
function applyDamage(s,target,n,source) {
  if(who(target)){s.life[target]-=n;addEvent(s,'damage.dealt',source,{target,amount:n});return;}
  const p=s.permanents.find(x=>x.id===target);
  if(p&&p.zone==='battlefield'){p.damage=(p.damage||0)+n;addEvent(s,'damage.dealt',source,{target,amount:n});
    if(p.damage>=p.toughness){p.zone='graveyard';addEvent(s,'permanent.died',p.id);}}
}
function effectResolve(s,item) {
  const t=item.targets,card=ADVANCED_CARDS[item.cardId];
  const specs=targetRules(item);
  const valid=t.map((id,i)=>targetLegal(s,item,id,specs[i]));
  // 608.2b: a spell whose every target became illegal does not resolve.
  if(t.length&&valid.every(x=>!x)){addEvent(s,'spell.fizzled',item.id);s.log.push(`${item.cardId}: all targets became illegal.`);return false;}
  if(card.effect==='bolt'&&valid[0])applyDamage(s,t[0],3,item.id);
  if(card.effect==='arcTrail') {
    if(valid[0])applyDamage(s,t[0],2,item.id);
    if(valid[1])applyDamage(s,t[1],1,item.id);
  }
  if(card.effect==='counter'&&valid[0]) {
    const ix=s.stack.findIndex(x=>x.id===t[0]);
    if(ix>=0){const [target]=s.stack.splice(ix,1);addEvent(s,'spell.countered',target.id,{by:item.id,wasCopy:target.kind==='copy'});}
  }
  if(card.effect==='creature') {
    s.permanents.push({id:'permanent-'+item.id,type:'creature',cardId:item.cardId,controller:item.controller,zone:'battlefield',toughness:2,damage:0});
  }
  if(card.effect==='abrade'&&valid[0]) {
    if(item.chosenModes[0]==='creature')applyDamage(s,t[0],3,item.id);
    else{const p=s.permanents.find(x=>x.id===t[0]);if(p?.zone==='battlefield'){p.zone='graveyard';addEvent(s,'artifact.destroyed',p.id);}}
  }
  return true;
}
export function resolveAdvanced(s0,options={}) {
  assert(options&&typeof options==='object'&&Object.keys(options).every(x=>x==='newTargets'),'Unsupported resolution choice');
  const newTargets=options.newTargets??null;
  assert(s0.status==='playing'&&s0.stack.length>0,'Nothing to resolve');
  assert(s0.step<80,'Action budget reached');
  const top=s0.stack.at(-1),effect=ADVANCED_CARDS[top.cardId].effect;
  assert(newTargets==null||['copy','retarget'].includes(effect),'This resolution cannot change targets');
  // Validate before consuming the spell; no partial mutation on illegal choice.
  const chosen=top.targets[0],original=s0.stack.find(x=>x.id===chosen);
  if(newTargets!=null&&original&&['copy','retarget'].includes(effect)) {
    const next=effect==='copy'?{...original,controller:top.controller,id:'copy-pending'}:original;
    validateNewTargets(s0,next,newTargets);
  }else if(newTargets!=null&&(!original||!['copy','retarget'].includes(effect))) {
    assert(false,'No legal spell to retarget');
  }
  const s=copy(s0);
  // Apply priority through the shared Step 5 model, not an ad-hoc stack pop.
  // The opponent's always-pass policy is explicit and deterministic here.
  let progress=passPriority(s.priority,'player');
  if(progress.outcome.type==='awaiting-opponent')
    progress=passPriority(progress.state,'opponent');
  assert(progress.outcome.type==='resolve-top','Resolution requires both priority passes');
  assert(progress.outcome.item.id===top.id,'Priority stack diverged from the effect engine');
  s.priority=progress.state;
  const item=s.stack.pop();s.step++;
  if(effect==='copy'||effect==='retarget') {
    const target=s.stack.find(x=>x.id===item.targets[0]);
    if(target) {
      if(effect==='copy') {
        const made=copy(target);
        made.id=`copy-${++s.copySerial}`;
        while(s.stack.some(x=>x.id===made.id))made.id=`copy-${++s.copySerial}`;
        made.kind='copy';made.controller=item.controller;made.isCast=false;made.sourceId=target.sourceId??null;
        made.originActionIndex=s.step;made.copiedFromId=target.id;
        doChangeTargets(s,made,newTargets);s.stack.push(made);
        addEvent(s,'spell.copied',made.id,{copiedFromId:target.id,isCast:false,modes:copy(made.chosenModes)});
        s.log.push(`A copy of ${target.cardId} enters the stack above its original; it was not cast.`);
      }else{
        doChangeTargets(s,target,newTargets);
        s.log.push(`Redirect resolves. ${target.cardId} retains its original mode.`);
      }
    }else{s.log.push(`${item.cardId} has no legal stack target on resolution.`);}
    if(target)addEvent(s,'spell.resolved',item.id,{isCast:item.isCast});
    else addEvent(s,'spell.fizzled',item.id);
  }else if(effectResolve(s,item))addEvent(s,'spell.resolved',item.id,{isCast:item.isCast});
  // Keep the shared typed stack consistent after copies, target changes and
  // counterspells, without conflating spell-copied with spell-cast events.
  s.priority.stack=s.stack.map(makeTypedStackEntry);
  assert(canonicalStackJson(s.priority.stack)===canonicalStackJson(s.stack.map(makeTypedStackEntry)),
    'Advanced priority stack is out of sync');
  closeIfFinished(s);
  if(s.status==='playing'){
    // In the curated opponent-always-passes training window, opponent holds
    // priority after resolution (active player), passes, and player can respond.
    const opponentPass=passPriority(s.priority,'opponent');
    assert(opponentPass.outcome.type==='awaiting-opponent','Opponent pass failed');
    s.priority=opponentPass.state;
  }
  s.history.push({action:'resolve',newTargets:newTargets==null?null:copy(newTargets)});
  return s;
}
export function replayAdvanced(scenario,actions) {
  assert(Array.isArray(actions)&&actions.length<=80,'Replay length limit');
  let s=createAdvancedGame(scenario);
  for(const a of actions) {
    assert(a&&typeof a==='object','Bad replay action');
    if(a.action==='cast')s=castAdvanced(s,a.handId,{targets:a.targets,chosenModes:a.chosenModes,xValue:a.xValue});
    else if(a.action==='resolve')s=resolveAdvanced(s,{newTargets:a.newTargets});
    else throw Error('Unknown replay action');
  }
  return s;
}
