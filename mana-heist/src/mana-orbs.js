// Visual-only mana orbs. The authoritative pool remains the deterministic reducer.
// Every successful tap creates one orb; casting consumes matching orbs.
import {COLORS} from "./engine.js";
const LABELS={W:"White",U:"Blue",B:"Black",R:"Red",G:"Green",C:"Colorless"};
const THEME={W:"#eadfaf",U:"#52b7f2",B:"#b08ac6",R:"#f58a63",G:"#76d3a2",C:"#c7d4d6"};
let serial=0;
export function reconstruct(pool){
 return COLORS.flatMap(color=>Array.from({length:pool[color]||0},()=>({id:++serial,color})));
}
export function transitionOrbs(existing,action,resultingPool){
 if(action.type==="tap")return [...existing,{id:++serial,color:action.color}];
 if(action.type==="end")return [];
 if(action.type==="cast"){
  const left={...action.spend};
  return existing.filter(orb=>{
   if((left[orb.color]||0)>0){left[orb.color]--;return false;}return true;
  });
 }
 return existing;
}
export function consistent(pool,orbs){
 return COLORS.every(c=>orbs.filter(o=>o.color===c).length===(pool[c]||0));
}
export function renderSockets(target,pool,orbs,{pendingId=null}={}){
 const capacity=Math.max(7,orbs.length+2);
 target.innerHTML=Array.from({length:capacity},(_,i)=>{
  const orb=orbs[i],color=orb?.color;
  const cls=orb?"mana-socket filled"+(orb.id===pendingId?" awaiting-orb":""):"mana-socket empty";
  return '<span class="'+cls+'" '+(orb?'data-orb-id="'+orb.id+'" data-color="'+color+'"':'')+
   ' role="img" aria-label="'+(orb?LABELS[color]+" mana stored":"Empty mana socket")+'">'+
   (orb?'<span class="socket-glow" style="--mana-color:'+THEME[color]+'"><span class="socket-core">'+color+'</span></span>':'<span class="socket-outline">◇</span>')+'</span>';
 }).join("");
}
export function sendOrb({color,sourceRect,id,layer,target}){
 const socket=target.querySelector('[data-orb-id="'+id+'"]');
 if(!socket){return;}
 const settle=()=>{if(socket.isConnected)socket.classList.remove("awaiting-orb");};
 if(!sourceRect||typeof window==="undefined"||window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches){settle();return;}
 const dest=socket.getBoundingClientRect();
 const start={x:sourceRect.left+sourceRect.width/2,y:sourceRect.top+sourceRect.height/2};
 const end={x:dest.left+dest.width/2,y:dest.top+dest.height/2};
 if(!Number.isFinite(start.x+start.y+end.x+end.y)){settle();return;}
 const bubble=document.createElement("div");
 bubble.className="mana-flight";
 bubble.style.setProperty("--orb-color",THEME[color]);
 bubble.textContent=color;bubble.setAttribute("aria-hidden","true");
 bubble.style.left=start.x+"px";bubble.style.top=start.y+"px";
 layer.appendChild(bubble);
 const dx=end.x-start.x,dy=end.y-start.y;
 const animation=bubble.animate([
  {transform:"translate(-50%,-50%) scale(.45)",opacity:0,filter:"blur(4px)"},
  {transform:"translate(calc(-50% + "+(dx*.18)+"px),calc(-50% - 38px)) scale(1.18)",opacity:1,filter:"blur(0px)",offset:.25},
  {transform:"translate(calc(-50% + "+dx+"px),calc(-50% + "+dy+"px)) scale(.8)",opacity:1,filter:"blur(0px)"}
 ],{duration:670,easing:"cubic-bezier(.16,.75,.2,1)",fill:"forwards"});
 animation.finished.then(()=>{bubble.remove();settle();}).catch(()=>{bubble.remove();settle();});
}
