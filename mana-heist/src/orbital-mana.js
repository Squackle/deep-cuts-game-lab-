// Purely visual mana orbital controller. All resource changes are made by
// engine.js before animations launch. No physics frame modifies game legality.
const COLORS={W:"#eaddae",U:"#58b9f5",B:"#b18bd9",R:"#ff8c71",G:"#75e0aa",C:"#d4e1e4"};
const active=new WeakMap();
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const cubic=t=>1-(1-t)**3;
const lerp=(a,b,t)=>a+(b-a)*t;
const xy=(r)=>({x:r.left+r.width/2,y:r.top+r.height/2});
export function orbitPosition(progress,start,target,index=0){
 const t=clamp(progress),r=Math.max(42,target.radius||110);
 const theta=Math.atan2(start.y-target.y,start.x-target.x)-.38+index*.19;
 const direction=index%2===0?1:-1;
 const outer=r+Math.min(25,Math.max(10,r*.09));
 const rim={x:target.x+Math.cos(theta)*outer,y:target.y+Math.sin(theta)*outer};
 if(t<=.18){
  const v=cubic(t/.18),u=1-v;
  const control={x:lerp(start.x,rim.x,.35),y:Math.min(start.y,rim.y)-Math.min(76,r*.42)};
  return {x:u*u*start.x+2*u*v*control.x+v*v*rim.x,
   y:u*u*start.y+2*u*v*control.y+v*v*rim.y,
   scale:lerp(.55,1.05,v),opacity:Math.min(1,.4+v*1.2),phase:"approach"};
 }
 const v=clamp((t-.18)/.82);
 // Two orbital arcs with angular momentum and radial attraction. The last
 // revolution tightens toward the center, giving the feeling of gravity.
 const angle=theta+direction*Math.PI*2*1.42*(.8*v+.2*v*v);
 const radius=outer*(1-.94*(v**1.36));
 return {x:target.x+Math.cos(angle)*radius,y:target.y+Math.sin(angle)*radius,
  scale:Math.max(.15,1.03-.84*(v**1.3)),opacity:v>.82?clamp((1-v)/.18):1,phase:v>.77?"absorb":"orbit"};
}
function remember(layer,controller){
 let set=active.get(layer);
 if(!set){set=new Set();active.set(layer,set);}
 set.add(controller);
 return ()=>set.delete(controller);
}
export function cancelOrbitMana(layer){
 const set=active.get(layer);
 if(set){for(const o of [...set])o.cancel();}
 layer?.querySelectorAll?.(".mh-orbiting,.mh-orbit-impact").forEach(node=>node.remove());
}
export function launchOrbitMana({color,sourceRect,destination,layer,index=0,onArrival,duration=1630}){
 let closed=false,frame=0,particle=null;
 const remove=remember(layer,{cancel(){if(closed)return;closed=true;
  if(frame)cancelAnimationFrame(frame);
  particle?.remove();remove();
 }});
 const arrive=()=>{if(closed)return;closed=true;
  if(frame)cancelAnimationFrame(frame);
  particle?.remove();remove();onArrival?.();
 };
 if(!layer||!destination||typeof window==="undefined"||!sourceRect||
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches){
  arrive();return;
 }
 const goal=destination.getBoundingClientRect(),source=xy(sourceRect),target={...xy(goal),radius:Math.min(goal.width,goal.height)*.49};
 if(!Number.isFinite(source.x+source.y+target.x+target.y)||goal.width<1){arrive();return;}
 const orbColor=COLORS[color]||COLORS.C;
 particle=document.createElement("span");
 particle.className="mana-flight mh-orbiting";
 particle.textContent=color==="C"?"◇":color;
 particle.setAttribute("aria-hidden","true");
 particle.style.setProperty("--orb-color",orbColor);
 particle.style.left="0px";particle.style.top="0px";
 layer.appendChild(particle);
 const born=performance.now()+index*93,trip=Math.max(600,duration);
 const animate=now=>{
  if(closed)return;
  const t=clamp((now-born)/trip),p=orbitPosition(t,source,target,index);
  particle.style.transform="translate("+p.x+"px,"+p.y+"px) translate(-50%,-50%) scale("+p.scale+")";
  particle.style.opacity=String(p.opacity);
  if(t>=1){
   const ring=document.createElement("span");
   ring.className="mh-orbit-impact";ring.setAttribute("aria-hidden","true");
   ring.style.left=target.x+"px";ring.style.top=target.y+"px";
   ring.style.setProperty("--orb-color",orbColor);
   layer.appendChild(ring);
   ring.addEventListener("animationend",()=>ring.remove(),{once:true});
   arrive();return;
  }
  frame=requestAnimationFrame(animate);
 };
 frame=requestAnimationFrame(animate);
}
