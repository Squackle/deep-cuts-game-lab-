import {CARDS,RULES_VERSION,cardLink} from './cards.js';
import {createGame,activate,pass,legalActions,legalTargets,creaturePower,creatureToughness,labelTarget} from './engine.js';
import scenarios from '../data/scenarios.json' with {type:'json'};

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const sp='dc-stackbreaker-progress-v2';
let current=0,game=null,history=[],hintVisible=false,detailsCard=null,selectedTargets={},progress={};
try{progress=JSON.parse(localStorage.getItem(sp)||'{}')||{}}catch{}
const save=()=>{try{localStorage.setItem(sp,JSON.stringify(progress));}catch{}};
const manaGlyph={W:'☀',U:'◆',B:'✦',R:'✹',G:'❀',C:'◇'};
const manaName={W:'White',U:'Blue',B:'Black',R:'Red',G:'Green',C:'Colorless'};
function pips(obj){let r=[];for(const c of ['generic','W','U','B','R','G','C']){
 const n=obj?.[c]||0;if(c==='generic'){if(n)r.push(`<span class="mana-pip generic" title="${n} generic mana">${n}</span>`);continue;}
 for(let i=0;i<n;i++)r.push(`<span class="mana-pip ${c}" title="${manaName[c]} mana">${manaGlyph[c]}</span>`);
 }return r.join('')||'<span class="empty-mana">0</span>';}
function spellName(item){return item.card+(item.spell===false?' · ability':'');}
function signature(name){let c=CARDS[name],color=c.colors?.[0]||'C';return `<div class="card-art ${color}" aria-hidden="true"><span class="art-runes">⟡ ✦ ⟡</span><span class="art-emblem">${c.type.startsWith('Creature')?'♜':c.type==='Sorcery'?'✺':'✦'}</span><span class="art-wisps">⌁ ⌁ ⌁</span></div>`;}
function card(name,opts={}){const c=CARDS[name],u=opts.unit,small=opts.small;
 let stat=u?`${creaturePower(u)}/${creatureToughness(u)}`:(c.power!=null?`${c.power}/${c.toughness}`:'');
 const damaged=u?.damage>0;const alt=u&&u.zone!=='battlefield'?`<span class="zone-stamp">${esc(u.zone)}</span>`:'';
 const tags=u&&u.zone==='battlefield'?`${u.hexproof?'<span class="trait">HEXPROOF</span>':''}${u.indestructible?'<span class="trait">INDESTRUCTIBLE</span>':''}`:'';
 return `<div class="card-frame ${small?'compact':''} ${u&&u.zone!=='battlefield'?'inactive':''}" role="group" aria-label="${esc(name)}${stat?' '+stat:''}${u?' '+u.zone:''}">
  <div class="card-head"><strong>${esc(name)}</strong><span class="mana-row">${pips(c.cost)}</span></div>
  ${signature(name)}<div class="card-type">${esc(c.type)}</div>
  <p class="oracle">${esc(c.oracle||'No rules text.')}</p>${c.note?`<p class="oracle note">${esc(c.note)}</p>`:''}
  <div class="card-base"><a href="${esc(cardLink(name))}" target="_blank" rel="noopener noreferrer" aria-label="See ${esc(name)} on Scryfall">CARD REFERENCE ↗</a>${stat?`<strong class="pt">${stat}</strong>`:''}</div>
  ${damaged?`<div class="damage">${u.damage} damage marked</div>`:''}${tags?`<div class="traits">${tags}</div>`:''}${alt}</div>`;
}
function targetText(id){return id==null?'No target':labelTarget(game,id);}
function setScenario(n){current=Math.max(0,Math.min(n,scenarios.length-1));game=createGame(scenarios[current]);history=[];hintVisible=false;detailsCard=null;selectedTargets={};render();}
function render(){const s=game,p=scenarios[current];$('missionNum').textContent=String(current+1).padStart(2,'0')+' / '+String(scenarios.length).padStart(2,'0');$('missionTier').textContent=p.tier.toUpperCase();$('scenarioTitle').textContent=p.title;$('scenarioIntro').textContent=p.intro;$('version').textContent=RULES_VERSION;
 $('playerLife').textContent=s.life.player;$('opponentLife').textContent=s.life.opponent;$('manaPool').innerHTML=pips(s.mana);
 $('priority').textContent=s.status==='playing'?'● YOU HAVE PRIORITY':s.status==='won'?'◆ SURVIVED':'✖ DEFEATED';
 $('objective').textContent=objectiveText(p);$('stackCount').textContent=String(s.stack.length).padStart(2,'0');
 $('scenarioSelect').value=String(current);
 $('battlefield').innerHTML=s.units.length?s.units.map(u=>`<div class="battle-unit">${card(u.card,{unit:u,small:true})}</div>`).join(''):'<p class="empty-panel">No creatures on the battlefield. This problem is entirely about spells on the stack.</p>';
 $('stack').innerHTML=s.stack.length?[...s.stack].reverse().map((o,i)=>`<li class="stack-entry ${i===0?'on-top':''}"><div class="stack-rank">${i===0?'TOP':String(i+1).padStart(2,'0')}</div><div class="stack-info"><strong>${esc(spellName(o))}</strong><small>${esc(o.controller==='player'?'YOUR SPELL':'OPPONENT')} · ${esc(CARDS[o.card].type)}</small>${o.targetId?`<span class="target-line">↳ ${esc(labelTarget(s,o.targetId))}</span>`:''}</div><a href="${esc(cardLink(o.card))}" target="_blank" rel="noopener noreferrer" class="tiny-link" aria-label="View ${esc(o.card)} card reference">↗</a></li>`).join(''):'<li class="stack-entry stack-empty">The stack is empty</li>';
 const available=legalActions(s);
 $('hand').innerHTML=s.hand.map((a,index)=>{
 const c=CARDS[a.card],targets=legalTargets(s,a),good=available.includes(a.id),target=targets.includes(selectedTargets[a.id])?selectedTargets[a.id]:targets[0];selectedTargets[a.id]=target;
 const castLabel=a.sourceId?'ACTIVATE ABILITY':'CAST RESPONSE';
 return `<article class="response ${good?'':'unavailable'}"><div class="response-heading"><span class="response-number">${index+1}</span><strong>${esc(a.card)}</strong><span class="mana-row">${a.sourceId?'<span class="cost-sac">SACRIFICE</span>':pips(c.cost)}</span></div><p>${esc(c.oracle)}</p>${c.note?`<small>${esc(c.note)}</small>`:''}
 <div class="response-foot">${targets.length>1?`<label class="select-label">TARGET <select data-target-for="${esc(a.id)}" aria-label="Choose target for ${esc(a.card)}">${targets.map(t=>`<option value="${esc(t)}" ${t===target?'selected':''}>${esc(targetText(t))}</option>`).join('')}</select></label>`:(targets.length===1&&target!=null?`<span class="target-caption">TARGET · ${esc(targetText(target))}</span>`:'<span class="target-caption">NO TARGET REQUIRED</span>')}
 <button class="cast-btn" data-cast="${esc(a.id)}" type="button" ${!good?'disabled':''}>${castLabel} ↗</button></div></article>`;
 }).join('');
 $('passButton').disabled=s.status!=='playing';$('undoButton').disabled=!history.length;$('retryButton').disabled=false;
 $('hintText').textContent=p.hint;$('hintText').hidden=!hintVisible;$('hintButton').setAttribute('aria-expanded',String(hintVisible));
 $('log').innerHTML=s.log.slice(-9).reverse().map((line,i)=>`<li>${esc(line)}</li>`).join('');
 const result=$('result');result.hidden=s.status==='playing';if(s.status!=='playing'){
  $('resultEyebrow').textContent=s.status==='won'?'✓ CASE SOLVED':'✕ RESPONSE FAILED';$('resultTitle').textContent=s.status==='won'?'The stack broke your way.':'The threat got through.';
  $('resultExplanation').textContent=p.explanation;
  if(s.status==='won'){const optimum=[10,12].includes(current+1)?2:1;const stars=s.used.length<=optimum?3:2;progress[p.id]=Math.max(progress[p.id]||0,stars);save();$('resultStars').textContent='★'.repeat(stars)+'☆'.repeat(3-stars);}else $('resultStars').textContent='';
  $('nextButton').textContent=current===scenarios.length-1?'FIRST CASE ↻':'NEXT CASE →';
 }
 $('completed').textContent=Object.keys(progress).length+' / 12 SOLVED';
 $('scenarioSelect').innerHTML=scenarios.map((p,i)=>`<option value="${i}" ${i===current?'selected':''}>${String(i+1).padStart(2,'0')}. ${esc(p.title)} ${progress[p.id]?'★':''}</option>`).join('');
 $('live').textContent=s.log.at(-1)||'Choose a response or pass priority.';
}
function objectiveText(s){let o=s.objective;
 if(o.type==='survive')return'Survive the stack with at least 1 life.';
 if(o.type==='win')return'Deal lethal damage to the opponent and survive.';
 if(o.type==='keepN')return`Keep at least ${o.count} friendly creatures on the battlefield.`;
 const unit=s.units.find(u=>u.id===o.unitId);
 if(o.type==='keepUnit')return`Keep ${unit?.card||o.unitId} on the battlefield.`;
 return`Keep ${unit?.card||o.unitId} out of the graveyard.`;
}
function applyCast(id){try{const a=game.hand.find(x=>x.id===id),t=selectedTargets[id]??null;history.push(structuredClone(game));game=activate(game,id,t);render();}catch(e){history.pop();$('live').textContent=e.message;}}
function applyPass(){if(game.status!=='playing')return;try{history.push(structuredClone(game));game=pass(game);render();}catch(e){history.pop();$('live').textContent=e.message;}}
$('hand').addEventListener('change',e=>{const id=e.target?.dataset?.targetFor;if(id)selectedTargets[id]=e.target.value;});
$('hand').addEventListener('click',e=>{const b=e.target.closest('[data-cast]');if(b)applyCast(b.dataset.cast);});
$('passButton').addEventListener('click',applyPass);
$('undoButton').addEventListener('click',()=>{if(history.length){game=history.pop();render();}});
for(const n of ['restartButton','retryButton'])$(n).addEventListener('click',()=>setScenario(current));
$('nextButton').addEventListener('click',()=>setScenario((current+1)%scenarios.length));
$('hintButton').addEventListener('click',()=>{hintVisible=!hintVisible;render();});
$('scenarioSelect').addEventListener('change',e=>setScenario(Number(e.target.value)));
document.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(e.key===' '){e.preventDefault();applyPass();}else if(e.key.toLowerCase()==='z'){if(history.length){game=history.pop();render();}}else if(/^[1-9]$/.test(e.key)){const a=game.hand[Number(e.key)-1];if(a)applyCast(a.id);}});
setScenario(0);