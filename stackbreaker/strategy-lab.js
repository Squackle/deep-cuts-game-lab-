// Accessible, offline-first unranked decision practice. No remote scoring,
// account reads, local save keys, or changes to the published Classic campaign.
import replacementBoards from './data/replacement-candidates.json' with {type:'json'};
import {STRATEGY_TRIALS,referenceSubsetEvidence} from './src/strategy-trials.js';
import {CARDS,LANDS} from './src/cards.js';
import * as legacy from './src/engine.js';
import * as preview from './src/rules-preview-engine.js';
import {RULES_PREVIEW_BOARDS} from './src/rules-preview-boards.js';
const $=id=>document.getElementById(id);
const pack=new URLSearchParams(location.search).get('pack');
const replacementPreview=pack==='replacement-review',rulesPreview=pack==='rules-preview';
const trials=rulesPreview?RULES_PREVIEW_BOARDS:replacementPreview?replacementBoards:STRATEGY_TRIALS;
const {createGame,tapLand,activate,pass,legalActions,legalTargets,labelTarget,creaturePower,creatureToughness,paymentOptions}=rulesPreview?preview:legacy;
if(rulesPreview){$('packHeading').textContent='RULES PREVIEW';$('packIntro').textContent='Four unranked workshops on triggered abilities, damage prevention, trample and mana commitments. The opponent always passes.';}
if(replacementPreview){$('packHeading').textContent='REPLACEMENT REVIEW';$('packIntro').textContent='Two unranked proposals only. Original campaign boards and scores are unchanged.';}
const node=(tag,text,cls='')=>{const e=document.createElement(tag);if(cls)e.className=cls;
 if(text!==undefined)e.textContent=String(text);return e;};
let index=0,state,history=[],completedTrials=new Set(),notice='Tap your lands, select a response, then PASS to resolve the stack.';
const selections=new Map(),payments=new Map();
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
function cardDetail(box,name){const c=CARDS[name];if(!c)return; if(c.oracle)box.append(node('p',c.oracle,'card-rule'));if(c.note)box.append(node('small',c.note,'card-note'));}
function displayTarget(s,id){
 const spell=s.stack.find(item=>item.id===id);
 if(!spell)return labelTarget(s,id);
 const controller=spell.controller==='player'?'yours':'opponent’s';
 const target=spell.targetId?' → '+labelTarget(s,spell.targetId):'';
 return spell.card+' ('+controller+')'+target;
}
function decisionWindow(p){
 if(!p.reviewResponse)return -1;
 return history.findIndex((before,i)=>!before.used.includes(p.reviewResponse)&&
  (history[i+1]??state).used.includes(p.reviewResponse));
}
function reviewDecision(p,window){
 if(window<0)return '';
 const before=history[window],after=history[window+1]??state;
 const spell=after.stack.find(item=>item.id===p.reviewResponse);
 const left=Object.entries(after.mana).filter(([,qty])=>qty>0).map(([color,qty])=>qty+' '+color).join(', ');
 const bear=state.units.find(unit=>unit.id==='bear');
 return `You targeted ${displayTarget(before,spell.targetId)}, leaving ${left||'no mana'} after the cast. Final life ${state.life.player}; opponent ${state.life.opponent}. Grizzly Bears ${bear.zone==='battlefield'?'survived':'went to the graveyard'}.`;
}
function setNotice(text){notice=text;$('notice').textContent=text;}
function load(n){
 index=n;state=createGame(trials[index]);history=[];selections.clear();payments.clear();
 $('hintText').hidden=true;
 setNotice('Tap mana sources, choose responses, and pass to resolve the stack. Nothing is ranked or saved.');
 render();
}
function render(){
 const focused=document.activeElement;
 const focusKey=focused?.dataset?.land?['land',focused.dataset.land]:focused?.dataset?.cast?['cast',focused.dataset.cast]:focused?.dataset?.trial?['trial',focused.dataset.trial]:null;
 const p=trials[index],nav=$('trialNav');nav.replaceChildren();
 for(const [i,t] of trials.entries()){
  const b=node('button',(completedTrials.has(t.id)?'Solved · ':'')+(i+1)+' · '+t.strategyFocus);b.type='button';b.dataset.trial=String(i);
  b.setAttribute('aria-current',String(i===index));nav.append(b);
 }
 $('trialIndex').textContent='TRIAL '+(index+1)+' / '+trials.length+' · '+p.strategyFocus.toUpperCase();
 $('currentTrial').textContent=p.title;$('trialPrompt').textContent=p.intro;
 const done=state.status!=='playing';
 const o=$('objective');o.replaceChildren();
 o.append(node('p',objectiveText(p)),node('p','Your life: '+state.life.player+' · Opponent: '+state.life.opponent));
 if(state.combat)o.append(node('p','Declared attacker: '+labelTarget(state,state.combat.attackerId)+' · Blocker: '+(state.combat.blockerId?labelTarget(state,state.combat.blockerId):'none')+(state.combat.resolved?' · damage resolved':'')));
 if(state.enchantments?.length)o.append(node('p','Enchantments: '+state.enchantments.map(x=>x.card+' ('+x.controller+')').join(' · ')));
 const st=$('stack');st.replaceChildren();
 const stackBox=node('div',undefined,'items');
 if(!state.stack.length)stackBox.append(node('p','Stack is empty.'));
 for(const [i,x] of [...state.stack].reverse().entries()){
  const box=item((i===0?'TOP: ':'')+x.card+(x.spell===false?' · ability':''),
   x.targetId?'Target: '+labelTarget(state,x.targetId):'No target');cardDetail(box,x.card);stackBox.append(box);
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
 if(!state.lands.length)landBox.append(node('p','No lands in this exercise. Check the starting mana pool.'));
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
  const box=item(a.card,a.sourceId?'Activated ability · sacrifice source':'Cast spell · '+costText(a.card));
  cardDetail(box,a.card);
  const targets=legalTargets(state,a),enabled=actions.has(a.id);
  if(!enabled&&!done)box.append(node('small',targets.length?'Not enough usable mana or source unavailable.':'No legal target or response window.','card-note'));
  if(enabled&&targets.length>1){
   const label=node('label','Target');label.htmlFor='target-'+a.id;box.append(label);
   const select=node('select');select.id='target-'+a.id;select.dataset.targetFor=a.id;
   const prompt=node('option','Choose a target');prompt.value='';prompt.disabled=true;prompt.selected=true;select.append(prompt);
   targets.forEach(t=>{const opt=node('option',t===null?'No target':displayTarget(state,t));
    opt.value=t===null?'__null__':t;select.append(opt);});
   const selected=selections.get(a.id);
   if(selected!==undefined&&targets.some(t=>(t===null?'__null__':t)===selected))select.value=selected;
   box.append(select);
  }
  // Generic mana is a strategic choice, not an automatic color deduction.
  const options=enabled&&!a.sourceId?paymentOptions(state,CARDS[a.card].cost):[];
  if(options.length>1){
   const label=node('label','Generic mana payment');label.htmlFor='payment-'+a.id;box.append(label);
   const select=node('select');select.id='payment-'+a.id;select.dataset.paymentFor=a.id;
   const prompt=node('option','Choose mana to spend');prompt.value='';prompt.disabled=true;prompt.selected=true;select.append(prompt);
   for(const option of options){
    const opt=node('option','Spend '+option.label+' · keep '+(Object.entries(option.pool)
     .filter(([,n])=>n>0).map(([c,n])=>c+' × '+n).join(' · ')||'no mana'));
    opt.value=JSON.stringify(option.spend);select.append(opt);
   }
   const previous=payments.get(a.id);
   if(previous&&options.some(o=>JSON.stringify(o.spend)===previous))select.value=previous;
   box.append(select);
  }
  const button=node('button',enabled?'Use response':'Unavailable');button.type='button';
  button.dataset.cast=a.id;button.disabled=!enabled||done;box.append(button);
  handBox.append(box);
 }hand.append(handBox);
 $('pool').textContent='Mana: '+Object.entries(state.mana).filter(([,n])=>n>0)
  .map(([c,n])=>c+' × '+n).join(' · ').replace(/^$/,'empty');
 $('pass').disabled=done;
 $('pass').textContent=state.stack.length?'PASS / RESOLVE TOP':state.combat&&!state.combat.resolved?'PASS / COMBAT DAMAGE':'PASS / FINISH WINDOW';
 $('restart').disabled=false;
 $('undo').disabled=history.length===0;
 const log=$('actionLog');log.replaceChildren(...state.log.slice(-8).map(line=>node('li',line)));
 const outcome=$('outcome');outcome.hidden=!done;
 $('nextTrial').hidden=state.status!=='won'||index===trials.length-1;
 $('retryTrial').hidden=state.status==='playing';
 const window=done?decisionWindow(p):-1;
 $('retryWindow').hidden=window<0;
 $('decisionReview').hidden=window<0;
 $('decisionReview').textContent=reviewDecision(p,window);
 if(done){
  $('outcomeTitle').textContent=state.status==='won'?'TRIAL SOLVED':'TRY ANOTHER LINE';
  const evidence=rulesPreview?{status:'not-applicable'}:referenceSubsetEvidence(p);
  const comparison=evidence.status==='verified-subset'
   ?' Supplied line: '+evidence.referenceResponses+' responses. A legal ordered subset uses '+
     evidence.shortestReferenceSubset+'; this is not a proof of global minimum.':'';
  $('outcomeText').textContent=(state.status==='won'?p.strategyLesson+' Your line used '+state.used.length+' response(s). '+p.retryPrompt:
   'The full stack did not meet the objective. '+p.strategyLesson+' Review the resolution log, then undo or restart.')+comparison;
 }
 $('notice').textContent=notice;
 if(focusKey){const [kind,value]=focusKey;const next=[...document.querySelectorAll('button[data-'+kind+']')].find(b=>b.dataset[kind]===value&&!b.disabled);(next||(!done?$('pass'):$('retryTrial'))).focus({preventScroll:true});}
}
function act(fn){
 if(state.status!=='playing')return;
 try{const next=fn();if(next){history.push(state);state=next;if(state.status==='won')completedTrials.add(trials[index].id);}setNotice(state.status==='playing'?
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
 const payment=e.target.closest('select[data-payment-for]');
 if(payment)payments.set(payment.dataset.paymentFor,payment.value);
});
$('hand').addEventListener('click',e=>{
 const b=e.target.closest('button[data-cast]');if(!b)return;
 const a=state.hand.find(a=>a.id===b.dataset.cast);if(!a)return;
 const targets=legalTargets(state,a);
 const value=$('target-'+a.id)?.value;
 if(targets.length>1&&!value){setNotice('Choose the target before using this response.');$('target-'+a.id).focus();return;}
 const target=targets.length===1?targets[0]:
  value==='__null__'?null:targets.find(t=>t===value)??targets[0];
 // Read the current visible selection; never reuse a stale allocation.
 const options=a.sourceId?[]:paymentOptions(state,CARDS[a.card].cost);
 const selected=$('payment-'+a.id)?.value;
 if(options.length>1&&!selected){setNotice('Choose the mana payment before casting.');$('payment-'+a.id).focus();return;}
 const payment=selected?options.find(o=>JSON.stringify(o.spend)===selected)?.spend:
  options.length===1?options[0].spend:null;
 if(selected&&!payment){setNotice('That mana payment is no longer available. Choose again.');render();return;}
 act(()=>activate(state,a.id,target,payment));
});
$('pass').addEventListener('click',()=>act(()=>pass(state)));
$('undo').addEventListener('click',()=>{if(!history.length)return;state=history.pop();selections.clear();payments.clear();setNotice('Previous action undone. Reconsider the resources and targets.');render();});
$('restart').addEventListener('click',()=>load(index));
$('retryTrial').addEventListener('click',()=>{load(index);$('currentTrial').focus();});
$('retryWindow').addEventListener('click',()=>{
 const window=decisionWindow(trials[index]);
 if(window<0)return;
 state=history[window];history=history.slice(0,window);selections.clear();payments.clear();
 $('hintText').hidden=true;setNotice('Priority restored before your counterspell. Choose your target and payment.');
 render();$('currentTrial').focus();
});
$('nextTrial').addEventListener('click',()=>{if(index+1<trials.length){load(index+1);$('currentTrial').focus();}});
$('hint').addEventListener('click',()=>{
 const hint=$('hintText'),show=hint.hidden;hint.hidden=!show;
 hint.textContent=show?trials[index].hint:'';setNotice(show?'Hint shown. Trial remains unranked.':'Hint hidden.');
});
load(0);
