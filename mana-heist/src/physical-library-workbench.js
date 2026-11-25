import {PHYSICAL_LIBRARY_VERSION,initial,actions,reduce,completed,getCard,poolLabel,labelAction} from "./engine.js";
import {resolveAutomaticCasts} from "./auto-cast.js";
// Synthetic QA fixture, not a scored level, additional lesson, or migration.
export const FIXTURE={id:"mh-physical-workbench",version:PHYSICAL_LIBRARY_VERSION,turnLimit:2,life:10,
 field:[{id:"f1",card:"fetchUR"},{id:"f2",card:"fetchUR"}],hand:[{id:"bounce",card:"bounceUG"}],
 library:[{id:"blue1",card:"island"},{id:"blue2",card:"island"},{id:"red",card:"mountain"}],
 stages:[{name:"Mixed ward",cost:{U:1,R:1}}]};
export function createWorkbench(level=FIXTURE){
 let state=initial(level),history=[];
 return {
  get state(){return state;},get canUndo(){return history.length>0;},
  get reserve(){return level.library.filter(c=>state.libraryAvailable.includes(c.id));},
  get choices(){return actions(level,state);},get done(){return completed(level,state);},
  move(action,automatic=false){
   const out=reduce(level,state,action);if(!out.ok)return out;
   const next=automatic?resolveAutomaticCasts(level,out.state):{state:out.state,casts:[]};
   history.push(state);state=next.state;return {ok:true,...next};
  },
  undo(){if(history.length)state=history.pop();return state;},
  reset(){state=initial(level);history=[];return state;}
 };
}
export function mountWorkbench(doc){
 const game=createWorkbench(),el=id=>doc.getElementById(id),name=id=>getCard(FIXTURE,id).name+" ("+id+")";
 const actionName=a=>a.type==="fetch"?"Fetch "+name(a.targetId)+" using "+name(a.id)+" · pay "+(a.shock?3:1)+" life":
  a.type==="play"?"Play "+name(a.id)+(a.returnId?" · return "+name(a.returnId):""):
  a.type==="cast"?"Cast · spend "+poolLabel(a.spend)+(a.untapId?" · untap "+name(a.untapId):""):labelAction(FIXTURE,a);
 function render(){
  const s=game.state;
  el("reserve").textContent=game.reserve.map(c=>name(c.id)).join(" · ")||"empty";
  el("field").textContent=s.field.map(f=>name(f.id)+(f.tapped?" (tapped)":"")).join(" · ")||"empty";
  el("hand").textContent=s.hand.map(name).join(" · ")||"empty";
  el("graveyard").textContent=s.graveyard.map(name).join(" · ")||"empty";
  el("consumed").textContent=s.consumed.map(name).join(" · ")||"empty";
  el("state").textContent="Turn "+s.turn+" · life "+s.life+" · mana "+poolLabel(s.pool)+" · "+(game.done?"Ward solved":"Ward requires U + R");
  el("undo").disabled=!game.canUndo;
  el("moves").replaceChildren(...game.choices.map(a=>{
   const b=doc.createElement("button");b.type="button";b.textContent=actionName(a);
   b.onclick=()=>{const out=game.move(a,el("auto").checked);el("notice").textContent=out.ok?"Action applied"+(out.casts.length?"; automatic ward resolved":"")+".":out.error;render();};
   return b;
  }));
 }
 el("undo").onclick=()=>{game.undo();el("notice").textContent="Previous transaction restored.";render();};
 el("reset").onclick=()=>{game.reset();el("notice").textContent="Fixture reset.";render();};
 el("auto").onchange=render;render();
}
