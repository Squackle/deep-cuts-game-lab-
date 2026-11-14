/** Portable QA image from the exact browser sprite-authoring module, without a screenshot substitute claim. */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const require=createRequire(import.meta.url),sharp=require('sharp');
const NS=64;
const toRgb=c=>{const s=c.startsWith('#')?c.slice(1):'000000';const n=parseInt(s,16);return [(n>>16)&255,(n>>8)&255,n&255]};
class Canvas {
  constructor(){this._w=0;this._h=0;this.buf=null;this.ctx=null}
  set width(w){this._w=w;this.buf=null;this.ctx=null}
  set height(h){this._h=h;this.buf=null;this.ctx=null}
  get width(){return this._w};get height(){return this._h}
  getContext(){if(!this.ctx){this.buf=new Uint8ClampedArray(this._w*this._h*4);this.ctx=new Context(this)}return this.ctx}
}
class Context {
  constructor(canvas){this.canvas=canvas;this.fillStyle='#000000';this.tx=0;this.ty=0;this.stack=[]}
  save(){this.stack.push([this.tx,this.ty,this.fillStyle])}
  restore(){[this.tx,this.ty,this.fillStyle]=this.stack.pop()}
  translate(x,y){this.tx+=x;this.ty+=y}
  fillRect(x,y,w,h){const [r,g,b]=toRgb(this.fillStyle),c=this.canvas;
    for(let yy=Math.round(y+this.ty);yy<Math.round(y+this.ty+h);yy++)for(let xx=Math.round(x+this.tx);xx<Math.round(x+this.tx+w);xx++){
      if(xx<0||yy<0||xx>=c.width||yy>=c.height)continue;const i=(yy*c.width+xx)*4;
      c.buf.set([r,g,b,255],i);
    }
  }
  getImageData(x,y,w,h){const d=new Uint8ClampedArray(w*h*4),c=this.canvas;
    for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
      const sy=y+yy,sx=x+xx;if(sx<0||sy<0||sx>=c.width||sy>=c.height)continue;
      d.set(c.buf.slice((sy*c.width+sx)*4,(sy*c.width+sx)*4+4),(yy*w+xx)*4);
    }return {data:d,width:w,height:h};
  }
  putImageData(img,x,y){const c=this.canvas;for(let yy=0;yy<img.height;yy++)for(let xx=0;xx<img.width;xx++){
    const i=((yy+y)*c.width+(xx+x))*4,j=(yy*img.width+xx)*4;c.buf.set(img.data.slice(j,j+4),i);
  }}
  drawImage(src,sx,sy,sw,sh,dx,dy,dw,dh){
    const c=this.canvas;const v=arguments.length===3?[0,0,src.width,src.height,sx,sy,src.width,src.height]:[sx,sy,sw,sh,dx,dy,dw,dh];
    const [xs,ys,ww,hh,xd,yd,wd,hd]=v;
    const b=src.getContext().canvas.buf;for(let y=0;y<hd;y++)for(let x=0;x<wd;x++){
      const tx=Math.floor(xd+x+this.tx),ty=Math.floor(yd+y+this.ty);if(tx<0||ty<0||tx>=c.width||ty>=c.height)continue;
      const sx0=Math.floor(xs+x*ww/wd),sy0=Math.floor(ys+y*hh/hd);
      const i=(sy0*src.width+sx0)*4,j=(ty*c.width+tx)*4,alpha=b[i+3]/255;
      if(alpha>0){for(let k=0;k<3;k++)c.buf[j+k]=b[i+k]*alpha+c.buf[j+k]*(1-alpha);c.buf[j+3]=255;}
    }
  }
}
globalThis.document={createElement:tag=>{if(tag!=='canvas')throw Error(tag);return new Canvas()}};
const {installPremiumModels}=await import('../src/rendering/premium-creatures.js');
const {installLegendaryBosses,BOSS_PRINTINGS}=await import('../src/rendering/legendary-boss-art.js');
const {drawGraftSheet}=await import('../src/rendering/graft-morphology.js');
const images={},manifest={sprites:{blank:{}},cols:4};
const t0=performance.now();installPremiumModels(images,manifest);installLegendaryBosses(images,manifest);
console.log('runtime sprites authored',Object.keys(images).length,'in',Math.round(performance.now()-t0),'ms');
const {resolveAnatomy}=await import('../src/engine/anatomy-resolver.js');
const {registerReferenceCards}=await import('../src/cards/catalog.js');
registerReferenceCards([{reference:true,id:'mtg:sample-dragon',kind:'creature',type:'Dragon',parts:{wings:1,horns:1,tail:1}},{reference:true,id:'mtg:sample-cat',kind:'creature',type:'Cat',parts:{claws:1,tail:1}}]);
let evo={parts:{wings:2,horns:1,tail:2,claws:1,spikes:1,shell:1},absorbed:[{cardId:'mtg:sample-dragon'},{cardId:'mtg:sample-cat'}]};
const anatomy=resolveAnatomy(evo);
const app={skinTone:3,anatomy,markings:['ember']};
const frame=64, hero=document.createElement('canvas');hero.width=256;hero.height=640;
const cg=hero.getContext('2d');cg.drawImage(images.blank,0,0);
drawGraftSheet(cg,app,'behind');drawGraftSheet(cg,app,'front');
const names=['blank','mtg_friendlySoldier','mtg_nemata','mtg_arasta','mtg_drakuseth','mtg_krenko','mtg_scarab','mtg_toxrill','thornmother','matron','unwritten'];
const w=1600,h=980;const bg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#0b1b19"/><rect x="15" y="15" width="${w-30}" height="${h-30}" fill="#22312d" stroke="#ab8a56" stroke-width="3"/><text x="42" y="62" fill="#e8d8a7" font-family="Georgia" font-size="34">GRAFTBOUND v1.3 · ACTUAL RUNTIME SPRITE ART</text><text x="42" y="90" fill="#b3c6b6" font-family="Arial" font-size="17">One rendering system, original procedural sprites. QA gallery — not a gameplay screenshot.</text></svg>`);
let composite=[];for(let i=0;i<names.length;i++){
 const name=names[i],src=images[name],fs=manifest.sprites[name].w;
 const cell=src.getContext('2d').getImageData(0,0,fs,fs);
 const png=await sharp(cell.data,{raw:{width:fs,height:fs,channels:4}}).resize(190,190,{kernel:'nearest'}).png().toBuffer();
 const c=i%5,r=Math.floor(i/5);composite.push({input:png,left:70+c*300,top:125+r*290});
 const label=(name==='blank'?'The Blank':name.replace('mtg_friendlySoldier','Soldier').replace('mtg_','').replace(/^./,s=>s.toUpperCase()));
 const labelSvg=Buffer.from(`<svg width="260" height="44"><text x="5" y="32" fill="#e6d7aa" font-family="Georgia" font-size="22">${label}</text></svg>`);
 composite.push({input:labelSvg,left:70+c*300,top:314+r*290});
}
const cell=hero.getContext('2d').getImageData(0,0,64,64);
const png=await sharp(cell.data,{raw:{width:64,height:64,channels:4}}).resize(190,190,{kernel:'nearest'}).png().toBuffer();
composite.push({input:png,left:70+300,top:125+2*290});
composite.push({input:Buffer.from('<svg width="280" height="44"><text x="5" y="32" fill="#e6d7aa" font-family="Georgia" font-size="21">Dragon + Cat Grafts</text></svg>'),left:70+300,top:314+2*290});
const output=process.argv[2]||'/mnt/data/GRAFTBOUND-v13-runtime-gallery.png';
await sharp(bg).composite(composite).png().toFile(output);console.log('gallery',output);
