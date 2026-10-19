// Step 4: visual-only spell dissolution. All outcomes are engine-authenticated.
export function dustVisualMode(event){
 if(!event)return 'none';
 if(event.outcome==='countered'&&event.targetKind==='stack'&&
  event.relatedStackIds?.includes(event.targetId))return 'dust-counter';
 if(event.outcome==='invalid-target')return 'dust-fizzle';
 return 'none';
}
export function captureDustCard(root,event){
 const mode=dustVisualMode(event);
 if(mode==='none'||!root?.querySelectorAll)return null;
 const id=mode==='dust-counter'?event.targetId:event.sourceStackId;
 const node=[...root.querySelectorAll('[data-stack-target]')].find(
  el=>el.dataset?.stackTarget===String(id));
 if(!node)return null;
 const r=node.getBoundingClientRect?.();
 if(!r||![r.left,r.top,r.width,r.height].every(Number.isFinite))return null;
 const picture=node.querySelector?.('img');
 const url=picture?.currentSrc||picture?.src||'';
 // Card-image URLs are read from our existing Scryfall artwork, not user HTML.
 const imageSrc=/^https:\/\/cards\.scryfall\.io\//i.test(url)?url:null;
 return {
  rect:{x:r.left,y:r.top,width:r.width,height:r.height},
  title:mode==='dust-counter'?(event.targetCard||'Countered spell'):(event.card||'Spell'),
  imageSrc
 };
}
export function dustParticleLayout(seed='spell',count=24){
 let hash=2166136261;
 for(const c of String(seed)){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619);}
 const values=[];
 for(let i=0;i<count;i++){
  hash=(Math.imul(hash^i,1664525)+1013904223)>>>0;
  const angle=(i/count)*Math.PI*2+(hash%200)/1000;
  const distance=14+(hash%85);
  values.push({
   x:Math.round(Math.cos(angle)*distance),
   y:Math.round(Math.sin(angle)*distance-12),
   delay:Math.round((hash>>>8)%210),
   size:2+(hash>>>16)%5
  });
 }
 return values;
}
// Unlike a real card game move, this only renders a snapshot after the engine
// has already removed the item. It never modifies the stack or game state.
export function renderSpellDust(root,layer,event,anchors,mode){
 if(typeof root?.createElement!=='function')return null;
 const fizzle=mode==='dust-fizzle';
 const point=fizzle?anchors?.source:anchors?.target;
 if(!point||![point.x,point.y].every(Number.isFinite))return null;
 const snapshot=anchors?.dustCard;
 const host=root.createElement('div');
 host.className='sb-vfx-dust-host '+(fizzle?'sb-vfx-dust-fizzle':'sb-vfx-dust-counter');
 host.setAttribute('aria-hidden','true');
 host.style.left=point.x+'px';
 host.style.top=point.y+'px';
 host.style.setProperty('--dust-width',Math.max(60,Math.min(360,snapshot?.rect?.width||175))+'px');
 host.style.setProperty('--dust-height',Math.max(55,Math.min(230,snapshot?.rect?.height||105))+'px');
 const ghost=root.createElement('div');
 ghost.className='sb-vfx-dust-card';
 const picture=snapshot?.imageSrc;
 if(picture){
  const img=root.createElement('img');
  img.src=picture;
  img.alt='';
  img.draggable=false;
  ghost.appendChild(img);
 }
 const title=root.createElement('span');
 title.className='sb-vfx-dust-label';
 title.textContent=snapshot?.title||(fizzle?event.card:event.targetCard)||'Spell';
 ghost.appendChild(title);
 host.appendChild(ghost);
 const ash=root.createElement('div');
 ash.className='sb-vfx-dust-particles';
 for(const p of dustParticleLayout(event.sourceStackId+':'+(event.targetId||''))){
  const particle=root.createElement('span');
  particle.className='sb-vfx-dust-particle';
  particle.style.setProperty('--dust-x',p.x+'px');
  particle.style.setProperty('--dust-y',p.y+'px');
  particle.style.setProperty('--dust-delay',p.delay+'ms');
  particle.style.setProperty('--dust-size',p.size+'px');
  ash.appendChild(particle);
 }
 host.appendChild(ash);
 layer.appendChild(host);
 return host;
}
