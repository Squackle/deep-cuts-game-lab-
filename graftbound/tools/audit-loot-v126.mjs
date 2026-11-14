// Repeatable deterministic reward audit. Does not change gameplay state or files.
import { installReferenceSet } from '../src/cards/reference-set.js';
import { cardPool, generatePack, RARITY_TABLE } from '../src/engine/rewards.js';
import { resolveCard } from '../src/cards/catalog.js';
import { newEvolution } from '../src/engine/evolution.js';
installReferenceSet();
const samples=2500,steps=[0,2,5,8,11,15,19,23],tiers=['battle','elite','boss'];
let packs=0,short=0,duplicates=0,guaranteeFailures=0,eligibilityFailures=0;
const rows=[];
for(const step of steps){for(const tier of tiers){
 const pool=cardPool({step,tier,evo:newEvolution()}),allowed=new Set(pool.map(c=>c.id));
 const availableRarity={};for(const rarity of Object.keys(RARITY_TABLE.battle))availableRarity[rarity]=pool.filter(c=>c.rarity===rarity).length;
 const counts={common:0,uncommon:0,rare:0,mythic:0};let haveRare=0,haveMythic=0;
 for(let seed=0;seed<samples;seed++){
  const cards=generatePack((Math.imul(seed+1,619)^Math.imul(step+1,137))>>>0,{step,tier,evo:newEvolution()});packs++;
  if(cards.length!==3)short++;
  if(new Set(cards).size!==cards.length)duplicates++;
  const rarities=cards.map(id=>resolveCard(id)?.rarity);
  if(cards.some(id=>!allowed.has(id)))eligibilityFailures++;
  if(tier==='boss' && (availableRarity.rare+availableRarity.mythic)>0 && !rarities.some(r=>r==='rare'||r==='mythic'))guaranteeFailures++;
  if(tier==='elite' && (availableRarity.uncommon+availableRarity.rare+availableRarity.mythic)>0 && rarities.every(r=>r==='common'))guaranteeFailures++;
  for(const rarity of rarities)if(rarity in counts)counts[rarity]++;
  if(rarities.some(r=>r==='rare'||r==='mythic'))haveRare++;
  if(rarities.includes('mythic'))haveMythic++;
 }
 rows.push({step,tier,eligible:availableRarity,cardRarities:counts,rareOrBetterPackPct:+(haveRare/samples*100).toFixed(1),mythicPackPct:+(haveMythic/samples*100).toFixed(1)});
}}
const result={generatedPacks:packs,slots:packs*3,invalidLength:short,duplicateCards:duplicates,guaranteeFailures,eligibilityFailures,rarityTables:RARITY_TABLE,rows};
console.log(JSON.stringify(result,null,2));
if(short||duplicates||guaranteeFailures||eligibilityFailures)process.exitCode=1;
