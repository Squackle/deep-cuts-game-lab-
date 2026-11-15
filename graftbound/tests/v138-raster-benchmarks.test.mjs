import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BENCHMARKS,BENCHMARK_STATES,BENCHMARK_POSES,BENCHMARK_VIEWS,poseFor,validateBenchmarkAsset,installRasterBenchmarks} from '../src/rendering/raster-benchmarks.js';
const readPNG=(name)=>{
  const bytes=readFileSync(new URL(`../assets/hd2d/benchmarks/${name}`,import.meta.url));
  assert.equal(bytes.subarray(1,4).toString('utf8'),'PNG');
  return {w:bytes.readUInt32BE(16),h:bytes.readUInt32BE(20),bytes};
};
test('approved raster source assets and skin material masks are shipped as reproducible PNG bytes',()=>{
  for(const asset of BENCHMARKS){
    const source=readPNG(asset.file);
    assert.equal(source.w,asset.size*4);
    assert.equal(source.h,asset.size*2);
    assert.ok(source.bytes.length>10000,asset.key+' is an actual authored raster, not a placeholder');
    if(asset.mask){const m=readPNG(asset.mask);assert.equal(m.w,source.w);assert.equal(m.h,source.h);}
  }
});
test('three existing runtime identities, including the graft-enabled Blank, retain their identity',()=>{
  assert.deepEqual(BENCHMARKS.map(b=>b.key),['blank','mtg_friendlySoldier','mtg_friendlySquirrel']);
  assert.deepEqual(BENCHMARKS.map(b=>b.size),[128,128,96]);
  assert.deepEqual(BENCHMARK_VIEWS,['front','back']);
  assert.deepEqual(Object.keys(BENCHMARK_STATES),['idle','walk','attack','cast','hurt']);
});
test('actual authored front idle/walk/attack source poses are distinct, not static sliding or color variants',()=>{
  for(const state of ['idle','walk','attack']){
    assert.ok(new Set(BENCHMARK_POSES[state]).size>1,state+' needs distinct authored art poses');
    for(let f=0;f<4;f++)assert.equal(poseFor(state,f,0),BENCHMARK_POSES[state][f]);
  }
  assert.equal(poseFor('walk',2,1),6,'rear uses a separate authored view');
  assert.throws(()=>poseFor('wrong',0,0),/Unknown benchmark state/);
  assert.throws(()=>poseFor('walk',4,0),/Invalid benchmark frame/);
  assert.throws(()=>poseFor('walk',0,2),/Invalid benchmark directional view/);
  for(const [idx,state] of Object.keys(BENCHMARK_STATES).entries()){
    const meta=BENCHMARK_STATES[state];assert.equal(meta.row,idx);assert.equal(meta.frames,4);
  }
});
test('malformed source dimensions are rejected rather than producing misaligned native sprites',()=>{
  for(const b of BENCHMARKS){
    assert.ok(validateBenchmarkAsset({width:b.size*4,height:b.size*2},b));
    assert.throws(()=>validateBenchmarkAsset({width:64,height:64},b),/source atlas/);
  }
});
test('no changes to engine RNG, game state or save keys are needed to load display art',async()=>{
  assert.equal(await installRasterBenchmarks({}, {sprites:{}}, async()=>{throw new Error('Should not fetch without DOM');}),0);
  const source=readFileSync(new URL('../src/rendering/raster-benchmarks.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/Math\.random|localStorage|player\.hp\s*=|window\.location/);
  const loader=readFileSync(new URL('../src/rendering/sprites.js',import.meta.url),'utf8');
  assert.match(loader,/await installRasterBenchmarks\(images,manifest,img\)/);
  const raster=readFileSync(new URL('../src/rendering/raster-benchmarks.js',import.meta.url),'utf8');
  assert.match(raster,/BENCHMARKS\.map\(async asset=>/,'stage all three native benchmark assets atomically');
  const native=readFileSync(new URL('../src/rendering/native-blank-art.js',import.meta.url),'utf8');
  assert.match(native,/drawNativeBlankGraftSheet/);
  assert.match(native,/drawNativeBlankGearSheet/);
});