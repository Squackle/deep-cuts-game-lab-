import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BLANK_NATIVE_FRAME,blankNativeAnchor,drawNativeBlankGraftSheet,
  nativeBlankGearKinds,drawNativeBlankGearSheet } from '../src/rendering/native-blank-art.js';
import {BENCHMARK_STATES,BENCHMARKS} from '../src/rendering/raster-benchmarks.js';

const source=(path)=>readFileSync(new URL(path,import.meta.url),'utf8');
function spyCanvas(){
 const calls=[];
 const g={calls,save(){calls.push('save')},restore(){calls.push('restore')},
  translate(...p){calls.push(['translate',...p])},beginPath(){calls.push('beginPath')},
  moveTo(...p){calls.push(['moveTo',...p])},lineTo(...p){calls.push(['lineTo',...p])},
  closePath(){calls.push('closePath')},fill(){calls.push('fill')},stroke(){calls.push('stroke')},
  ellipse(...p){calls.push(['ellipse',...p])},
  bezierCurveTo(...p){calls.push(['bezier',...p])},
  quadraticCurveTo(...p){calls.push(['quad',...p])},
  createRadialGradient(...p){calls.push(['gradient',...p]);return {addColorStop(){}}}
 };
 return g;
}
const blank={anatomy:{stage:0,features:{},morph:{head:'neutral',surface:'skin',lower:'biped'}}};
const mutant={anatomy:{stage:9,features:{
  wings:2,tail:2,horns:2,claws:1,armor:2,moss:1,eyes:1,venom:1,spikes:1
 },morph:{head:'draconic',surface:'scales',wingKind:'membrane',tailKind:'scaled'}}};
test('Blank native artwork has 128px source frames and seven individually anchored source poses',()=>{
 assert.equal(BLANK_NATIVE_FRAME,128);
 assert.equal(BENCHMARKS[0].key,'blank');
 assert.equal(BENCHMARKS[0].size,128);
 assert.deepEqual(Object.keys(BENCHMARK_STATES),['idle','walk','attack','cast','hurt']);
 const resting=blankNativeAnchor('idle',0,0);
 const walking=blankNativeAnchor('walk',2,0);
 const punching=blankNativeAnchor('attack',1,0);
 const rear=blankNativeAnchor('walk',1,1);
 assert.notDeepEqual(resting.rightHand,punching.rightHand);
 assert.notDeepEqual(resting.leftFoot,walking.leftFoot);
 assert.notDeepEqual(resting.face,rear.face);
 for(const a of [resting,walking,punching,rear])for(const p of Object.values(a)){
  assert.equal(p.length,2);assert.ok(p.every(x=>Number.isFinite(x)&&x>=0&&x<128));
 }
});
test('initial Blank generates no anatomical overlays, armor or non-default clothing',()=>{
 const g=spyCanvas();drawNativeBlankGraftSheet(g,blank,'behind');
 drawNativeBlankGraftSheet(g,blank,'front');
 assert.equal(g.calls.filter(x=>x==='fill').length,0);
 assert.equal(g.calls.filter(x=>x==='stroke').length,0);
 const clean=spyCanvas();drawNativeBlankGearSheet(clean,[]);
 assert.equal(clean.calls.filter(x=>x==='fill').length,0);
 assert.equal(clean.calls.filter(x=>x==='stroke').length,0);
});
test('multiple grafts share native pose anchors and render genuinely distinct behind/front anatomy',()=>{
 const behind=spyCanvas(),front=spyCanvas();
 drawNativeBlankGraftSheet(behind,mutant,'behind');
 drawNativeBlankGraftSheet(front,mutant,'front');
 assert.ok(behind.calls.filter(x=>x==='fill').length>40,'tail, wings and spikes must draw real native art');
 assert.ok(front.calls.filter(x=>x==='fill').length>40,'scales, horns, claws, armor and moss must draw real native art');
 assert.deepEqual(behind.calls.filter(x=>Array.isArray(x)&&x[0]==='translate').length,40);
 assert.deepEqual(front.calls.filter(x=>Array.isArray(x)&&x[0]==='translate').length,40);
 const a=spyCanvas();drawNativeBlankGraftSheet(a,mutant,'front');
 assert.deepEqual(a.calls,front.calls,'sprite creation must be deterministic and replay safe');
 assert.throws(()=>drawNativeBlankGraftSheet(spyCanvas(),mutant,'invalid'),/Invalid Blank graft layer/);
});
test('grafted heads, treefolk surfaces and insectoid chitin are supported without losing the base human pose',()=>{
 for(const m of [
  {head:'feline',surface:'fur',wingKind:'feather'},
  {head:'beak',surface:'bark',wingKind:'feather'},
  {head:'neutral',surface:'chitin',wingKind:'membrane'}
 ]){
  const g=spyCanvas();
  drawNativeBlankGraftSheet(g,{anatomy:{stage:3,features:{wings:1,antlers:1,tail:1},morph:m}},'front');
  assert.ok(g.calls.filter(x=>x==='fill'||x==='stroke').length>=40);
 }
});
test('five card Equipment visuals use native anchors, while unknown items do not invent gear',()=>{
 const ids=['mtg:accorder-s-shield','mtg:basilisk-collar','mtg:swiftfoot-boots',
   'mtg:mask-of-memory','mtg:moonsilver-spear'];
 assert.deepEqual(nativeBlankGearKinds(ids),['shield','collar','boots','mask','spear']);
 assert.deepEqual(nativeBlankGearKinds(['mtg:unknown']),[]);
 const gear=spyCanvas();drawNativeBlankGearSheet(gear,ids);
 assert.ok(gear.calls.filter(x=>x==='fill').length>150);
 assert.equal(gear.calls.filter(x=>Array.isArray(x)&&x[0]==='translate').length,40);
});
test('runtime integration selects native graft and equipment painters without changing engine rules',()=>{
 const bench=source('../src/rendering/raster-benchmarks.js');
 const evo=source('../src/rendering/evolution-visuals.js');
 const equip=source('../src/rendering/equipment-visuals.js');
 assert.match(bench,/BENCHMARKS\.map\(async asset=>/);
 assert.match(evo,/if\(native\)drawNativeBlankGraftSheet\(g,app,pass\)/);
 assert.match(equip,/drawNativeBlankGearSheet\(g,ids\)/);
 for(const path of ['../src/rendering/native-blank-art.js','../src/rendering/raster-benchmarks.js'])
  assert.doesNotMatch(source(path),/Math\.random|localStorage|score\s*=|player\.hp\s*=/);
});
