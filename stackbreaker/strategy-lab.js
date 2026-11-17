// Accessible, offline-first unranked decision practice. No remote scoring,
// account reads, local save keys, or changes to the published Classic campaign.
import {STRATEGY_TRIALS,referenceSubsetEvidence} from './src/strategy-trials.js';
import {CARDS,LANDS} from './src/cards.js';
import {createGame,tapLand,activate,pass,legalActions,legalTargets,labelTarget,
 creaturePower,creatureToughness} from './src/engine.js';
const $=id=>document.getElementById(id);
const node=(tag,text,cls='')=>{const e=document.createElement(tag);if(cls)e.className=cls;
 if(text!==undefined)e.textContent=String(text);return e;};
let index=0,state,notice='Tap your lands, select a response, then PASS to resolve the stack.';
const selections=new Map();
function objectiveText(p){
 const o=p.objective;
 if(o.type==='keepUnit'||o.type==='winKeepUnit'){
  const unit=p.units.find(u=>u.id===o.unitId);
  return (o.type==='winKeepUnit'?'Defeat your opponent and keep ':'Keep ')+(unit?.card||o.unitId)+' on your battlefield.';
 }
 if(o.type==='keepN')return 'Keep at least '+o.count+' of your creatures on the battlefield.';
 if(o.type==='survive')return 'Survive the entire stack.';
 if(o.type==='win')return 'Defeat the opposing player.';
 return 'Complete the given objective.';
}
function costText(name){const c=CARDS[name]?.cost;
 return !c?'Ability':Object.entries(c).filter(([,n])=>n>0).map(([k,n])=>'{'+(k==='generic'?'generic '+n:k+'×'+n)+'}').join(' ')||'Free';}
function item(title,detail,cls=''){
 const e=node('div',undefined,'item '+cls);e.append(node('strong',title));
 if(detail)e.append(node('small',detail));return e;
}
function setNotice(text){notice=text;$('notice').textContent=text;}
function load(n){
 index=n;state=createGame(STRATEGY_TRIALS[index]);selections.clear();
 $('hintText').hidden=true;
 setNotice('Tap mana sources, choose responses, and pass to resolve the stack. Nothing is ranked or saved.');
 render();
}
function render(){
 const p=STRATEGY_TRIALS[index],nav=$('trialNav');nav.replaceChildren();
 for(const [i,t] of STRATEGY_TRIALS.entries()){
  const b=node('button',(i+1)+' · '+t.strategyFocus);b.type='button';b.dataset.trial=String(i);
  b.setAttribute('aria-current',String(i===index));nav.append(b);
 }
 $('trialIndex').textContent='TRIAL '+(index+1)+' / '+STRATEGY_TRIALS.length+' · '+p.strategyFocus.toUpperCase();
 $('currentTrial').textContent=p.title;$('trialPrompt').textContent=p.intro;
 const done=state.status!=='playing';
 const o=$('objective');o.replaceChildren();
 o.append(node('p',objectiveText(p)),node('p','Your life: '+state.life.player+' · Opponent: '+state.life.opponent));
 const st=$('stack');st.replaceChildren();
 const stackBox=node('div',undefined,'items');
 if(!state.stack.length)stackBox.append(node('p','Stack is empty.'));
 for(const [i,x] of [...state.stack].reverse().entries()){
  stackBox.append(item((i===0?'TOP: ':'')+x.card,
   x.targetId?'Target: '+labelTarget(state,x.targetId):'No target'));
 }st.append(stackBox);
 const creatures=$('units');creatures.replaceChildren();
 const unitBox=node('div',undefined,'items');
 if(!state.units.length)unitBox.append(node('p','No creatures in this response window.'));
 for(const u of state.units){
  unitBox.append(item(u.card,
   (u.zone==='battlefield'?creaturePower(u)+'/'+creatureToughness(u):u.zone)+
    ' · '+u.controller+(u.hexproof?' · hexproof':'')+(u.indestructible?' · indestructible':''),
   u.zone!=='battlefield'?'dead':''));
 }creatures.append(unitBox);
 const lands=$('lands');lands.replaceChildren();
 const landBox=node('div',undefined,'items');
 if(!state.lands.length)landBox.append(node('p','No mana source needed.'));
 for(const l of state.lands){
  const card=LANDS[l.card],box=item(l.card,(l.tapped?'Tapped':'Untapped')+
   ' · Produces '+(card?.mana||'?'));
  const tap=node('button',l.tapped?'Tapped':'Tap for mana');tap.type='button';
  tap.disabled=done||l.tapped;tap.dataset.land=l.id;box.append(tap);landBox.append(box);
 }lands.append(landBox);
 const hand=$('hand');hand.replaceChildren();
 const actions=new Set(legalActions(state)),handBox=node('div',undefined,'items');
 const live=state.hand.filter(a=>!state.used.includes(a.id));
 if(!live.length)handBox.append(node('p','No unspent responses remain.'));
 for(const a of live){
  const box=item(a.card,(a.sourceId?'Activated ability':'Cast spell')+' · '+costText(a.card));
  const targets=legalTargets(state,a),enabled=actions.has(a.id);
  if(enabled&&targets.length>1){
   const label=node('label','Target');label.htmlFor='target-'+a.id;box.append(label);
   const select=node('select');select.id='target-'+a.id;select.dataset.targetFor=a.id;
   targets.forEach(t=>{const opt=node('option',t===null?'No target':labelTarget(state,t));
    opt.value=t===null?'__null__':t;select.append(opt);});
   const selected=selections.get(a.id);
   if(selected!==undefined&&targets.some(t=>(t===null?'__null__':t)===selected))select.value=selected;
   box.append(select);
  }
  const button=node('button',enabled?'Use response':'Unavailable');button.type='button';
  button.dataset.cast=a.id;button.disabled=!enabled||done;box.append(button);
  handBox.append(box);
 }hand.append(handBox);
 $('pool').textContent='Mana: '+Object.entries(state.mana).filter(([,n])=>n>0)
  .map(([c,n])=>c+' × '+n).join(' · ').replace(/^$/,'empty');
 $('pass').disabled=done;
 $('restart').disabled=false;
 const outcome=$('outcome');outcome.hidden=!done;
 if(done){
  $('outcomeTitle').textContent=state.status==='won'?'TRIAL SOLVED':'TRY ANOTHER LINE';
  const evidence=referenceSubsetEvidence(p);
  const comparison=evidence.status==='verified-subset'
   ?' Supplied line: '+evidence.referenceResponses+' responses. A legal ordered subset uses '+
     evidence.shortestReferenceSubset+'; this is not a proof of global minimum.':'';
  $('outcomeText').textContent=(state.status==='won'?p.strategyLesson:
   'The full stack did not meet the objective. Restart and examine another line.')+comparison;
 }
 $('notice').textContent=notice;
}
function act(fn){
 if(state.status!=='playing')return;
 try{const next=fn();if(next)state=next;setNotice(state.status==='playing'?
  'Action accepted. Reassess the top of the stack before passing.':
  state.status==='won'?'Objective achieved.':'Objective not met.');}
 catch(error){setNotice(error?.message||'That action is not legal.');}
 render();
}
$('trialNav').addEventListener('click',e=>{
 const b=e.target.closest('button[data-trial]');if(b)load(Number(b.dataset.trial));
});
$('lands').addEventListener('click',e=>{
 const b=e.target.closest('button[data-land]');if(b)act(()=>tapLand(state,b.dataset.land));
});
$('hand').addEventListener('change',e=>{
 const input=e.target.closest('select[data-target-for]');
 if(input)selections.set(input.dataset.targetFor,input.value);
});
$('hand').addEventListener('click',e=>{
 const b=e.target.closest('button[data-cast]');if(!b)return;
 const a=state.hand.find(a=>a.id===b.dataset.cast);if(!a)return;
 const targets=legalTargets(state,a);
 const value=selections.get(a.id);
 const target=targets.length===1?targets[0]:
  value==='__null__'?null:targets.find(t=>t===value)??targets[0];
 act(()=>activate(state,a.id,target));
});
$('pass').addEventListener('click',()=>act(()=>pass(state)));
$('restart').addEventListener('click',()=>load(index));
$('hint').addEventListener('click',()=>{
 const hint=$('hintText'),show=hint.hidden;hint.hidden=!show;
 hint.textContent=show?STRATEGY_TRIALS[index].hint:'';setNotice(show?'Hint shown. Trial remains unranked.':'Hint hidden.');
});
load(0);
