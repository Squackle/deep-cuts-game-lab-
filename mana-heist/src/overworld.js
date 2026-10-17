import {LEVELS,CHAPTERS,GALAXIES} from "./levels.js";
import {chapterIndex} from "./campaign.js";
import {evaluateVault} from "./difficulty-metrics.js";
const $=id=>document.getElementById(id);
const roman=["I","II","III","IV","V","VI","VII","VIII","IX","X"];
export function renderOverworld({world,bests,index,proofs,medal}){
 const ch=CHAPTERS[world];
 if(!ch)throw Error("Invalid campaign world "+world);
 const galaxy=GALAXIES[ch.galaxy];
 $("worldNumber").textContent="GALAXY "+roman[ch.galaxy]+" · WORLD "+(ch.world+1)+" / 5";
 $("worldName").textContent=ch.name;
 $("worldSubtitle").textContent=galaxy.name+" · "+ch.subtitle+" · 10 stages";
 $("previousWorld").disabled=world===0;
 $("nextWorld").disabled=world>=CHAPTERS.length-1;
 $("campaignTotal").textContent=LEVELS.filter(l=>bests[l.id]).length+" / "+LEVELS.length+" CRACKED";
 const jump=document.querySelector(".vault-jump");
 if(jump){jump.replaceChildren();const label=document.createElement("span");label.textContent="QUICK JUMP";jump.append(label);
  for(let i=0;i<GALAXIES.length;i++){const b=document.createElement("button");b.type="button";b.dataset.jumpGalaxy=String(i);b.textContent=roman[i]+" · "+GALAXIES[i].name;b.setAttribute("aria-label","Jump to Galaxy "+(i+1));jump.append(b);}}
 const intro=document.querySelector(".campaign-top .muted");if(intro)intro.textContent="Ten galaxies · fifty worlds · 500 open vaults. C = structural complexity; D = estimated difficulty. Former final vault: C 50 / D 50."; 
 const option=document.querySelector('[data-mode="heist"] .mode-description');if(option)option.textContent="500 unsealed vaults across ten galaxies. The former finale is halfway; the new endgame adds longer multi-spell mana circuits.";
 $("galaxyPicker").innerHTML=GALAXIES.map((g,i)=>{
  const open=true,active=i===ch.galaxy;
  const cleared=LEVELS.slice(g.range[0],g.range[1]+1).filter(l=>bests[l.id]).length;
  return '<button type="button" class="galaxy-tab '+(active?"active":"")+'" data-galaxy="'+i+'"'+(open?"":" disabled")+
   ' aria-pressed="'+active+'" aria-label="Galaxy '+(i+1)+': '+g.name+(open?"":" locked")+'">'+
   '<span class="galaxy-symbol">'+(open?["✧","☾","◈","✦","✹"][i]:"◈")+'</span>'+
   '<span><b>GALAXY '+roman[i]+'</b><small>'+(open?g.name:"UNEXPLORED")+'</small><em>'+cleared+' / 50</em></span></button>';
 }).join("");
 $("chapterPicker").innerHTML=LEVELS.slice(ch.range[0],ch.range[1]+1).map((p,off)=>{
  const i=ch.range[0]+off,isOpen=true,win=bests[p.id],rating=evaluateVault(p);
  const optimal=win?proofs.get(p.id):null;
  const stars=win&&optimal?medal(p,{turn:win.turn,spentLife:win.spentLife,actions:win.actions,stage:p.stages.length},optimal):0;
  const current=i===index&&!win;
  const displayCode=(off+1).toString().padStart(2,"0");
  return '<button class="overworld-stage '+(win?"finished":current?"current":"")+'" type="button" data-level="'+i+'"'+(isOpen?"":" disabled")+
   ' aria-label="Galaxy '+(ch.galaxy+1)+', world '+(ch.world+1)+', stage '+(off+1)+(isOpen?", "+p.title:" locked")+'">'+
   '<span class="stage-node">'+(win?"✦":isOpen?"◇":"◆")+'</span>'+
   '<span class="stage-code">LEVEL '+displayCode+'</span>'+
   '<strong>'+(isOpen?p.title:"SEALED VAULT")+'</strong>'+
   '<span class="vault-ratings" aria-label="Complexity '+rating.complexity+' of 100; estimated difficulty '+rating.difficulty+' of 100">C '+rating.complexity+' · D '+rating.difficulty+'</span>'+
   '<span class="stage-detail">'+(win?"★".repeat(stars)+" · "+win.turn+" TURN"+(win.turn>1?"S":""):current?"NEXT HEIST":isOpen?"REPLAY STAGE":"LOCKED")+'</span></button>';
 }).join("");
 $("worldPips").innerHTML=CHAPTERS.slice(ch.galaxy*5,ch.galaxy*5+5).map((act,n)=>{
  const i=ch.galaxy*5+n,accessible=true,active=i===world;
  return '<button type="button" class="world-pip '+(active?"active":"")+'" data-world="'+i+'" '+(accessible?"":"disabled")+
   ' aria-label="World '+(n+1)+(accessible?"":" locked")+'" aria-pressed="'+active+'">'+(accessible?roman[n]:"·")+'</button>';
 }).join("");
 $("mapHint").textContent="All 500 vaults are unsealed. Former finale: Galaxy V / vault 250 (C 50 · D 50). The endgame adds multi-ward ritual and Coffers circuits. Ratings are structural estimates, not empirical player success rates.";
}
