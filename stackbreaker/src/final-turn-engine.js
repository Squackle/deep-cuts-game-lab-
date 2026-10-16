// Final Turn Phase 1: isolated, deterministic, scenario-scoped MTG state machine.
// Explicitly NOT a complete MTG engine. No interaction with Classic's save key.
export const DRILL_RULES_VERSION='final-turn-lifecycle-0.1';
export const SUPPORTED_CARDS=Object.freeze({
 'Lightning Bolt':{type:'instant',cost:{R:1},effect:'damage',amount:3,targets:['player','opponent'],text:'Lightning Bolt deals 3 damage to any target.'},
 'Counterspell':{type:'instant',cost:{U:2},effect:'counter',targets:['stack'],text:'Counter target spell.'},
 'Lava Spike':{type:'sorcery',cost:{R:1},effect:'damage',amount:3,targets:['opponent','player'],text:'Lava Spike deals 3 damage to target player or planeswalker.'}
});
const copy=value=>structuredClone(value);
const allowedColors=['W','U','B','R','G','C'];
const manaZero=()=>Object.fromEntries(allowedColors.map(c=>[c,0]));
const sequence=['upkeep','draw','precombatMain','beginningOfCombat','endOfCombat','postcombatMain','endStep'];
const prettyStep={upkeep:'Upkeep',draw:'Draw',precombatMain:'Precombat main',beginningOfCombat:'Beginning of combat',endOfCombat:'End of combat',postcombatMain:'Postcombat main',endStep:'End step'};
const err=message=>{throw new Error(message)};
export const formatStep=step=>prettyStep[step]||step;
export function validateDrill(d){
 const issues=[];
 if(!d||typeof d!=='object')return ['Scenario must be an object'];
 if(d.version!==DRILL_RULES_VERSION)issues.push('Rules version mismatch');
 if(!/^[a-z0-9-]{3,60}$/.test(d.id||''))issues.push('Invalid scenario ID');
 if(d.opponentPolicy!=='alwaysPass')issues.push('Opponent policy not supported yet');
 if(d.activePlayer!=='opponent'||d.step!=='endStep')issues.push('Phase 1 opening must be opponent end step');
 if(!d.life||!Number.isInteger(d.life.player)||!Number.isInteger(d.life.opponent)||d.life.player<=0||d.life.opponent<=0)issues.push('Invalid starting life');
 if(!Array.isArray(d.lands)||!Array.isArray(d.hand)||!Array.isArray(d.stack)||!Array.isArray(d.library))issues.push('Missing required zones');
 const cards=[...(d.hand||[]),...(d.stack||[]).map(x=>x.card)];
 for(const n of cards)if(!SUPPORTED_CARDS[n])issues.push('Unsupported card '+n);
 for(const l of d.lands||[])if(!['Island','Mountain'].includes(l.card)||!['U','R'].includes(l.mana))issues.push('Unsupported land '+l.card);
 if((d.stack||[]).length!==1||d.stack?.[0]?.card!=='Lightning Bolt'||d.stack[0]?.target!=='player')issues.push('Opening stack must be a Lightning Bolt targeting player');
 if(new Set((d.lands||[]).map(l=>l.id)).size!==(d.lands||[]).length)issues.push('Duplicate land IDs');
 if(d.objective!=='defeatOpponent')issues.push('Unsupported objective');
 return issues;
}
export function createDrill(spec){
 const errors=validateDrill(spec);
 if(errors.length)err(errors.join('; '));
 return {...copy(spec),mana:manaZero(),turn:1,priority:'player',passes:1,
  lands:spec.lands.map(l=>({...copy(l),tapped:!!l.tapped})),
  stack:copy(spec.stack),hand:copy(spec.hand),library:copy(spec.library),
  graveyards:{player:[],opponent:[]},status:'playing',log:['Opponent casts Lightning Bolt targeting you.','Opponent passes priority. You may respond.'],actions:0};
}
function requirePriority(s){if(s.status!=='playing'||s.priority!=='player')err('No player priority');}
export function tapMana(s0,id){
 requirePriority(s0);const s=copy(s0),land=s.lands.find(l=>l.id===id);
 if(!land||land.tapped)err('That land cannot produce mana right now');
 if(!allowedColors.includes(land.mana))err('Unsupported mana source');
 land.tapped=true;s.mana[land.mana]++;s.actions++;s.log.push('You tap '+land.card+' for '+land.mana+'.');return s;
}
function payMana(s,cost){
 for(const [color,n] of Object.entries(cost))if((s.mana[color]||0)<n)err('Not enough '+color+' mana. Tap lands first.');
 for(const [color,n] of Object.entries(cost))s.mana[color]-=n;
}
function checkTarget(s,card,target){
 if(card.effect==='counter'){
  if(!s.stack.some(x=>x.id===target))err('Counterspell must target a spell on the stack');
 }else if(!['player','opponent'].includes(target))err('Choose a player target');
}
export function castSpell(s0,name,target){
 requirePriority(s0);
 const s=copy(s0),card=SUPPORTED_CARDS[name];
 if(!card||!s.hand.includes(name))err('Card is not in your hand');
 if(card.type==='sorcery'&&(s.activePlayer!=='player'||!['precombatMain','postcombatMain'].includes(s.step)||s.stack.length))err('Sorcery timing: your main phase, empty stack, and priority required');
 checkTarget(s,card,target);
 payMana(s,card.cost);
 s.hand.splice(s.hand.indexOf(name),1);
 s.stack.push({id:'player-spell-'+(++s.actions),card:name,controller:'player',target});
 s.passes=0;
 s.log.push('You cast '+name+' targeting '+(target==='opponent'?'the opponent':target==='player'?'you':s.stack.find(x=>x.id===target)?.card||'a spell')+'.');
 return s;
}
function moveToGraveyard(s,item){
 s.graveyards[item.controller].push(item.card);
}
function checkWin(s){
 if(s.life.player<=0&&s.life.opponent<=0){s.status='draw';s.log.push('Both players lost.');}
 else if(s.life.player<=0){s.status='lost';s.log.push('You lost the game.');}
 else if(s.life.opponent<=0){s.status='won';s.log.push('You won the game!');}
}
function resolveTop(s){
 const item=s.stack.pop(),card=SUPPORTED_CARDS[item.card];
 if(!card)err('Cannot resolve unsupported card');
 s.log.push('Resolving '+item.card+'.');
 if(card.effect==='counter'){
  const at=s.stack.findIndex(x=>x.id===item.target);
  if(at>=0){const [countered]=s.stack.splice(at,1);moveToGraveyard(s,countered);s.log.push(countered.card+' was countered.');}
  else s.log.push('Counterspell has no legal target and does not resolve.');
 }else if(card.effect==='damage'){
  if(['player','opponent'].includes(item.target)){s.life[item.target]-=card.amount;s.log.push(item.card+' deals '+card.amount+' damage to '+item.target+'.');}
  else s.log.push('The spell has no legal target and does not resolve.');
 }
 moveToGraveyard(s,item);checkWin(s);
}
function advance(s){
 // Phase 1 drill has no creatures. The beginning-of-combat and end-of-combat
 // steps are visited; attacker/blocker/damage steps await Phase 3's engine.
 // The end-step -> cleanup -> next untap transition has no player priority.
 s.mana=manaZero();
 let i=sequence.indexOf(s.step);
 if(i<0)err('Unknown turn step');
 if(i===sequence.length-1){
  if(s.activePlayer==='player'){
   s.status='failed';s.log.push('The practice window ended without a win. Reset to retry.');return;
  }
  s.log.push('Opponent cleanup: mana pools empty.');
  s.activePlayer='player';s.turn++;
  for(const l of s.lands)l.tapped=false;
  s.log.push('Your untap step: all your lands untap.');
  s.step='upkeep';
 }else{
  s.step=sequence[i+1];
  if(s.step==='draw'){
   if(s.library.length){const card=s.library.shift();s.hand.push(card);s.log.push('You draw '+card+'.');}
   else {s.status='lost';s.log.push('You tried to draw from an empty library and lost.');}
  }
  if(s.step==='beginningOfCombat')s.log.push('No creatures are present; combat has no attackers in this drill.');
 }
 if(s.status==='playing')s.log.push(formatStep(s.step)+' — '+s.activePlayer+"'s turn.");
}
export function passPriority(s0){
 requirePriority(s0);const s=copy(s0);
 s.actions++;s.log.push('You pass priority.');
 // Only the Phase 1 scripted opponent is supported. They pass, never cast.
 s.log.push('Opponent passes priority.');
 if(s.stack.length)resolveTop(s);
 else advance(s);
 if(s.status==='playing'){s.priority='player';s.passes=s.activePlayer==='opponent'?1:0;}
 return s;
}
export const isSorceryWindow=s=>s.status==='playing'&&s.activePlayer==='player'&&
 ['precombatMain','postcombatMain'].includes(s.step)&&s.stack.length===0;
export const legalCast=(s,name)=>{const c=SUPPORTED_CARDS[name];return !!c&&s.hand.includes(name)&&
 (c.type!=='sorcery'||isSorceryWindow(s))&&Object.entries(c.cost).every(([k,v])=>(s.mana[k]||0)>=v);
};
export const openingDrill=Object.freeze({
 id:'final-turn-001',version:DRILL_RULES_VERSION,title:'From the Brink',
 description:'The opponent has a lethal Bolt on the stack. Survive, then take your turn and find the win.',
 activePlayer:'opponent',step:'endStep',opponentPolicy:'alwaysPass',objective:'defeatOpponent',
 life:{player:2,opponent:3},
 lands:[{id:'island-a',card:'Island',mana:'U'},{id:'island-b',card:'Island',mana:'U'},{id:'mountain-a',card:'Mountain',mana:'R'}],
 hand:['Counterspell','Lava Spike'],library:['Mountain'],
 stack:[{id:'enemy-bolt',card:'Lightning Bolt',controller:'opponent',target:'player'}]
});
