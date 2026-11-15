import {loadAssets} from '../src/rendering/sprites.js';
import {composeEquippedSheet} from '../src/rendering/equipment-visuals.js';
const $=id=>document.getElementById(id);
const cases=[
 {label:'Unmodified Blank — skin + loincloth only',stage:0,features:{},morph:{head:'neutral',surface:'skin'}},
 {label:'Feline graft — fur, claws and tail',stage:4,features:{claws:1,tail:1},morph:{head:'feline',surface:'fur',tailKind:'fur'}},
 {label:'Draconic graft — horns, wings, scales and armor',stage:8,features:{wings:2,horns:1,armor:1,claws:2,tail:1},morph:{head:'draconic',surface:'scales',wingKind:'membrane',tailKind:'scaled'}},
 {label:'Plant graft — antlers, bark and moss',stage:5,features:{antlers:1,moss:1},morph:{head:'neutral',surface:'bark'}},
 {label:'Equipment — shield, boots and spear (separate from grafts)',stage:0,features:{},morph:{head:'neutral',surface:'skin'},gear:['mtg:accorder-s-shield','mtg:swiftfoot-boots','mtg:moonsilver-spear']}
];
const poses=[
 {label:'Idle / front',view:0,row:0,frame:0},
 {label:'Walk / front',view:0,row:1,frame:1},
 {label:'Attack / front',view:0,row:2,frame:2},
 {label:'Idle / rear',view:1,row:0,frame:0}
];
try{
 const assets=await loadAssets(),meta=assets.manifest.sprites.blank,cols=meta.cols||4;
 if(meta.artPack!=='owner-raster-benchmarks-v1')throw new Error('Blank native raster is not active');
 for(const item of cases){
  const appearance={anatomy:{stage:item.stage,features:item.features,morph:item.morph},skinTone:0,tintMix:0,dominant:null,markings:[]};
  const sprite=composeEquippedSheet(assets,appearance,item.gear||[],[]);
  const article=document.createElement('article'),heading=document.createElement('h2');
  heading.textContent=item.label;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=156;
  canvas.setAttribute('aria-label',item.label+' real sprite frames');
  const g=canvas.getContext('2d');g.imageSmoothingEnabled=false;
  g.font='12px system-ui';g.fillStyle='#f1e1c8';
  for(let i=0;i<poses.length;i++){
   const p=poses[i],row=p.view*Object.keys(meta.anims).length+p.row;
   g.drawImage(sprite,p.frame*meta.w,row*meta.h,meta.w,meta.h,i*128,0,128,128);
   g.fillText(p.label,i*128+8,147);
  }
  article.append(heading,canvas);$('gallery').append(article);
 }
 $('status').textContent='Loaded native '+meta.w+'px Blank; '+cases.length+' appearance comparisons; '+cols+' animation columns per state.';
 $('status').id='ready';
}catch(err){
 $('status').textContent='QA loading failed: '+String(err);
 $('status').id='error';
}
