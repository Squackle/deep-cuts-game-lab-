/** Card-faithful original authored gear, spatially anchored to the evolved 64px hero. */
import { composePlayerSheet } from './evolution-visuals.js';
import { drawEquipmentSheet, gearKinds, EQUIPMENT_PRINTINGS } from './gear-art.js';
import { composeAuraSheet } from './aura-art.js';
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
 g.save();g.scale(source.width/(64*4),source.height/(64*10));drawEquipmentSheet(g,appearance,ids);g.restore();
 const out=composeAuraSheet(c,assets.manifest.sprites.blank.w,auras,assets.manifest.cols);
 if(cache.size>=16)cache.delete(cache.keys().next().value);cache.set(key,out);
 return out;
}
/** Gear can also be equipped by summoned allies. Compose onto their actual source rig,
 * scaled to each rig's frame size; never assume a human is behind the sprite. */
export function composeAllyAttachments(source,frame,equipment=[],auras=[],cols=4){
 if(!equipment?.length&&!auras?.length)return source;
 const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
 const g=canvas.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(source,0,0);
 if(equipment?.length){
  const overlay=document.createElement('canvas');overlay.width=64*4;overlay.height=64*10;
  drawEquipmentSheet(overlay.getContext('2d'),{anatomy:null},equipment);
  const rows=Math.round(source.height/frame);
  for(let row=0;row<rows;row++)for(let f=0;f<cols;f++){
   const rigRow=Math.min(9,row);g.drawImage(overlay,f*64,rigRow*64,64,64,f*frame,row*frame,frame,frame);
  }
 }
 return composeAuraSheet(canvas,frame,auras,cols);
}