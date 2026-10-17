import {lessonNote,relevantLesson} from "./sage-lessons.js";
export function mountSage({stage,goToLesson}){
 const notes=document.createElement("aside");
 notes.id="sageNotes";notes.className="sage-notes";notes.hidden=true;
 notes.setAttribute("aria-label","Sage's notes for this lesson");
 notes.innerHTML='<div class="sage-heading"><span aria-hidden="true" class="sage-sigil">✧</span><div><small>THE SAGE’S NOTES</small><strong id="sageTitle"></strong></div><button id="sageToggle" type="button" aria-label="Collapse lesson notes" aria-expanded="true">−</button></div><div id="sageContent"><p id="sageText"></p><p id="sageRemember"></p><div class="sage-tail"><span id="sageSkill"></span><button id="sageLessonLink" hidden type="button">VIEW LESSON →</button></div></div>';
 stage.append(notes);
 const title=notes.querySelector("#sageTitle"),txt=notes.querySelector("#sageText"),remember=notes.querySelector("#sageRemember"),skill=notes.querySelector("#sageSkill");
 const link=notes.querySelector("#sageLessonLink"),toggle=notes.querySelector("#sageToggle");
 let targetLesson=0,manualExpanded=true,restCount=0,currentLevelId=null;
 toggle.addEventListener("click",()=>{manualExpanded=!manualExpanded;notes.classList.toggle("collapsed",!manualExpanded);
  toggle.setAttribute("aria-expanded",String(manualExpanded));toggle.textContent=manualExpanded?"−":"+";});
 link.addEventListener("click",()=>goToLesson(targetLesson));
 return {
  render({mode,index,level,state,finished}){
   if(level.id!==currentLevelId){currentLevelId=level.id;restCount=0;manualExpanded=true;notes.classList.remove("collapsed");toggle.setAttribute("aria-expanded","true");toggle.textContent="−";}
   const teach=mode==="learn"&&!finished,whisper=mode==="heist"&&restCount>=2&&!finished;
   notes.hidden=!(teach||whisper);if(notes.hidden)return;
   notes.classList.toggle("is-whisper",whisper);
   if(teach){
    const meta=lessonNote(index,level,state);
    if(!meta){notes.hidden=true;return;}
    title.textContent="Lesson "+(index+1)+": "+meta.title;
    txt.textContent=meta.body;remember.textContent=meta.why;
    skill.textContent="SKILL · "+meta.skill.replaceAll("-"," ").toUpperCase();
    link.hidden=true;
    stage.classList.toggle("sage-mixing",Boolean(meta.mixed));
   }else{
    targetLesson=relevantLesson(level);
    title.textContent="A Sage’s Whisper";
    txt.textContent="The vault is stubborn. Revisit a related lesson before trying another route.";
    remember.textContent="A new route may require a different source, payment, or order of spells.";
    skill.textContent="RELATED · LESSON "+(targetLesson+1);
    link.hidden=false;
    stage.classList.remove("sage-mixing");
   }
  },
  onRestart(level){if(level.id===currentLevelId)restCount++;},
  hide(){notes.hidden=true;stage.classList.remove("sage-mixing");},
  reset(){restCount=0;currentLevelId=null;notes.hidden=true;stage.classList.remove("sage-mixing");}
 };
}
