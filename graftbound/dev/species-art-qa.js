import {loadAssets} from '../src/rendering/sprites.js';
const $=id=>document.getElementById(id);
const models=[['Spider','mtg_spider'],['Friendly Spider','mtg_friendlySpider'],
  ['Snake','mtg_friendlySnake'],['Hornet','mtg_friendlyHornet'],['Stinger','mtg_moth']];
const states=['idle','walk','attack','cast','hurt','defeat'];
function signature(bytes){
  let hash=2166136261,opaque=0,edge=0;
  for(let i=0;i<bytes.length;i+=4){
    const alpha=bytes[i+3];if(alpha<20)continue;
    opaque++;
    const x=(i/4)%96,y=Math.floor(i/4/96);
    if(x<2||x>=94||y<2||y>=94)edge++;
    for(let channel=0;channel<4;channel++)hash=Math.imul(hash^bytes[i+channel],16777619)>>>0;
  }
  return {hash:hash>>>0,opaque,edge};
}
try{
 const assets=await loadAssets(),results=[];
 for(const [label,key] of models){
  const meta=assets.manifest.sprites[key],sprite=assets.images[key];
  if(!sprite||meta?.artPack!=='species-anatomy-study-v1'||meta.w!==96||meta.h!==96)
    throw new Error('Native species study not active for '+key);
  const anims=meta.anims,views=meta.views;
  if(views.join(',')!=='front,back')throw new Error('Missing directional art for '+key);
  const article=document.createElement('article'),heading=document.createElement('h2');
  heading.textContent=label+' · '+key;
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=12*98;
  const g=canvas.getContext('2d',{willReadFrequently:true});g.imageSmoothingEnabled=false;
  const report={key,width:sprite.width,height:sprite.height,viewStates:{},worldHeight:meta.h*meta.pixelScale};
  for(const [viewIndex,view] of views.entries()){
    const stats={};
    for(const [stateIndex,state] of states.entries()){
      const anim=anims[state],hashes=new Set();let minOpaque=1e10,maxEdge=0;
      if(!anim||anim.row!==stateIndex)throw new Error(key+' missing ordered '+state+' row');
      const row=viewIndex*states.length+anim.row;
      for(let f=0;f<4;f++){
        const cell=document.createElement('canvas');cell.width=cell.height=96;
        const ctx=cell.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;
        ctx.drawImage(sprite,f*96,row*96,96,96,0,0,96,96);
        const sig=signature(ctx.getImageData(0,0,96,96).data);
        hashes.add(sig.hash);minOpaque=Math.min(minOpaque,sig.opaque);maxEdge=Math.max(maxEdge,sig.edge);
        g.drawImage(cell,f*96,(viewIndex*6+stateIndex)*98);
      }
      stats[state]={distinct:hashes.size,minOpaque,maxEdge};
      if(minOpaque<90)throw new Error(key+' '+view+' '+state+' contains an empty frame');
      if(hashes.size<3)throw new Error(key+' '+view+' '+state+' repeats its animation');
      if(maxEdge>0)throw new Error(key+' '+view+' '+state+' reaches a clipped sprite-cell edge: '+maxEdge+' pixels');
    }
    report.viewStates[view]=stats;
  }
  article.dataset.key=key;
  article.dataset.worldHeight=String(report.worldHeight);
  article.dataset.frontWalk=String(report.viewStates.front.walk.distinct);
  article.dataset.frontAttack=String(report.viewStates.front.attack.distinct);
  article.dataset.frontDefeat=String(report.viewStates.front.defeat.distinct);
  article.dataset.frontEdge=String(Math.max(...Object.values(report.viewStates.front).map(s=>s.maxEdge)));
  const info=document.createElement('small');
  info.textContent='Source '+meta.w+'px · World height '+report.worldHeight.toFixed(1)+'px · 2 views · '+states.length+' states · frame inspection passed';
  article.append(heading,canvas,info);$('models').append(article);
  results.push(report);
 }
 $('status').textContent='Loaded '+results.length+' native runtime species; all tested views/states have 3+ distinct nonempty frames.';
 $('status').id='ready';
}catch(err){$('status').textContent='Species art QA failed: '+String(err);$('status').id='error';}
