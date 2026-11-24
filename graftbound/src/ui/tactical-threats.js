// Read-only presentation of threats omitted by the single primary intent.
// The original intent and all authoritative combat rules stay unchanged.
import { planEnemy } from '../engine/ai.js';
import { enemies, player } from '../engine/combat.js';

export function tacticalThreat(s, intent) {
 const foe=s.units.find(u=>u.uid===intent.uid);
 if(!foe)return {hits:1,notes:[]};
 const notes=[];
 const hits=intent.kind==='attack'&&foe.keywords?.doubleStrike&&!foe.auras?.includes('mtg:pacifism')?2:1;
 if(hits===2)notes.push('Double Strike: up to two hits; shield is shared across both');
 if(foe.auras?.includes('mtg:pacifism')&&intent.kind==='attack')notes.push('Pacifism prevents this attack');
 if(foe.defId==='alpha')notes.push('May create a Wolf at the enemy end step if its side cast no spell');
 if(foe.defId==='arasta')notes.push('Your instant or sorcery casts can create enemy Spiders');
 if(foe.defId==='toxrill')notes.push('Slime: −1/−1 at each end step, twice per complete round while Toxrill lives');
 if(foe.boss&&s.phase==='player'){
  const actions=planEnemy(s,foe).actions;
  if(intent.kind!=='summon'&&actions.some(a=>a.type==='legendarySummon'))notes.push('Also plans a summon');
  if(intent.kind!=='support'&&actions.some(a=>a.type==='nemataPump'))notes.push('Also plans to sacrifice a Saproling and empower the others');
  if(actions.some(a=>a.type==='drakusethFlames'))notes.push('Attack also triggers flame damage');
  if(intent.kind!=='summon'&&actions.some(a=>a.type==='scarabReanimate'))notes.push('Also plans reanimation');
 }
 return {hits,notes};
}
export function slimeEndStepWarning(s) {
 if(s.phase!=='player'||!enemies(s).some(u=>u.defId==='toxrill'))return '';
 const p=player(s);
 return p.toughness<=1?'Toxrill: ending your turn can be fatal from slime (zero toughness).':
 p.toughness<=2?'Toxrill: both end steps can reduce your toughness to zero this round.':
 'Toxrill: one −1/−1 slime counter at each end step while it lives.';
}
