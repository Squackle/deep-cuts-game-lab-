// Reviewed, bounded printed-creature adaptations for permanent hero grafts.
// Authoritative DOM-free triggers; every effect uses explicit battle events and board state.
import { player, enemies, alive, heal, dealDamage, loseLife } from './abilities.js';
import { tileAt, unitAt, T, manhattan } from '../core/grid.js';
import { drawCards, refillFromGraveyard } from './deck.js';
import { lv } from '../cards/graft-levels.js';

const owns=(s,id)=>s.traits?.includes(id);
const nearestFoe=s=>enemies(s).sort((a,b)=>manhattan(a,player(s))-manhattan(b,player(s))||a.uid-b.uid)[0];
function spawnAlly(s,ev,name,power,toughness,keywords={}){
 const hero=player(s);const type=name.toLowerCase().replace(/[^a-z]/g,'');
 // Board occupancy, real game costs and turn rules constrain summons; never a hidden three-token ceiling.
 const spots=[];
 for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++){
  const t=tileAt(s,x,y);if(t===T.ROCK||t===T.LAVA||unitAt(s,x,y))continue;
  spots.push({x,y,d:Math.abs(x-hero.x)+Math.abs(y-hero.y)});
 }
 spots.sort((a,b)=>a.d-b.d||a.y-b.y||a.x-b.x);
 const pos=spots[0];if(!pos)return null;
 const cardIdentity=name==='Elemental'?{colors:['R'],types:['Elemental']} : name==='Drake'?{colors:['U'],types:['Drake']} : name==='Cat Soldier'?{colors:['W'],types:['Cat','Soldier']} : {colors:[],types:[name]};
 const u={uid:s.nextUid++,side:'player',hero:false,defId:'sproutling',traitToken:type,name,
  ...cardIdentity,creatureTypes:cardIdentity.types.join(' '),
  x:pos.x,y:pos.y,power,toughness,hp:toughness,maxHp:toughness,move:2,keywords:{...keywords},statuses:{},token:true};
 s.units.push(u);
 ev.push({t:'summon',uid:u.uid,defId:u.defId,x:u.x,y:u.y,by:hero.uid,ally:true,trait:type,name,phase:s.phase,turn:s.turn,entryPower:u.power});return u;
}
export function traitDraw(s,ev,n=1){
  /* v1.5.0: no new gameplay after a finalized victory */ if(s&&s.victoryDeclared)return;
 if(!s.deck)return 0;
 let count=0;
 // Approved pilot rule: draw one at a time, refilling only when empty.
 for(let i=0;i<n&&!s.victoryDeclared&&s.phase!=='lost';i++){
  const old=refillFromGraveyard(s.deck);if(old)ev.push({t:'deckReshuffle',count:old,uid:player(s).uid});
  const [card]=drawCards(s.deck,1);if(!card)break;
  count++;ev.push({t:'cardDraw',id:card.id,uid:player(s).uid});onHeroDraw(s,ev);
 }
 return count;
}
export function onHeroDraw(s,ev){
  /* v1.5.0: no new gameplay after a finalized victory */ if(s&&s.victoryDeclared)return;
 if(!owns(s,'sheoldred')||!alive(player(s)))return;
 const n=lv(s,'sheoldred').heal;const gain=heal(s,ev,player(s),n,'sheoldred');
 if(gain)ev.push({t:'graftTrigger',name:`Sheoldred · draw grants ${n} life`,uid:player(s).uid,amount:gain});
}
export function onBattleGrafts(s,ev){
 const hero=player(s);if(!hero)return;
 if(owns(s,'ascendant') && hero.hp>=30){
  const b=lv(s,'ascendant').buff;hero.power+=b;hero.toughness+=b;hero.maxHp+=b;hero.hp+=b;hero.keywords.flying=1;
  ev.push({t:'graftTrigger',name:`Serra Ascendant · +${b}/+${b} and Flying at 30+ life`,uid:hero.uid});
 }
 if(owns(s,'visionary'))traitDraw(s,ev,lv(s,'visionary').draw);
}
export function onHeroAttack(s,ev){
  /* v1.5.0: no new gameplay after a finalized victory */ if(s&&s.victoryDeclared)return;
 if(owns(s,'brimaz')){
  const token=spawnAlly(s,ev,'Cat Soldier',...lv(s,'brimaz').token);
  if(token)ev.push({t:'graftTrigger',name:'Brimaz · Cat Soldier',uid:player(s).uid});
 }
}
export function onHeroSpell(s,ev){
  /* v1.5.0: no new gameplay after a finalized victory */ if(s&&s.victoryDeclared)return;
 if(owns(s,'archmage'))traitDraw(s,ev,1);
 if(owns(s,'pyromancer'))spawnAlly(s,ev,'Elemental',...lv(s,'pyromancer').token);
 if(owns(s,'talrand'))spawnAlly(s,ev,'Drake',...lv(s,'talrand').token,{flying:1});
 if(owns(s,'archaeomancer')&&(s.archaeomancerUses||0)<lv(s,'archaeomancer').uses){
  s.archaeomancerUses=(s.archaeomancerUses||0)+1;s.archaeomancerUsed=true;
  // The spell just cast occupies the newest graveyard position; recover a DIFFERENT card.
  const grave=s.deck?.graveyard;
  const i=grave&&grave.length>1?grave.length-2:-1;
  if(i>=0){const [c]=grave.splice(i,1);s.deck.hand.push(c);
    ev.push({t:'cardReturn',id:c.id,uid:player(s).uid,from:'graveyard'});
  } else traitDraw(s,ev,1);
 }
}
export function onHeroHeal(s,ev,amount,kind){
  /* v1.5.0: no new gameplay after a finalized victory */ if(s&&s.victoryDeclared)return;
 if(!owns(s,'vito')||kind==='vito'||amount<=0)return;
 const target=nearestFoe(s);if(!target)return;
 const dmg=amount+lv(s,'vito').bonus;
 ev.push({t:'graftTrigger',name:`Vito · ${dmg} life loss to ${target.name}`,uid:player(s).uid});
 loseLife(s,ev,player(s),target,dmg,'vito');
}
export function onUnitDeath(s,ev,dead){
 if(!owns(s,'bloodArtist')||dead.hero)return;
 const target=nearestFoe(s);
 if(target && target!==dead){
  const p=lv(s,'bloodArtist');
  ev.push({t:'graftTrigger',name:`Blood Artist · drain ${p.drain} life`,uid:player(s).uid});
  dealDamage(s,ev,player(s),target,p.drain,{kind:'bloodArtist',element:'umbral'});
  heal(s,ev,player(s),p.heal,'bloodArtist');
 }
}
