import {loadAssets} from '../src/rendering/sprites.js';
const $=id=>document.getElementById(id);
const models=[['Nemata, Grove Guardian','mtg_nemata'],['Arasta of the Endless Web','mtg_arasta'],['Drakuseth, Maw of Flames','mtg_drakuseth'],['Krenko, Mob Boss','mtg_krenko'],['The Scarab God','mtg_scarab'],['Toxrill, the Corrosive','mtg_toxrill']];
const states=['idle','walk','attack','cast','hurt','defeat'];
function signature(bytes){
  let hash=2166136261,opaque=0,edge=0,edgePoint=null;
  for(let i=0;i<bytes.length;i+=4){
    const alpha=bytes[i+3];if(alpha<20)continue;
    opaque++;
    const x=(i/4)%112,y=Math.floor(i/4/112);
    if(x<2||x>=110||y<2||y>=110){edge++;if(!edgePoint)edgePoint=[x,y];}
    for(let channel=0;channel<4;channel++)hash=Math.imul(hash^bytes[i+channel],16777619)>>>0;
  }
  return {hash:hash>>>0,opaque,edge,edgePoint};
}
try{
 const assets=await loadAssets(),results=[];
 for(const [label,key] of models){
  const meta=assets.manifest.sprites[key],sprite=assets.images[key];
  if(!sprite||meta?.artPack!=='advanced-boss-motion-v1'||meta.w!==112||meta.h!==112)
    throw new Error('Advanced boss motion not active for '+key);
  const anims=meta.anims,views=meta.views;
  if(views.join(',')!=='front,back')throw new Error('Missing directional art for '+key);
  const article=document.createElement('article'),heading=document.createElement('h2');
  heading.textContent=label+' · '+key;
  const canvas=document.createElement('canvas');canvas.width=448;canvas.height=12*114;
  const g=canvas.getContext('2d',{willReadFrequently:true});g.imageSmoothingEnabled=false;
  const report={key,width:sprite.width,height:sprite.height,viewStates:{},worldHeight:meta.h*(meta.pixelScale||1)};
  for(const [viewIndex,view] of views.entries()){
    const stats={};
    for(const [stateIndex,state] of states.entries()){
      const anim=anims[state],hashes=new Set();let minOpaque=1e10,maxEdge=0,firstEdge=null;
      if(!anim||anim.row!==stateIndex)throw new Error(key+' missing ordered '+state+' row');
      const row=viewIndex*states.length+anim.row;
      for(let f=0;f<4;f++){
        const cell=document.createElement('canvas');cell.width=cell.height=112;
        const ctx=cell.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;
        ctx.drawImage(sprite,f*112,row*112,112,112,0,0,112,112);
        const sig=signature(ctx.getImageData(0,0,112,112).data);
        hashes.add(sig.hash);minOpaque=Math.min(minOpaque,sig.opaque);
        if(sig.edge>maxEdge){maxEdge=sig.edge;firstEdge={frame:f,pixel:sig.edgePoint};}
        g.drawImage(cell,f*112,(viewIndex*6+stateIndex)*114);
      }
      stats[state]={distinct:hashes.size,minOpaque,maxEdge};
      if(minOpaque<90)throw new Error(key+' '+view+' '+state+' contains an empty frame');
      if(hashes.size<3)throw new Error(key+' '+view+' '+state+' repeats its animation');
      if(maxEdge>0)throw new Error(key+' '+view+' '+state+' reaches a clipped sprite-cell edge: '+maxEdge+' pixels '+JSON.stringify(firstEdge));
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
 $('status').textContent='Loaded '+results.length+' legendary boss identities; all tested views/states have 3+ distinct nonempty frames.';
 $('status').id='ready';
}catch(err){$('status').textContent='Boss motion QA failed: '+String(err);$('status').id='error';}
