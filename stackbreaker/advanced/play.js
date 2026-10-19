import cases from '../data/advanced-scenarios.json' with {type:'json'};
import {ADVANCED_CARDS,createAdvancedGame,castAdvanced,resolveAdvanced,
  advancedTargetOptions,targetRules} from '../src/advanced-stack.js';

const byId=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;'}[x]));
const validCases=new Map(cases.map(c=>[c.id,c]));
const routeCase=new URLSearchParams(location.search).get('case');
let active=validCases.has(routeCase)?routeCase:cases[0].id;
let state=createAdvancedGame(validCases.get(active));
let selected=state.hand[0]?.id||null;
const art=new Map();
const artNames=['Twincast','Redirect','Lightning Bolt','Arc Trail','Abrade'];
const cardLink=name=>'https://scryfall.com/search?q='+encodeURIComponent('!"'+name+'"');
function titleFor(id) {
  if(id==='player')return'You';
  if(id==='opponent')return'Opponent';
  const p=state.permanents.find(x=>x.id===id);
  if(p)return p.cardId+(p.controller==='player'?' (yours)':' (opponent)');
  const sp=state.stack.find(x=>x.id===id);
  return sp?sp.cardId+(sp.kind==='copy'?' (copy)':' (spell)'):id;
}
function optionsHtml(values,selectedValue) {
  return values.map(v=>`<option value="${esc(v)}" ${v===selectedValue?'selected':''}>${esc(titleFor(v))}</option>`).join('');
}
function setFeedback(text=''){byId('feedback').textContent=text;}
function renderChoices(){
  byId('caseChoices').innerHTML=cases.map((c,i)=>
    `<button type="button" data-case="${esc(c.id)}" aria-pressed="${c.id===active}">
      <strong>FILE ${String(i+1).padStart(2,'0')}</strong><span>${esc(c.title)}</span></button>`).join('');
  for(const el of byId('caseChoices').querySelectorAll('button')){
    el.addEventListener('click',()=>switchCase(el.dataset.case));
  }
}
function switchCase(id) {
  if(!validCases.has(id))return;
  active=id;state=createAdvancedGame(validCases.get(id));
  selected=state.hand[0]?.id||null;
  const route=new URL(location.href);route.searchParams.set('case',id);
  history.replaceState(null,'',route);
  renderChoices();render();setFeedback();
}
function reset(){state=createAdvancedGame(validCases.get(active));selected=state.hand[0]?.id||null;render();setFeedback('Case restarted. No browser progress is saved.');}
function renderSelection(targetContainer,item,prefix,{current=null}={}) {
  const rules=targetRules(item);
  const selects=[];
  rules.forEach((rule,i)=>{
    const chosen=current?.[i];
    const opts=advancedTargetOptions(state,item,i);
    // Keeping an existing target is allowed even if it has become illegal.
    if(chosen!=null&&!opts.includes(chosen))opts.unshift(chosen);
    const selectedValue=chosen??opts[0];
    const label=document.createElement('label');
    label.textContent=rules.length===1?'TARGET':`TARGET ${i+1} · ${rule==='anotherAny'?'ANOTHER TARGET':rule.toUpperCase()}`;
    const select=document.createElement('select');
    select.className=prefix+'-target';
    select.setAttribute('aria-label',label.textContent);
    for(const id of opts){const option=document.createElement('option');
      option.value=id;option.textContent=titleFor(id);
      if(id===selectedValue)option.selected=true;
      select.append(option);}
    label.append(select);targetContainer.append(label);selects.push(select);
  });
  return selects;
}
function renderCastDecision() {
  const target=byId('decision');target.innerHTML='';
  if(state.status!=='playing'||!selected)return;
  const hand=state.hand.find(x=>x.id===selected);if(!hand)return;
  const c=ADVANCED_CARDS[hand.cardId];
  const intro=document.createElement('p');intro.textContent='CAST '+hand.cardId.toUpperCase()+' · CHOOSE ITS LEGAL SPELL TARGET';
  target.append(intro);
  const item={id:hand.id,controller:'player',cardId:hand.cardId,chosenModes:[]};
  let modeSelect=null;
  if(c.modes) {
    const label=document.createElement('label');label.textContent='CHOSEN MODE';
    modeSelect=document.createElement('select');modeSelect.setAttribute('aria-label','Chosen spell mode');
    for(const key of Object.keys(c.modes)){const option=document.createElement('option');option.value=key;option.textContent=key;modeSelect.append(option);}
    label.append(modeSelect);target.append(label);
    item.chosenModes=[modeSelect.value];
    modeSelect.addEventListener('change',()=>renderCastDecision());
  }
  const selects=renderSelection(target,item,'cast');
  const button=document.createElement('button');button.type='button';button.textContent='CAST THIS RESPONSE →';
  button.addEventListener('click',()=>{
    try {
      const chosenModes=c.modes?[modeSelect.value]:[];
      const targets=selects.map(x=>x.value);
      state=castAdvanced(state,selected,{targets,chosenModes});
      selected=state.hand[0]?.id||null;render();setFeedback();
    }catch(error){setFeedback(error.message);}
  });
  target.append(button);
}
function renderResolveDecision() {
  const target=byId('decision');target.innerHTML='';
  if(state.status!=='playing'||!state.stack.length)return false;
  const top=state.stack.at(-1),effect=ADVANCED_CARDS[top.cardId].effect;
  if(!['copy','retarget'].includes(effect))return false;
  const original=state.stack.find(x=>x.id===top.targets[0]);
  if(!original)return false;
  const copyCandidate=effect==='copy'?{...original,controller:top.controller,id:'copy-preview'}:original;
  const line=document.createElement('p');
  line.textContent=(effect==='copy'?'THE COPY MAY CHOOSE NEW TARGETS.':'REDIRECT MAY CHOOSE NEW TARGETS.')+' Modes are fixed; keeping existing targets is legal.';
  target.append(line);
  renderSelection(target,copyCandidate,'resolve',{current:original.targets});
  return true;
}
function resolveClick(){
 try{
  let args={};
  const selects=[...byId('decision').querySelectorAll('select.resolve-target')];
  if(selects.length)args={newTargets:selects.map(x=>x.value)};
  state=resolveAdvanced(state,args);render();setFeedback();
 }catch(error){setFeedback(error.message);}
}
function render(){
  const c=validCases.get(active),i=cases.findIndex(x=>x.id===active);
  byId('caseNumber').textContent=`CASE ${String(i+1).padStart(2,'0')} / ${String(cases.length).padStart(2,'0')}`;
  byId('caseName').textContent=c.title;byId('tier').textContent=c.tier;
  byId('intro').textContent=c.intro;
  byId('yourLife').textContent=state.life.player;byId('enemyLife').textContent=state.life.opponent;
  const mana=Object.entries(state.mana).filter(([,n])=>n>0);
  byId('mana').textContent=mana.length?mana.map(([k,n])=>`${n} ${k}`).join('  ·  '):'EMPTY';
  byId('battlefield').innerHTML=state.permanents.length?state.permanents.map(p=>
    `<div class="permanent" data-zone="${esc(p.zone)}"><strong>${esc(p.cardId)}</strong>
     <small>${esc(p.controller)} · ${esc(p.type)} · ${esc(p.zone)}${p.damage!=null?' · '+p.damage+'/'+p.toughness+' damage/toughness':''}</small></div>`).join(''):'<span class="empty">No permanents in this response window.</span>';
  byId('stack').innerHTML=state.stack.length?state.stack.map(x=>
    `<li class="spell" data-kind="${esc(x.kind)}"><span><strong>${esc(x.cardId)}</strong><small>
      ${esc(x.controller)} · ${esc(x.chosenModes.join(', ')||'no mode')} ·
      ${x.targets.length?'→ '+esc(x.targets.map(titleFor).join(' / ')):'no targets'}</small></span>
      <span class="tag">${x.kind==='copy'?'SPELL COPY · NOT CAST':'SPELL'}</span></li>`).join(''):'<li class="empty">The stack is empty.</li>';
  byId('hand').innerHTML=state.hand.length?state.hand.map(x=>{
    const url=art.get(x.cardId);
    return `<button type="button" class="hand-card ${selected===x.id?'selected':''}" data-hand="${esc(x.id)}" aria-pressed="${selected===x.id}">
      ${url?'<img src="'+esc(url)+'" alt="" aria-hidden="true">':''}
      <strong>${esc(x.cardId)}</strong><small>${Object.entries(ADVANCED_CARDS[x.cardId].cost).map(([k,n])=>k==='generic'?n:n+k).join(' ')}</small>
      <span class="card-link">SELECT RESPONSE</span></button>`;
  }).join(''):'<span class="empty">No response cards remain.</span>';
  for(const button of byId('hand').querySelectorAll('button'))button.addEventListener('click',()=>{
    selected=button.dataset.hand;render();setFeedback();
  });
  if(!renderResolveDecision())renderCastDecision();
  const result=byId('result');result.className='result '+(state.status==='playing'?'':state.status);
  result.textContent=state.status==='playing'?'PRIORITY WINDOW OPEN':state.status==='won'?'CASE SOLVED · STACKBROKEN':'CASE LOST · TRY AGAIN';
  const resolveButton=byId('resolveButton');resolveButton.disabled=state.status!=='playing'||!state.stack.length;
  resolveButton.textContent=state.stack.length?state.stack.at(-1).cardId==='Twincast'?'RESOLVE TWINCAST · CREATE COPY →':
    'PASS / RESOLVE TOP →':'STACK EMPTY';
  byId('lessonText').textContent=state.status==='won'?c.lesson:'Complete a case to reveal the relevant copy and target interaction.';
  const log=state.events.slice(-14).map(e=>`${e.type} · ${e.subjectId}`);
  byId('log').innerHTML=(log.length?log:state.log).map(x=>`<li>${esc(x)}</li>`).join('');
}
byId('resolveButton').addEventListener('click',resolveClick);
byId('resetButton').addEventListener('click',reset);
renderChoices();render();
async function hydrateArt(){
  // Scryfall images are display-only. A slow/broken request never blocks rules.
  for(const name of artNames){
    try{
      const response=await fetch('https://api.scryfall.com/cards/named?exact='+encodeURIComponent(name),
        {headers:{Accept:'application/json'}});
      if(response.ok){const data=await response.json(),url=data.image_uris?.small||data.card_faces?.[0]?.image_uris?.small;
        if(/^https:\/\/cards\.scryfall\.io\//.test(url||'')){art.set(name,url);render();}}
      if(response.status===429)break;
    }catch{}
    await new Promise(done=>setTimeout(done,180));
  }
}
hydrateArt();
