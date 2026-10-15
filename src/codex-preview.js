import {BRIEFINGS} from "./boss-briefing.js";
import {ABILITIES} from "./miniboss.js";
import {drawAbilityMeter} from "./boss-art.js";
export const CODEX_ORDER=Object.freeze(["stalker","warden","weaver","guardian"]);
/** Profile UI only: prototype entries without account claiming or actual unlock state. */
export function codexEntry(id){
 const brief=BRIEFINGS[id],ability=ABILITIES[id];
 return brief&&ability?{id,name:brief.name,title:brief.title,tag:brief.tag,
  tip:brief.tip,ability:ability.ability,phases:ability.phases}:null;
}
export function renderCodex(root,doc){
 if(!root)return;
 for(const id of CODEX_ORDER){
  const entry=codexEntry(id),card=doc.createElement("article");
  card.className="codex-entry";
  const art=doc.createElement("canvas");art.width=64;art.height=64;
  art.setAttribute("aria-hidden","true");drawAbilityMeter(art,id,1);
  const content=doc.createElement("div");
  const status=doc.createElement("small");status.textContent="PROFILE-BOUND RECORD · PREVIEW ONLY";
  const title=doc.createElement("h2");title.textContent=entry.name;
  const description=doc.createElement("p");description.textContent=entry.title+" · "+entry.tag;
  const meta=doc.createElement("p");meta.textContent=entry.ability+" · "+entry.phases+" captures";
  const tip=doc.createElement("p");tip.textContent=entry.tip;
  content.append(status,title,description,meta,tip);card.append(art,content);root.append(card);
 }
}
if(typeof document!=="undefined")renderCodex(document.getElementById("codexList"),document);
