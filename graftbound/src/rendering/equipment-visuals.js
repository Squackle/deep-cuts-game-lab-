/** Card-faithful original authored gear, spatially anchored to the evolved 64px hero. */
import { composePlayerSheet } from './evolution-visuals.js';
import { drawEquipmentSheet, gearKinds, EQUIPMENT_PRINTINGS } from './gear-art.js';
import { composeAuraSheet } from './aura-art.js';
import { drawNativeBlankGearSheet } from './native-blank-art.js';
export { gearKinds, EQUIPMENT_PRINTINGS };
const memo=new WeakMap();
export function composeEquippedSheet(assets,appearance,equipment=[],auras=[]){
 const source=composePlayerSheet(assets,appearance);
 const ids=[...(equipment||[])].sort(),key=JSON.stringify([ids,[...(auras||[])].sort()]);
 if(!ids.length&&!auras.length)return source;
 let cache=memo.get(source);if(!cache){cache=new Map();memo.set(source,cache)}
 if(cache.has(key))return cache.get(key);
 const c=document.createElement('canvas');c.width=source.width;c.height=source.height;
 const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(source,0,0);
 g.save();
 if(assets.manifest.sprites.blank.artPack==='owner-raster-benchmarks-v1') drawNativeBlankGearSheet(g,ids);
 else {g.scale(source.width/(64*4),source.height/(64*10));drawEquipmentSheet(g,appearance,ids);}
 g.restore();
 const out=composeAuraSheet(c,assets.manifest.sprites.blank.w,auras,assets.manifest.cols);
 if(cache.size>=16)cache.delete(cache.keys().next().value);cache.set(key,out);
 return out;
}
/** Gear can also be equipped by summoned allies. Compose onto their actual source rig,
 * scaled to each rig's frame size; never assume a human is behind the sprite. */
/** Map imported atlas rows and columns onto the existing four-frame, two-view gear atlas.
 * Side views use the generic front overlay until species-specific anchors are authored.
 */
export function allyGearFrames(source, frame, cols=4, rig={}) {
 const height=rig.height||frame, rows=Math.floor(source.height/height), widthCols=Math.min(cols,Math.floor(source.width/frame));
 const views=rig.views||['front','back'], animations=rig.animations;
 const states=animations?Object.entries(animations):null;
 const perView=states?.length||5, result=[];
 const legacyRows={idle:0,walk:1,attack:2,cast:3,hurt:4,defeat:4};
 for(let row=0;row<rows;row++){
  const view=views[Math.floor(row/perView)]||'front', local=row%perView;
  const state=states?.find(([,a])=>a.row===local);
  const gearRow=(view==='back'?5:0)+(states?(legacyRows[state?.[0]]??0):Math.min(4,local));
  const frames=Math.min(widthCols,state?.[1]?.frames||widthCols);
  for(let f=0;f<frames;f++)result.push({row,col:f,gearRow,gearCol:Math.min(3,Math.floor(f*4/frames)),width:frame,height});
 }
 return result;
}
export function composeAllyAttachments(source,frame,equipment=[],auras=[],cols=4,rig={}){
 if(!equipment?.length&&!auras?.length)return source;
 const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
 const g=canvas.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(source,0,0);
 if(equipment?.length){
  const overlay=document.createElement('canvas');overlay.width=64*4;overlay.height=64*10;
  drawEquipmentSheet(overlay.getContext('2d'),{anatomy:null},equipment);
  for(const {row,col,gearRow,gearCol,width,height} of allyGearFrames(source,frame,cols,rig)){
   g.drawImage(overlay,gearCol*64,gearRow*64,64,64,col*width,row*height,width,height);
  }
 }
 return composeAuraSheet(canvas,frame,auras,cols,rig.height||frame);
}
