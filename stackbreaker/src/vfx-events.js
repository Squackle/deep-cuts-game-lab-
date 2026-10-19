// Stackbreaker VFX (Steps 1–5) — presentation-only resolution journal.
// Rules state is authoritative; no VFX event is written to saved gameplay.
import {CARDS} from './cards.js';
import {pyroblastVisualMode,renderPyroblastVfx} from './pyroblast-vfx.js';
import {dustVisualMode,captureDustCard,renderSpellDust} from './dust-vfx.js';
import {observeResolutionChanges,resolutionFxMode,renderResolutionFx,fxNarration} from './resolution-fx.js';

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
 const changes=observeResolutionChanges(before,after);
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
  damageAmount:outcome==='damage-dealt'?Math.max(0, target==='life'
   ? (before.life?.[targetId]??0)-(after.life?.[targetId]??0)
   : (afterUnit?.damage??0)-(targetUnit?.damage??0)):0,
  terminalStatus:after.status==='won'||after.status==='lost'?after.status:null,
  colors:card.colors||[],changes,
  isCreatureSpell:top.spell!==false&&card.type?.startsWith('Creature'),
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
 const field=pointRect(root?.getElementById?.('battlefield'));
 const healTarget=event.effect==='heal'||event.effect==='sacGain'?
  pointRect(root?.getElementById?.(event.targetId==='opponent'?'opponentLife':'playerLife')):null;
 const anchors={source:pointRect(source),target:pointRect(target)||healTarget,
  field,affected:(event.changes?.units||[]).map(x=>pointRect(
   findDataNode(root,'[data-unit]','unit',x.id))).filter(Boolean)};
 // A creature summon is not targeted; the battlefield is its arrival point.
 if(event.isCreatureSpell&&!anchors.target)anchors.target=field;
 if(['destroyAll','weakenAll','sweepDamage','ward','intervention'].includes(event.effect)&&!anchors.target)
  anchors.target=field;
 const dustCard=captureDustCard(root,event);
 if(dustCard)anchors.dustCard=dustCard;
 return anchors;
}
/** Accessible narration follows the engine outcome, not an animation guess. */
export function describeSpellVfxForA11y(event){
 if(!event)return '';
 const card=event.card||'Spell';
 const target=event.targetCard||(
  event.targetId==='player'?'you':
  event.targetId==='opponent'?'your opponent':'the target'
 );
 switch(event.outcome){
  case 'countered':return card+' counters '+target+'. The spell leaves the stack.';
  case 'invalid-target':return card+' fails to resolve: all its targets are illegal.';
  case 'uncounterable':return card+' resolves, but '+target+' cannot be countered.';
  case 'no-counter':return card+' resolves without countering '+target+'.';
  case 'prevented':return card+' resolves; damage is prevented.';
  case 'damage-dealt':return card+' resolves and deals '+(event.damageAmount||0)+' damage to '+target+'.';
  case 'destroyed':return card+' destroys '+target+'.';
  default:{const semantic=resolutionFxMode(event);
   return semantic!=='none'?fxNarration(event,semantic):card+' resolves.';}
 }
}
/** Deterministic screen-space bolt: repeatable seed, no game RNG or effects. */
export function lightningGeometry(source,target,seed='bolt'){
 if(!source||!target||![source.x,source.y,target.x,target.y].every(Number.isFinite))return null;
 const dx=target.x-source.x,dy=target.y-source.y,distance=Math.hypot(dx,dy);
 if(distance<2)return null;
 let hash=2166136261;
 for(const letter of String(seed)){hash^=letter.charCodeAt(0);hash=Math.imul(hash,16777619);}
 const perpX=-dy/distance,perpY=dx/distance;
 const points=[];
 const segments=11,variance=Math.min(19,Math.max(5,distance*.065));
 for(let i=0;i<=segments;i++){
  const t=i/segments;
  const wave=Math.sin(Math.PI*t);
  let offset=0;
  if(i!==0&&i!==segments){
   const salt=((hash>>>((i%4)*7))^Math.imul(i,1103515245))>>>0;
   offset=((salt%201)/100-1)*variance*wave;
  }
  points.push({x:source.x+dx*t+perpX*offset,y:source.y+dy*t+perpY*offset});
 }
 const formatPoint=p=>Math.round(p.x*10)/10+' '+Math.round(p.y*10)/10;
 const path='M'+points.map(formatPoint).join(' L');
 const branches=[3,6,8].map((at,j)=>{
  const start=points[at];
  const sign=j%2?-1:1;
  const reach=Math.min(46,Math.max(13,distance*.13));
  const p1={x:start.x+dx/distance*reach*.52+perpX*reach*.48*sign,
   y:start.y+dy/distance*reach*.52+perpY*reach*.48*sign};
  const p2={x:start.x+dx/distance*reach*.93+perpX*reach*sign,
   y:start.y+dy/distance*reach*.93+perpY*reach*sign};
  return 'M'+formatPoint(start)+' L'+formatPoint(p1)+' L'+formatPoint(p2);
 });
 return {path,branches,distance};
}
export function lightningVisualMode(event){
 if(event?.card!=='Lightning Bolt'||event?.effect!=='damage')return 'generic';
 if(event.outcome==='damage-dealt')return 'impact';
 if(event.outcome==='prevented')return 'shield';
 if(event.outcome==='invalid-target')return 'dissipate';
 return 'generic';
}
function svgNode(root,parent,tag,attrs={},klass=''){
 const element=root.createElementNS('http://www.w3.org/2000/svg',tag);
 for(const [key,value] of Object.entries(attrs))element.setAttribute(key,String(value));
 if(klass)element.setAttribute('class',klass);
 parent.appendChild(element);
 return element;
}
/**
 * All spell animations are ephemeral and purely visual. Engine rules already
 * resolved synchronously. The overlay is inert and can always be canceled.
 */
export function createSpellVfxController(root,view){
 let cue=null,clearTimer=null;
 const reduce=()=>!!view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 // Never strand viewport-space particles after resize, scrolling or page leave.
 // This listener is per controller, not per individual spell/event.
 view?.addEventListener?.('resize',()=>cancel(),{passive:true});
 view?.addEventListener?.('orientationchange',()=>cancel(),{passive:true});
 view?.addEventListener?.('pagehide',()=>cancel());
 view?.addEventListener?.('scroll',()=>cancel(),{passive:true});
 root?.addEventListener?.('visibilitychange',()=>{
  if(root.hidden)cancel();
 });
 const cancel=()=>{
  if(clearTimer!==null){view?.clearTimeout?.(clearTimer);clearTimer=null;}
  cue?.remove?.();cue=null;
 };
 function play(event,anchors){
  cancel();
  if(!event)return {played:false,reason:'no-event'};
  if(reduce())return {played:false,reason:'reduced-motion'};
  if(root?.hidden)return {played:false,reason:'hidden-document'};
  if(!anchors?.source)return {played:false,reason:'no-anchors'};
  if(!root?.createElement||!root.body)return {played:false,reason:'no-document'};
  const fireMode=pyroblastVisualMode(event);
  if(event.card==='Pyroblast'&&fireMode==='generic')return {played:false,reason:'unverified-pyroblast-outcome'};
  const boltMode=lightningVisualMode(event);
  const dustMode=dustVisualMode(event);
  const semanticMode=resolutionFxMode(event);
  const mode=fireMode!=='generic'?fireMode:boltMode!=='generic'?boltMode:
   dustMode!=='none'?dustMode:semanticMode!=='none'?semanticMode:'generic';
  const misses=mode==='dissipate'||mode==='fire-miss'||mode==='dust-fizzle';
  const semantic=semanticMode!=='none'&&mode===semanticMode;
  if(!misses&&!semantic&&!anchors.target)return {played:false,reason:'no-anchors'};
  const geometry=anchors.target?lightningGeometry(anchors.source,anchors.target,event.sourceStackId):null;
  if(!misses&&!semantic&&!geometry)return {played:false,reason:'overlapping'};
  const layer=root.createElement('div');
  layer.className='sb-vfx-layer';
  layer.setAttribute('aria-hidden','true');
  layer.setAttribute('data-vfx-mode',mode);
  layer.setAttribute('data-vfx-outcome',event.outcome||'resolved');
  if(event.terminalStatus)layer.setAttribute('data-vfx-terminal',event.terminalStatus);
  if(semantic){
   renderResolutionFx(root,layer,view,event,anchors,mode);
  }else if(mode.startsWith('fire-')){
   if(typeof root.createElementNS!=='function')return {played:false,reason:'no-svg'};
   renderPyroblastVfx(root,layer,view,event,anchors,mode);
  }else if(mode==='dust-counter'||mode==='dust-fizzle'){
   // Unlike a successful counter, illegal-target resolution has no recipient.
   if(mode==='dust-counter'&&anchors.target){
    const link=root.createElement('div');
    link.className='sb-vfx-dust-link';
    link.style.left=anchors.source.x+'px';
    link.style.top=anchors.source.y+'px';
    link.style.width=geometry.distance+'px';
    link.style.transform='translateY(-50%) rotate('+
     Math.atan2(anchors.target.y-anchors.source.y,anchors.target.x-anchors.source.x)+'rad)';
    layer.appendChild(link);
   }
  }else if(mode==='generic'){
   const trace=root.createElement('div');
   trace.className='sb-vfx-trace';
   trace.style.left=anchors.source.x+'px';
   trace.style.top=anchors.source.y+'px';
   trace.style.width=geometry.distance+'px';
   trace.style.transform='translateY(-50%) rotate('+
    Math.atan2(anchors.target.y-anchors.source.y,anchors.target.x-anchors.source.x)+'rad)';
   trace.dataset.effect=event.effect||'other';
   trace.dataset.outcome=event.outcome||'resolved';
   layer.appendChild(trace);
  }else{
   if(typeof root.createElementNS!=='function')return {played:false,reason:'no-svg'};
   const width=Math.max(1,view?.innerWidth||root.documentElement?.clientWidth||1000);
   const height=Math.max(1,view?.innerHeight||root.documentElement?.clientHeight||750);
   const svg=svgNode(root,layer,'svg',{
    viewBox:'0 0 '+width+' '+height,preserveAspectRatio:'none',
    'aria-hidden':'true'
   },'sb-vfx-bolt-svg');
   if(mode==='dissipate'){
    // Target ceased to be legal. Crucially NO bolt and NO damage impact.
    svgNode(root,svg,'circle',{cx:anchors.source.x,cy:anchors.source.y,r:18},'sb-vfx-bolt-miss');
   }else{
    const path=geometry.path;
    svgNode(root,svg,'path',{d:path,pathLength:100},'sb-vfx-bolt-glow');
    svgNode(root,svg,'path',{d:path,pathLength:100},'sb-vfx-bolt-core');
    for(const d of geometry.branches){
     svgNode(root,svg,'path',{d,pathLength:100},'sb-vfx-bolt-branch');
    }
    svgNode(root,svg,'circle',{cx:anchors.source.x,cy:anchors.source.y,r:9},'sb-vfx-bolt-spark');
    svgNode(root,svg,'circle',{cx:anchors.target.x,cy:anchors.target.y,r:21},
     mode==='shield'?'sb-vfx-bolt-shield':'sb-vfx-bolt-impact');
    svgNode(root,svg,'circle',{cx:anchors.target.x,cy:anchors.target.y,r:5},
     mode==='shield'?'sb-vfx-bolt-shield-core':'sb-vfx-bolt-impact-core');
    // Display only actual dealt damage, never on a prevented/invalid spell.
    if(mode==='impact'&&event.damageAmount>0){
     const label=svgNode(root,svg,'text',{
      x:anchors.target.x,y:anchors.target.y-22,'text-anchor':'middle'
     },'sb-vfx-bolt-damage');
     label.textContent='−'+event.damageAmount;
    }
   }
  }
  if(dustMode!=='none')renderSpellDust(root,layer,event,anchors,dustMode);
  root.body.appendChild(layer);cue=layer;
  const lifetime=semantic?850:mode==='generic'?260:mode==='dust-counter'?880:mode==='dust-fizzle'?650:
   misses?420:mode.startsWith('fire-')?900:800;
  if(typeof view?.setTimeout==='function')clearTimer=view.setTimeout(()=>{
   if(cue===layer){layer.remove();cue=null;}clearTimer=null;
  },lifetime);
  return {played:true,reason:'ok',mode};
 }
 return {play,cancel};
}
