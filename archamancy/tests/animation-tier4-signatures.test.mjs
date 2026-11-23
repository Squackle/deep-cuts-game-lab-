import test from 'node:test';
import assert from 'node:assert/strict';
import {createFx,tierFourCastSignature} from '../fx.mjs';

const roster={
 judgment:{kind:'strike',color:'W'},arcanum:{kind:'arcane',color:'U'},
 hex:{kind:'hex',color:'B'},storm:{kind:'chain',color:'R'},
 thorn:{kind:'root',color:'G'},mirror:{kind:'mirror',color:'U'},
 grove:{kind:'farm',color:'G'},goblin:{kind:'troops',color:'R'}
};
function scene(tower={uid:7,tier:4,kind:'judgment',branch:'A'}){
 const t={...tower},state={enemies:[],troops:[],commander:null,projectiles:[],
  events:[{type:'towerAttack',source:0,seq:1}],towers:{0:t},sequence:1,tick:10};
 return {state,map:{pads:[{x:320,y:190}]},roster,types:{},
  pointAt:()=>({x:0,y:0})};
}
function fakeCanvas(){
 const log=[];
 const ctx={canvas:{width:1000,height:600},
  save(){},restore(){},beginPath(){},closePath(){},moveTo(){},lineTo(){},
  quadraticCurveTo(){},arc(){},ellipse(){},fill(){},
  stroke(){log.push('stroke')},rotate(){},translate(x,y){log.push(['translate',x,y])},
  fillRect(){},strokeText(){},fillText(){}};
 return {ctx,log};
}
test('all five schools have distinct visual identities; branches choose opposite sweeps',()=>{
 const schools=[['judgment','W'],['arcanum','U'],['hex','B'],['storm','R'],['thorn','G']];
 for(const [kind,motif] of schools){
  const a=tierFourCastSignature({tier:4,branch:'A'},roster[kind]);
  const b=tierFourCastSignature({tier:4,branch:'B'},roster[kind]);
  assert.equal(a.motif,motif);assert.equal(a.turn,1);assert.equal(b.turn,-1);
  assert.match(a.color,/^#[0-9a-f]{6}$/i);
 }
 assert.equal(tierFourCastSignature({tier:3,branch:'B'},roster.judgment),null);
 assert.equal(tierFourCastSignature({tier:4,branch:'A'},roster.grove),null);
 assert.equal(tierFourCastSignature({tier:4},roster.goblin),null);
 assert.equal(tierFourCastSignature({tier:4},null),null);
});
test('a Tier IV tower attack emits a short accent at the pad rather than at an enemy',()=>{
 const {ctx,log}=fakeCanvas(),fx=createFx(ctx),game=scene();
 const before=JSON.stringify(game.state);
 const cues=fx.update(game,1000);
 assert.deepEqual(cues,[{type:'sound',name:'shot_strike',x:320}]);
 assert.equal(JSON.stringify(game.state),before,'VFX must never change rules/state');
 fx.draw(1200);
 assert.ok(log.some(x=>Array.isArray(x)&&x[0]==='translate'&&x[1]===320&&x[2]===158));
 assert.ok(log.includes('stroke'),'signature should draw original line art');
});
test('attacks at low tiers or from non-aimed towers add no cast signature',()=>{
 for(const tower of [{uid:1,tier:3,kind:'judgment',branch:'A'},
  {uid:2,tier:4,kind:'grove',branch:'B'}]){
  const {ctx,log}=fakeCanvas(),fx=createFx(ctx),game=scene(tower);
  fx.update(game,1000);fx.draw(1100);
  assert.equal(log.some(x=>Array.isArray(x)&&x[0]==='translate'),false);
 }
});
test('repeated attacks are throttled; reset clears cooldown for the next run',()=>{
 const {ctx,log}=fakeCanvas(),fx=createFx(ctx),game=scene();
 fx.update(game,1000);
 for(let i=2;i<=30;i++){
  game.state.events=[{type:'towerAttack',source:0,seq:i}];
  game.state.sequence=i;
  fx.update(game,1000+i*10);
 }
 fx.draw(1320);
 assert.equal(log.filter(x=>Array.isArray(x)&&x[0]==='translate').length,1);
 fx.reset();fx.update({...game,state:{...game.state,sequence:31,events:[{type:'towerAttack',source:0,seq:31}]}},1340);
 fx.draw(1450);
 assert.equal(log.filter(x=>Array.isArray(x)&&x[0]==='translate').length,2);
});
test('reduced-motion preference suppresses new cast geometry',()=>{
 const prev=globalThis.matchMedia;
 try{
  globalThis.matchMedia=()=>({matches:true});
  const {ctx,log}=fakeCanvas(),fx=createFx(ctx);
  fx.update(scene(),1000);fx.draw(1100);
  assert.equal(log.some(x=>Array.isArray(x)&&x[0]==='translate'),false);
 }finally{
  if(prev===undefined)delete globalThis.matchMedia;else globalThis.matchMedia=prev;
 }
});
