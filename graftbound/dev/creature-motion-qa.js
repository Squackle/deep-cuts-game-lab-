import {loadAssets} from '../src/rendering/sprites.js';
const $=id=>document.getElementById(id);
const units=[
 ['Wolf','mtg_wolf'],['Dire Wolf','mtg_alpha'],['Drake','mtg_friendlyDrake'],
 ['Saproling','mtg_saproling'],['Summoned Saproling','mtg_friendlySproutling'],
 ['Goblin','mtg_goblin'],['Goblin Soldier','mtg_friendlyGoblin']
];
function fingerprint(bytes){
 let hash=2166136261,opaque=0,edge=0;
 for(let i=0;i<bytes.length;i+=4){
  if(bytes[i+3]<20)continue;
  opaque++;
  const x=(i/4)%96,y=Math.floor(i/4/96);
  if(x<1||x>=95||y<1||y>=95)edge++;
  for(let k=0;k<4;k++)hash=Math.imul(hash^bytes[i+k],16777619)>>>0;
 }
 return {hash:hash>>>0,opaque,edge};
}
try{
 const assets=await loadAssets(),records=[];
 for(const [label,key] of units){
  const meta=assets.manifest.sprites[key],source=assets.images[key];
  if(!meta||!source)throw new Error('Missing runtime identity '+key);
  const anims=meta.anims||assets.manifest.anims,views=meta.views||assets.manifest.views;
  const cols=meta.cols||assets.manifest.cols;
  const box=document.createElement('article'),h=document.createElement('h2');
  h.textContent=label+' · '+key;box.append(h);
  const canvas=document.createElement('canvas');canvas.width=480;canvas.height=6*100;
  const g=canvas.getContext('2d',{willReadFrequently:true});g.imageSmoothingEnabled=false;
  const stats={};
  for(const [index,state] of ['idle','walk','attack','cast','hurt','defeat'].entries()){
   const a=anims[state],ids=new Set(),alpha=[];
   if(!a)throw new Error(key+' missing '+state);
   for(let f=0;f<Math.min(4,a.frames);f++){
    const cell=document.createElement('canvas');cell.width=cell.height=96;
    const ctx=cell.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;
    const row=(views.indexOf('front')*Object.keys(anims).length)+a.row;
    ctx.drawImage(source,f*meta.w,row*meta.h,meta.w,meta.h,0,0,96,96);
    const result=fingerprint(ctx.getImageData(0,0,96,96).data);
    ids.add(result.hash);alpha.push(result.opaque);
    g.drawImage(cell,f*120,index*100);
   }
   stats[state]={distinct:ids.size,opaque:alpha};
  }
  box.append(canvas);
  const caption=document.createElement('small');
  caption.textContent=Object.entries(stats).map(([k,v])=>k+': '+v.distinct+' distinct').join(' · ');
  box.append(caption);
  box.dataset.key=key;
  box.dataset.distinctWalk=String(stats.walk.distinct);
  box.dataset.distinctAttack=String(stats.attack.distinct);
  box.dataset.distinctCast=String(stats.cast.distinct);
  box.dataset.distinctDefeat=String(stats.defeat.distinct);
  box.dataset.stats=JSON.stringify(stats);
  if(stats.defeat.distinct<3)throw new Error(key+' requires visibly distinct defeat poses');
  $('families').append(box);
  records.push({label,key,stats});
 }
 $('summary').textContent='Loaded '+records.length+' actual runtime identities. Art quality remains work-in-progress.';
 $('summary').id='ready';
}catch(error){
 $('summary').textContent='Runtime creature-motion QA failed: '+String(error);
 $('summary').id='error';
}
