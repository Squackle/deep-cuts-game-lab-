/** Original miniature pixel equipment, authored for specific MTG printings (reference only,
 * never copied card-image pixels). Uses graft body anchors instead of fixed 48px offsets. */
import { ANCHORS } from './anatomy.js';
import { anatomyAnchor } from '../engine/anatomy-resolver.js';
export const EQUIPMENT_PRINTINGS=Object.freeze({
 'mtg:accorder-s-shield':{set:'Scars of Mirrodin',character:'Faceted broad alloy shield; silver face, riveted rim, etched geometric device'},
 'mtg:basilisk-collar':{set:'Worldwake',character:'Broad dark scaled neckband with small curved fangs and linked tooth ornaments'},
 'mtg:swiftfoot-boots':{set:'Magic 2012',character:'Warm leather enchanted boots with shining brass bindings and luminous soles'},
 'mtg:mask-of-memory':{set:'Mirrodin',character:'Inscribed metal face mask with pronounced brow and paired narrow eye openings'},
 'mtg:moonsilver-spear':{set:'Avacyn Restored',character:'Long luminous moon-silver spear with stylized silver spearhead and crossguard'},
});
const KIND={'mtg:accorder-s-shield':'shield','mtg:basilisk-collar':'collar','mtg:swiftfoot-boots':'boots','mtg:mask-of-memory':'mask','mtg:moonsilver-spear':'spear'};
export const gearKinds=ids=>[...new Set((ids||[]).map(i=>KIND[i]).filter(Boolean))];
function p(g,x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));}
function line(g,x0,y0,x1,y1,c,w=1){let n=Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0)));for(let i=0;i<=n;i++){let t=i/Math.max(1,n);p(g,x0+(x1-x0)*t,y0+(y1-y0)*t,w,w,c);}}
function shape(g,a,color,edge='#26323c'){for(let y=Math.floor(Math.min(...a.map(v=>v[1])));y<=Math.ceil(Math.max(...a.map(v=>v[1])));y++){
 let xs=[];for(let i=0;i<a.length;i++){const [x0,y0]=a[i],[x1,y1]=a[(i+1)%a.length];if(y+.5>=Math.min(y0,y1)&&y+.5<Math.max(y0,y1)&&y0!==y1)xs.push(x0+(y+.5-y0)*(x1-x0)/(y1-y0));}xs.sort((u,v)=>u-v);for(let k=0;k+1<xs.length;k+=2)for(let x=Math.ceil(xs[k]);x<xs[k+1];x++)p(g,x,y,1,1,color);}
 if(edge)for(let i=0;i<a.length;i++)line(g,...a[i],...a[(i+1)%a.length],edge,1);
}
function anchor(app,k){return anatomyAnchor(app?.anatomy,k,ANCHORS.hero[k])||ANCHORS.hero[k]||[32,32]}
function paint(g,app,kind,anim,f,back){
 const bob=anim===1?(f%2):anim===0?(f>1?1:0):0;
 const [hx,hy]=anchor(app,'face'),[nx,ny]=anchor(app,'neck'),[lx,ly]=anchor(app,'forearmLeft'),[rx,ry]=anchor(app,'gripRight');
 if(kind==='boots'){
  for(const k of ['footLeft','footRight']){let [x,y]=anchor(app,k);x-=3;y-=7;const widen=(app.anatomy?.morph?.lower==='ungulate'?2:0);
   shape(g,[[x-1-widen,y],[x+6+widen,y],[x+7+widen,y+8],[x-2-widen,y+8]],'#8d5c36');
   p(g,x+1,y+2,3,4,'#cda16c');p(g,x-1-widen,y+7,9+widen*2,2,'#edca78');
   line(g,x,y+1,x+5,y+1,'#f3df9a');p(g,x+3,y+4,1,2,'#f9db88');
  }return;
 }
 if(kind==='collar'){
  shape(g,[[nx-7,ny-1+bob],[nx+7,ny-1+bob],[nx+6,ny+4+bob],[nx-6,ny+4+bob]],'#4b4539');
  line(g,nx-6,ny+bob,nx+6,ny+bob,'#d6c18a');
  for(let i=-3;i<=3;i++){const x=nx+i*2;p(g,x,ny+1+bob,1,1,'#e8dbaf');if(i%2===0)shape(g,[[x,ny+2+bob],[x+2,ny+2+bob],[x+1,ny+5+bob]],'#c8c0a2');}return;
 }
 if(kind==='mask'){
  const mask=app.anatomy?.morph?.head==='draconic',wide=mask?9:8;
  shape(g,[[hx-wide,hy-7+bob],[hx+wide,hy-7+bob],[hx+wide-1,hy+4+bob],[hx,hy+7+bob],[hx-wide+1,hy+4+bob]],'#8c8f93');
  line(g,hx-wide+2,hy-5+bob,hx+wide-2,hy-5+bob,'#e7d9ad');
  line(g,hx-4,hy-3+bob,hx-1,hy-3+bob,'#292f41',2);line(g,hx+2,hy-3+bob,hx+5,hy-3+bob,'#292f41',2);
  p(g,hx-1,hy+2+bob,2,3,'#d6c98b');p(g,hx-5,hy+4+bob,2,1,'#d8be75');p(g,hx+4,hy+4+bob,2,1,'#d8be75');return;
 }
 if(kind==='shield'){
  const x=lx-8,y=ly-13+bob;
  shape(g,[[x,y],[x+10,y-2],[x+17,y+2],[x+16,y+17],[x+9,y+22],[x+2,y+17]],'#6d8390');
  shape(g,[[x+2,y+2],[x+10,y],[x+15,y+3],[x+14,y+15],[x+9,y+18],[x+4,y+15]],'#b4bec0');
  line(g,x+9,y+1,x+9,y+18,'#42596c');line(g,x+4,y+9,x+14,y+9,'#42596c');
  for(const [ox,oy] of [[3,3],[13,3],[4,15],[12,15]])p(g,x+ox,y+oy,2,2,'#e9d699');return;
 }
 if(kind==='spear'){
  const x=rx+3,y=ry+3+bob,raised=anim===2&&f<3;
  const tx=x+(raised?8:1),ty=raised?2:7;
  line(g,x,y+9,tx,ty+13,'#564439',4);line(g,x+1,y+9,tx+1,ty+13,'#b5a78a',1);
  shape(g,[[tx-2,ty+14],[tx-5,ty+7],[tx-2,ty+2],[tx,ty-7],[tx+2,ty+2],[tx+5,ty+7],[tx+2,ty+14]],'#c7d1d5');
  line(g,tx,ty-5,tx,ty+13,'#fff7d9');line(g,tx-4,ty+13,tx+4,ty+13,'#8cacc0',2);
  p(g,tx-1,ty+8,2,2,'#eef8ff');return;
 }
}
export function drawEquipmentSheet(g,app,ids){
 const types=gearKinds(ids);
 for(let view=0;view<2;view++)for(let anim=0;anim<5;anim++)for(let f=0;f<4;f++){
  g.save();g.translate(f*64,(view*5+anim)*64);
  for(const t of types)paint(g,app,t,anim,f,!!view);
  g.restore();
 }
}
