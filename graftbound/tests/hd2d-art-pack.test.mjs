import test from 'node:test';
import assert from 'node:assert/strict';
import {REQUIRED_STATES,validateHd2dManifest,chooseSpriteDirection,installHd2dArtPack} from '../src/rendering/hd2d-art-pack.js';

const base = () => ({sprites:{
  blank:{w:64,h:64,pivotY:60},
  mtg_friendlySoldier:{w:64,h:64,pivotY:60},
  mtg_nemata:{w:112,h:112,pivotY:106}
}, views:['front','back'],cols:4,
  anims:{idle:{row:0,frames:4,fps:4,loop:true},
         walk:{row:1,frames:4,fps:10,loop:true},
         attack:{row:2,frames:4,fps:12,loop:false},
         cast:{row:3,frames:3,fps:8,loop:false},
         hurt:{row:4,frames:2,fps:8,loop:false}}});
const states=()=>Object.fromEntries(REQUIRED_STATES.map((key,row)=>
  [key,{row,frames:key==='walk'?8:4,fps:key==='walk'?10:8,loop:key==='idle'||key==='walk'}]));
const sample=(key='mtg_friendlySoldier')=>({
  key,file:'soldier/sheet.png',frameWidth:128,frameHeight:128,columns:8,
  pivotX:64,pivotY:119,views:['front','back','left','right'],animations:states(),
  ...(key === 'mtg_friendlySoldier' ? {skinMaskFile:'soldier/skin-mask.png'} : {}),
  anchors:{rightHand:[90,72],ground:[64,119]}
});
test("the empty approved-art intake leaves the current game's runtime untouched",async()=>{
  const manifest=base(),images={mtg_friendlySoldier:{width:256,height:640}};
  const old=structuredClone(manifest);
  const count=await installHd2dArtPack(images,manifest,async()=>({schemaVersion:1,units:[]}),
    async()=>{throw Error('must not request a PNG for empty manifest');});
  assert.equal(count,0);
  assert.deepEqual(manifest,old);
});
test('one native sheet replaces exactly one existing identity and preserves world/tile dimensions',async()=>{
  const manifest=base(),images={mtg_friendlySoldier:{width:256,height:640}};
  const oldBlank=structuredClone(manifest.sprites.blank);
  const native={width:1024,height:2560};
  const paths=[];
  const count=await installHd2dArtPack(images,manifest,async()=>({schemaVersion:1,units:[sample()]}),
    async(path)=>{paths.push(path);return native});
  assert.deepEqual(paths,['hd2d/soldier/sheet.png','hd2d/soldier/skin-mask.png']);
  assert.equal(count,1);assert.equal(images.mtg_friendlySoldier,native);
  assert.equal(images['mtg_friendlySoldier:skinMask'],native);
  assert.deepEqual(manifest.sprites.blank,oldBlank);
  const meta=manifest.sprites.mtg_friendlySoldier;
  assert.equal(meta.w,128);assert.equal(meta.h,128);
  assert.equal(meta.pixelScale,.5);assert.equal(meta.h*meta.pixelScale,64);
  assert.equal(meta.pivotY,119);assert.equal(meta.anims.walk.frames,8);
  assert.equal(meta.views.length,4);assert.deepEqual(meta.anchors.rightHand,[90,72]);
});
test('pack validation is atomic if one sheet is malformed',async()=>{
  const manifest=base(),images={mtg_friendlySoldier:{original:true},mtg_nemata:{original:true}};
  const before=structuredClone(manifest),unit=sample(),boss={...sample('mtg_nemata'),file:'boss/nemata.png'};
  await assert.rejects(installHd2dArtPack(images,manifest,async()=>({schemaVersion:1,units:[unit,boss]}),
    async path=>path.includes('nemata')?{width:8,height:8}:{width:1024,height:2560}),/sheet size/);
  assert.deepEqual(manifest,before);assert.deepEqual(images.mtg_friendlySoldier,{original:true});
});
test('unsafe, missing, duplicate, and unsupported art metadata is rejected rather than installed',()=>{
  const valid=sample(), pack=units=>({schemaVersion:1,units});
  const expectBad=(unit,pattern)=>assert.throws(()=>validateHd2dManifest(pack([unit]),base().sprites),pattern);
  expectBad({...valid,key:'mtg_notInRegistry'},/unknown runtime identity/);
  expectBad({...valid,key:'blank'},/needs a resolution-aware graft/);
  expectBad({...valid,file:'../escape.png'},/unsafe PNG path/);
  expectBad({...valid,file:'soldier//a.png'},/unsafe PNG path/);
  expectBad({...valid,skinMaskFile:undefined},/requires a native skinMaskFile/);
  expectBad({...valid,skinMaskFile:'../invalid.png'},/unsafe skin mask PNG path/);
  expectBad({...valid,columns:3},/invalid native frame/);
  expectBad({...valid,pivotY:129},/foot pivot/);
  expectBad({...valid,views:['front','front']},/requires distinct/);
  expectBad({...valid,views:['front','back','right','left','up']},/requires distinct/);
  expectBad({...valid,animations:{...states(),hurt:undefined}},/missing required state/);
  expectBad({...valid,animations:{...states(),walk:{row:9,frames:8,fps:10,loop:true}}},/contiguous/);
  assert.throws(()=>validateHd2dManifest(pack([valid,valid]),base().sprites),/duplicate identity/);
});
test('four-direction art uses explicit side pixels and does not mirror asymmetric gear',()=>{
  const four=['front','back','left','right'],two=['front','back'];
  assert.deepEqual(chooseSpriteDirection(four,-1,0),{index:0,flip:false});
  assert.deepEqual(chooseSpriteDirection(four,1,0),{index:1,flip:false});
  assert.deepEqual(chooseSpriteDirection(four,0,-1),{index:2,flip:false});
  assert.deepEqual(chooseSpriteDirection(four,0,1),{index:3,flip:false});
  assert.deepEqual(chooseSpriteDirection(two,0,1),{index:0,flip:true});
  assert.deepEqual(chooseSpriteDirection(two,0,-1),{index:0,flip:false});
});

test('a mismatched Soldier skin mask rejects the entire batch without changing active art',async()=>{
  const manifest=base(),old=structuredClone(manifest),images={mtg_friendlySoldier:{id:'legacy'}};
  await assert.rejects(installHd2dArtPack(images,manifest,
    async()=>({schemaVersion:1,units:[sample()]}),
    async path=>path.includes('skin-mask')?{width:32,height:32}:{width:1024,height:2560}),/skin mask size/);
  assert.deepEqual(manifest,old);
  assert.deepEqual(images.mtg_friendlySoldier,{id:'legacy'});
  assert.equal(images['mtg_friendlySoldier:skinMask'],undefined);
});

test('successive replacements of the 128px benchmark always preserve original 64px world height',async()=>{
  const manifest=base(),images={mtg_friendlySoldier:{id:'raster'}};
  manifest.sprites.mtg_friendlySoldier={w:128,h:128,pivotY:123,pixelScale:0.5,artPack:'owner-raster-benchmarks-v1'};
  for (const frame of [96,160,128]) {
    const u={...sample(),frameWidth:frame,frameHeight:frame,pivotY:frame-5,pivotX:Math.floor(frame/2)};
    const pixels={width:frame*u.columns,height:frame*u.views.length*Object.keys(u.animations).length};
    await installHd2dArtPack(images,manifest,async()=>({schemaVersion:1,units:[u]}),async()=>pixels);
    const meta=manifest.sprites.mtg_friendlySoldier;
    assert.equal(meta.h,frame);
    assert.ok(Math.abs(meta.h*meta.pixelScale-64)<1e-9);
  }
});
