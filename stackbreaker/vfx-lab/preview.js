import {createSpellVfxController} from '../src/vfx-events.js';
const controller=createSpellVfxController(document,window);
const origin=document.getElementById('origin');
const sourceName=document.getElementById('sourceName');
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
 miss:{effect:'counter',outcome:'invalid-target',targetKind:'stack',targetId:'missing-spell',relatedStackIds:[],title:'Missing Target',info:'Target no longer legal',type:'No legal target',status:'Pyroblast fails to resolve. No fireball hits the target.'},
 'dust-counter':{card:'Counterspell',effect:'counter',outcome:'countered',targetKind:'stack',targetId:'blue-spell',relatedStackIds:['blue-spell'],title:'Lightning Bolt',info:'Spell on the stack',type:'Instant',status:'Counterspell resolves: its target Lightning Bolt is countered and dissolves into dust.'},
 'dust-fizzle':{card:'Swords to Plowshares',effect:'exile',outcome:'invalid-target',targetKind:'creature',targetId:'missing-creature',relatedStackIds:[],title:'Gone Creature',info:'All targets became illegal',type:'No legal target',status:'Swords to Plowshares fails to resolve because all targets became illegal. The source spell fades into ash.'}
 'heal':{card:"Healing Salve",fxType:'heal',colors:['W'],title:"Healing Salve",info:'Visual resolution preview',type:"HEAL",status:"You gain 5 life. Golden sparks flow into your life total."},
 'exile':{card:"Swords to Plowshares",fxType:'exile',colors:['W'],title:"Swords to Plowshares",info:'Visual resolution preview',type:"EXILE",status:"The target is banished through a white-gold portal."},
 'summon':{card:"Llanowar Elves",fxType:'summon',colors:['G'],title:"Llanowar Elves",info:'Visual resolution preview',type:"SUMMON",status:"A glowing summoning circle materializes the creature."},
 'bounce':{card:"Unsummon",fxType:'bounce',colors:['U'],title:"Unsummon",info:'Visual resolution preview',type:"BOUNCE",status:"Blue wind returns the permanent to its owner's hand."},
 'shield':{card:"Heroic Intervention",fxType:'shield',colors:['G'],title:"Heroic Intervention",info:'Visual resolution preview',type:"SHIELD",status:"A translucent protective barrier shields the creature."},
 'destroy-fx':{card:"Murder",fxType:'destroy',colors:['B'],title:"Murder",info:'Visual resolution preview',type:"DESTROY",status:"The target creature cracks apart into black magical energy."},
 'wipe':{card:"Wrath of God",fxType:'wipe',colors:['W'],title:"Wrath of God",info:'Visual resolution preview',type:"WIPE",status:"An expanding wave destroys affected creatures."},
 'damage-wave':{card:"Pyroclasm",fxType:'damage-wave',colors:['R'],title:"Pyroclasm",info:'Visual resolution preview',type:"DAMAGE-WAVE",status:"Fiery shockwaves strike every affected creature."},
 'buff':{card:"Giant Growth",fxType:'buff',colors:['G'],title:"Giant Growth",info:'Visual resolution preview',type:"BUFF",status:"Green energy raises the creature's effective stats."},
 'weaken':{card:"Disfigure",fxType:'weaken',colors:['B'],title:"Disfigure",info:'Visual resolution preview',type:"WEAKEN",status:"Dark magic weakens the creature."},
 'counters':{card:"Snakeskin Veil",fxType:'counters',colors:['G'],title:"Snakeskin Veil",info:'Visual resolution preview',type:"COUNTERS",status:"A permanent counter badge pulses as +1/+1 is added."},
 'draw':{card:"Divination",fxType:'draw',colors:['U'],title:"Divination",info:'Visual resolution preview',type:"DRAW",status:"Blue arcane cards drift toward your hand. Visual fixture only."},
 'token':{card:"Raise the Alarm",fxType:'token',colors:['W'],title:"Raise the Alarm",info:'Visual resolution preview',type:"TOKEN",status:"New luminous token silhouettes materialize. Visual fixture only."},
 'reanimate':{card:"Reanimate",fxType:'reanimate',colors:['B'],title:"Reanimate",info:'Visual resolution preview',type:"REANIMATE",status:"Black energy summons a creature from a graveyard. Visual fixture only."},
 'tap':{card:"Forest",fxType:'tap',colors:['G'],title:"Forest",info:'Visual resolution preview',type:"TAP",status:"The mana-producing land emits a pulse of energy."},
 'untap':{card:"Twiddle",fxType:'untap',colors:['U'],title:"Twiddle",info:'Visual resolution preview',type:"UNTAP",status:"A land/permanent untaps in a blue shimmer. Visual fixture only."},
 'copy':{card:"Reverberate",fxType:'copy',colors:['R'],title:"Reverberate",info:'Visual resolution preview',type:"COPY",status:"A spell splits into a glowing duplicate. Visual fixture only."},
 'scry':{card:"Opt",fxType:'scry',colors:['U'],title:"Opt",info:'Visual resolution preview',type:"SCRY",status:"Arcane card silhouettes swirl and reorder. Visual fixture only."},
};
const center=el=>{const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}};
function show(mode){
 const data=fixtures[mode];if(!data)return;
 controller.cancel();
 if(resetId!==null){clearTimeout(resetId);resetId=null}
 target.classList.remove('hit');void target.offsetWidth;
 sourceName.textContent=data.card||'Pyroblast';
 title.textContent=data.title;info.textContent=data.info;type.textContent=data.type;
 document.querySelectorAll('[data-mode]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.mode===mode)));
 const event={card:data.card||'Pyroblast',sourceStackId:'demo-'+mode,effect:data.effect||data.fxType,outcome:data.outcome||'resolved',
  targetKind:data.targetKind,targetId:data.targetId,targetCard:data.title,relatedStackIds:data.relatedStackIds||[],
  colors:data.colors||['R'],fxType:data.fxType,visualFixture:!!data.fxType,
  ...(data.fxType==='heal'?{changes:{life:{player:5,opponent:0},units:[]}}:{})};
 const r=target.getBoundingClientRect(),originRect=origin.getBoundingClientRect();
 const dustCard=mode==='dust-counter'||mode==='dust-fizzle'?{
  rect:{width:mode==='dust-counter'?r.width:originRect.width,height:mode==='dust-counter'?r.height:originRect.height},
  title:mode==='dust-counter'?data.title:(data.card||'Pyroblast'),imageSrc:null
 }:null;
 const focus=center(target);
 const fieldAffected=['wipe','damage-wave'].includes(mode)?[
   {x:focus.x-52,y:focus.y-33},{x:focus.x+46,y:focus.y-25},
   {x:focus.x-45,y:focus.y+35},{x:focus.x+52,y:focus.y+30}
 ]:[];
 const outcome=controller.play(event,{source:center(origin),
  target:mode==='miss'||mode==='dust-fizzle'?null:focus,
  field:focus,affected:fieldAffected,...(dustCard?{dustCard}:{})});
 status.textContent=outcome.reason==='reduced-motion'?data.status+' Reduced-motion mode: animation skipped.':
  outcome.played?data.status:'Preview unavailable: '+outcome.reason+'.';
 if(outcome.played&&(mode==='counter'||mode==='destroy'))target.classList.add('hit');
 resetId=setTimeout(()=>{target.classList.remove('hit');resetId=null},920);
}
document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>show(btn.dataset.mode)));
window.addEventListener('pagehide',()=>{controller.cancel();if(resetId!==null)clearTimeout(resetId)});
