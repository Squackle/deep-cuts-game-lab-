import cases from '../data/ward-scenarios.json' with {type:'json'};
import {WARD_CARDS,createWardGame,castWard,resolveWard,
 beginWardUpkeep,canPayWard,wardTargetOptions} from '../src/trigger-ward.js';
const byId=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const scenes=new Map(cases.map(c=>[c.id,c]));
const route=new URLSearchParams(location.search).get('case');
let active=scenes.has(route)?route:cases[0].id;
let state=createWardGame(scenes.get(active));
let selected=state.hand[0]?.id??null;
function labelFor(id){
 if(id==='player')return'You';
 if(id==='opponent')return'Opponent';
 const p=state.permanents.find(x=>x.id===id);
 if(p)return p.cardId+(p.controller==='player'?' (yours)':' (opponent)')+(p.zone==='graveyard'?' · graveyard':'');
 const onStack=state.stack.find(x=>x.id===id);
 return onStack?onStack.cardId+(onStack.kind==='trigger'?' · triggered ability':' · spell'):id;
}
function feedback(message=''){byId('feedback').textContent=message;}
function menu(){
 byId('caseChoices').innerHTML=cases.map((c,i)=>`<button type="button" data-case="${esc(c.id)}" aria-pressed="${c.id===active}"><small>CASE ${String(i+1).padStart(2,'0')}</small><span>${esc(c.title)}</span></button>`).join('');
 for(const button of byId('caseChoices').querySelectorAll('button'))
  button.addEventListener('click',()=>switchCase(button.dataset.case));
}
function switchCase(id){
 if(!scenes.has(id))return;
 active=id;state=createWardGame(scenes.get(id));
 selected=state.hand[0]?.id??null;
 const url=new URL(location.href);url.searchParams.set('case',id);
 history.replaceState(null,'',url);
 menu();render();feedback();
}
function restart(){
 state=createWardGame(scenes.get(active));
 selected=state.hand[0]?.id??null;
 render();feedback('Case restarted. No persistent progress is stored.');
}
function castDecision({append=false}={}){
 const element=byId('decision');if(!append)element.innerHTML='';
 if(state.status!=='playing'||!selected)return;
 const hand=state.hand.find(x=>x.id===selected);
 if(!hand)return;
 const rule=WARD_CARDS[hand.cardId];
 const headline=document.createElement('p');headline.textContent='CAST '+hand.cardId.toUpperCase()+' · CHOOSE THE LEGAL TARGET';
 element.append(headline);
 const selects=[];
 for(let i=0;i<rule.slots.length;i++){
  const label=document.createElement('label');
  label.textContent='TARGET '+(i+1)+' · '+rule.slots[i].toUpperCase();
  const select=document.createElement('select');select.className='cast-target';
  select.setAttribute('aria-label',label.textContent);
  const item={cardId:hand.cardId,controller:'player'};
  const ids=wardTargetOptions(state,item,i);
  for(const id of ids){
   const opt=document.createElement('option');opt.value=id;opt.textContent=labelFor(id);select.append(opt);
  }
  label.append(select);element.append(label);selects.push(select);
 }
 const submit=document.createElement('button');
 submit.type='button';submit.textContent='CAST RESPONSE →';
 submit.addEventListener('click',()=>{
  try{
   state=castWard(state,hand.id,{targets:selects.map(s=>s.value)});
   selected=state.hand[0]?.id??null;
   render();feedback();
  }catch(e){feedback(e.message);}
 });
 element.append(submit);
}
function wardDecision(){
 const element=byId('decision');element.innerHTML='';
 const top=state.stack.at(-1);
 if(state.status!=='playing'||top?.kind!=='trigger')return;
 const desc=document.createElement('p');
 desc.textContent=top.choices.effect==='ward'
  ?'WARD TRIGGER · choose whether to pay when this trigger resolves.'
  :'TRIGGERED ABILITY · pass priority to resolve it.';
 element.append(desc);
 if(top.choices.effect==='ward'){
  const target=state.stack.find(x=>x.id===top.choices.protectedSpellId);
  if(!target)return;
  const cost=top.choices.wardCost;
  const amount=Object.entries(cost).map(([k,v])=>`${v} ${k==='generic'?'generic':k}`).join(' + ');
  const enabled=target.controller==='player'&&canPayWard(state,cost);
  const label=document.createElement('label');label.className='pay';
  const input=document.createElement('input');input.type='checkbox';input.id='payWard';
  input.disabled=!enabled;
  label.append(input,document.createTextNode(
   `Pay ward ${amount} to preserve ${labelFor(target.id)}${enabled?'':' · unavailable to you'}`));
  element.append(label);
 }
}
function render(){
 const caseFile=scenes.get(active),index=cases.findIndex(x=>x.id===active);
 byId('caseNumber').textContent=`CASE ${String(index+1).padStart(2,'0')} / ${String(cases.length).padStart(2,'0')}`;
 byId('caseName').textContent=caseFile.title;
 byId('intro').textContent=caseFile.description;
 byId('yourLife').textContent=state.life.player;byId('enemyLife').textContent=state.life.opponent;
 const mana=Object.entries(state.mana.player).filter(([,n])=>n>0);
 byId('mana').textContent=mana.length?mana.map(([c,n])=>`${n} ${c}`).join(' · '):'NONE';
 byId('battlefield').innerHTML=state.permanents.length?state.permanents.map(p=>
 `<div class="permanent" data-zone="${esc(p.zone)}"><strong>${esc(p.cardId)}</strong>
   <small>${esc(p.controller)} · ${esc(p.zone)}${p.ward?' · WARD {2}':''}</small></div>`).join('')
  :'<span class="empty">No permanents in this response window.</span>';
 byId('stack').innerHTML=state.stack.length?state.stack.map((x,i)=>
 `<li data-kind="${esc(x.kind)}"><span><strong>${esc(x.cardId)}</strong><small>
  ${esc(x.controller)} · ${x.kind==='trigger'?esc(x.choices.effect)+' · source '+esc(x.sourceId):'TARGET → '+esc(x.targets.map(labelFor).join(' / ')||'none')}
  </small></span><span class="tag">${i===state.stack.length-1?'NEXT · ':''}${x.kind==='trigger'?'TRIGGER · NOT CAST':'SPELL'}</span></li>`).join('')
  :'<li class="empty">Stack empty.</li>';
 byId('hand').innerHTML=state.hand.length?state.hand.map(x=>
 `<button type="button" data-hand="${esc(x.id)}" aria-pressed="${selected===x.id}"><strong>${esc(x.cardId)}</strong><small>INSTANT RESPONSE</small></button>`).join('')
  :'<span class="empty">No instant responses available.</span>';
 for(const button of byId('hand').querySelectorAll('button'))
  button.addEventListener('click',()=>{selected=button.dataset.hand;render();feedback();});
 const top=state.stack.at(-1);
 if(top?.kind==='trigger'){
  wardDecision();
  // Trigger on stack does not stop instants: Stifle/Edict may respond.
  castDecision({append:true});
 }else castDecision();
 const status=byId('result');
 status.className='result '+(state.status==='playing'?'':state.status);
 status.textContent=state.status==='playing'?'PRIORITY WINDOW OPEN':state.status==='won'?'CASE SOLVED · STACKBROKEN':'CASE LOST · TRY AGAIN';
 byId('resolveButton').disabled=state.status!=='playing'||!state.stack.length;
 byId('resolveButton').textContent=top?.kind==='trigger'?'PASS / RESOLVE TRIGGER →':'PASS / RESOLVE TOP →';
 byId('upkeepButton').hidden=caseFile.id!=='tw-006';
 byId('upkeepButton').disabled=state.status!=='playing'||state.upkeepStarted;
 byId('lessonText').textContent=state.status==='won'?caseFile.detail:'Solve a case to see the relevant interaction.';
 const entries=state.events.slice(-18).map(x=>`${x.type} · ${x.subjectId}`);
 byId('log').innerHTML=(entries.length?entries:['Opponent passes priority to you.']).map(x=>`<li>${esc(x)}</li>`).join('');
}
byId('resolveButton').addEventListener('click',()=>{
 try{
  const payWard=byId('payWard')?.checked===true;
  state=resolveWard(state,{payWard});render();feedback();
 }catch(e){feedback(e.message);}
});
byId('upkeepButton').addEventListener('click',()=>{
 try{state=beginWardUpkeep(state,'player');render();feedback();}
 catch(e){feedback(e.message);}
});
byId('resetButton').addEventListener('click',restart);
menu();render();
