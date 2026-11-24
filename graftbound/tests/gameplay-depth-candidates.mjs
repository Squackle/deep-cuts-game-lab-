// Research fixtures only; never imported by the game, saves or ranked verifier.
// Each candidate changes a cloned encounter, not a registered enemy or rules version.
import { player, enemies } from '../src/engine/combat.js';
import { botPlay } from './helpers.mjs';

export const CANDIDATE_VERSION = 'gameplay-depth-candidate-1';
export const CASES = Object.freeze({
 'Gloam Coven': ['coven-no-warden','coven-alpha-power-minus-one'],
 'Nemata, Grove Guardian': ['nemata-vitality-minus-three'],
 'Arasta of the Endless Web': ['arasta-vitality-minus-three'],
 'Toxrill, the Corrosive': ['toxrill-vitality-minus-five'],
});
export function candidateSnapshot(original, variant) {
 const s=structuredClone(original);
 const foe=id=>enemies(s).find(u=>u.defId===id);
 const reduceVitality=(u,n)=>{
  if(!u || u.legendaryVitality<n)throw Error('Missing expected vitality');
  u.legendaryVitality-=n;u.maxHp-=n;u.hp=Math.min(u.hp,u.maxHp);
 };
 switch(variant){
  case 'baseline':break;
  case 'coven-no-warden':{
   // Pressure ablation, NOT a proposed final encounter roster. Keep geometry, hero and RNG fixed.
   const w=foe('tortoise');if(!w)throw Error('Missing Warden');
   s.units=s.units.filter(u=>u.uid!==w.uid);break;
  }
  case 'coven-alpha-power-minus-one':{
   const a=foe('alpha');if(!a)throw Error('Missing Alpha');a.power=Math.max(0,a.power-1);break;
  }
  case 'nemata-vitality-minus-three':reduceVitality(foe('nemata'),3);break;
  case 'arasta-vitality-minus-three':reduceVitality(foe('arasta'),3);break;
  case 'toxrill-vitality-minus-five':reduceVitality(foe('toxrill'),5);break;
  default:throw Error('Unknown research variant');
 }
 return s;
}
export function assessSnapshot(original,variant) {
 const s=candidateSnapshot(original,variant),p=player(s);
 const start={hp:p.hp,power:p.power,toughness:p.toughness,keywords:Object.keys(p.keywords).sort(),foes:enemies(s).map(u=>u.defId)};
 const result=botPlay(s,60,{smarterSpells:true});
 return {result,turns:s.turn,enemyDamage:s.stats.enemyHealthDamage,health:p.hp,slime:p.slime||0,remaining:enemies(s).map(u=>({id:u.defId,hp:u.hp})),start};
}
