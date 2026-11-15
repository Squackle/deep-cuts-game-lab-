import { loadAssets } from '../src/rendering/sprites.js';
const assets=await loadAssets();
const $=id=>document.getElementById(id);
const modelList=Object.entries(assets.manifest.sprites).filter(([key,meta])=>assets.images[key] && meta.w && meta.h);
const states=['idle','walk','attack','cast','hurt'];
const stateSelect=$('state'), viewSelect=$('view'), grid=$('models'), coverage=$('coverage');
for(const v of states){const el=document.createElement('option');el.value=v;el.textContent=v;stateSelect.append(el)}
for(const v of ['front','back','left','right']){const el=document.createElement('option');el.value=v;el.textContent=v;viewSelect.append(el)}
const accepted=modelList.filter(([k,m])=>m.artPack==='hd2d-v1').length;
coverage.textContent=accepted+' / '+modelList.length+' runtime identities contain independently authored HD-2D sprite sheets. Remaining models use legacy art. This is an asset inspector, not proof of art acceptance or a battle screenshot.';
const cards=[];
for(const [key,meta] of modelList){
  const box=document.createElement('article');box.className='card';
  const canvas=document.createElement('canvas');canvas.width=canvas.height=176;canvas.setAttribute('aria-label',key+' sprite animation');
  const title=document.createElement('strong');title.textContent=key.replace(/^mtg_/,'').replace(/_/g,' ');
  const status=document.createElement('small');status.textContent=meta.artPack==='hd2d-v1'?'Native authored HD-2D':'Legacy art — not approved';
  box.append(canvas,title,status);grid.append(box);cards.push({key,meta,canvas});
}
let last=0;
function draw(now){
  if(now-last>=100){last=now;
    for(const item of cards){
      const {key,meta,canvas}=item, anims=meta.anims||assets.manifest.anims;
      const state=anims[stateSelect.value]||anims.idle,views=meta.views||assets.manifest.views;
      const preferred=viewSelect.value,index=views.includes(preferred)?views.indexOf(preferred):views.indexOf(preferred==='right'?'front':'back');
      const viewIndex=Math.max(0,index), frame=Math.floor(now/1000*state.fps)%state.frames, ctx=canvas.getContext('2d');
      ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;
      const row=viewIndex*Object.keys(anims).length+state.row;
      const size=150,aspect=meta.w/meta.h,dw=aspect>1?size:size*aspect,dh=aspect>1?size/aspect:size;
      ctx.drawImage(assets.images[key],frame*meta.w,row*meta.h,meta.w,meta.h,(176-dw)/2,(176-dh)/2,dw,dh);
    }
  }
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
