import {CARDS,LANDS,RULES_VERSION,cardLink} from './cards.js';
import {createGame,tapLand,activate,pass,paymentOptions,legalActions,legalTargets,creaturePower,creatureToughness,labelTarget} from './engine.js';
import scenarios from '../data/scenarios.json' with {type:'json'};

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const glyph={W:'☀',U:'◆',B:'✦',R:'✹',G:'❀',C:'◇'};
const progressKey='dc-stackbreaker-progress-v3';
let index=0,game,history=[],selectedTargets={},selectedPayments={},hint=false,progress={},dragTouch=null;
try{progress=JSON.parse(localStorage.getItem(progressKey)||'{}')||{};}catch{}
const save=()=>{try{localStorage.setItem(progressKey,JSON.stringify(progress))}catch{}};
function pips(obj,raw=false){let out=[];for(const c of ['generic','W','U','B','R','G','C']){const n=obj?.[c]||0;
 if(c==='generic'){if(n)out.push(`<span class="mana-pip generic" title="${n} generic">${n}</span>`);continue;}
 for(let j=0;j<n;j++)out.push(`<span class="mana-pip ${c}" title="${c} mana">${glyph[c]}</span>`);
 }return out.join('')||(raw?'':'<span class="empty-mana">EMPTY</span>');}
function titleForTarget(id){return id==null?'No target':labelTarget(game,id)}
function objectiveText(s){const o=s.objective;if(o.type==='survive')return'Survive with at least 1 life.';
 if(o.type==='win')return'Deal lethal damage to the opponent and survive.';
 if(o.type==='keepN')return`Keep at least ${o.count} friendly creatures alive.`;
 return`Keep ${s.units.find(u=>u.id===o.unitId)?.card||'the required creature'} ${o.type==='keepUnit'?'on the battlefield':'out of the graveyard'}.`;
}
function changeCase(n){index=Math.max(0,Math.min(scenarios.length-1,n));game=createGame(scenarios[index]);history=[];hint=false;selectedTargets={};selectedPayments={};render();}
function shortCard(u){const c=CARDS[u.card],gone=u.zone!=='battlefield';let flags=[u.indestructible?'INDESTRUCTIBLE':'',u.hexproof?'HEXPROOF':'',u.damage?`${u.damage} DAMAGE`:''].filter(Boolean).join(' · ');
 return `<div class="battle-unit"><div class="battle-card ${gone?'off':''}" title="${esc(c.oracle||c.type)}" role="group" aria-label="${esc(u.card)}, ${creaturePower(u)}/${creatureToughness(u)}, ${gone?u.zone:'on battlefield'}"><header>${esc(u.card)}</header><span class="sig" aria-hidden="true">${c.colors.includes('G')?'❀':c.colors.includes('W')?'✧':'✦'}</span><div class="flags">${esc(gone?u.zone.toUpperCase():flags)}</div><strong class="pt">${creaturePower(u)}/${creatureToughness(u)}</strong></div></div>`;
}
function landCard(l){const c=LANDS[l.card],m=c.mana;return `<button class="land-card ${m} ${l.tapped?'tapped':''}" type="button" data-land="${esc(l.id)}" ${l.tapped||game.status!=='playing'?'disabled':''} title="${esc(l.card+' — '+c.oracle)}" aria-label="${l.tapped?'Tapped':'Tap'} ${esc(l.card)} for ${m} mana"><span class="land-name">${esc(l.card)}</span><span class="land-sigil" aria-hidden="true">${glyph[m]}</span><span class="tap-label">${l.tapped?'TAPPED':`TAP · ${m}`}</span></button>`;}
function stackCard(item,i){const c=CARDS[item.card];return `<li class="stack-entry ${i===0?'on-top':''}"><span class="stack-rank">${i===0?'TOP':i+1}</span><div style="min-width:0;flex:1"><b>${esc(item.card)}${item.spell===false?' · ABILITY':''}</b><small>${item.controller==='player'?'YOU':'OPPONENT'}${item.targetId?' → '+esc(labelTarget(game,item.targetId)):''}</small></div><a href="${esc(cardLink(item.card))}" target="_blank" rel="noopener noreferrer" title="Card reference for ${esc(item.card)}" aria-label="View ${esc(item.card)} card">↗</a></li>`}
function handCard(a,i,ready){const c=CARDS[a.card];const targets=legalTargets(game,a);let target=selectedTargets[a.id];if(!targets.includes(target))target=targets[0];selectedTargets[a.id]=target;
 const payments=a.sourceId?[{spend:null,label:'Sacrifice'}]:paymentOptions(game,c.cost);const selected=selectedPayments[a.id]??0;
 if(selected>=payments.length)selectedPayments[a.id]=0;
 const can=ready.includes(a.id);
 const selectors=targets.length>1?`<label>TARGET<select data-target-for="${esc(a.id)}" aria-label="Target for ${esc(a.card)}">${targets.map(t=>`<option value="${esc(t)}" ${target===t?'selected':''}>${esc(titleForTarget(t))}</option>`).join('')}</select></label>`:(targets.length===1&&target!=null?`<span class="response-steps">→ ${esc(titleForTarget(target))}</span>`:'<span class="response-steps">NO TARGET</span>');
 const paySelect=payments.length>1?`<label>GENERIC<select data-payment-for="${esc(a.id)}" aria-label="Spend generic mana for ${esc(a.card)}">${payments.map((op,j)=>`<option value="${j}" ${j===(selectedPayments[a.id]??0)?'selected':''}>${esc(op.label)}</option>`).join('')}</select></label>`:'';
 return `<article class="response-card ${a.sourceId?'ability':''} ${!can?'unavailable':''}" data-drag-card="${esc(a.id)}" draggable="true" tabindex="0" title="${esc(c.oracle)}" aria-label="${esc(a.card)}, drag onto stack or use the Cast button"><div class="response-head"><strong>${esc(a.card)}</strong><span class="mana-row">${a.sourceId?'SAC':pips(c.cost,true)}</span></div><div class="oracle-preview">${esc(c.oracle)}</div><div class="response-steps">${a.sourceId?'Sacrifice source to activate':can?'Ready · drag to stack':'Tap lands to pay'} · ${esc(c.type)}</div><div class="response-bottom">${selectors}${paySelect}<button type="button" data-cast="${esc(a.id)}" ${!can?'disabled':''}>${a.sourceId?'ACTIVATE':'CAST'} ↗</button></div></article>`;
}
function render(){const s=game,p=scenarios[index];$('missionTier').textContent=p.tier.toUpperCase();$('missionNum').textContent=String(index+1).padStart(2,'0')+' / 12';$('scenarioTitle').textContent=p.title;
 $('scenarioSelect').innerHTML=scenarios.map((o,i)=>`<option value="${i}" ${i===index?'selected':''}>${String(i+1).padStart(2,'0')} ${esc(o.title)}${progress[o.id]?' ★':''}</option>`).join('');
 $('playerLife').textContent=s.life.player;$('opponentLife').textContent=s.life.opponent;$('manaPool').innerHTML=pips(s.mana);
 $('priority').textContent=s.status==='playing'?'● PRIORITY: YOU':s.status==='won'?'✓ SURVIVED':'✕ DEFEATED';$('objective').textContent=objectiveText(s);$('objectiveShort').textContent=p.tier.toUpperCase();
 $('battlefield').innerHTML=s.units.length?s.units.map(shortCard).join(''):'<span class="empty-creatures">No creatures in this case</span>';
 $('lands').innerHTML=s.lands.length?s.lands.map(landCard).join(''):'<span class="empty-creatures">No lands needed — activate your creature’s ability</span>';
 $('stackCount').textContent=String(s.stack.length).padStart(2,'0');$('stack').innerHTML=s.stack.length?[...s.stack].reverse().map(stackCard).join(''):'<li class="stack-empty">Empty stack</li>';
 const remaining=s.hand.filter(a=>!s.used.includes(a.id)),ready=legalActions(s);$('handCount').textContent=remaining.length+' AVAILABLE';$('hand').classList.toggle('many',remaining.length>3);$('hand').innerHTML=remaining.map((a,i)=>handCard(a,i,ready)).join('')||'<span class="empty-creatures">Hand empty — pass priority to resolve the stack</span>';
 $('passButton').disabled=s.status!=='playing';$('undoButton').disabled=!history.length;$('nextButton').textContent=s.status==='won'?(index===11?'FIRST CASE ↻':'NEXT CASE →'):'NEXT →';
 $('resultMini').className='result-mini'+(s.status==='won'?' won':s.status==='lost'?' lost':'');$('resultEyebrow').textContent=s.status==='won'?'✓ CASE SOLVED':s.status==='lost'?'✕ TRY AGAIN':'YOUR MOVE';
 $('resultTitle').textContent=s.status==='won'?'Click NEXT to continue':s.status==='lost'?'Reset or undo to retry':'Tap lands, then cast responses';
 $('scenarioIntro').textContent=p.intro;$('objectiveLong').textContent=objectiveText(s);$('hintText').hidden=!hint;$('hintText').textContent=p.hint;$('hintButton').setAttribute('aria-expanded',String(hint));
 $('resultExplanation').textContent=s.status==='playing'?'Complete the case to see the rules explanation.':p.explanation;
 if(s.status==='won'){const stars=s.used.length<=2?3:2;progress[p.id]=Math.max(progress[p.id]||0,stars);save();$('resultStars').textContent='★'.repeat(stars)+'☆'.repeat(3-stars);}else $('resultStars').textContent='';
 $('completed').textContent=Object.keys(progress).length+' / 12 SOLVED';$('log').innerHTML=s.log.slice(-14).reverse().map(x=>`<li>${esc(x)}</li>`).join('');$('version').textContent=RULES_VERSION;$('live').textContent=s.log.at(-1)||'Tap a land to produce mana.';
}
function notify(message){$('live').textContent=message;}
function pushState(s){history.push(structuredClone(game));game=s;render()}
function applyLand(id){try{pushState(tapLand(game,id));}catch(e){notify(e.message)}}
function applyCast(id){try{const a=game.hand.find(x=>x.id===id);if(!a)return;const payment=a.sourceId?null:paymentOptions(game,CARDS[a.card].cost)[selectedPayments[id]??0];
 const target=selectedTargets[id]??null;pushState(activate(game,id,target,payment?.spend??null));}catch(e){notify(e.message+ ' — tap the required lands first.')}}
function applyPass(){try{pushState(pass(game))}catch(e){notify(e.message)}}
function undo(){if(!history.length)return;game=history.pop();render()}
$('lands').addEventListener('click',e=>{const btn=e.target.closest('[data-land]');if(btn)applyLand(btn.dataset.land)});
$('hand').addEventListener('change',e=>{if(e.target.dataset.targetFor)selectedTargets[e.target.dataset.targetFor]=e.target.value;if(e.target.dataset.paymentFor)selectedPayments[e.target.dataset.paymentFor]=Number(e.target.value)});
$('hand').addEventListener('click',e=>{const btn=e.target.closest('[data-cast]');if(btn)applyCast(btn.dataset.cast)});
$('passButton').addEventListener('click',applyPass);$('undoButton').addEventListener('click',undo);$('restartButton').addEventListener('click',()=>changeCase(index));$('nextButton').addEventListener('click',()=>changeCase((index+1)%scenarios.length));
$('scenarioSelect').addEventListener('change',e=>changeCase(Number(e.target.value)));
$('hintButton').addEventListener('click',()=>{hint=!hint;render()});
// Desktop HTML drag/drop: cards can be physically placed on the stack.
$('hand').addEventListener('dragstart',e=>{const source=e.target.closest('[data-drag-card]');if(!source||game.status!=='playing'){e.preventDefault();return;}e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',source.dataset.dragCard);source.classList.add('dragging')});
$('hand').addEventListener('dragend',()=>{$('stackDrop').classList.remove('drop-ready');$('hand').querySelectorAll('.dragging').forEach(n=>n.classList.remove('dragging'))});
$('stackDrop').addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='move';$('stackDrop').classList.add('drop-ready')});
$('stackDrop').addEventListener('dragleave',e=>{if(!$('stackDrop').contains(e.relatedTarget))$('stackDrop').classList.remove('drop-ready')});
$('stackDrop').addEventListener('drop',e=>{e.preventDefault();$('stackDrop').classList.remove('drop-ready');const id=e.dataTransfer.getData('text/plain');if(id)applyCast(id)});
// Touch/pen drag with a floating ghost; tap-to-cast button remains an accessible fallback.
$('hand').addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||e.target.closest('button,select,label,a'))return;const card=e.target.closest('[data-drag-card]');if(!card)return;dragTouch={id:card.dataset.dragCard,x:e.clientX,y:e.clientY,moved:false,ghost:null};});
document.addEventListener('pointermove',e=>{if(!dragTouch)return;const d=dragTouch;if(!d.moved&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>9){d.moved=true;d.ghost=document.createElement('div');d.ghost.className='drag-ghost';d.ghost.textContent=game.hand.find(a=>a.id===d.id)?.card||'SPELL';document.body.append(d.ghost)}
 if(!d.moved)return;e.preventDefault();d.ghost.style.left=e.clientX+'px';d.ghost.style.top=e.clientY+'px';$('stackDrop').classList.toggle('drop-ready',!!document.elementFromPoint(e.clientX,e.clientY)?.closest('#stackDrop'));
},{passive:false});
function finishTouch(e){if(!dragTouch)return;const d=dragTouch;dragTouch=null;const onStack=d.moved&&!!document.elementFromPoint(e.clientX,e.clientY)?.closest('#stackDrop');d.ghost?.remove();$('stackDrop').classList.remove('drop-ready');if(onStack)applyCast(d.id);}
document.addEventListener('pointerup',finishTouch);document.addEventListener('pointercancel',()=>{dragTouch?.ghost?.remove();dragTouch=null;$('stackDrop').classList.remove('drop-ready')});
document.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;
 if(e.key===' '){e.preventDefault();applyPass()}else if(e.key.toLowerCase()==='z')undo();else if(/^[1-9]$/.test(e.key)){const a=game.hand.filter(x=>!game.used.includes(x.id))[Number(e.key)-1];if(a)applyCast(a.id)}});
changeCase(0);