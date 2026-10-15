import {LEVELS,CHAPTERS} from "./levels.js";
import {chapterIndex,chapterAccessible,highestUnlocked,stageCode,unlocked} from "./campaign.js";
const $=id=>document.getElementById(id);
const numerals=["I","II","III","IV","V"];
export function renderOverworld({world,bests,index,proofs,medal}){
 const ch=CHAPTERS[world];
 if(!ch)throw Error("Invalid chapter");
 const furthest=highestUnlocked(bests);
 $("worldNumber").textContent="ACT "+numerals[world]+" / "+(world+1)+" OF "+CHAPTERS.length;
 $("worldName").textContent=ch.name;
 $("worldSubtitle").textContent=ch.subtitle+" · "+(ch.range[1]-ch.range[0]+1)+" stages";
 $("previousWorld").disabled=world===0;
 $("nextWorld").disabled=world>=CHAPTERS.length-1 || !chapterAccessible(world+1,bests);
 $("campaignTotal").textContent=LEVELS.filter(l=>bests[l.id]).length+" / "+LEVELS.length+" CRACKED";
 $("chapterPicker").innerHTML=LEVELS.slice(ch.range[0],ch.range[1]+1).map((p,off)=>{
  const i=ch.range[0]+off,isOpen=unlocked(i,bests),win=bests[p.id];
  const optimal=proofs.get(p.id);
  const stars=win?medal(p,{turn:win.turn,spentLife:win.spentLife,stage:p.stages.length},optimal):0;
  const current=i===furthest&&isOpen&&!win;
  return '<button class="overworld-stage '+(win?"finished":current?"current":"")+'" type="button" data-level="'+i+'"'+(isOpen?"":" disabled")+
   ' aria-label="Stage '+stageCode(i)+(isOpen?", "+p.title:" locked")+'">'+
   '<span class="stage-node">'+(win?"✦":isOpen?"◇":"◆")+'</span>'+
   '<span class="stage-code">'+stageCode(i)+'</span>'+
   '<strong>'+(isOpen?p.title:"SEALED VAULT")+'</strong>'+
   '<span class="stage-detail">'+(win?"★".repeat(stars)+" · "+win.turn+" TURN"+(win.turn>1?"S":""):current?"NEXT HEIST":isOpen?"REPLAY STAGE":"LOCKED")+'</span></button>';
 }).join("");
 $("worldPips").innerHTML=CHAPTERS.map((act,i)=>{
  const accessible=chapterAccessible(i,bests);
  return '<button type="button" class="world-pip '+(i===world?"active":"")+'" data-world="'+i+'" '+(accessible?"":"disabled")+' aria-label="Act '+(i+1)+(accessible?"":" locked")+'" aria-pressed="'+(i===world)+'">'+(accessible?numerals[i]:"·")+'</button>';
 }).join("");
 $("mapHint").textContent=world===chapterIndex(furthest)?
 "Current objective: stage "+stageCode(furthest)+". Complete it to reveal the next vault.":
 "Previously opened chapter. Replay unlocked stages to improve your medal.";
}
