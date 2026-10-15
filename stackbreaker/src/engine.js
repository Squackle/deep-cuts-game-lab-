import {CARDS,LANDS,RULES_VERSION,isCreature} from './cards.js';
const clone=x=>structuredClone(x);
const colors=['W','U','B','R','G','C'];
export const maxSteps=140;
function validId(s){return typeof s==='string'&&/^[a-z][a-z0-9-]{0,50}$/i.test(s)}
function fail(text){throw new Error(text)}
function unique(arr){return new Set(arr).size===arr.length}
export function validateScenario(p){
 const problems=[];const say=(test,msg)=>{if(!test)problems.push(msg)};
 if(!p||typeof p!=='object')return {valid:false,errors:['Not an object']};
 say(validId(p.id),'invalid id');say(p.version===RULES_VERSION,'version mismatch');
 for(const f of ['title','intro','hint','explanation','tier'])say(typeof p[f]==='string'&&p[f].length>0,`missing ${f}`);
 say(['Apprentice','Investigator','Mastermind'].includes(p.tier),'invalid tier');
 say(Number.isInteger(p.life?.player)&&p.life.player>0,'invalid player life');say(Number.isInteger(p.life?.opponent)&&p.life.opponent>0,'invalid opponent life');
 say(p.mana&&colors.every(c=>Number.isInteger(p.mana[c]??0)&&(p.mana[c]??0)>=0),'invalid mana');
 say(Array.isArray(p.lands),'missing real land cards');
 say(['player','opponent'].includes(p.activeActor),'invalid active actor');
 say(p.opponentPolicy==='alwaysPass','unsupported opponent policy');
 say(Array.isArray(p.units)&&Array.isArray(p.stack)&&p.stack.length>0&&Array.isArray(p.hand),'missing zones');
 const units=Array.isArray(p.units)?p.units:[],stack=Array.isArray(p.stack)?p.stack:[],hand=Array.isArray(p.hand)?p.hand:[];
 const lands=Array.isArray(p.lands)?p.lands:[];
 const ids=[...units,...stack,...hand,...lands].map(x=>x.id);
 for(const l of lands){say(!!LANDS[l.card],`unknown land ${l.card}`);say(l.controller==='player',`only player lands are supported`);say(l.tapped===undefined||typeof l.tapped==='boolean',`invalid tapped flag`);}say(ids.every(validId)&&unique(ids),'duplicate or bad object ids');
 for(const u of units){say(!!CARDS[u.card]&&isCreature(u.card),`unknown creature ${u.card}`);say(['player','opponent'].includes(u.controller),'bad unit controller');say(!u.zone||u.zone==='battlefield','bad starting zone');}
 for(const x of stack){say(!!CARDS[x.card],`unknown stack card ${x.card}`);say(['player','opponent'].includes(x.controller),'bad stack controller');say(!isCreature(x.card)||x.spell===true,'creature abilities need explicit support');}
 for(const a of hand){say(!!CARDS[a.card],`unknown hand card ${a.card}`);say(!isCreature(a.card)||!!a.sourceId,'only activated creature abilities in hand');if(a.sourceId)say(units.some(u=>u.id===a.sourceId&&u.card===a.card&&u.controller==='player'),'bad ability source');}
 const allTargets=[...units.map(u=>u.id),...stack.map(x=>x.id),'player','opponent'];
 for(const x of stack)say(!CARDS[x.card]?.targetRule||allTargets.includes(x.targetId),`bad stack target ${x.id}`);
 say(['survive','keepN','keepUnit','win','winKeepUnit','saveFromGraveyard'].includes(p.objective?.type),'bad objective');
 if(['keepUnit','winKeepUnit','saveFromGraveyard'].includes(p.objective?.type))say(units.some(u=>u.id===p.objective.unitId),'objective unit missing');
 if(p.objective?.type==='keepN')say(Number.isInteger(p.objective.count)&&p.objective.count>0,'bad objective count');
 return{valid:problems.length===0,errors:problems};
}
export function createGame(p){let v=validateScenario(p);if(!v.valid)fail(`Invalid ${p?.id}: ${v.errors.join('; ')}`);
 const s=clone(p);s.lands=s.lands.map(l=>({tapped:false,...l}));s.units=s.units.map(u=>({zone:'battlefield',damage:0,powerBoost:0,toughnessBoost:0,hexproof:false,indestructible:false,...u}));
 s.stack=s.stack.map(x=>({...x,spell:x.spell!==false}));s.used=[];s.passCount=1;s.currentActor='player';s.log=['Opponent passes priority to you.'];s.status='playing';s.step=0;return s;
}
export const creaturePower=u=>CARDS[u.card].power+(u.powerBoost||0);
export const creatureToughness=u=>CARDS[u.card].toughness+(u.toughnessBoost||0);
export function objectiveMet(s){const o=s.objective; if(s.life.player<=0)return false;
 if(o.type==='survive')return s.life.player>0;
 if(o.type==='win')return s.life.opponent<=0&&s.life.player>0;
 if(o.type==='winKeepUnit')return s.life.opponent<=0&&s.life.player>0&&s.units.some(u=>u.id===o.unitId&&u.zone==='battlefield'&&u.controller==='player');
 if(o.type==='keepN')return s.units.filter(u=>u.controller==='player'&&u.zone==='battlefield').length>=o.count;
 const unit=s.units.find(u=>u.id===o.unitId);if(!unit)return false;
 return o.type==='keepUnit'?unit.zone==='battlefield':unit.zone!=='graveyard';
}
function finish(s){s.status=objectiveMet(s)?'won':'lost';s.log.push(s.status==='won'?'Objective met.':'Objective not met.');}
function sbas(s){for(const u of s.units){if(u.zone!=='battlefield')continue;
 if(creatureToughness(u)<=0 || (u.damage>=creatureToughness(u)&&!u.indestructible)){
 u.zone='graveyard';s.log.push(`${u.card} is put into the graveyard by state-based actions (rule 704).`);
 }}
 if(s.life.player<=0||s.life.opponent<=0)finish(s);
}
// Colored and true colorless pips are mandatory; generic may use any unspent mana.
export function remainingMana(s,cost,spendGeneric=null){
 const pool=Object.fromEntries(colors.map(c=>[c,s.mana[c]||0]));
 for(const c of colors){const needed=cost[c]||0;if(pool[c]<needed)return null;pool[c]-=needed;}
 let generic=cost.generic||0;
 if(spendGeneric!==null){
  if(!spendGeneric||colors.some(c=>!Number.isInteger(spendGeneric[c]||0)||(spendGeneric[c]||0)<0))return null;
  if(colors.reduce((sum,c)=>sum+(spendGeneric[c]||0),0)!==generic)return null;
  for(const c of colors){const qty=spendGeneric[c]||0;if(qty>pool[c])return null;pool[c]-=qty;}
  return pool;
 }
 for(const c of ['C','W','U','B','R','G']){const spent=Math.min(pool[c],generic);pool[c]-=spent;generic-=spent;}
 return generic===0?pool:null;
}
export function paymentOptions(s,cost){
 const left=Object.fromEntries(colors.map(c=>[c,(s.mana[c]||0)-(cost[c]||0)]));
 if(colors.some(c=>left[c]<0))return [];
 const options=[];const assign={};const order=['C','W','U','B','R','G'];
 function choose(i,remaining){if(options.length>64)return;
  if(i===order.length){if(remaining===0){const spend={...assign};const pool=remainingMana(s,cost,spend);if(pool)options.push({spend,pool,label:order.filter(c=>spend[c]).map(c=>`${spend[c]}${c}`).join(' + ')||'No generic'});}return;}
  const color=order[i];for(let n=0;n<=Math.min(left[color],remaining);n++){assign[color]=n;choose(i+1,remaining-n);}
 }
 choose(0,cost.generic||0);
 return options;
}
export function tapLand(s0,landId){
 if(s0.status!=='playing'||s0.currentActor!=='player')fail('You do not have priority');
 const s=clone(s0),land=s.lands.find(l=>l.id===landId);
 if(!land||land.controller!=='player'||land.tapped)fail('Land cannot be tapped for mana');
 const color=LANDS[land.card]?.mana;if(!color)fail('Unsupported mana ability');
 land.tapped=true;s.mana[color]=(s.mana[color]||0)+1;
 s.log.push(`Tapped ${land.card} for {${color}}. Mana abilities do not use the stack (rule 605).`);
 return s;
}

function legalTarget(s,item,targetId){const rule=CARDS[item.card].targetRule;
 if(!rule)return targetId==null;
 if(!targetId)return false;
 if(rule==='player')return targetId==='player'||targetId==='opponent';
 if(rule.startsWith('stack:')){const ref=s.stack.find(x=>x.id===targetId);if(!ref||!ref.spell)return false;
 const typ=CARDS[ref.card].type;const what=rule.split(':')[1];return what==='spell'||(what==='instant'&&typ==='Instant')||(what==='creature'&&typ.startsWith('Creature'))||(what==='noncreature'&&!typ.startsWith('Creature'));
 }
 if(rule.startsWith('creature')){const u=s.units.find(x=>x.id===targetId&&x.zone==='battlefield');if(!u)return false;
 if(u.hexproof&&u.controller!==item.controller)return false;
 if(rule==='creature:nonblack'&&CARDS[u.card].colors.includes('B'))return false;
 if(rule==='creature:own'&&u.controller!==item.controller)return false;
 return true;
 }
 if(rule==='any'){if(targetId==='player'||targetId==='opponent')return true;return legalCreatureTarget(s,item,targetId);}
 return false;
}
function legalCreatureTarget(s,item,id){const u=s.units.find(x=>x.id===id&&x.zone==='battlefield');return !!u && !(u.hexproof&&u.controller!==item.controller);}
export function legalTargets(s,action){const card=CARDS[action.card];if(!card)return[];
 const rule=card.targetRule||((card.effect==='damage')?'any':null);
 const candidates=rule?.startsWith('stack:')?s.stack.map(x=>x.id):rule==='player'?['player','opponent']:rule?.startsWith('creature')?s.units.map(x=>x.id):rule==='any'?['player','opponent',...s.units.map(x=>x.id)]:[null];
 return candidates.filter(targetId=>rule==='any'?targetId==='player'||targetId==='opponent'||legalCreatureTarget(s,{controller:'player'},targetId):legalTarget(s,{...action,controller:'player'},targetId));
}
export function legalActions(s){if(s.status!=='playing'||s.currentActor!=='player')return[];
 return s.hand.filter(a=>!s.used.includes(a.id)&&
  (a.sourceId?s.units.some(u=>u.id===a.sourceId&&u.zone==='battlefield'&&u.controller==='player'):
   paymentOptions(s,CARDS[a.card].cost).length>0 &&
   (!(isCreature(a.card)||CARDS[a.card].type==='Sorcery')||(s.activeActor==='player'&&s.stack.length===0)))&&
  legalTargets(s,a).length>0).map(a=>a.id);
}
export function activate(s0,actionId,targetId=null,genericSpend=null){if(!legalActions(s0).includes(actionId))fail('Illegal or unaffordable action');
 const s=clone(s0),a=s.hand.find(x=>x.id===actionId),c=CARDS[a.card],allowed=legalTargets(s,a);if(!allowed.some(x=>x===targetId))fail('Illegal target');
 if(a.sourceId){const source=s.units.find(u=>u.id===a.sourceId);source.zone='graveyard';s.log.push(`${source.card} sacrificed as activation cost. (Rule 602)`);}else{s.mana=remainingMana(s,c.cost,genericSpend);if(!s.mana)fail('Cannot pay mana');}
 s.stack.push({id:a.id,card:a.card,controller:'player',spell:!a.sourceId,sourceId:a.sourceId||null,targetId});s.used.push(a.id);s.passCount=0;s.step++;
 s.log.push(`${a.sourceId?'Activated':'Cast'} ${a.card}${targetId?' targeting '+labelTarget(s,targetId):''}. You retain priority.`);
 return s;
}
export function labelTarget(s,id){if(id==='player')return'you';if(id==='opponent')return'opponent';return s.units.find(u=>u.id===id)?.card || s.stack.find(x=>x.id===id)?.card ||id;}
function resolve(s,item){const c=CARDS[item.card],target=item.targetId;
 if(item.spell&&isCreature(item.card)){s.units.push({id:'permanent-'+item.id,card:item.card,controller:item.controller,zone:'battlefield',damage:0,powerBoost:0,toughnessBoost:0,indestructible:false,hexproof:false});s.log.push(`${item.card} resolves and enters the battlefield.`);return;}
 if((c.targetRule||c.effect==='damage')&&!((c.effect==='damage')?(target==='player'||target==='opponent'||legalCreatureTarget(s,item,target)):legalTarget(s,item,target))){s.log.push(`${item.card}: all targets illegal on resolution; spell/ability does not resolve (608.2b).`);return;}
 switch(c.effect){
 case 'destroyAll':{let count=0,warded=0;for(const u of s.units)if(u.zone==='battlefield'){if(u.indestructible)warded++;else{u.zone='graveyard';count++}}s.log.push(`Wrath of God: ${count} creature(s) destroyed, ${warded} indestructible.`);break;}
 case 'ward':{let count=0;for(const u of s.units)if(u.zone==='battlefield'&&u.controller===item.controller){u.indestructible=true;count++}s.log.push(`Selfless Spirit's ability resolved after its source left: ${count} creature(s) gain indestructible.`);break;}
 case 'intervention':{let count=0;for(const u of s.units)if(u.zone==='battlefield'&&u.controller===item.controller){u.indestructible=true;u.hexproof=true;count++}s.log.push(`Heroic Intervention: ${count} permanent(s) gain hexproof and indestructible.`);break;}
 case 'damage':{const amount=c.amount;if(target==='player'||target==='opponent'){s.life[target]-=amount;s.log.push(`${item.card} deals ${amount} damage to ${labelTarget(s,target)}.`);}else{const u=s.units.find(x=>x.id===target);u.damage+=amount;s.log.push(`${item.card} marks ${amount} damage on ${u.card} (${u.damage}/${creatureToughness(u)} damage/toughness).`);}break;}
 case 'heal':s.life[target]+=c.amount;s.log.push(`Healing Salve: ${labelTarget(s,target)} gains ${c.amount} life.`);break;
 case 'counter':{let idx=s.stack.findIndex(x=>x.id===target);if(idx>=0){const x=s.stack.splice(idx,1)[0];s.log.push(`${item.card} counters ${x.card}.`);}break;}
 case 'blossom':{const u=s.units.find(x=>x.id===target);u.powerBoost+=2;u.toughnessBoost+=2;u.hexproof=true;s.log.push(`${u.card} gets +2/+2 and gains hexproof until end of turn.`);break;}
 case 'dive':{const u=s.units.find(x=>x.id===target);u.toughnessBoost+=3;u.hexproof=true;s.log.push(`${u.card} gets +0/+3 and gains hexproof until end of turn.`);break;}
 case 'pump':{const u=s.units.find(x=>x.id===target);u.powerBoost+=c.amount;u.toughnessBoost+=c.amount;s.log.push(`${u.card} gets +${c.amount}/+${c.amount} until end of turn.`);break;}
 case 'destroy':{const u=s.units.find(x=>x.id===target);if(u.indestructible)s.log.push(`${u.card} cannot be destroyed (indestructible).`);else{u.zone='graveyard';s.log.push(`${item.card} destroys ${u.card}.`);}break;}
 case 'exile':{const u=s.units.find(x=>x.id===target),p=creaturePower(u);u.zone='exile';s.life[u.controller]+=p;s.log.push(`Swords to Plowshares exiles ${u.card}; its controller gains ${p} life.`);break;}
 case 'bounce':{const u=s.units.find(x=>x.id===target);u.zone='hand';s.log.push(`Unsummon returns ${u.card} to its owner's hand.`);break;}
 default:fail(`Unsupported card effect ${c.effect}`);
 }
}
export function pass(s0){if(s0.status!=='playing'||s0.currentActor!=='player')fail('No player priority');const s=clone(s0);s.step++;if(s.step>maxSteps)fail('Step cap reached');
 s.log.push('You pass priority.');s.passCount++;
 if(s.passCount===2){if(!s.stack.length){finish(s);return s;}const item=s.stack.pop();s.log.push(`TOP RESOLVES: ${item.card}.`);resolve(s,item);sbas(s);if(s.status!=='playing')return s;
 s.passCount=0;s.currentActor=s.activeActor;
 if(s.currentActor==='opponent'){s.log.push('Opponent passes after resolution.');s.currentActor='player';s.passCount=1;}
 }else{ // scripted opponent passes
  s.log.push('Opponent passes priority.');s.passCount=2;
  if(!s.stack.length){finish(s);return s;}const item=s.stack.pop();s.log.push(`TOP RESOLVES: ${item.card}.`);resolve(s,item);sbas(s);if(s.status!=='playing')return s;
  s.passCount=0;s.currentActor=s.activeActor;
  if(s.currentActor==='opponent'){s.log.push('Opponent passes after resolution.');s.currentActor='player';s.passCount=1;}
 }
 return s;
}
export function autoplay(s0,max=120){let s=clone(s0);for(let i=0;i<max&&s.status==='playing';i++)s=pass(s);if(s.status==='playing')fail('Autoplay budget');return s;}