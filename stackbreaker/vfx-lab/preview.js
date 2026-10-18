import {createSpellVfxController} from '../src/vfx-events.js';
const controller=createSpellVfxController(document,window);
const origin=document.getElementById('origin');
const target=document.getElementById('destination');
const title=document.getElementById('targetName');
const info=document.getElementById('targetInfo');
const type=document.getElementById('targetType');
const status=document.getElementById('previewStatus');
let resetId=null;
const fixtures={
 counter:{effect:'counter',outcome:'countered',targetKind:'stack',targetId:'blue-spell',relatedStackIds:['blue-spell'],title:'Blue Spell',info:'Spell on the stack',type:'Instant',status:'Pyroblast counters the target blue spell.'},
 destroy:{effect:'destroy',outcome:'destroyed',targetKind:'permanent',targetId:'blue-permanent',relatedStackIds:[],title:'Blue Permanent',info:'Permanent on the battlefield',type:'Creature',status:'Pyroblast destroys the blue permanent.'},
 resist:{effect:'counter',outcome:'uncounterable',targetKind:'stack',targetId:'uncounterable-spell',relatedStackIds:[],title:'Uncounterable Spell',info:'Spell on the stack',type:'Instant',status:'The spell cannot be countered. No destruction occurs.'},
 miss:{effect:'counter',outcome:'invalid-target',targetKind:'stack',targetId:'missing-spell',relatedStackIds:[],title:'Missing Target',info:'Target no longer legal',type:'No legal target',status:'Pyroblast fails to resolve. No fireball hits the target.'}
};
const center=el=>{const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}};
function show(mode){
 const data=fixtures[mode];if(!data)return;
 controller.cancel();
 if(resetId!==null){clearTimeout(resetId);resetId=null}
 target.classList.remove('hit');void target.offsetWidth;
 title.textContent=data.title;info.textContent=data.info;type.textContent=data.type;
 document.querySelectorAll('[data-mode]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.mode===mode)));
 const event={card:'Pyroblast',sourceStackId:'demo-pyroblast',effect:data.effect,outcome:data.outcome,
  targetKind:data.targetKind,targetId:data.targetId,relatedStackIds:data.relatedStackIds};
 const outcome=controller.play(event,{source:center(origin),target:mode==='miss'?null:center(target)});
 status.textContent=outcome.reason==='reduced-motion'?data.status+' Reduced-motion mode: animation skipped.':
  outcome.played?data.status:'Preview unavailable: '+outcome.reason+'.';
 if(outcome.played&&(mode==='counter'||mode==='destroy'))target.classList.add('hit');
 resetId=setTimeout(()=>{target.classList.remove('hit');resetId=null},920);
}
document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>show(btn.dataset.mode)));
window.addEventListener('pagehide',()=>{controller.cancel();if(resetId!==null)clearTimeout(resetId)});
