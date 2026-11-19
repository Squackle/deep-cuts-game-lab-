import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeAshA, makeRisingEmber, makeCurlingFlame, makeArtFrames } from '../dev/animation-studio/pixel-art.js';
import { SmokeField } from '../dev/animation-studio/smoke-fluid.js';
const read = path => readFileSync(new URL(path,import.meta.url),'utf8');
const pix=(img)=>{const out=[];for(let i=0;i<img.data.length;i+=4){
 if(img.data[i+3]>0)out.push([img.data[i],img.data[i+1],img.data[i+2],img.data[i+3],i/4|0]);}return out;};
const centroidY=img=>{const p=pix(img);return p.reduce((s,a)=>s+Math.floor(a[4]/img.width),0)/Math.max(1,p.length);};
test('Ash A is a pure grayscale, low powder mound with no attached orange flame',()=>{
 const a=makeAshA(3),b=makeAshA(3),p=pix(a);
 assert.equal(a.width,48);assert.equal(a.height,29);
 assert.deepEqual([...a.data],[...b.data],'ash bitmap is deterministic for replay/reset');
 assert.ok(p.length>145&&p.length<900,'ash has discernible mound and scattered powder');
 assert.ok(p.every(([r,g,b])=>Math.abs(r-g)<=5&&Math.abs(g-b)<=8),
    'Ash A is pale grayscale powder, not bonfire rocks or glowing embers');
 assert.ok(p.some(([r])=>r>=180),'ash has pale dust highlights');
 assert.ok(p.some(([r])=>r<80),'ash has dark powdered depth');
 assert.ok(p.some(pixel=>Math.floor(pixel[4]/a.width)>15),'the dust pile occupies the lower area of its sprite');
 assert.ok(Math.min(...p.map(pixel=>Math.floor(pixel[4]/a.width)))<=11,
   'approved Ash A mound has a readable pale ridge, not just a ground-level dust line');
});
test('Rising Ember B animates an ascending, fading pixel cluster',()=>{
 const frames=Array.from({length:8},(_,i)=>makeRisingEmber(i));
 assert.ok(frames.every(f=>f.width===9&&f.height===13));
 assert.ok(centroidY(frames[7])<centroidY(frames[0])-4,'ember rises frame to frame');
 assert.ok(pix(frames[7]).some(a=>a[3]<255),'ember fades at the end');
 assert.ok(pix(frames[0]).some(([r,g,b])=>r>240&&g>180&&b>70),'hot core is present');
 assert.notDeepEqual([...frames[1].data],[...frames[5].data],'frames actually change');
});
test('Curling Flame C is pixel based, animated and asymmetrical without a triangular wedge',()=>{
 const frames=Array.from({length:8},(_,i)=>makeCurlingFlame(i));
 assert.ok(frames.every(f=>f.width===17&&f.height===23));
 assert.ok(frames.every(f=>pix(f).length>24),'visible clustered flame in each frame');
 assert.ok(frames.some(f=>pix(f).some(([r,g,b])=>r>245&&g>175&&b>50)),
  'yellow core remains visible');
 assert.ok(frames.some(f=>pix(f).some(([r,g,b])=>r>160&&g<100&&b<40)),
  'red-orange edges remain visible');
 assert.notDeepEqual([...frames[0].data],[...frames[4].data],'curl silhouette animates');
 const f=frames[3];
 const rows=[];
 for(let y=0;y<f.height;y++){
  const xs=[];
  for(let x=0;x<f.width;x++)if(f.data[(y*f.width+x)*4+3]>0)xs.push(x);
  if(xs.length)rows.push((Math.min(...xs)+Math.max(...xs))/2);
 }
 assert.ok(Math.max(...rows)-Math.min(...rows)>=3,
  'flame bends laterally rather than rising in a straight triangular spike');
});
test('sprite atlas contains one approved Ash A and both 8-frame fire effects',()=>{
 const a=makeArtFrames();
 assert.deepEqual(Object.keys(a),['ash','embers','flames']);
 assert.equal(a.embers.length,8);assert.equal(a.flames.length,8);
});
test('no vector flame triangles, smooth ember line strokes or old ash ellipses in studio render',()=>{
 const studio=read('../dev/animation-studio/studio.js');
 const solver=read('../dev/animation-studio/smoke-fluid.js');
 assert.match(studio,/createPixelAtlas\(document\)/);
 assert.match(studio,/pixelAtlas\.ash/);
 assert.match(studio,/tilePx\*1\.35/,'Ash A uses a tile-relative readable scale');
 assert.match(studio,/pixelAtlas\.flames\[frame\]/);
 assert.match(studio,/pixelAtlas\.embers\[frame\]/);
 assert.match(studio,/ctx\.imageSmoothingEnabled=false/);
 assert.match(studio,/drawPixelFire\(smoke,reduced\)/);
 assert.match(studio,/clipToArena\(ctx,sc,0\.04\)/);
 assert.doesNotMatch(studio,/function drawContainedFlames|ctx\.bezierCurveTo|ctx\.ellipse|function blob\(/);
 assert.doesNotMatch(solver,/ctx\.strokeStyle=p\.bright|ctx\.lineTo\(p\.x\*sx,p\.y\*sy\)/);
 assert.doesNotMatch(studio,/localStorage|sessionStorage|\/api\//);
});
test('small flames and embers remain emitted at caster and within wall bounds',()=>{
 const f=new SmokeField(56,56),o={x:.31,y:.68};
 for(let i=1;i<=100;i++)f.advanceTo(i/30,o);
 assert.ok(f.flames.length>0,'curled pixel flame particles still have physics');
 assert.ok(f.embers.length>0,'rising ember particles still have physics');
 for(const p of [...f.flames,...f.embers]) {
  assert.ok(p.x>=.7&&p.x<=f.w-1.7);
  assert.ok(p.y>=.7&&p.y<=f.h-1.7);
 }
 f.reset();
 assert.equal(f.flames.length,0);assert.equal(f.embers.length,0);
});
