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
const {installPremiumModels,recolorSkin}=await import('../src/rendering/premium-creatures.js');
const {skinToneForSeed}=await import('../src/engine/visual-identity.js');
const images={},manifest={sprites:{blank:{}},anims:{idle:{row:0}},cols:4,views:['front','back']};installPremiumModels(images,manifest);
const crops=[];
for(const [key,shade] of [['blank',skinToneForSeed(123456)],['mtg_friendlySoldier',1],['blank',10],['mtg_friendlySoldier',10]]){
 const mask=key==='blank'?images['blank:mask']:images['mtg_friendlySoldier:skinMask'];
 const im=recolorSkin(images[key],mask,shade);const cell=im.getContext().getImageData(0,0,64,64);
 const fileBuffer=await sharp(cell.data,{raw:{width:64,height:64,channels:4}}).png().toBuffer();
 crops.push(fileBuffer);
}
const bg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="510"><rect width="1200" height="510" fill="#13251f"/><rect x="22" y="22" width="1156" height="466" fill="#1f3028" stroke="#ad8d53" stroke-width="2"/><text x="54" y="65" font-family="Georgia" font-size="29" fill="#e5ce9d">GRAFTBOUND · Milestone A · Actual Runtime Sprite Pixels</text><text x="54" y="95" font-family="Arial" font-size="17" fill="#b8c5b5">64-pixel authored frames drawn by the game module · representative skin variants</text><text x="94" y="435" font-family="Georgia" font-size="21" fill="#eedab4">The Blank · front</text><text x="373" y="435" font-family="Georgia" font-size="21" fill="#eedab4">Soldier · front</text><text x="679" y="435" font-family="Georgia" font-size="21" fill="#eedab4">The Blank · deep tone</text><text x="951" y="435" font-family="Georgia" font-size="21" fill="#eedab4">Soldier · deep tone</text><text x="54" y="468" font-family="Arial" font-size="14" fill="#9eac9e">Model QA render, not a captured WebGL gameplay screenshot. Bosses, graft engine, Equipment and Auras follow in later milestones.</text></svg>`);
const labels=[80,365,660,935];let composite=[];
for(let i=0;i<crops.length;i++){let b=await sharp(crops[i]).resize(230,230,{kernel:'nearest'}).png().toBuffer();composite.push({input:b,left:labels[i],top:160})}
const out=process.argv[2]||'/mnt/data/graftbound_v13_milestoneA_models.png';
await sharp(bg).composite(composite).png().toFile(out);console.log(out);
