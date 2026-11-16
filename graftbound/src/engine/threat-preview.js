/** Pure read-only HUD projection of the exact pressure each reachable battle
 * would receive if entered now. Never mutates saves, gameplay RNG or battle rules.
 * A shrine/event or tutorial is not an encounter with applied World Threat. */
import {availableNodes} from './campaign.js';
import {runStats} from './run.js';
import {strengthOf,expectedStrength} from './strength.js';
import {stepOf} from './power.js';
import {normalizedWorldThreat,effectiveThreatLevel} from './world-threat.js';

export function previewNextWorldThreat(run){
  const base=normalizedWorldThreat(run?.worldThreat).level;
  if(!run?.map)return {base,range:null,nodes:[]};
  const reachable=availableNodes(run.map,run.current);
  // The first tutorial is deliberately exempt from Threat. Never preview it
  // as a dynamically scaled battle when the next encounter is scripted gentle.
  if(reachable.some(n=>n.type==='tutorial'))return {base,range:null,nodes:[],tutorial:true};
  const next=reachable.filter(n=>n.type==='battle'||n.type==='elite'||n.type==='boss');
  if(!next.length)return {base,range:null,nodes:[]};
  const score=strengthOf(run.evo,{spellbook:run.spellbook||[],stats:runStats(run)}).score;
  const nodes=next.map(n=>({
    id:n.id,type:n.type,depth:n.depth,
    level:effectiveThreatLevel(run.worldThreat,{
      strength:score,expected:expectedStrength(stepOf(run.act,n.depth))
    })
  }));
  const levels=nodes.map(n=>n.level);
  return {base,range:{min:Math.min(...levels),max:Math.max(...levels)},nodes};
}
export function threatPreviewLabel(p){
  const base='Stored '+p.base+'/24';
  if(p.tutorial)return base+' · Tutorial has no Threat';
  if(!p.range)return base+' · Next battle adapts to your strength';
  const {min,max}=p.range;
  const value=min===max?String(min):min+'–'+max;
  return base+' · Next battle '+value+'/24';
}
