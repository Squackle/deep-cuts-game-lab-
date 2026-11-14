// GRAFTBOUND v1.2.8 — deterministic, event-driven, composable permanent graft abilities.
// All choices, counters and tokens are part of the serialized battle state, never the UI.
// This layer deliberately shares triggers: one event can activate many grafts in printed order.
import { player, enemies, allies, alive, heal, dealDamage, effectivePower, checkStateBasedDeath, sacrificeAlly } from './abilities.js';
import { tileAt, unitAt, T, manhattan } from '../core/grid.js';
import { drawCards, refillFromGraveyard } from './deck.js';
import { availableMana, spendMana } from './mana.js';
import { onHeroDraw, onHeroHeal } from './trait-triggers.js';

const STAMP=Symbol('comboEventHandled');
const MAX_EVENTS=1600; // Safety against buggy recursion, not a token/power cap.
const owns=(s,id)=>s.traits?.includes(id);
const state=s=>(s.combo ||= {choices:[], counters:{}, actions:{}, treasure:0});
const nearest=s=>enemies(s).sort((a,b)=>manhattan(a,player(s))-manhattan(b,player(s))||a.uid-b.uid)[0];
const validCell=(s,x,y)=> x>=0&&y>=0&&x<s.w&&y<s.h&&![T.ROCK,T.LAVA].includes(tileAt(s,x,y))&&!unitAt(s,x,y);
// Paid graft powers should not offer actions that would have no effect.
const hasOpenTile=s=>{for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++)if(validCell(s,x,y))return true;return false;};
const canDraw=s=>!!((s.deck?.library?.length||0)+(s.deck?.graveyard?.length||0));
const TYPES={
  'Bird Illusion':{types:['Bird','Illusion'],colors:['U'],feature:'birdIllusion',move:3,keywords:{flying:1}},
  Tentacle:{types:['Tentacle'],colors:['U'],feature:'tentacle',move:2,keywords:{}},
  Skeleton:{types:['Skeleton','Warrior'],colors:['B'],feature:'skeleton',move:2,keywords:{}},
  Snake:{types:['Snake'],colors:['B'],feature:'snake',move:2,keywords:{deathtouch:1}},
  Goblin:{types:['Goblin'],colors:['R'],feature:'goblin',move:3,keywords:{haste:1}},
  Hornet:{types:['Insect'],colors:['G'],feature:'hornet',move:3,keywords:{flying:1,deathtouch:1}},
  Squirrel:{types:['Squirrel'],colors:['G'],feature:'squirrel',move:2,keywords:{}},
};
export const COMBO_TOKEN_TYPES=TYPES;

export function comboToken(s,ev,name,power=1,toughness=1,source='combo'){
  const spec=TYPES[name]||{types:[name],colors:[],feature:name.toLowerCase().replace(/\W/g,''),move:2,keywords:{}};
  const h=player(s);if(!alive(h))return null;
  let pos=null,dist=Infinity;
  for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++)if(validCell(s,x,y)){
    const d=Math.abs(x-h.x)+Math.abs(y-h.y);
    if(d<dist){dist=d;pos={x,y};}
  }
  if(!pos)return null;
  const u={uid:s.nextUid++,side:'player',hero:false,defId:'sproutling',name,traitToken:spec.feature,
    creatureTypes:spec.types.join(' '),types:spec.types.slice(),colors:spec.colors.slice(),sourceGraft:source,
    token:true,x:pos.x,y:pos.y,power,toughness,maxHp:toughness,hp:toughness,move:spec.move,
    keywords:{...spec.keywords},statuses:{},championLambholt:owns(s,'lambholt')};
  s.units.push(u);
  ev.push({t:'summon',uid:u.uid,defId:'sproutling',x:u.x,y:u.y,by:h.uid,ally:true,name,trait:spec.feature});
  return u;
}
const giveCounter=(s,ev,u,kind,amount=1)=>{
 if(!alive(u)||amount<=0)return;
 u.power+=amount;u.toughness+=amount;u.maxHp+=amount;u.hp+=amount;
 (u.comboCounters ||= {})[kind]=((u.comboCounters||{})[kind]||0)+amount;
 ev.push({t:'status',uid:u.uid,status:`${kind} +1/+1`,value:amount,total:u.comboCounters[kind]});
};
function comboDraw(s,ev,n=1){
 if(!s.deck)return 0;
 const back=refillFromGraveyard(s.deck);if(back)ev.push({t:'deckReshuffle',count:back,uid:player(s).uid});
 const cards=drawCards(s.deck,n);
 for(const c of cards){ev.push({t:'cardDraw',id:c.id,uid:player(s).uid});onHeroDraw(s,ev);}
 return cards.length;
}
function gainLife(s,ev,n,source){
 const h=player(s);if(!alive(h)||n<=0)return;
 const actual=heal(s,ev,h,n,source);
 // Life gain still triggers Magic-style synergies at full RPG HP, but cannot overheal.
 if(!actual){ev.push({t:'graftTrigger',name:`${source}: gained ${n} life (health already full)`,uid:h.uid});onHeroHeal(s,ev,n,source);}
 ev.push({t:'comboLifeGain',uid:h.uid,amount:n,kind:source});
}
function drain(s,ev,source,n){
 const foe=nearest(s);if(!foe)return;
 ev.push({t:'graftTrigger',name:`${source} · drain ${n}`,uid:player(s).uid,target:foe.uid});
 dealDamage(s,ev,player(s),foe,n,{kind:source,element:'umbral'});
 gainLife(s,ev,n,source);
}
function queue(s,kind,detail={}){
 state(s).choices.push({kind,...detail});
}
export const hasComboChoices=s=>!!s?.combo?.choices?.length;
export function comboChoices(s){
 const c=s?.combo?.choices?.[0];if(!c)return null;
 const choices=[];
 if(c.kind==='mentor'||c.kind==='nadir'){
   choices.push({arg:0,label:'Skip (save mana)'});
   if(availableMana(s)>=1&&(c.kind!=='mentor'||canDraw(s)))choices.push({arg:1,label:`Pay 1 mana · ${c.kind==='mentor'?'draw a card':'gain +1/+1 and summon Tentacle'}`});
 }
 if(c.kind==='oracle'){
   for(const v of (s.deck?.library||[]).slice(0,2))if(!choices.some(x=>x.arg===v.id))choices.push({arg:v.id,label:`Take ${v.id.replace(/^mtg:/,'').replaceAll('-',' ')}`});
   if(!choices.length)choices.push({arg:0,label:'No cards remain · Continue'});
 }
 if(c.kind==='geists'){
   choices.push({arg:0,label:'Do not freeze a target'});
   for(const u of enemies(s))choices.push({arg:u.uid,label:`Freeze ${u.name}${u.boss?' (1 turn)':' (2 turns)'}`});
 }
 if(c.kind==='ivy'){
   for(const u of allies(s))choices.push({arg:u.uid,label:`+1/+1 counter → ${u.hero?'Hero':u.name}`});
 }
 return {kind:c.kind,subtitle:c.kind==='oracle'?'Look at the top two real cards':c.kind==='mentor'?'A small ally entered':c.kind==='nadir'?'You drew a card':c.kind==='geists'?'Choose an enemy to freeze':'Green ally entered',choices};
}
export function resolveComboChoice(s,kind,arg){
 const c=s.combo?.choices?.[0];if(!c||c.kind!==kind)throw Error('No matching pending combo choice');
 const view=comboChoices(s);if(!view.choices.some(x=>x.arg===arg))throw Error('Invalid combo choice or insufficient mana');
 const ev=[],h=player(s);
 s.combo.choices.shift();
 if(kind==='mentor'&&arg===1){ev.push(spendMana(s,1));comboDraw(s,ev,1);}
 if(kind==='nadir'&&arg===1){ev.push(spendMana(s,1));giveCounter(s,ev,h,'nadir');comboToken(s,ev,'Tentacle',1,1,'nadir');}
 if(kind==='oracle'&&arg){
   const top=s.deck.library.splice(0,2);const i=top.findIndex(x=>x.id===arg);
   if(i<0)throw Error('Chosen card left top of library');
   const [chosen]=top.splice(i,1);s.deck.hand.push(chosen);s.deck.library.push(...top);
   ev.push({t:'cardDraw',id:chosen.id,uid:h.uid});onHeroDraw(s,ev);
 }
 if(kind==='geists'&&arg){const foe=s.units.find(u=>u.uid===arg&&alive(u));if(foe){foe.statuses.stunned=(foe.statuses.stunned||0)+(foe.boss?1:2);ev.push({t:'status',uid:foe.uid,status:'stunned',value:foe.boss?1:2,total:foe.statuses.stunned});}}
 if(kind==='ivy')giveCounter(s,ev,s.units.find(u=>u.uid===arg),'ivy');
 return resolveComboEvents(s,ev);
}
export function comboActiveOptions(s){
 if(!s||s.phase!=='player'||hasComboChoices(s))return [];
 const co=state(s),out=[];
 if(owns(s,'ayara')&&co.actions.ayaraTurn!==s.turn){
  for(const u of allies(s))if(!u.hero&&(u.colors||[]).includes('B'))out.push({kind:'ayara',arg:u.uid,label:`Ayara · sacrifice ${u.name} → draw`});
 }
 if(owns(s,'skeleton')&&availableMana(s)>=2&&hasOpenTile(s)&&!allies(s).some(u=>u.sourceGraft==='skeleton'))out.push({kind:'skeleton',arg:0,label:'Reassemble Skeleton · 2 mana'});
 if(owns(s,'witness')&&!co.actions.witness&&s.deck)for(const c of s.deck.graveyard)if(!out.some(x=>x.kind==='witness'&&x.arg===c.id))out.push({kind:'witness',arg:c.id,label:`Eternal Witness · return ${c.id.replace(/^mtg:/,'').replaceAll('-',' ')}`});
 return out;
}
export function comboActivate(s,kind,arg){
 if(s.phase!=='player'||hasComboChoices(s))throw Error('Finish pending combo choices first');
 if(!comboActiveOptions(s).some(o=>o.kind===kind&&o.arg===arg))throw Error('Combo ability is not available');
 const co=state(s),ev=[];
 if(kind==='ayara'){
  const u=s.units.find(x=>x.uid===arg);co.actions.ayaraTurn=s.turn;
  sacrificeAlly(s,ev,u);comboDraw(s,ev,1);
 }
 if(kind==='skeleton'){
  ev.push(spendMana(s,2));const u=comboToken(s,ev,'Skeleton',1,1,'skeleton');if(u){u.tapped=true;ev.push({t:'graftTrigger',name:'Reassembling Skeleton returns exhausted',uid:u.uid});}
 }
 if(kind==='witness'){
  if(!s.deck)throw Error('No combat deck');
  const i=s.deck.graveyard.findIndex(x=>x.id===arg);if(i<0)throw Error('Card not in graveyard');
  const [c]=s.deck.graveyard.splice(i,1);s.deck.hand.push(c);co.actions.witness=true;
  ev.push({t:'cardReturn',id:c.id,uid:player(s).uid,from:'graveyard'});
 }
 s.stats.actions++;return resolveComboEvents(s,ev);
}

// Run each event exactly once, even if an enclosing engine action concatenates arrays.
// Appended events (e.g. lifegain -> damage -> death -> draws -> new summons) are processed
// in stable FIFO order. The normal mana/board/deck rules naturally constrain combos.
export function resolveComboEvents(s,ev){
 if(!s?.traits?.length)return ev;
 const co=state(s);let processed=0;
 for(let i=0;i<ev.length;i++){
  const e=ev[i];if(e[STAMP])continue;
  if(++processed>MAX_EVENTS){ev.push({t:'graftTrigger',name:'Combo surge paused at engine safety limit',uid:player(s)?.uid});break;}
  Object.defineProperty(e,STAMP,{value:true,enumerable:false});
  const hero=player(s);if(!alive(hero))continue;
  if(e.t==='summon'){
   const u=s.units.find(x=>x.uid===e.uid);if(!u||u.hero)continue;
   if(owns(s,'soulWarden'))gainLife(s,ev,1,'Soul Warden');
   if(u.side==='player'){
    if(owns(s,'ayara')&&(u.colors||[]).includes('B'))drain(s,ev,'Ayara',1);
    if(owns(s,'mentor')&&effectivePower(u)<=2&&s.deck)queue(s,'mentor',{source:u.uid});
    if(owns(s,'ivy')&&(u.colors||[]).includes('G'))queue(s,'ivy',{source:u.uid});
    if(owns(s,'lambholt')){giveCounter(s,ev,hero,'lambholt');u.championLambholt=true;}
   }
  } else if(e.t==='comboLifeGain'){
   if(owns(s,'pridemate'))giveCounter(s,ev,hero,'pridemate');
  } else if(e.t==='cardDraw'){
   if(owns(s,'nadir')&&s.deck)queue(s,'nadir',{card:e.id});
  } else if(e.t==='death'){
   const u=s.units.find(x=>x.uid===e.uid);if(!u||u.hero)continue;
   if(owns(s,'zulaport')&&u.side==='player')drain(s,ev,'Zulaport Cutthroat',1);
   const turnKey=`${e.turn??s.turn}:${e.phase||s.phase}`;
   if(owns(s,'morbid')&&co.actions.morbidTurn!==turnKey){co.actions.morbidTurn=turnKey;comboDraw(s,ev,1);}
  } else if(e.t==='comboSpellCast'){
   if(owns(s,'mystic'))comboToken(s,ev,'Bird Illusion',1,1,'mystic');
   if(owns(s,'guttersnipe')){const foe=nearest(s);if(foe)dealDamage(s,ev,hero,foe,2,{kind:'guttersnipe',element:'ember'});}
   if(owns(s,'electrofield')){const foe=nearest(s);if(foe)dealDamage(s,ev,hero,foe,1,{kind:'electrofield',element:'ember'});}
   if(owns(s,'stormkiln')){co.treasure=(co.treasure||0)+1;ev.push({t:'graftTrigger',name:`Storm-Kiln · Treasure ${co.treasure}`,uid:hero.uid});}
  } else if(e.t==='damage'&&e.src===hero.uid&&e.amount>0&&e.kind!=='strike'&&e.kind!=='strike2'&&e.kind!=='counter'&&e.kind!=='trample'){
   const target=s.units.find(x=>x.uid===e.uid);
   if(owns(s,'spitfire')&&target?.side==='enemy'){
    hero.statuses.empowered=(hero.statuses.empowered||0)+3;
    ev.push({t:'graftTrigger',name:`Chandra's Spitfire · +3 attack (${hero.statuses.empowered})`,uid:hero.uid});
   }
  } else if(e.t==='attack'){
   const attacker=s.units.find(x=>x.uid===e.uid);
   if(owns(s,'rabblemaster')&&attacker?.side==='player'&&!attacker.hero&&(attacker.types||[]).includes('Goblin')){
    hero.statuses.empowered=(hero.statuses.empowered||0)+1;
    ev.push({t:'graftTrigger',name:'Goblin Rabblemaster · attacking Goblin +1 attack',uid:hero.uid});
   }
  } else if(e.t==='turn'){
   if(owns(s,'ophiomancer')&&!allies(s).some(u=>(u.types||[]).includes('Snake')))comboToken(s,ev,'Snake',1,1,'ophiomancer');
   if(e.phase==='player'&&owns(s,'rabblemaster'))comboToken(s,ev,'Goblin',1,1,'rabblemaster');
   if(e.phase==='player'&&owns(s,'hermit')&&s.turn===4){
    for(const u of allies(s).filter(u=>u.sourceGraft==='hermit')){
      if(u.hermitBonus){u.power-=1;u.toughness-=1;u.maxHp-=1;u.hp=Math.min(u.hp,u.maxHp);u.hermitBonus=false;}
    }
    ev.push({t:'graftTrigger',name:'Deep Forest Hermit · Squirrel bonus expired',uid:hero.uid});
   }
  }
 }
 return ev;
}

export function initialComboEvents(s,ev){
 state(s);
 if(owns(s,'lambholt'))player(s).championLambholt=true;
 if(owns(s,'mulldrifter'))comboDraw(s,ev,2);
 if(owns(s,'electrofield')){player(s).statuses.shield=(player(s).statuses.shield||0)+2;ev.push({t:'shield',uid:player(s).uid,amount:2,total:player(s).statuses.shield,kind:'electrofield'});}
 if(owns(s,'stormkiln')){const gear=(player(s).equipment||[]).length;player(s).power+=gear;}
 if(owns(s,'skeleton'))comboToken(s,ev,'Skeleton',1,1,'skeleton');
 if(owns(s,'hornetQueen'))for(let i=0;i<4;i++)comboToken(s,ev,'Hornet',1,1,'hornetQueen');
 if(owns(s,'hermit'))for(let i=0;i<4;i++){const u=comboToken(s,ev,'Squirrel',2,2,'hermit');if(u)u.hermitBonus=true;}
 if(owns(s,'oracle')&&s.deck?.library.length)queue(s,'oracle');
 if(owns(s,'geists')&&enemies(s).length)queue(s,'geists');
 return ev;
}
