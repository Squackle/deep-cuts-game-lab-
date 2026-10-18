// Stackbreaker VFX step 1 — presentation-only resolution journal.
// Rules state is authoritative; no VFX event is written to saved gameplay.
import {CARDS} from './cards.js';

const pointRect=el=>{
 if(!el||typeof el.getBoundingClientRect!=='function')return null;
 const r=el.getBoundingClientRect();
 if(![r.left,r.top,r.width,r.height].every(Number.isFinite))return null;
 return {x:r.left+r.width/2,y:r.top+r.height/2,width:r.width,height:r.height};
};
function findDataNode(root,selector,key,value){
 if(!root?.querySelectorAll||value==null)return null;
 return [...root.querySelectorAll(selector)].find(el=>el.dataset?.[key]===String(value))||null;
}
function targetKind(before,target){
 if(target==='player'||target==='opponent')return 'life';
 if(before.stack.some(x=>x.id===target))return 'stack';
 if(before.units.some(x=>x.id===target))return 'creature';
 return 'unknown';
}
/**
 * Only describes a spell/ability that actually resolves (is popped) by pass().
 * Pure before/after difference; no duplicate game rules or mutations.
 */
export function describeSpellResolution(before,after){
 if(!before||!after||!Array.isArray(before.stack)||!Array.isArray(after.stack))return null;
 if(!Array.isArray(before.log)||!Array.isArray(after.log))return null;
 const top=before.stack.at(-1);
 if(!top||after.stack.some(x=>x.id===top.id)||before.status!=='playing')return null;
 const added=after.log.slice(before.log.length);
 if(!added.some(s=>s==='TOP RESOLVES: '+top.card+'.'))return null;
 const card=CARDS[top.card];
 if(!card)return null;
 const targetId=top.targetId??null;
 const target=targetKind(before,targetId);
 const previousTarget=before.stack.find(x=>x.id===targetId)||
  before.units.find(x=>x.id===targetId)||null;
 const removedStack=before.stack.filter(x=>!after.stack.some(y=>y.id===x.id));
 const countered=card.effect==='counter'&&target==='stack'&&
  removedStack.some(x=>x.id===targetId);
 const invalid=added.some(x=>x.includes('all targets illegal on resolution'));
 const prevented=card.effect==='damage'&&added.some(x=>x.includes('prevents ')&&x.includes(' damage from '));
 const uncounterable=card.effect==='counter'&&added.some(x=>x.includes('cannot be countered'));
 const targetUnit=before.units.find(x=>x.id===targetId);
 const afterUnit=after.units.find(x=>x.id===targetId);
 const creatureDamaged=target==='creature'&&afterUnit&&targetUnit&&afterUnit.damage>targetUnit.damage;
 const playerDamaged=target==='life'&&after.life?.[targetId]<before.life?.[targetId];
 const didDamage=(card.effect==='damage'||card.effect==='helix')&&(playerDamaged||creatureDamaged);
 const destroyed=target==='creature'&&targetUnit?.zone==='battlefield'&&afterUnit?.zone==='graveyard';
 let outcome='resolved';
 if(invalid)outcome='invalid-target';
 else if(uncounterable)outcome='uncounterable';
 else if(countered)outcome='countered';
 else if(prevented)outcome='prevented';
 else if(didDamage)outcome='damage-dealt';
 else if(destroyed)outcome='destroyed';
 else if(card.effect==='counter')outcome='no-counter';
 return {
  sourceStackId:top.id,card:top.card,controller:top.controller,
  effect:card.effect||'other',targetId,targetKind:target,
  targetCard:previousTarget?.card||null,
  outcome,relatedStackIds:removedStack.filter(x=>x.id!==top.id).map(x=>x.id),
  gameStep:after.step,scenarioId:before.id
 };
}
/** Capture anchor rectangles BEFORE the UI rerenders the resolving stack. */
export function captureSpellAnchors(root,event){
 if(!event)return null;
 const source=findDataNode(root,'[data-stack-target]','stackTarget',event.sourceStackId);
 const target=event.targetKind==='life'
  ?findDataNode(root,'[data-target-person]','targetPerson',event.targetId)
  :event.targetKind==='stack'
  ?findDataNode(root,'[data-stack-target]','stackTarget',event.targetId)
  :event.targetKind==='creature'
  ?findDataNode(root,'[data-unit]','unit',event.targetId)
  :null;
 return {source:pointRect(source),target:pointRect(target)};
}
/** Tiny inert visual bridge. Later VFX phases add electric/fire/dust language. */
export function createSpellVfxController(root,view){
 let cue=null,clearTimer=null;
 const reduce=()=>!!view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const cancel=()=>{
  if(clearTimer!==null){view?.clearTimeout?.(clearTimer);clearTimer=null;}
  cue?.remove?.();cue=null;
 };
 function play(event,anchors){
  cancel();
  if(!event)return {played:false,reason:'no-event'};
  if(reduce())return {played:false,reason:'reduced-motion'};
  if(!anchors?.source||!anchors?.target)return {played:false,reason:'no-anchors'};
  if(!root?.createElement||!root.body)return {played:false,reason:'no-document'};
  const dx=anchors.target.x-anchors.source.x,dy=anchors.target.y-anchors.source.y;
  const length=Math.hypot(dx,dy);
  if(!Number.isFinite(length)||length<2)return {played:false,reason:'overlapping'};
  const layer=root.createElement('div');
  layer.className='sb-vfx-layer';
  layer.setAttribute('aria-hidden','true');
  const trace=root.createElement('div');
  trace.className='sb-vfx-trace';
  trace.style.left=anchors.source.x+'px';
  trace.style.top=anchors.source.y+'px';
  trace.style.width=length+'px';
  trace.style.transform='translateY(-50%) rotate('+Math.atan2(dy,dx)+'rad)';
  trace.dataset.effect=event.effect||'other';
  trace.dataset.outcome=event.outcome||'resolved';
  layer.appendChild(trace);root.body.appendChild(layer);cue=layer;
  if(typeof view?.setTimeout==='function')clearTimer=view.setTimeout(()=>{
   if(cue===layer){layer.remove();cue=null;}clearTimer=null;
  },260);
  return {played:true,reason:'ok'};
 }
 return {play,cancel};
}
