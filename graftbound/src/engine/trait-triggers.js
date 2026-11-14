// Reviewed, bounded printed-creature adaptations for permanent hero grafts.
// Authoritative DOM-free triggers; every effect uses explicit battle events and board state.
import { player, enemies, alive, heal, dealDamage } from './abilities.js';
import { tileAt, unitAt, T, manhattan } from '../core/grid.js';
import { drawCards, refillFromGraveyard } from './deck.js';

const owns=(s,id)=>s.traits?.includes(id);
const nearestFoe=s=>enemies(s).sort((a,b)=>manhattan(a,player(s))-manhattan(b,player(s))||a.uid-b.uid)[0];
function spawnAlly(s,ev,name,power,toughness,keywords={}){
 const hero=player(s);const type=name.toLowerCase().replace(/[^a-z]/g,'');
 if(s.units.filter(u=>u.hp>0&&u.traitToken===type).length>=3)return null;
 const spots=[];
 for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++){
  const t=tileAt(s,x,y);if(t===T.ROCK||t===T.LAVA||unitAt(s,x,y))continue;
  spots.push({x,y,d:Math.abs(x-hero.x)+Math.abs(y-hero.y)});
 }
 spots.sort((a,b)=>a.d-b.d||a.y-b.y||a.x-b.x);
 const pos=spots[0];if(!pos)return null;
 const u={uid:s.nextUid++,side:'player',hero:false,defId:'sproutling',traitToken:type,name,
  x:pos.x,y:pos.y,power,toughness,hp:toughness,maxHp:toughness,move:2,keywords:{...keywords},statuses:{},token:true};
 s.units.push(u);
 ev.push({t:'summon',uid:u.uid,defId:u.defId,x:u.x,y:u.y,by:hero.uid,ally:true,trait:type,name});return u;
}
export function traitDraw(s,ev,n=1){
 if(!s.deck)return 0;
 const old=refillFromGraveyard(s.deck);if(old)ev.push({t:'deckReshuffle',count:old,uid:player(s).uid});
 const cards=drawCards(s.deck,n);
 for(const card of cards){ev.push({t:'cardDraw',id:card.id,uid:player(s).uid});onHeroDraw(s,ev);}
 return cards.length;
}
export function onHeroDraw(s,ev){
 if(!owns(s,'sheoldred')||!alive(player(s)))return;
 const gain=heal(s,ev,player(s),2,'sheoldred');
 if(gain)ev.push({t:'graftTrigger',name:'Sheoldred · draw grants 2 life',uid:player(s).uid,amount:gain});
}
export function onBattleGrafts(s,ev){
 const hero=player(s);if(!hero)return;
 if(owns(s,'ascendant') && hero.hp>=30){
  hero.power+=3;hero.toughness+=3;hero.maxHp+=3;hero.hp+=3;hero.keywords.flying=1;
  ev.push({t:'graftTrigger',name:'Serra Ascendant · +3/+3 and Flying at 30+ life',uid:hero.uid});
 }
 if(owns(s,'visionary'))traitDraw(s,ev,1);
}
export function onHeroAttack(s,ev){
 if(owns(s,'brimaz')){
  const token=spawnAlly(s,ev,'Cat Soldier',1,1);
  if(token)ev.push({t:'graftTrigger',name:'Brimaz · Cat Soldier',uid:player(s).uid});
 }
}
export function onHeroSpell(s,ev){
 if(owns(s,'archmage'))traitDraw(s,ev,1);
 if(owns(s,'pyromancer'))spawnAlly(s,ev,'Elemental',1,1);
 if(owns(s,'talrand'))spawnAlly(s,ev,'Drake',2,2,{flying:1});
 if(owns(s,'archaeomancer')&&!s.archaeomancerUsed){
  s.archaeomancerUsed=true;
  // The spell just cast occupies the newest graveyard position; recover a DIFFERENT card.
  const grave=s.deck?.graveyard;
  const i=grave&&grave.length>1?grave.length-2:-1;
  if(i>=0){const [c]=grave.splice(i,1);s.deck.hand.push(c);
    ev.push({t:'cardReturn',id:c.id,uid:player(s).uid,from:'graveyard'});
  } else traitDraw(s,ev,1);
 }
}
export function onHeroHeal(s,ev,amount,kind){
 if(!owns(s,'vito')||kind==='vito'||amount<=0)return;
 const target=nearestFoe(s);if(!target)return;
 ev.push({t:'graftTrigger',name:`Vito · deal ${amount} damage to ${target.name}`,uid:player(s).uid});
 dealDamage(s,ev,player(s),target,amount,{kind:'vito',element:'umbral'});
}
export function onUnitDeath(s,ev,dead){
 if(!owns(s,'bloodArtist')||dead.hero)return;
 const target=nearestFoe(s);
 if(target && target!==dead){
  ev.push({t:'graftTrigger',name:'Blood Artist · drain 1 life',uid:player(s).uid});
  dealDamage(s,ev,player(s),target,1,{kind:'bloodArtist',element:'umbral'});
  heal(s,ev,player(s),1,'bloodArtist');
 }
}
