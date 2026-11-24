import test from 'node:test';
import assert from 'node:assert/strict';
import {REAL_CREATURE_MODELS as MODELS} from '../src/data/creature-models.js';
import {drawTokenStudyFrame,TOKEN_FRAME} from '../src/rendering/detailed-token-art.js';
import {arena,evoWith} from './helpers.mjs';
import {pilotPhaseStart} from '../src/engine/combo-triggers.js';

function record(view,state,frame,palette){
 const log=[];let depth=0;
 const op=(name,...args)=>{for(const v of args)if(typeof v==='number')assert.ok(Number.isFinite(v));log.push([name,...args]);};
 const g={save(){depth++;op('save')},restore(){depth--;op('restore')},createRadialGradient(...args){op('gradient',...args);return {addColorStop(...a){op('stop',...a)}}}};
 for(const name of ['beginPath','moveTo','lineTo','closePath','fill','stroke','ellipse','bezierCurveTo','rect','clip'])g[name]=(...args)=>op(name,...args);
 drawTokenStudyFrame(g,'saproling',view,state,frame,palette);assert.equal(depth,0);
 assert.ok(log.some(x=>x[0]==='rect'&&x.slice(1).join(',')==='0,0,'+TOKEN_FRAME+','+TOKEN_FRAME));
 return log;
}
test('Dedicated Saproling: all 48 direction/state/frame combinations draw deterministically, with distinct crest geometry',()=>{
 const palette=MODELS.friendlySaproling;assert.ok(palette.verdant);assert.equal(palette.feature,'saproling');
 for(let view=0;view<2;view++)for(let state=0;state<6;state++)for(let frame=0;frame<4;frame++){
   const a=record(view,state,frame,palette);assert.deepEqual(a,record(view,state,frame,palette));
   const b=record(view,state,frame,MODELS.friendlySproutling);
   assert.ok(a.filter(x=>x[0]==='lineTo').length>b.filter(x=>x[0]==='lineTo').length);
 }
});
test('Verdant Force produces one legal Saproling per phase until the board is full, not on repeated phase callbacks',()=>{
 const s=arena(['P.......','........','........','........','........','........','........','.......g'],{g:'grub'},{evo:evoWith('mtg:verdant-force')});
 const ev=[];for(let turn=1;turn<=40;turn++){s.turn=turn;for(const phase of ['player','enemy']){s.phase=phase;pilotPhaseStart(s,ev);const n=s.units.length;pilotPhaseStart(s,ev);assert.equal(s.units.length,n);}}
 const tokens=s.units.filter(u=>u.sourceGraft==='verdantForce');assert.ok(tokens.length>=20);assert.ok(s.units.length<=s.w*s.h);
 assert.equal(new Set(s.units.map(u=>u.x+','+u.y)).size,s.units.length);
 assert.ok(tokens.every(u=>u.name==='Saproling'&&u.power===1&&u.toughness===1&&u.colors.join()==='G'));
});
