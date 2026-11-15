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
  // Measure actual resulting RGBA pixels, not merely an asset-loaded flag.
  const pixels=g.getImageData(0,0,512,128).data;let signature=2166136261,opaque=0,edge=0;
  for(let k=0;k<pixels.length;k+=4){
   const alpha=pixels[k+3],x=(k/4)%512,y=Math.floor(k/4/512);
   if(alpha>20){
    opaque++;
    if(x%128<2||x%128>125||y<2||y>125)edge++;
    for(let channel=0;channel<4;channel++)signature=Math.imul(signature^pixels[k+channel],16777619)>>>0;
   }
  }
  article.dataset.signature=String(signature>>>0);
  article.dataset.opaque=String(opaque);
  article.dataset.edge=String(edge);
  if(opaque<100)throw new Error('Empty raster for '+item.label);
  article.append(heading,canvas);$('gallery').append(article);
 }
 const signatures=[...$('gallery').querySelectorAll('article')].map(x=>x.dataset.signature);
 if(new Set(signatures).size!==cases.length)throw new Error('Anatomy or Equipment variant failed to produce unique runtime pixels');
 $('status').textContent='Loaded native '+meta.w+'px Blank; '+cases.length+' distinct raster comparisons; '+cols+' animation columns per state.';
 $('status').id='ready';
}catch(err){
 $('status').textContent='QA loading failed: '+String(err);
 $('status').id='error';
}
