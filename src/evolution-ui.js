/**
 * Accessible touch-first mutation draft and persistent mutation status.
 * All content comes from the local, hand-authored mutation registry.
 */
import {MUTATIONS,COLORS,activeEffects} from "./engine.js";
const COLOR_NAMES={W:"WHITE",U:"BLUE",B:"BLACK",R:"RED",G:"GREEN"};
const SELECTION_KEYS=["1","2","3"];
const CLASSIC_COPY={
 U:"Slow your swarm for 28 movements so you can navigate tight corners.",
 R:"Move faster and earn double points from brood orbs for 24 movements.",
 G:"Your next four collected orbs each grant extra growth."
};
export function mutationDescription(color,mode="hunt"){
 const entry=MUTATIONS[color];
 if(!entry)return "";
 return mode==="classic"?(CLASSIC_COPY[color]||entry.description):entry.description;
}
export function createMutationButton(doc,color,index,onSelect,mode="hunt"){
 if(!MUTATIONS[color])throw Error("Unknown mutation");
 const m=MUTATIONS[color],description=mutationDescription(color,mode),button=doc.createElement("button");
 button.type="button";button.className="mutation-card color-"+color;
 button.setAttribute("data-mutation",color);
 button.setAttribute("aria-label",SELECTION_KEYS[index]+": "+COLOR_NAMES[color]+" — "+m.name+". "+description);
 const number=doc.createElement("span");number.className="mutation-number";number.textContent=SELECTION_KEYS[index]??String(index+1);
 const icon=doc.createElement("span");icon.className="mutation-icon";icon.textContent=m.icon;icon.setAttribute("aria-hidden","true");
 const details=doc.createElement("span");details.className="mutation-details";
 const heading=doc.createElement("strong");heading.textContent=m.name;
 const text=doc.createElement("small");text.textContent=description;
 const label=doc.createElement("em");label.textContent=COLOR_NAMES[color]+" · "+m.school;
 details.append(label,heading,text);
 button.append(number,icon,details);
 button.addEventListener("click",event=>onSelect(color,event));
 return button;
}
export function showMutationDraft(overlay,container,options,onSelect,mode="hunt"){
 if(!overlay||!container)return;
 container.replaceChildren();
 for(let i=0;i<options.length;i++)
  container.append(createMutationButton(container.ownerDocument,options[i],i,onSelect,mode));
 overlay.hidden=false;
 container.querySelector("button")?.focus({preventScroll:true});
}
export function hideMutationDraft(overlay){
 if(overlay)overlay.hidden=true;
}
export function drawMutationHud(root,run){
 if(!root)return;
 const owned=COLORS.filter(color=>run.mutations[color]>0);
 const active=activeEffects(run);
 root.replaceChildren();
 if(!owned.length){
  const empty=root.ownerDocument.createElement("span");
  empty.className="mutation-none";empty.textContent="NO MUTATIONS YET";
  root.append(empty);return;
 }
 for(const color of owned){
  const m=MUTATIONS[color],badge=root.ownerDocument.createElement("span");
  badge.className="mutation-badge color-"+color;
  badge.title=m.name+" ×"+run.mutations[color];
  badge.textContent=color+" ×"+run.mutations[color];
  root.append(badge);
 }
 for(const effect of active){
  const pill=root.ownerDocument.createElement("span");
  pill.className="effect-badge color-"+effect.color;
  pill.textContent=effect.label;pill.title=MUTATIONS[effect.color].name;
  root.append(pill);
 }
}
