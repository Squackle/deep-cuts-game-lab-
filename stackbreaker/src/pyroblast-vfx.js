// Pyroblast visuals; engine-authoritative outcome required, no gameplay rules added.
export function pyroblastVisualMode(event){
 if(event?.card!=='Pyroblast')return 'generic';
 if(event.outcome==='invalid-target')return 'fire-miss';
 if(event.effect==='counter'&&event.targetKind==='stack'&&event.outcome==='countered'&&
   event.relatedStackIds?.includes(event.targetId))return 'fire-counter';
 if(event.effect==='destroy'&&['creature','permanent'].includes(event.targetKind)&&
   event.outcome==='destroyed')return 'fire-destroy';
 if(event.effect==='counter'&&event.targetKind==='stack'&&event.outcome==='uncounterable')return 'fire-resist';
 return 'generic';
}
export function fireballGeometry(source,target,seed='pyroblast'){
 if(!source||!target||![source.x,source.y,target.x,target.y].every(Number.isFinite))return null;
 const dx=target.x-source.x,dy=target.y-source.y,distance=Math.hypot(dx,dy);
 if(distance<2)return null;
 let hash=2166136261;
 for(const c of String(seed)){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619);}
 const offset=Math.min(85,Math.max(13,distance*.16))*(hash%2?1:-1);
 const nx=-dy/distance,ny=dx/distance;
 const p=(t,a)=>({x:source.x+dx*t+nx*offset*a,y:source.y+dy*t+ny*offset*a});
 const a=p(.27,.88),b=p(.70,.87);
 const n=x=>Math.round(x*10)/10;
 return {path:'M'+n(source.x)+' '+n(source.y)+' C'+n(a.x)+' '+n(a.y)+
  ' '+n(b.x)+' '+n(b.y)+' '+n(target.x)+' '+n(target.y),distance};
}
function fireNode(root,parent,tag,attrs={},klass=''){
 const e=root.createElementNS('http://www.w3.org/2000/svg',tag);
 for(const [key,value] of Object.entries(attrs))e.setAttribute(key,String(value));
 if(klass)e.setAttribute('class',klass);
 parent.appendChild(e);
 return e;
}
export function renderPyroblastVfx(root,layer,view,event,anchors,mode){
 const width=Math.max(1,view?.innerWidth||root.documentElement?.clientWidth||1000);
 const height=Math.max(1,view?.innerHeight||root.documentElement?.clientHeight||750);
 const svg=fireNode(root,layer,'svg',{viewBox:'0 0 '+width+' '+height,
  preserveAspectRatio:'none','aria-hidden':'true'},'sb-vfx-fire-svg');
 const source=anchors.source;
 if(mode==='fire-miss'){
  fireNode(root,svg,'circle',{cx:source.x,cy:source.y,r:20},'sb-vfx-fire-miss');
  return;
 }
 const target=anchors.target,arc=fireballGeometry(source,target,event.sourceStackId);
 if(!arc)return;
 const defs=fireNode(root,svg,'defs');
 const gradient=fireNode(root,defs,'radialGradient',{id:'sb-vfx-pyro-gradient'});
 fireNode(root,gradient,'stop',{offset:'0%','stop-color':'#fffada'});
 fireNode(root,gradient,'stop',{offset:'40%','stop-color':'#ffd34f'});
 fireNode(root,gradient,'stop',{offset:'70%','stop-color':'#ff6529'});
 fireNode(root,gradient,'stop',{offset:'100%','stop-color':'#c51511','stop-opacity':0});
 fireNode(root,svg,'path',{d:arc.path,pathLength:100},'sb-vfx-fire-trail');
 const orb=fireNode(root,svg,'g',{},'sb-vfx-fire-orb');
 fireNode(root,orb,'circle',{r:23,fill:'url(#sb-vfx-pyro-gradient)'},'sb-vfx-fire-aura');
 fireNode(root,orb,'circle',{r:7},'sb-vfx-fire-core');
 fireNode(root,orb,'animateMotion',{path:arc.path,dur:'610ms',begin:'0ms',fill:'freeze'});
 for(let i=0;i<5;i++){
  const ember=fireNode(root,svg,'circle',{r:3+(i%3),fill:i%2?'#ff8a27':'#ffd781'},'sb-vfx-fire-ember');
  fireNode(root,ember,'animateMotion',{path:arc.path,dur:'650ms',
   begin:(65+i*36)+'ms',fill:'freeze'});
 }
 const klass=mode==='fire-counter'?'sb-vfx-fire-counterburst':
  mode==='fire-destroy'?'sb-vfx-fire-destroyburst':'sb-vfx-fire-resist';
 const radius=mode==='fire-destroy'?39:mode==='fire-resist'?29:32;
 fireNode(root,svg,'circle',{cx:target.x,cy:target.y,r:radius},klass);
 if(mode==='fire-counter'||mode==='fire-destroy'){
  fireNode(root,svg,'circle',{cx:target.x,cy:target.y,r:9},'sb-vfx-fire-impact-core');
  for(let i=0;i<6;i++){
   const a=i*Math.PI/3;
   fireNode(root,svg,'path',{d:'M'+target.x+' '+target.y+' l'+
    Math.round(Math.cos(a)*28)+' '+Math.round(Math.sin(a)*28)},
    'sb-vfx-fire-impact-spark');
  }
 }
}
