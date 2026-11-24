// Versioned unranked rules fork. Legacy engine.js is pinned for historical replay.
import {CARDS,LANDS,isCreature} from './cards.js';
export const RULES_VERSION='sb-mtg-training-0.3.1-rules-preview';
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
 say(Array.isArray(p.units)&&Array.isArray(p.stack)&&(p.stack.length>0||p.phase==='main'||p.combat)&&Array.isArray(p.hand),'missing zones');
 const units=Array.isArray(p.units)?p.units:[],stack=Array.isArray(p.stack)?p.stack:[],hand=Array.isArray(p.hand)?p.hand:[];
 const lands=Array.isArray(p.lands)?p.lands:[];
 const enchantments=Array.isArray(p.enchantments)?p.enchantments:[];
 const ids=[...units,...stack,...hand,...lands,...enchantments].map(x=>x.id);
 say(ids.length<=48,'preview object budget');say(colors.every(c=>(p.mana?.[c]??0)<=20),'preview mana budget');
 for(const x of enchantments)say(x.card==='Impact Tremors'&&['player','opponent'].includes(x.controller)&&x.zone==='battlefield','unsupported enchantment snapshot');
 if(p.combat){const a=units.find(u=>u.id===p.combat.attackerId),b=units.find(u=>u.id===p.combat.blockerId);say(!!a&&a.controller===p.activeActor&&(!p.combat.blockerId||!!b&&b.controller!==a.controller),'invalid declared combat');say(!p.combat.resolved,'combat must start unresolved');say([a,b].filter(Boolean).every(u=>['War Mammoth','Ambush Viper','Savannah Lions','Grizzly Bears','Hill Giant','Centaur Courser','Silvercoat Lion','Runeclaw Bear'].includes(u.card)),'unsupported combat characteristics');}
 for(const l of lands){say(!!LANDS[l.card],`unknown land ${l.card}`);say(l.controller==='player',`only player lands are supported`);say(l.tapped===undefined||typeof l.tapped==='boolean',`invalid tapped flag`);}say(ids.every(validId)&&unique(ids),'duplicate or bad object ids');
 for(const u of units){say(!!CARDS[u.card]&&isCreature(u.card),`unknown creature ${u.card}`);say(['player','opponent'].includes(u.controller),'bad unit controller');say(!u.zone||u.zone==='battlefield','bad starting zone');}
 for(const x of stack){say(!!CARDS[x.card],`unknown stack card ${x.card}`);say(['player','opponent'].includes(x.controller),'bad stack controller');say(!isCreature(x.card)||x.spell===true,'creature abilities need explicit support');}
 for(const a of hand){say(!!(CARDS[a.card]||LANDS[a.card]),`unknown hand card ${a.card}`);if(a.sourceId)say(['ward','sacGain'].includes(CARDS[a.card]?.effect)&&units.some(u=>u.id===a.sourceId&&u.card===a.card&&u.controller==='player'),'unsupported ability source');}
 const allTargets=[...units.map(u=>u.id),...stack.map(x=>x.id),'player','opponent'];
 for(const x of stack)say(!CARDS[x.card]?.targetRule||allTargets.includes(x.targetId),`bad stack target ${x.id}`);
 say(['survive','keepN','keepUnit','win','winKeepUnit','saveFromGraveyard'].includes(p.objective?.type),'bad objective');
 if(['keepUnit','winKeepUnit','saveFromGraveyard'].includes(p.objective?.type))say(units.some(u=>u.id===p.objective.unitId),'objective unit missing');
 if(p.objective?.type==='keepN')say(Number.isInteger(p.objective.count)&&p.objective.count>0,'bad objective count');
 return{valid:problems.length===0,errors:problems};
}
export function createGame(p){let v=validateScenario(p);if(!v.valid)fail(`Invalid ${p?.id}: ${v.errors.join('; ')}`);
 const s=clone(p);s.enchantments=s.enchantments||[];s.landPlayed=false;s.lands=s.lands.map(l=>({tapped:false,...l}));s.units=s.units.map(u=>({zone:'battlefield',damage:0,powerBoost:0,toughnessBoost:0,hexproof:false,indestructible:false,...u}));
 s.stack=s.stack.map(x=>({...x,spell:x.spell!==false}));s.used=[];s.passCount=s.activeActor==='opponent'?1:0;s.currentActor='player';s.log=[s.activeActor==='opponent'?'Opponent passes priority to you.':'You have priority.'];s.status='playing';s.step=0;return s;
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
 if(creatureToughness(u)<=0 || ((u.damage>=creatureToughness(u)||u.deathtouchDamage)&&!u.indestructible)){
 u.zone='graveyard';s.log.push(`${u.card} is put into the graveyard by state-based actions (rule 704).`);
 }u.deathtouchDamage=false;}
 if(s.life.player<=0||s.life.opponent<=0)finish(s);
}
// Colored and true colorless pips are mandatory; generic may use any unspent mana.
export function remainingMana(s,cost,spendGeneric=null){
 const pool=Object.fromEntries(colors.map(c=>[c,s.mana[c]||0]));
 for(const c of colors){const needed=cost[c]||0;if(pool[c]<needed)return null;pool[c]-=needed;}
 let generic=cost.generic||0;
 if(spendGeneric!==null){
  if(!spendGeneric||typeof spendGeneric!=='object'||Array.isArray(spendGeneric)||Object.keys(spendGeneric).some(c=>!colors.includes(c))||colors.some(c=>!Number.isInteger(spendGeneric[c]??0)||(spendGeneric[c]??0)<0))return null;
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
 function choose(i,remaining){
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

// Land plays are special actions, never spells or stack objects (rule 305).
// Response snapshots have no main phase, so a land in hand is not a free mana source.
export function playLand(s0,handId){
 if(s0.status!=='playing'||s0.currentActor!=='player'||s0.activeActor!=='player'||
    s0.phase!=='main'||s0.stack.length!==0||s0.landPlayed)fail('You can only play one land during your own main phase with an empty stack.');
 const a=s0.hand.find(x=>x.id===handId&&!s0.used.includes(x.id));
 if(!a||!LANDS[a.card]||a.sourceId)fail('This is not an available land card.');
 const s=clone(s0);s.landPlayed=true;s.lands.push({id:'played-'+a.id,card:a.card,controller:'player',tapped:false});
 s.used.push(a.id);s.log.push(`Played ${a.card} as a land for the turn. This does not use the stack.`);
 return s;
}
function legalTarget(s,item,targetId){const c=CARDS[item.card],rule=c.targetRule||(c.effect==='damage'||c.effect==='helix'?'any':null);
 if(!rule)return targetId==null;
 if(!targetId)return false;
 if(rule==='player')return targetId==='player'||targetId==='opponent';
 if(rule.startsWith('stack:')){const ref=s.stack.find(x=>x.id===targetId);if(!ref||!ref.spell)return false;
 const typ=CARDS[ref.card].type;const what=rule.split(':')[1];return what==='spell'||(what==='instant'&&typ==='Instant')||(what==='creature'&&isCreature(ref.card))||(what==='noncreature'&&!isCreature(ref.card));
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
 const rule=card.targetRule||((card.effect==='damage'||card.effect==='helix')?'any':null);
 const candidates=rule?.startsWith('stack:')?s.stack.map(x=>x.id):rule==='player'?['player','opponent']:rule?.startsWith('creature')?s.units.map(x=>x.id):rule==='any'?['player','opponent',...s.units.map(x=>x.id)]:[null];
 return candidates.filter(targetId=>rule==='any'?targetId==='player'||targetId==='opponent'||legalCreatureTarget(s,{controller:'player'},targetId):legalTarget(s,{...action,controller:'player'},targetId));
}
export function legalActions(s){if(s.status!=='playing'||s.currentActor!=='player')return[];
 return s.hand.filter(a=>!s.used.includes(a.id)&&!!CARDS[a.card]&&
  (a.sourceId?['ward','sacGain'].includes(CARDS[a.card].effect)&&s.units.some(u=>u.id===a.sourceId&&u.zone==='battlefield'&&u.controller==='player'):
   paymentOptions(s,CARDS[a.card].cost).length>0 &&
   (CARDS[a.card].type==='Instant'||CARDS[a.card].flash===true||
    (!(isCreature(a.card)||CARDS[a.card].type.startsWith('Sorcery')||CARDS[a.card].type.startsWith('Enchantment')||CARDS[a.card].type.startsWith('Artifact'))||
    (s.activeActor==='player'&&s.stack.length===0&&s.phase==='main'))))&&
  legalTargets(s,a).length>0).map(a=>a.id);
}
export function activate(s0,actionId,targetId=null,genericSpend=null){if(!legalActions(s0).includes(actionId))fail('Illegal or unaffordable action');
 const s=clone(s0),a=s.hand.find(x=>x.id===actionId),c=CARDS[a.card],allowed=legalTargets(s,a);if(!allowed.some(x=>x===targetId))fail('Illegal target');
 if(a.sourceId){const source=s.units.find(u=>u.id===a.sourceId);source.zone='graveyard';s.log.push(`${source.card} sacrificed as activation cost. (Rule 602)`);}else{s.mana=remainingMana(s,c.cost,genericSpend);if(!s.mana)fail('Cannot pay mana');}
 if(!a.sourceId&&paymentOptions(s0,c.cost).length>1&&genericSpend===null)fail('Choose the generic mana allocation explicitly');
 s.stack.push({id:a.id,card:a.card,controller:'player',spell:!a.sourceId,sourceId:a.sourceId||null,targetId});s.used.push(a.id);s.passCount=0;s.step++;
 s.log.push(`${a.sourceId?'Activated':'Cast'} ${a.card}${targetId?' targeting '+labelTarget(s,targetId):''}. You retain priority.`);
 return s;
}
export function labelTarget(s,id){if(id==='player')return'you';if(id==='opponent')return'opponent';return s.units.find(u=>u.id===id)?.card || s.stack.find(x=>x.id===id)?.card ||id;}
function deal(s,item,target,amount){
 if(amount<=0)return;
 const prevented=Object.hasOwn(s.preventedSpellDamage||{},item.id)?s.preventedSpellDamage[item.id]:null;
 if(prevented){s.life[prevented]+=amount;s.log.push(`Hallow prevents ${amount} damage from ${item.card}.`);return;}
 if(target==='player'||target==='opponent')s.life[target]-=amount;else s.units.find(u=>u.id===target).damage+=amount;
 s.log.push(`${item.card} deals ${amount} damage to ${labelTarget(s,target)}.`);
}
function resolve(s,item){const c=CARDS[item.card],target=item.targetId;
 if(item.trigger==='impact'){deal(s,item,item.controller==='player'?'opponent':'player',1);return;}
 if(item.spell&&c.type==='Enchantment'){s.enchantments.push({id:'permanent-'+item.id,card:item.card,controller:item.controller,zone:'battlefield'});s.log.push(`${item.card} resolves and enters the battlefield as an enchantment.`);return;}
 if(item.spell&&isCreature(item.card)){s.units.push({id:'permanent-'+item.id,card:item.card,controller:item.controller,zone:'battlefield',damage:0,powerBoost:0,toughnessBoost:0,indestructible:false,hexproof:false});s.log.push(`${item.card} resolves and enters the battlefield.`);
 // All supported simultaneous triggers are identical untargeted Impact Tremors effects.
 for(const source of s.enchantments.filter(x=>x.card==='Impact Tremors'&&x.zone==='battlefield'&&x.controller===item.controller)){
  s.stack.push({id:'trigger-'+item.id+'-'+source.id,card:'Impact Tremors',controller:source.controller,sourceId:source.id,spell:false,trigger:'impact',targetId:null});s.log.push('Impact Tremors triggers and is put on the stack.');
 }return;}
 if((c.targetRule||c.effect==='damage'||c.effect==='helix')&&!legalTarget(s,item,target)){s.log.push(`${item.card}: all targets illegal on resolution; spell/ability does not resolve (608.2b).`);return;}
 switch(c.effect){
 case 'destroyAll':{let count=0,warded=0;for(const u of s.units)if(u.zone==='battlefield'){if(u.indestructible)warded++;else{u.zone='graveyard';count++}}s.log.push(`Wrath of God: ${count} creature(s) destroyed, ${warded} indestructible.`);break;}
 case 'ward':{let count=0;for(const u of s.units)if(u.zone==='battlefield'&&u.controller===item.controller){u.indestructible=true;count++}s.log.push(`Selfless Spirit's ability resolved after its source left: ${count} creature(s) gain indestructible.`);break;}
 case 'intervention':{let count=0;for(const u of s.units)if(u.zone==='battlefield'&&u.controller===item.controller){u.indestructible=true;u.hexproof=true;count++}s.log.push(`Heroic Intervention: ${count} permanent(s) gain hexproof and indestructible.`);break;}
 case 'damage':deal(s,item,target,c.amount);break;
 case 'preventSpellDamage':{s.preventedSpellDamage={...s.preventedSpellDamage,[target]:item.controller};s.log.push(`Hallow shields against all damage from ${labelTarget(s,target)} this turn.`);break;}
 case 'sacGain':{s.life[item.controller]+=c.amount;s.log.push(`${item.card}'s sacrificed ability resolves: ${item.controller} gains ${c.amount} life.`);break;}
 case 'heal':s.life[target]+=c.amount;s.log.push(`Healing Salve: ${labelTarget(s,target)} gains ${c.amount} life.`);break;
 case 'counter':{let idx=s.stack.findIndex(x=>x.id===target);if(idx>=0){const x=s.stack[idx];if(CARDS[x.card]?.uncounterable){s.log.push(`${x.card} cannot be countered by ${item.card}.`);}else{s.stack.splice(idx,1);s.log.push(`${item.card} counters ${x.card}.`);}}break;}
 case 'boostHexproof':{const u=s.units.find(x=>x.id===target);u.powerBoost+=c.amount;u.toughnessBoost+=c.amount;u.hexproof=true;s.log.push(`${u.card} gets +${c.amount}/+${c.amount} and gains hexproof.`);break;}
 case 'blossom':{const u=s.units.find(x=>x.id===target);u.powerBoost+=2;u.toughnessBoost+=2;u.hexproof=true;s.log.push(`${u.card} gets +2/+2 and gains hexproof until end of turn.`);break;}
 case 'dive':{const u=s.units.find(x=>x.id===target);u.toughnessBoost+=3;u.hexproof=true;s.log.push(`${u.card} gets +0/+3 and gains hexproof until end of turn.`);break;}
 case 'sweepDamage':{for(const u of s.units)if(u.zone==='battlefield')deal(s,item,u.id,c.amount);break;}
 case 'weakenAll':{for(const u of s.units)if(u.zone==='battlefield'){u.powerBoost-=c.amount;u.toughnessBoost-=c.amount;}s.log.push(`${item.card}: all creatures get -${c.amount}/-${c.amount}. Indestructible does not prevent zero toughness.`);break;}
 case 'shrink':{const u=s.units.find(x=>x.id===target);u.powerBoost-=c.amount;u.toughnessBoost-=c.amount;s.log.push(`${u.card} gets -${c.amount}/-${c.amount}.`);break;}
 case 'safekeeping':{const u=s.units.find(x=>x.id===target);u.hexproof=true;u.indestructible=true;s.life[item.controller]+=2;s.log.push(`${u.card} gains hexproof/indestructible; ${item.controller} gains 2 life.`);break;}
 case 'helix':{deal(s,item,target,3);s.life[item.controller]+=3;s.log.push(`${item.controller} gains 3 life from Lightning Helix.`);break;}
 case 'vapor':{const u=s.units.find(x=>x.id===target);u.zone='hand';s.life[u.controller]-=1;s.log.push(`Vapor Snag returns ${u.card}; its controller loses 1 life.`);break;}
 case 'pump':{const u=s.units.find(x=>x.id===target);u.powerBoost+=c.amount;u.toughnessBoost+=c.amount;s.log.push(`${u.card} gets +${c.amount}/+${c.amount} until end of turn.`);break;}
 case 'destroy':{const u=s.units.find(x=>x.id===target);if(u.indestructible)s.log.push(`${u.card} cannot be destroyed (indestructible).`);else{u.zone='graveyard';s.log.push(`${item.card} destroys ${u.card}.`);}break;}
 case 'exile':{const u=s.units.find(x=>x.id===target),p=Math.max(0,creaturePower(u));u.zone='exile';s.life[u.controller]+=p;s.log.push(`Swords to Plowshares exiles ${u.card}; its controller gains ${p} life.`);break;}
 case 'bounce':{const u=s.units.find(x=>x.id===target);u.zone='hand';s.log.push(`Unsummon returns ${u.card} to its owner's hand.`);break;}
 default:fail(`Unsupported card effect ${c.effect}`);
 }
}
// Declared single-attacker / at-most-one-blocker snapshot. No declaration UI,
// first/double strike, protection, or multi-blocker assignment. Trample uses the
// explicit preview convention of maximizing damage to the defending player.
function resolveCombat(s){
 const c=s.combat;if(!c||c.resolved)return false;c.resolved=true;
 const a=s.units.find(u=>u.id===c.attackerId&&u.zone==='battlefield'),b=s.units.find(u=>u.id===c.blockerId&&u.zone==='battlefield');
 if(!a){s.log.push('Attacker removed from combat.');return true;}
 const power=Math.max(0,creaturePower(a)),trample=CARDS[a.card].tags?.includes('Trample'),death=CARDS[a.card].tags?.includes('Deathtouch'),defender=a.controller==='player'?'opponent':'player';
 if(b){
  const lethal=Math.max(0,creatureToughness(b)-b.damage);
  const assigned=trample?Math.min(power,death?Math.min(lethal,1):lethal):power;
  b.damage+=assigned;if(death&&assigned>0)b.deathtouchDamage=true;
  const returnDamage=Math.max(0,creaturePower(b));a.damage+=returnDamage;
  if(CARDS[b.card].tags?.includes('Deathtouch')&&returnDamage>0)a.deathtouchDamage=true;
  s.life[defender]-=power-assigned;s.log.push('Combat damage is simultaneous. '+assigned+' to blocker, '+returnDamage+' to attacker, '+(power-assigned)+' to defending player.');
 }else if(!c.blockerId||trample){s.life[defender]-=power;s.log.push('Attacker deals '+power+' to defending player.');}
 else s.log.push('Attacker remains blocked; without trample it deals no damage to the defending player.');
 sbas(s);return true;
}
export function pass(s0){
 if(s0.status!=='playing'||s0.currentActor!=='player')fail('No player priority');
 const s=clone(s0);s.step++;if(s.step>maxSteps)fail('Step cap reached');
 s.log.push('You pass priority.');if(s.passCount===0)s.log.push('Opponent passes priority.');
 if(!s.stack.length){if(resolveCombat(s)&&s.status==='playing'){s.passCount=s.activeActor==='opponent'?1:0;return s;}if(s.status==='playing')finish(s);return s;}
 const item=s.stack.pop();s.log.push('TOP RESOLVES: '+item.card+'.');resolve(s,item);sbas(s);if(s.status!=='playing')return s;
 s.currentActor='player';s.passCount=s.activeActor==='opponent'?1:0;
 if(s.activeActor==='opponent')s.log.push('Opponent passes after resolution.');
 return s;
}
export function autoplay(s0,max=120){let s=clone(s0);for(let i=0;i<max&&s.status==='playing';i++)s=pass(s);if(s.status==='playing')fail('Autoplay budget');return s;}