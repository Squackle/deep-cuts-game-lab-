import cases from '../data/replacement-scenarios.js';
import {createReplacementGame,chooseReplacement,applicableEffects,replacementChooser} from '../src/replacement-prevention.js';
const byId=id=>document.getElementById(id);
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const scenes=new Map(cases.map(c=>[c.id,c]));
const requested=new URLSearchParams(location.search).get('case');
let active=scenes.has(requested)?requested:cases[0].id;
let state=createReplacementGame(scenes.get(active));
const label=id=>id==='player'?'You':id==='opponent'?'Opponent':state.permanents.find(p=>p.id===id)?.cardId||id;
function selectScene(id){
 if(!scenes.has(id))return;
 active=id;state=createReplacementGame(scenes.get(id));
 const url=new URL(location.href);url.searchParams.set('case',id);history.replaceState(null,'',url);
 choices();render();feedback();
}
function feedback(value=''){byId('feedback').textContent=value;}
function choices(){
 byId('caseChoices').innerHTML=cases.map((c,index)=>`<button type="button" data-case="${escapeHtml(c.id)}" aria-pressed="${c.id===active}"><small>FILE ${String(index+1).padStart(2,'0')}</small><span>${escapeHtml(c.title)}</span></button>`).join('');
 for(const b of byId('caseChoices').querySelectorAll('button'))b.addEventListener('click',()=>selectScene(b.dataset.case));
}
function apply(id){
 try{state=chooseReplacement(state,{effectId:id,actor:replacementChooser(state)});render();feedback();}
 catch(e){feedback(e.message);}
}
function render(){
 const c=scenes.get(active);
 byId('caseNumber').textContent=`FILE ${String(cases.indexOf(c)+1).padStart(2,'0')} / 24`;
 byId('caseName').textContent=c.title;
 byId('intro').textContent='The incoming event would deal '+c.damage.amount+' damage to '+label(c.damage.target)+'. Choose the order that preserves your objective.';
 byId('yourLife').textContent=state.life.player;byId('enemyLife').textContent=state.life.opponent;
 byId('damage').textContent=state.pending.amount;
 byId('battlefield').innerHTML=state.permanents.length?state.permanents.map(p=>
  `<div class="permanent" data-zone="${escapeHtml(p.zone)}"><strong>${escapeHtml(p.cardId)}</strong><small>${escapeHtml(p.controller)} · ${escapeHtml(p.zone)} · ${p.damage||0}/${p.toughness} damage / toughness</small></div>`).join('')
  :`<span class="empty">Affected: ${escapeHtml(label(state.pending.target))}</span>`;
 const decision=byId('decision');
 const available=applicableEffects(state);
 decision.innerHTML=available.length
  ?`<p>CONTROLLER'S CHOICE: ${escapeHtml(replacementChooser(state))} · DAMAGE TO ${escapeHtml(label(state.pending.target))}</p>`+
   available.map(e=>`<button type="button" data-effect="${escapeHtml(e.id)}">${escapeHtml(e.card)} · ${escapeHtml(e.kind)}</button>`).join(' ')
  :'<p>The damage event has finished resolving.</p>';
 for(const b of decision.querySelectorAll('button'))b.addEventListener('click',()=>apply(b.dataset.effect));
 const result=byId('result');result.className='result '+(state.status==='playing'?'':state.status);
 result.textContent=state.status==='playing'?'CHOOSE THE NEXT APPLICABLE EFFECT':
  state.status==='won'?'CASE SOLVED · STACKBROKEN':'CASE LOST · TRY AGAIN';
 byId('lessonText').textContent=state.status==='won'?c.explanation:'Test a different order to see the outcome.';
 const e=state.events.slice(-14).map(x=>`${x.type} · ${x.id||x.target||x.status||''}`);
 byId('log').innerHTML=(e.length?e:['Awaiting the affected player\'s decision.']).map(s=>`<li>${escapeHtml(s)}</li>`).join('');
}
byId('resetButton').addEventListener('click',()=>{state=createReplacementGame(scenes.get(active));render();feedback('Case reset — no browser progress saved.');});
choices();render();
