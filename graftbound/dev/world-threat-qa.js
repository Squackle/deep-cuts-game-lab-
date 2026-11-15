import {installReferenceSet} from '../src/cards/reference-set.js';
import {newWorldThreat,settleWorldThreat,effectiveThreatLevel,threatModifiers} from '../src/engine/world-threat.js';
import {newRun,enterNode,runStats} from '../src/engine/run.js';
import {generateMap} from '../src/engine/campaign.js';
import {strengthOf} from '../src/engine/strength.js';
import {previewNextWorldThreat,threatPreviewLabel} from '../src/engine/threat-preview.js';

const assert=(ok,message)=>{if(!ok)throw new Error(message)};
const status=document.getElementById('status'),results=document.getElementById('results');
try{
  installReferenceSet();
  const first=settleWorldThreat(newWorldThreat(),{victory:true,enemyDamage:0,maxHealth:20});
  assert(first.level===1,'a flawless win did not increase stored threat');
  let low=settleWorldThreat(first,{victory:true,enemyDamage:1,maxHealth:20});
  low=settleWorldThreat(low,{victory:true,enemyDamage:1,maxHealth:20});
  assert(low.level===2,'two near-flawless wins did not increase threat');
  assert(threatModifiers({level:12}).reinforcement===2,'late pressure lacks counter reinforcements');
  const run=newRun({seed:1729,tutorial:false});
  run.act=1;run.map=generateMap(run.seed,{act:1});
  const target=run.map.nodes.find(n=>n.depth===2&&['battle','elite'].includes(n.type));
  const parent=run.map.nodes.find(n=>n.depth===1&&n.next.includes(target.id));
  assert(target&&parent,'missing deterministic test encounter');
  run.current=parent.id;run.visited=[parent.id];
  run.evo.power=42;run.evo.toughness=38;
  const base=run.worldThreat.level;
  const strength=strengthOf(run.evo,{spellbook:run.spellbook,stats:runStats(run)}).score;
  const expected=3+2*(run.act*8+target.depth);
  const predicted=effectiveThreatLevel(run.worldThreat,{strength,expected});
  const forecast=previewNextWorldThreat(run),mapText=threatPreviewLabel(forecast);
  assert(forecast.nodes.some(n=>n.id===target.id&&n.level===predicted),
    'map displayed a different threat from the actual selected encounter');
  assert(mapText.includes('Stored 0/12 · Next battle '),
    'map must distinguish stored zero from active build-strength threat');
  enterNode(run,target.id);
  assert(predicted>=5,'strong build did not raise active threat');
  assert(run.battle.worldThreat===predicted,'battle did not apply adaptive threat level');
  assert(run.worldThreat.level===base,'preview changed saved campaign threat');
  const foes=run.battle.units.filter(u=>u.side==='enemy');
  assert(foes.length>0&&foes.every(u=>u.worldShield>0),'battle enemies lack world shields');
  assert(run.battle.reinforced<=2,'Act II reinforcement cap exceeded');
  const details=[
    ['Flawless win',`0 → ${first.level}`],
    ['Two light-hit wins',`${first.level} → ${low.level}`],
    ['Persistent level',String(run.worldThreat.level)],
    ['Actual map label',mapText],
    ['Build strength',strength.toFixed(1)],
    ['Expected strength',String(expected)],
    ['Active battle threat',run.battle.worldThreat+'/12'],
    ['Counter reinforcements',String(run.battle.reinforced)],
    ['Shielded enemies',foes.filter(u=>u.worldShield>0).length+'/'+foes.length]
  ];
  for(const [name,value]of details){
    const tr=document.createElement('tr'),a=document.createElement('th'),b=document.createElement('td');
    a.textContent=name;b.textContent=value;tr.append(a,b);results.appendChild(tr);
  }
  status.id='ready';status.textContent='PASS — stored threat, adaptive encounter pressure, enemy wards and Act II caps verified in-browser.';
  results.dataset.worldThreat=String(run.battle.worldThreat);
  results.dataset.enemyCount=String(foes.length);
  results.dataset.shields=String(foes.filter(u=>u.worldShield>0).length);
}catch(err){status.id='error';status.textContent='FAIL — '+(err?.message||String(err));}
