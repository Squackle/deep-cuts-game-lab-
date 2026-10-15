// Cast-failure feedback. The pure calculation mirrors the existing engine's
// color requirements: N (generic) accepts any leftover mana, while C is a
// true colorless requirement that only C mana can satisfy.
import {COLORS} from "./engine.js";
export const MANA_NAMES={W:"white",U:"blue",B:"black",R:"red",G:"green",C:"colorless",N:"generic"};
export function missingMana(pool,cost){
 const missing={};
 for(const color of COLORS){
  const shortage=Math.max(0,(cost[color]||0)-(pool[color]||0));
  if(shortage)missing[color]=shortage;
 }
 const leftover=COLORS.reduce((sum,color)=>sum+Math.max(0,(pool[color]||0)-(cost[color]||0)),0);
 const generic=Math.max(0,(cost.N||0)-leftover);
 if(generic)missing.N=generic;
 return missing;
}
export function failureText(missing){
 const parts=Object.entries(missing).map(([color,number])=>number+" "+MANA_NAMES[color]+(color==="N"?" mana (any color)":" mana"));
 if(!parts.length)return "This ward cannot be cast yet.";
 return "Need "+parts.join(" and ")+". "+(missing.N?"Generic mana accepts any color.":"Only the colored symbol needs that exact color.");
}
export function flashWard({vault,ward,costRow,button,pool,missing}){
 if(typeof document==="undefined")return;
 const noMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
 const animations=[];
 const animate=(el,frames,options)=>{
  if(!el||typeof el.animate!=="function")return;
  animations.push(el.animate(frames,options));
 };
 const shade="rgba(255,75,82,.70)";
 if(!noMotion){
  animate(vault,[{boxShadow:"0 0 0 0 rgba(255,69,76,0)",offset:0},{boxShadow:"inset 0 0 48px 10px rgba(230,40,63,.32),0 0 0 2px rgba(255,69,76,.6)",offset:.28},{boxShadow:"inset 0 0 0 rgba(255,69,76,0),0 0 0 0 rgba(255,69,76,0)",offset:1}],{duration:620,easing:"ease-out"});
  animate(ward,[{transform:"translateX(0)"},{transform:"translateX(-9px)"},{transform:"translateX(7px)"},{transform:"translateX(-4px)"},{transform:"translateX(0)"}],{duration:380,easing:"ease-out"});
  animate(button,[{filter:"none"},{filter:"brightness(1.14) sepia(.45) saturate(3) hue-rotate(-18deg)",backgroundColor:"#c44248",offset:.20},{backgroundColor:"#c44248",offset:.55},{filter:"none"}],{duration:640,easing:"ease-out"});
  animate(pool,[{borderColor:"rgba(255,75,82,0)"},{borderColor:shade,offset:.3},{borderColor:"rgba(255,75,82,0)"}],{duration:620});
 }
 let detected=0;
 // Costs may have repeated mana symbols. Emphasize only as many as are missing.
 for(const [color,count] of Object.entries(missing)){
  let remaining=count;
  for(const glyph of costRow?.querySelectorAll(".mana-glyph")||[]){
   if(!remaining||!glyph.classList.contains(color))continue;
   glyph.classList.add("mana-error-glyph");
   detected++;
   remaining--;
   if(!noMotion){
    const a=glyph.animate([{boxShadow:"0 0 0 0 transparent",transform:"scale(1)"},{boxShadow:"0 0 0 4px #ff5363,0 0 24px 8px #fe4b63bb",transform:"scale(1.26)",offset:.35},{boxShadow:"0 0 0 0 transparent",transform:"scale(1)"}],{duration:680,easing:"ease-out"});
    a.finished.finally(()=>glyph.classList.remove("mana-error-glyph")).catch(()=>{});
   }else glyph.classList.remove("mana-error-glyph");
  }
 }
 return detected;
}
