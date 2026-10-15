// Visual-only ward-charge model. Gameplay and legal mana payment remain in engine.js.
// A floating mana orb lights one equal arc when it can help pay the current cost.
import {COLORS} from "./engine.js";

export const MANA_HUES=Object.freeze({W:"#f6e5b0",U:"#49b6f5",B:"#b18ade",R:"#ff745a",G:"#69e2a0",C:"#bfd0d7"});
const SUM=keys=>keys.reduce((sum,key)=>sum+Math.max(0,Number(key)||0),0);
export function chargeAllocation(cost,orbs){
 const required=Object.fromEntries(COLORS.map(color=>[color,cost?.[color]||0]));
 let generic=cost?.N||0;
 const total=SUM(Object.values(required))+generic;
 const charged=[];
 // Reserve all mana explicitly needed for colored pips before assigning generic.
 // This prevents an early blue orb from accidentally consuming a generic slot
 // that a later blue requirement needs.
 const typedIds=new Set();
 for(const color of COLORS){
  let need=required[color];
  for(const orb of orbs){
   if(need<=0)break;
   if(orb.color!==color||typedIds.has(orb.id))continue;
   typedIds.add(orb.id);
   need--;
  }
 }
 for(const orb of orbs){
  if(typedIds.has(orb.id)){charged.push({id:orb.id,color:orb.color,requirement:orb.color});continue;}
  if(generic>0){charged.push({id:orb.id,color:orb.color,requirement:"N"});generic--;}
 }
 // Segments are shown in the order mana was gathered, not printed cost order.
 return {total,charged:charged.slice(0,total).sort((a,b)=>orbs.findIndex(x=>x.id===a.id)-orbs.findIndex(x=>x.id===b.id))};
}
const esc=s=>String(s).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
export function renderWardCharge({svg,count,cost,orbs,pendingId=null,animateId=null,open=false}){
 if(!svg)return {total:0,charged:[]};
 const included=orbs.filter(orb=>orb.id!==pendingId);
 const result=chargeAllocation(cost,included);
 const {total,charged}=result;
 const circle=2*Math.PI*48;
 const step=circle/Math.max(1,total);
 const gap=Math.min(5,step*.12);
 const arc=Math.max(0,step-gap);
 const track=Array.from({length:total},(_,i)=>
  '<circle class="ward-charge-track" cx="60" cy="60" r="48" transform="rotate(-90 60 60)"'+
  ' stroke-dasharray="'+arc.toFixed(3)+' '+circle.toFixed(3)+'" stroke-dashoffset="'+(-i*step-gap/2).toFixed(3)+'"/>').join("");
 const lights=charged.map((item,i)=>
  '<circle class="ward-charge-arc'+(item.id===animateId?" charged-new":"")+'" data-charge-id="'+item.id+'" data-color="'+item.color+'"'+
  ' cx="60" cy="60" r="48" transform="rotate(-90 60 60)" stroke="'+MANA_HUES[item.color]+'"'+
  ' stroke-dasharray="'+arc.toFixed(3)+' '+circle.toFixed(3)+'" stroke-dashoffset="'+(-i*step-gap/2).toFixed(3)+'"'+
  ' style="--arc-length:'+arc.toFixed(3)+';--arc-circumference:'+circle.toFixed(3)+'"/>' ).join("");
 svg.innerHTML='<circle class="ward-charge-back" cx="60" cy="60" r="48"/>'+track+lights;
 svg.setAttribute("aria-label",open?"Vault opened":charged.length+" of "+total+" mana charged toward the ward");
 if(count)count.textContent=open?"OPEN":charged.length+" / "+total;
 if(animateId!=null&&typeof svg.querySelector==="function"){
  const added=svg.querySelector('[data-charge-id="'+animateId+'"]');
  if(added&&typeof added.animate==="function"&&!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches){
   added.animate([{opacity:.1,filter:"brightness(3)",strokeWidth:4},{opacity:1,filter:"brightness(1.6)",strokeWidth:12,offset:.45},{opacity:1,filter:"brightness(1)",strokeWidth:9}],{duration:510,easing:"cubic-bezier(.18,.86,.22,1)"});
  }
 }
 return result;
}
