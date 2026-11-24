import test from 'node:test';
import assert from 'node:assert/strict';
import { allyGearFrames } from '../src/rendering/equipment-visuals.js';
import { formatSpellText } from '../src/engine/spells.js';
import { installReferenceSet } from '../src/cards/reference-set.js';
import { referenceCards } from '../src/cards/catalog.js';
installReferenceSet();

test('native rectangular atlas maps named views, states and active frames to gear overlay',()=>{
 const animations={idle:{row:0,frames:6},walk:{row:1,frames:8},attack:{row:2,frames:5},cast:{row:3,frames:6},hurt:{row:4,frames:4},defeat:{row:5,frames:5}};
 const frames=allyGearFrames({width:8*96,height:4*6*128},96,8,{height:128,views:['front','back','left','right'],animations});
 const pick=(row,col)=>frames.find(f=>f.row===row&&f.col===col);
 assert.deepEqual(pick(8,4),{row:8,col:4,gearRow:7,gearCol:3,width:96,height:128});
 assert.equal(pick(14,4).gearRow,2);
 assert.equal(pick(23,4).gearRow,4);
 assert.equal(pick(8,5),undefined);
 assert.ok(frames.every(f=>f.gearCol>=0&&f.gearCol<4&&f.gearRow>=0&&f.gearRow<10));
});
test('all current spells have complete level-scaled descriptions',()=>{
 for(const c of referenceCards().filter(c=>c.kind==='spell'))for(let level=1;level<=3;level++){
  const text=formatSpellText(c.id,level,2);
  assert.ok(!/undefined|NaN|\{\d+\}/.test(text),c.id+' '+text);
 }
 assert.match(formatSpellText('mtg:disfigure',1,0),/Weaken it by 2: it strikes for 2 less/);
 assert.match(formatSpellText('mtg:giant-growth',1,0),/\+3\/\+3/);
 assert.match(formatSpellText('mtg:titanic-growth',1,0),/\+4\/\+4/);
 for(const id of ['mtg:healing-hands','mtg:revitalize'])assert.match(formatSpellText(id),/draw one card/);
});
