// Assemble the title screen around the existing controls and battlefield selector.
import {mountTitleAmbience} from "./title-ambience.mjs";
export function createTitleMenu({title, campaignBar, openBattlefields, orders}) {
 const cover=title.querySelector(".title-card");
 const mapChoices=title.querySelector(".title-maps");
 const footer=title.querySelector(".title-foot");

 const dialog=document.createElement("dialog");
 dialog.id="battlefieldDialog";
 dialog.className="field-dialog illustrated-dialog";
 dialog.setAttribute("aria-labelledby","field-dialog-title");
 dialog.innerHTML='<header class="dialog-head"><h2 id="field-dialog-title">Gauntlet setup</h2><button type="button">Done</button></header>';
 dialog.querySelector("button").addEventListener("click",()=>dialog.close());
 mapChoices.querySelector(".title-head").remove();
 dialog.append(mapChoices);
 title.after(dialog);

 const dispatch=document.createElement("section");
 dispatch.className="field-orders";
 dispatch.setAttribute("aria-labelledby","field-orders-title");
 dispatch.innerHTML='<div class="field-orders-heading"><div><span class="field-orders-label">Gauntlet setup</span><h3 id="field-orders-title"></h3></div><button type="button" class="field-orders-change">Change</button></div><p class="field-conditions"></p>';
 const name=dispatch.querySelector("h3"),conditions=dispatch.querySelector(".field-conditions");
 const change=dispatch.querySelector("button");
 change.setAttribute("aria-label","Change battlefield and difficulty");
 change.addEventListener("click",openBattlefields);
 dispatch.append(campaignBar);
 cover.insertBefore(dispatch,footer);
 footer.append(title.querySelector("#resetGameProgress"));
 title.querySelector(".title-tag").textContent="Defend the roads of five realms. Build towers, lead a commander, and grow your spellbook.";
 title.classList.add("illustrated-title");
 mountTitleAmbience(title);

 function render(){
  const current=orders();
  name.textContent=current.name;
  conditions.textContent=current.difficulty+" · "+current.season+(current.onslaught?" · Onslaught":"");
 }

 function revealSelected(){
  dialog.querySelector(".map-card[aria-pressed=true]")?.scrollIntoView({block:"nearest",inline:"center"});
 }

 return {dialog,render,revealSelected};
}
