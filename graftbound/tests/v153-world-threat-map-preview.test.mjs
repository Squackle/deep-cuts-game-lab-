import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newRun,enterNode} from '../src/engine/run.js';
import {availableNodes,generateMap} from '../src/engine/campaign.js';
import {previewNextWorldThreat,threatPreviewLabel} from '../src/engine/threat-preview.js';
import {effectiveThreatLevel} from '../src/engine/world-threat.js';

test('actual map previews stored and adaptive threat instead of showing misleading zero',()=>{
  const run=newRun({seed:1729,tutorial:false});
  run.worldThreat={level:0,flawlessStreak:0};
  run.act=1;run.map=generateMap(run.seed,{act:1});
  run.evo.power=42;run.evo.toughness=38;
  const base=JSON.stringify(run.worldThreat);
  const view=previewNextWorldThreat(run);
  assert.equal(view.base,0);
  assert.equal(view.nodes.length,1);
  assert.equal(view.nodes[0].id,availableNodes(run.map,null)[0].id);
  assert.ok(view.range.min>=5,'stronger grafted hero should see adaptive pressure on map');
  assert.equal(view.range.max,view.range.min);
  assert.match(threatPreviewLabel(view),/Stored 0\/12 · Next battle \d+\/12/);
  assert.equal(JSON.stringify(run.worldThreat),base,'UI calculation must never modify saved level');
  enterNode(run,view.nodes[0].id);
  assert.equal(run.battle.worldThreat,view.range.min,
    'map forecast must exactly match battle actually created for the same node');
});
test('ordinary weak builds see no surprise battle pressure and save stays unchanged',()=>{
  const run=newRun({seed:41,tutorial:false});
  const view=previewNextWorldThreat(run);
  assert.deepEqual(view.range,{min:0,max:0});
  assert.equal(view.base,0);
  assert.equal(threatPreviewLabel(view),'Stored 0/12 · Next battle 0/12');
  assert.equal(effectiveThreatLevel(run.worldThreat,{strength:1,expected:3}),0);
});
test('the scripted opening tutorial accurately reports that World Threat is disabled',()=>{
  const run=newRun({seed:99,tutorial:true});
  const preview=previewNextWorldThreat(run);
  assert.equal(preview.base,0);
  assert.equal(preview.tutorial,true);
  assert.equal(preview.range,null);
  assert.equal(threatPreviewLabel(preview),'Stored 0/12 · Tutorial has no Threat');
});
test('old saves with missing threat state render cleanly and established threat is displayed',()=>{
  const run=newRun({seed:42,tutorial:false});delete run.worldThreat;
  assert.equal(previewNextWorldThreat(run).base,0);
  run.worldThreat={level:11,flawlessStreak:0};
  const p=previewNextWorldThreat(run);
  assert.equal(p.base,11);
  assert.ok(p.range.min>=11);
  assert.match(threatPreviewLabel(p),/Stored 11\/12/);
});
test('map preview safely handles reachable shrines/events without presenting them as battles',()=>{
  const run=newRun({seed:73,tutorial:false});
  run.map=generateMap(run.seed,{act:0});
  const node=run.map.nodes.find(n=>n.next.length&&n.next.every(id=>{
    const child=run.map.nodes.find(x=>x.id===id);
    return child.type==='shrine'||child.type==='event';
  }));
  if(node){
    run.current=node.id;
    const p=previewNextWorldThreat(run);
    assert.equal(p.nodes.length,0);
    assert.equal(p.range,null);
    assert.match(threatPreviewLabel(p),/Next battle adapts/);
  }
  assert.deepEqual(previewNextWorldThreat(null),{base:0,range:null,nodes:[]});
});
test('UI source renders same pure forecast visibly and in accessible label',()=>{
  const src=readFileSync(new URL('../src/ui/screens.js',import.meta.url),'utf8');
  assert.ok(src.includes("import {previewNextWorldThreat,threatPreviewLabel} from '../engine/threat-preview.js';"));
  assert.ok(src.includes('const threatPreview=previewNextWorldThreat(run);'));
  assert.ok(src.includes('aria-label="World Threat: ${esc(threatPreviewLabel(threatPreview))}"'));
  assert.ok(src.includes('⚔ World Threat · ${esc(threatPreviewLabel(threatPreview))}'));
  const preview=readFileSync(new URL('../src/engine/threat-preview.js',import.meta.url),'utf8');
  for(const forbidden of ['Math.random','localStorage','window.','fetch(','run.worldThreat ='])
    assert.equal(preview.includes(forbidden),false,'preview may not mutate saved run or RNG');
});
