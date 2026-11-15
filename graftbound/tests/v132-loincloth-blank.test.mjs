import test from 'node:test';
import assert from 'node:assert/strict';
import { drawHero } from '../src/rendering/premium-creatures.js';
import { renderGraftFrame } from '../src/rendering/graft-morphology.js';
import { deriveAppearance } from '../src/engine/appearance.js';

/** Deterministic pixel inspection of the same canvas drawing functions used by
 * the real sprite atlas. No screenshot or browser dependency is required. */
class PixelContext {
  constructor(size=64){this.size=size;this.colors=Array(size*size).fill(null);this.fillStyle='#000000';this.globalCompositeOperation='source-over';this.stack=[];this.dx=0;this.dy=0;}
  save(){this.stack.push([this.dx,this.dy,this.fillStyle,this.globalCompositeOperation]);}
  restore(){[this.dx,this.dy,this.fillStyle,this.globalCompositeOperation]=this.stack.pop();}
  translate(x,y){this.dx+=x;this.dy+=y;}
  fillRect(x,y,w,h){
    const x0=Math.round(x+this.dx),y0=Math.round(y+this.dy),width=Math.round(w),height=Math.round(h);
    for(let yy=Math.max(0,y0);yy<Math.min(this.size,y0+height);yy++)
      for(let xx=Math.max(0,x0);xx<Math.min(this.size,x0+width);xx++)
        this.colors[yy*this.size+xx]=this.globalCompositeOperation==='destination-out'?null:this.fillStyle;
  }
  at(x,y){return this.colors[y*this.size+x];}
}
const draw=(view=0,anim=0,frame=0)=>{const art=new PixelContext(),mask=new PixelContext();drawHero(art,mask,view,anim,frame);return {art,mask};};
const blankEvo=(parts={})=>({power:1,toughness:1,parts,absorbed:[],colors:{}});

test('starting Blank has bare chest, uncovered arms and bare feet with skin mask',()=>{
  for(const view of [0,1]){
    const {art,mask}=draw(view);
    for(const [x,y,part] of [[32,35,'chest'],[19,33,'arm'],[32,18,'head'],[26,58,'foot']]){
      assert.equal(mask.at(x,y),'#ffffff',view+' '+part+' must be skin, not clothing');
      assert.ok(art.at(x,y),view+' '+part+' must be drawn');
    }
  }
});

test('the only default garment is a brown groin wrap, excluded precisely from the skin mask',()=>{
  const {art,mask}=draw();
  assert.ok(['#7c5743','#a67b5a','#4a332b','#d2a477'].includes(art.at(32,46)),'brown cloth over groin');
  assert.equal(mask.at(32,46),null,'cloth must never change color with skin palette');
  assert.equal(mask.at(22,48),'#ffffff','exposed thigh beside cloth remains skin masked');
  assert.equal(mask.at(26,58),'#ffffff','bare foot below wrap remains skin masked');
  const forbidden=['#344453','#667d83','#abb8aa','#303b40','#56666a','#718185','#97a4a0'];
  for(const color of forbidden)assert.ok(!art.colors.includes(color),color+' must not appear as default vest, pants or boots');
});

test('walk, cast, attack and hurt frames preserve the cloth and full-body skin variation',()=>{
  for(const view of [0,1])for(const anim of [0,1,2,3,4])for(let frame=0;frame<4;frame++){
    const {art,mask}=draw(view,anim,frame);
    assert.ok(art.colors.some(color=>['#7c5743','#a67b5a','#4a332b'].includes(color)),view+':'+anim+':'+frame+' groin cloth');
    assert.ok(mask.colors.includes('#ffffff'),view+':'+anim+':'+frame+' skin');
    assert.ok(art.colors.filter(Boolean).length>250,'non-empty posed character');
  }
});

test('armor is added only when an armor graft is actually present',()=>{
  for(const [parts,expectArmor] of [[{},false],[{claws:1},false],[{armor:1},true],[{armor:2,claws:1},true]]){
    const app=deriveAppearance(blankEvo(parts),{skinTone:5}),g=new PixelContext();
    renderGraftFrame(g,app,0,0,0,'front');
    assert.equal(g.colors.includes('#607a85'),expectArmor,JSON.stringify(parts));
  }
});
