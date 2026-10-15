import {CARDS,LANDS,RULES_VERSION,cardLink} from './cards.js';
import {createGame,tapLand,activate,pass,paymentOptions,legalActions,legalTargets,creaturePower,creatureToughness,labelTarget} from './engine.js';
import scenarios from '../data/scenarios.json' with {type:'json'};

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const glyph={W:'☀',U:'◆',B:'✦',R:'✹',G:'❀',C:'◇'};
// Images, card rules text and links are hydrated from a single Scryfall collection
// request. The training engine remains curated and deterministic; card metadata is
// display-only. Scryfall permits hotlinking its card-image CDN; artist/copyright
// information is presented with each cropped artwork via the hover full-card view.
const scryfallCatalog=new Map();
const CARD_CACHE_KEY='dc-stackbreaker-scryfall-cards-v1';
const CARD_CACHE_MS=24*60*60*1000;
const imageUrl=(name,size='small')=>{
 const card=scryfallCatalog.get(name);
 const url=card?.images?.[size]||'';
 return /^https:\/\/(?:cards\.scryfall\.io|img\.scryfall\.com)\//.test(url)?url:'';
};
const printedText=(name)=>scryfallCatalog.get(name)?.oracle||CARDS[name]?.oracle||LANDS[name]?.oracle||'';
const linkToCard=(name)=>scryfallCatalog.get(name)?.page||cardLink(name);
const thumb=(name,kind='small',className='')=>{
 const url=imageUrl(name,kind);
 return url?`<img class="${className}" data-preview="${esc(name)}" src="${esc(url)}" alt="${esc(name)} card image from Scryfall" loading="eager" draggable="false">`:
 `<span class="image-pending ${className}" data-preview="${esc(name)}" aria-label="Preview ${esc(name)} card">${kind==='art'?'◈':'✧'}</span>`;
};
function cardFromScryfall(c){
 const face=c.card_faces?.[0]||c;
 const image=c.image_uris||face.image_uris||{};
 const copy=key=>typeof image[key]==='string'?image[key]:'';
 return {name:c.name,images:{small:copy('small'),normal:copy('normal')||copy('large'),art:copy('art_crop')},
  oracle:c.oracle_text||face.oracle_text||'',artist:c.artist||face.artist||'',
  page:/^https:\/\/scryfall\.com\//.test(c.scryfall_uri||'')?c.scryfall_uri:cardLink(c.name)};
}
function putScryfallCards(cards){let added=0;
 for(const c of cards||[]){if(!c?.name)continue;
  const record=cardFromScryfall(c);
  if(!record.images.small&&!record.images.normal)continue;
  if(CARDS[record.name]||LANDS[record.name]){scryfallCatalog.set(record.name,record);added++;}
 }
 return added;
}
function assetStatus(message){const el=$('artStatus');if(el)el.textContent=message;}
async function fetchScryfallCatalog(){
 const names=[...Object.keys(CARDS),...Object.keys(LANDS)];
 try{const saved=JSON.parse(localStorage.getItem(CARD_CACHE_KEY)||'null');
  if(saved?.at>Date.now()-CARD_CACHE_MS&&saved?.cards){
   for(const [name,c] of Object.entries(saved.cards))if(names.includes(name)&&c?.images)scryfallCatalog.set(name,c);
   if(names.every(n=>scryfallCatalog.has(n))){assetStatus('SCRYFALL IMAGES');render();return;}
  }
 }catch{}
 assetStatus('LOADING SCRYFALL…');
 try{
  const res=await fetch('https://api.scryfall.com/cards/collection',{
   method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
   body:JSON.stringify({identifiers:names.map(name=>({name}))})});
  if(res.status===429||res.status===403){assetStatus('SCRYFALL TEMPORARILY UNAVAILABLE');return;}
  if(!res.ok)throw Error('Scryfall collection HTTP '+res.status);
  const doc=await res.json();if(!Array.isArray(doc.data))throw Error('Invalid card collection');
  putScryfallCards(doc.data);
 }catch(error){
  // A few browser configurations block cross-origin POST. Fallback: Scryfall's
  // read-only named endpoint, sequential at <10 requests/s, without retry loops.
  for(const name of names){
   if(scryfallCatalog.has(name))continue;
   try{const response=await fetch('https://api.scryfall.com/cards/named?exact='+encodeURIComponent(name),{headers:{Accept:'application/json'}});
    if(response.ok)putScryfallCards([await response.json()]);
   }catch{}
   await new Promise(resolve=>setTimeout(resolve,150));
  }
 }
 try{localStorage.setItem(CARD_CACHE_KEY,JSON.stringify({at:Date.now(),cards:Object.fromEntries(scryfallCatalog)}));}catch{}
 assetStatus(scryfallCatalog.size===names.length?'SCRYFALL IMAGES':`SCRYFALL ${scryfallCatalog.size}/${names.length}`);
 render();
}
let previewName='';
function closeCardPreview(){previewName='';const el=$('cardPreview');if(el)el.hidden=true;}
function showCardPreview(name,x,y){
 const src=imageUrl(name,'normal')||imageUrl(name,'small');if(!src)return;
 const box=$('cardPreview');if(!box)return;
 if(previewName!==name){$('cardPreviewImage').src=src;$('cardPreviewImage').alt=name+' full Magic card';
  $('cardPreviewLabel').textContent=name;const artist=scryfallCatalog.get(name)?.artist;
  $('cardPreviewCredit').textContent=(artist?'Illustration: '+artist+' · ':'')+'© Wizards of the Coast · via Scryfall';
  $('cardPreviewLink').href=linkToCard(name);previewName=name;}
 box.hidden=false;
 const w=Math.min(230,innerWidth-20),h=Math.min(352,innerHeight-20);
 box.style.left=Math.max(8,Math.min(innerWidth-w-8,(x||innerWidth/2)+22))+'px';
 box.style.top=Math.max(8,Math.min(innerHeight-h-8,(y||innerHeight/2)-h/2))+'px';
}
// Hover is deliberately scoped to the artwork, not the whole stack item.
// The overlay ignores mouse events, so leaving the thumbnail closes it instantly.
document.addEventListener('pointerover',e=>{
 const art=e.target.closest?.('[data-preview]');if(!art||e.pointerType==='touch')return;
 if(art.contains(e.relatedTarget))return;
 showCardPreview(art.dataset.preview,e.clientX,e.clientY);
});
document.addEventListener('pointermove',e=>{
 if(!previewName||e.pointerType==='touch')return;
 if(!e.target.closest?.('[data-preview]'))closeCardPreview();
});
document.addEventListener('pointerout',e=>{
 const art=e.target.closest?.('[data-preview]');if(art&&!art.contains(e.relatedTarget))closeCardPreview();
});
document.addEventListener('focusin',e=>{const art=e.target.closest?.('[data-preview]');if(art){const r=art.getBoundingClientRect();showCardPreview(art.dataset.preview,r.right,r.top);}});
document.addEventListener('focusout',e=>{if(e.target.closest?.('[data-preview]'))closeCardPreview();});
document.addEventListener('click',e=>{
 if(e.pointerType==='touch'||matchMedia('(hover:none)').matches){
  const el=e.target.closest?.('[data-preview]');if(el){
   if(previewName===el.dataset.preview)closeCardPreview();
   else showCardPreview(el.dataset.preview,e.clientX||innerWidth/2,e.clientY||innerHeight/2);
  }else closeCardPreview();
 }
});
window.addEventListener('scroll',closeCardPreview,{passive:true});
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
 return `<div class="battle-unit"><div class="battle-card ${gone?'off':''}" role="group" aria-label="${esc(u.card)}, ${creaturePower(u)}/${creatureToughness(u)}, ${gone?u.zone:'on battlefield'}">${thumb(u.card,'small','battle-image')}<header>${esc(u.card)}</header><div class="flags">${esc(gone?u.zone.toUpperCase():flags)}</div><strong class="pt">${creaturePower(u)}/${creatureToughness(u)}</strong></div></div>`;
}
function landCard(l){const c=LANDS[l.card],m=c.mana;return `<button class="land-card ${m} ${l.tapped?'tapped':''}" type="button" data-land="${esc(l.id)}" ${l.tapped||game.status!=='playing'?'disabled':''} title="${esc(l.card+' — '+c.oracle)}" aria-label="${l.tapped?'Tapped':'Tap'} ${esc(l.card)} for ${m} mana">${thumb(l.card,'small','land-image')}<span class="land-name">${esc(l.card)}</span><span class="tap-label">${l.tapped?'TAPPED':`TAP · ${m}`}</span></button>`;}
function stackCard(item,i){const c=CARDS[item.card];const ability=printedText(item.card)||'No rules text.';
 return `<li class="stack-entry ${i===0?'on-top':''}"><span class="stack-rank">${i===0?'TOP':i+1}</span><span class="stack-art">${thumb(item.card,'art','stack-art-image')}</span><div class="stack-details"><b>${esc(item.card)}${item.spell===false?' · ABILITY':''}</b><span class="stack-oracle">${esc(ability)}</span><small>${item.controller==='player'?'YOU':'OPPONENT'}${item.targetId?' → '+esc(labelTarget(game,item.targetId)):''}</small></div><a href="${esc(linkToCard(item.card))}" target="_blank" rel="noopener noreferrer" title="Card reference for ${esc(item.card)}" aria-label="View ${esc(item.card)} card">↗</a></li>`}
function handCard(a,i,ready){const c=CARDS[a.card];const targets=legalTargets(game,a);let target=selectedTargets[a.id];if(!targets.includes(target))target=targets[0];selectedTargets[a.id]=target;
 const payments=a.sourceId?[{spend:null,label:'Sacrifice'}]:paymentOptions(game,c.cost);const selected=selectedPayments[a.id]??0;
 if(selected>=payments.length)selectedPayments[a.id]=0;
 const can=ready.includes(a.id);
 const selectors=targets.length>1?`<label>TARGET<select data-target-for="${esc(a.id)}" aria-label="Target for ${esc(a.card)}">${targets.map(t=>`<option value="${esc(t)}" ${target===t?'selected':''}>${esc(titleForTarget(t))}</option>`).join('')}</select></label>`:(targets.length===1&&target!=null?`<span class="response-steps">→ ${esc(titleForTarget(target))}</span>`:'<span class="response-steps">NO TARGET</span>');
 const paySelect=payments.length>1?`<label>GENERIC<select data-payment-for="${esc(a.id)}" aria-label="Spend generic mana for ${esc(a.card)}">${payments.map((op,j)=>`<option value="${j}" ${j===(selectedPayments[a.id]??0)?'selected':''}>${esc(op.label)}</option>`).join('')}</select></label>`:'';
 return `<article class="response-card ${a.sourceId?'ability':''} ${!can?'unavailable':''}" data-drag-card="${esc(a.id)}" draggable="true" tabindex="0" aria-label="${esc(a.card)}, drag onto stack or use the Cast button">${thumb(a.card,'small','response-image')}<div class="response-head"><strong>${esc(a.card)}</strong><span class="mana-row">${a.sourceId?'SAC':pips(c.cost,true)}</span></div><div class="oracle-preview">${esc(printedText(a.card))}</div><div class="response-steps">${a.sourceId?'Sacrifice source to activate':can?'Ready · drag to stack':'Tap lands to pay'} · ${esc(c.type)}</div><div class="response-bottom">${selectors}${paySelect}<button type="button" data-cast="${esc(a.id)}" ${!can?'disabled':''}>${a.sourceId?'ACTIVATE':'CAST'} ↗</button></div></article>`;
}
function render(){closeCardPreview();const s=game,p=scenarios[index];$('missionTier').textContent=p.tier.toUpperCase();$('missionNum').textContent=String(index+1).padStart(2,'0')+' / 12';$('scenarioTitle').textContent=p.title;
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
fetchScryfallCatalog();