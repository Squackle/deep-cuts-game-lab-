/** v1.3 appearance-only creature anatomy. No gameplay RNG, no DOM or combat effects.
 * All absorbed cards keep their authoritative statistics; anatomy is just a presentation. */
import { resolveCard } from '../cards/catalog.js';

export const MORPH_TYPES = Object.freeze(['feline','draconic','avian','insectoid','arboreal','serpentine','aquatic','ungulate','undead','humanoid']);
export const MORPH_REGIONS = Object.freeze(['head','jaw','neck','shoulders','torso','back','arms','hands','pelvis','legs','feet','rear','secondary']);
const FAMILY = Object.freeze({
  feline: /\b(Cat|Leonin|Lion|Tiger|Sable)\b/i,
  draconic: /\b(Dragon|Drake|Dinosaur|Lizard|Crocodile)\b/i,
  avian: /\b(Bird|Angel|Pegasus)\b/i,
  insectoid: /\b(Insect|Spider|Scorpion|Thopter)\b/i,
  arboreal: /\b(Treefolk|Plant|Druid|Dryad|Fungus|Saproling)\b/i,
  serpentine: /\b(Snake|Wurm|Serpent)\b/i,
  aquatic: /\b(Fish|Merfolk|Kraken|Octopus)\b/i,
  ungulate: /\b(Horse|Ox|Centaur|Minotaur|Elephant)\b/i,
  undead: /\b(Skeleton|Zombie|Spirit|Vampire)\b/i,
  humanoid: /\b(Human|Elf|Goblin|Dwarf|Knight|Soldier)\b/i,
});
const NAME_TO_REGION = Object.freeze({
  wings:'back',shell:'back',spikes:'back',horns:'head',antlers:'head',crown:'head',
  tail:'rear',blades:'arms',claws:'hands',tusks:'jaw',beak:'jaw',armor:'torso',
  moss:'torso',venom:'secondary',eyes:'head',tendrils:'secondary',aura:'secondary',bulk:'torso',
});
/** Resolve every physical feature, not just the strongest of each old single-feature slot. */
export function resolveAnatomy(evo) {
  const parts={...(evo?.parts||{})}, scores=Object.fromEntries(MORPH_TYPES.map(t=>[t,0]));
  for(const absorbed of evo?.absorbed||[]){
    const c=resolveCard(absorbed.cardId),type=String(c?.type||c?.sourceInfo?.typeLine||'');
    for(const [family,pattern] of Object.entries(FAMILY))if(pattern.test(type))scores[family]++;
  }
  const families=MORPH_TYPES.filter(t=>scores[t]>0).sort((a,b)=>scores[b]-scores[a]||MORPH_TYPES.indexOf(a)-MORPH_TYPES.indexOf(b));
  const physical=Object.keys(parts).filter(k=>Number(parts[k])>0&&NAME_TO_REGION[k]&&!['aura','bulk','venom','moss','eyes','tendrils'].includes(k));
  const features=Object.fromEntries(Object.entries(parts).filter(([,v])=>v>0).map(([k,v])=>[k,Math.min(3,v|0)]));
  const regions=Object.fromEntries(MORPH_REGIONS.map(r=>[r,[]]));
  for(const feature of physical)regions[NAME_TO_REGION[feature]].push(feature);
  const head=features.beak?'beak':scores.feline>scores.draconic&&scores.feline>0?'feline':scores.draconic?'draconic':features.tusks?'tusked':'neutral';
  const surface=scores.arboreal>0&&scores.arboreal>=scores.draconic?'bark':scores.insectoid>0&&scores.insectoid>scores.draconic?'chitin':scores.draconic>0?'scales':scores.feline>0?'fur':'skin';
  const lower=scores.ungulate>=2?'ungulate':scores.serpentine>=2?'serpentine':'biped';
  const morph={head,surface,lower,wingKind:scores.avian>scores.draconic?'feather':'membrane',
    tailKind:scores.serpentine>scores.draconic?'serpent':scores.feline>scores.draconic?'fur':'scaled',
    primary:families[0]||'neutral',secondary:families[1]||null};
  return {features,physical,families,scores,regions,morph,stage:(evo?.absorbed||[]).length,bodyRegions:MORPH_REGIONS};
}
export function anatomyAnchor(anatomy,name,base){
  if(!Array.isArray(base))return null;
  const n=(anatomy?.features?.bulk||0), shift=n?Math.min(n*1.4,4):0;
  const [x,y]=base;const torsoGrow=['shoulderLeft','shoulderRight','forearmLeft','forearmRight','gripLeft','gripRight'].includes(name);
  const side=x<32?-1:x>32?1:0;
  if(name.startsWith('foot')&&anatomy?.morph?.lower==='ungulate')return [x+side*2,y];
  if(name==='face'&&anatomy?.morph?.head==='draconic')return [x-2,y+2];
  return [x+side*(torsoGrow?shift:0),y];
}
