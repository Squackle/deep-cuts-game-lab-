import test from 'node:test';
import assert from 'node:assert/strict';
import { newRun } from '../src/engine/run.js';
import { visualForRun,skinToneForSeed,SKIN_PALETTES } from '../src/engine/visual-identity.js';
import { resolveAnatomy,anatomyAnchor,MORPH_REGIONS } from '../src/engine/anatomy-resolver.js';
import { deriveAppearance } from '../src/engine/appearance.js';
import { registerReferenceCards } from '../src/cards/catalog.js';
import { EQUIPMENT_PRINTINGS,gearKinds } from '../src/rendering/gear-art.js';
import { BOSS_PRINTINGS,LEGENDARY_BOSS_KEYS,installLegendaryBosses } from '../src/rendering/legendary-boss-art.js';
import { ENEMIES } from '../src/data/enemies.js';

registerReferenceCards([
  {reference:true,id:'test:dragon',kind:'creature',type:'Dragon',parts:{wings:1,horns:1,tail:1}},
  {reference:true,id:'test:cat',kind:'creature',type:'Cat',parts:{claws:1,tail:1}},
  {reference:true,id:'test:treefolk',kind:'creature',type:'Treefolk',parts:{moss:1}},
  {reference:true,id:'test:insect',kind:'creature',type:'Insect',parts:{wings:1}}
]);
const evo=(parts,ids=[])=>({parts,absorbed:ids.map(cardId=>({cardId})),colors:{},power:1,toughness:1});
test('cosmetic identity persists from existing saves without consuming gameplay RNG',()=>{
  const a=newRun({seed:12345}),b=newRun({seed:12345});
  assert.equal(a.visual.skinTone,b.visual.skinTone);
  assert.equal(visualForRun(a).skinTone,skinToneForSeed(a.seed));
  assert.equal(visualForRun({seed:12345}).skinTone,a.visual.skinTone);
  assert.equal(SKIN_PALETTES.length,12);
  assert.equal(new Set(Array.from({length:100},(_,i)=>skinToneForSeed(12,i))).size,12);
});
test('coexisting physical grafts resolve simultaneously; they do not silently hide wings, shell or spikes',()=>{
  const state=evo({wings:1,shell:1,spikes:2,horns:1,antlers:2,crown:1,tail:1,armor:1,claws:2,blades:1,tusks:1,beak:2,venom:1,moss:1,eyes:1,tendrils:1});
  const a=resolveAnatomy(state);
  for(const p of ['wings','shell','spikes','horns','antlers','crown','tail','armor','claws','blades','tusks','beak']) assert.ok(a.physical.includes(p),p);
  assert.deepEqual(a.regions.back,['wings','shell','spikes']);
  assert.ok(a.regions.head.includes('horns') && a.regions.head.includes('antlers'));
  assert.equal(a.features.spikes,2);
});
test('dragon+cat and insect+plant yield distinct, deterministic mixed anatomy',()=>{
  const a=resolveAnatomy(evo({wings:1,horns:1,claws:1},['test:dragon','test:cat']));
  assert.equal(a.morph.primary,'feline'===a.morph.primary?'feline':'draconic');
  assert.ok(a.families.includes('feline')&&a.families.includes('draconic'));
  assert.equal(a.morph.surface,'scales');
  const b=resolveAnatomy(evo({wings:1,moss:1},['test:insect','test:treefolk']));
  assert.ok(b.families.includes('insectoid')&&b.families.includes('arboreal'));
  assert.notDeepEqual(a.morph,b.morph);
  assert.deepEqual(a,resolveAnatomy(evo({wings:1,horns:1,claws:1},['test:dragon','test:cat'])));
  assert.deepEqual(anatomyAnchor(a,'head',[32,18]),[32,18]);
  assert.ok(MORPH_REGIONS.includes('pelvis'));
});
test('visual changes cannot add equipment effects or alter combat stats',()=>{
  const x=evo({wings:3,claws:1,armor:2},['test:dragon']);
  const app=deriveAppearance(x,{skinTone:7});
  assert.equal(app.skinTone,7);assert.equal(app.anatomy.features.wings,3);
  assert.equal(x.power,1);assert.equal(x.toughness,1);
  assert.deepEqual(gearKinds(['mtg:moonsilver-spear','mtg:basilisk-collar']),['spear','collar']);
});
test('every implemented legendary boss has independent art, valid printed identity and a live enemy sprite key',()=>{
  assert.equal(LEGENDARY_BOSS_KEYS.length,6);
  for(const name of LEGENDARY_BOSS_KEYS){
   assert.equal(ENEMIES[name].sprite,'mtg_'+name,name);
   assert.ok(BOSS_PRINTINGS[name]?.name&&BOSS_PRINTINGS[name]?.set);
  }
  assert.equal(Object.keys(EQUIPMENT_PRINTINGS).length,7);
  assert.ok(EQUIPMENT_PRINTINGS['mtg:skullclamp']&&EQUIPMENT_PRINTINGS['mtg:shadowspear']);
  for(const val of Object.values(EQUIPMENT_PRINTINGS))assert.ok(val.set&&val.character);
});
class CanvasMock{
  constructor(){this._w=0;this._h=0;this.buf=null;this.ctx=null}
  set width(v){this._w=v;this.buf=null;this.ctx=null}
  set height(v){this._h=v;this.buf=null;this.ctx=null}
  get width(){return this._w}get height(){return this._h}
  getContext(){if(!this.ctx){this.buf=new Uint8Array(this._w*this._h*4);this.ctx=new Ctx(this)}return this.ctx}
}
class Ctx{
  constructor(c){this.canvas=c;this.x=0;this.y=0;this.stack=[];this.fillStyle='#000000'}
  save(){this.stack.push([this.x,this.y,this.fillStyle])}
  restore(){[this.x,this.y,this.fillStyle]=this.stack.pop()}
  translate(x,y){this.x+=x;this.y+=y}
  fillRect(x,y,w,h){let c=this.canvas;const rgb=Number.parseInt(this.fillStyle.slice(1),16),s=[(rgb>>16)&255,(rgb>>8)&255,rgb&255,255];
    for(let yy=Math.max(0,Math.round(y+this.y));yy<Math.min(c.height,Math.round(y+this.y+h));yy++)for(let xx=Math.max(0,Math.round(x+this.x));xx<Math.min(c.width,Math.round(x+this.x+w));xx++)c.buf.set(s,(yy*c.width+xx)*4);
  }
}
test('actual authored boss frames render distinct RGBA pixels in normal and attack poses',()=>{
  const old=globalThis.document;globalThis.document={createElement:()=>new CanvasMock()};
  try{
   const images={},manifest={sprites:{}};installLegendaryBosses(images,manifest);
   const hashes=new Set();
   for(const name of LEGENDARY_BOSS_KEYS){
    const key='mtg_'+name,canvas=images[key],meta=manifest.sprites[key];
    assert.equal(meta.w,112);assert.equal(canvas.width,448);
    const advanced=LEGENDARY_BOSS_KEYS.includes(name);
    assert.equal(canvas.height,advanced?1344:1120);
    if(advanced){
      assert.equal(meta.anims.defeat.row,5);
      assert.deepEqual(meta.views,['front','back']);
      assert.equal(meta.artPack,'advanced-boss-motion-v1');
    }else assert.equal(meta.anims,undefined);
    const data=canvas.buf;assert.ok(data);
    const h=Array.from(data).reduce((n,v,i)=>((n*31+v+i)%2147483647),1);
    hashes.add(h);
    const alpha=(y)=>{let count=0;for(let row=y;row<y+112;row++)for(let col=0;col<112;col++)if(data[(row*canvas.width+col)*4+3])count++;return count;};
    assert.ok(alpha(0)>170,name+' idle should contain detailed pixels');
    assert.ok(alpha(2*112)>170,name+' attack should contain detailed pixels');
   }
   assert.equal(hashes.size,6,'no two legendary identities may share a model');
  }finally{globalThis.document=old;}
});
