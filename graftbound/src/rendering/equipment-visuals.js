/** Original 48px gear silhouettes, overlaid on every animation cell of the evolved hero.
 * Gear is drawn on the actual rendered combat sprite sheet, not a disconnected HUD icon. */
import { composePlayerSheet } from './evolution-visuals.js';
const NAMES = Object.freeze({
 'mtg:accorder-s-shield':'shield','mtg:basilisk-collar':'collar',
 'mtg:swiftfoot-boots':'boots','mtg:mask-of-memory':'mask','mtg:moonsilver-spear':'spear'
});
export const gearKinds = ids => [...new Set((ids || []).map(id => NAMES[id]).filter(Boolean))];
export function composeEquippedSheet(assets, appearance, equipment = []) {
 const source = composePlayerSheet(assets,appearance);
 const kinds = gearKinds(equipment); if (!kinds.length) return source;
 const canvas=document.createElement('canvas'); canvas.width=source.width;canvas.height=source.height;
 const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(source,0,0);
 const frame=48,cols=Math.floor(source.width/frame),rows=Math.floor(source.height/frame);
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  c.save();c.translate(col*frame,row*frame);
  const bob=(row%6===1&&col%2)?1:0;
  if(kinds.includes('boots')){
   c.fillStyle='#332f36';c.fillRect(16,39+bob,7,4);c.fillRect(25,39+bob,7,4);
   c.fillStyle='#c1a363';c.fillRect(16,39+bob,7,1);c.fillRect(25,39+bob,7,1);
  }
  if(kinds.includes('collar')){
   c.fillStyle='#3d4432';c.fillRect(19,20+bob,11,3);
   c.fillStyle='#c7a85f';c.fillRect(19,20+bob,11,1);c.fillRect(23,21+bob,2,2);
  }
  if(kinds.includes('mask')){
   c.fillStyle='#30282a';c.fillRect(19,13+bob,11,7);
   c.fillStyle='#dec58f';c.fillRect(19,13+bob,11,1);c.fillRect(19,13+bob,1,7);c.fillRect(29,13+bob,1,7);
   c.fillStyle='#dfe5c5';c.fillRect(21,16+bob,3,2);c.fillRect(26,16+bob,2,2);
  }
  if(kinds.includes('shield')){
   // Beveled shield plate, readable at 48px and attached to the hero's left arm.
   c.fillStyle='#282f38';c.fillRect(8,23+bob,10,15);c.fillRect(10,38+bob,6,2);
   c.fillStyle='#9ea9ae';c.fillRect(9,24+bob,8,12);c.fillRect(11,36+bob,4,2);
   c.fillStyle='#4a6472';c.fillRect(11,26+bob,4,8);
   c.fillStyle='#eed58a';c.fillRect(12,28+bob,2,4);
  }
  if(kinds.includes('spear')){
   c.fillStyle='#4a2a1b';c.fillRect(35,15+bob,2,28);
   c.fillStyle='#d7c7ad';c.fillRect(34,8+bob,4,9);c.fillRect(35,5+bob,2,4);
   c.fillStyle='#fff2c9';c.fillRect(35,8+bob,1,9);
  }
  c.restore();
 }
 return canvas;
}
