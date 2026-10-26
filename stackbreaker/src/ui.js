import {renderCardFallback} from './card-fallback.js';
import {CARDS,LANDS,RULES_VERSION,cardLink} from './cards.js';
import {createGame,tapLand,playLand,activate,pass,paymentOptions,legalActions,legalTargets,creaturePower,creatureToughness,labelTarget} from './engine.js';
import {presentCreaturePT} from './pt-display.js';
import {describeSpellResolution,captureSpellAnchors,createSpellVfxController,describeSpellVfxForA11y} from './vfx-events.js';
import coreScenarios from '../data/scenarios.json' with {type:'json'};
import campaignExpansion from '../data/campaign-expansion.json' with {type:'json'};
import {GALAXIES,makeWorlds,generateStages} from './galaxies.js';
import {commanderScenario,HAND_SIZE} from './commander.js';
import {dailyUtcDate,dailyCountdown,dailyEntryForDate,bindDailyScenario,localDailyStart,dailyAcceptedTransition,readLocalDaily,writeLocalDaily,dailyShareText} from './daily.js';
import {MASTERY_CATALOG,readLocalMastery,writeLocalMastery,emptyMasteryRun,appendMasteryTransition,markMasteryRunUnclean,completeMasteryWin,evaluateMastery} from './mastery.js';
import {COSMETIC_TYPES,COSMETIC_META,cosmeticChoices,emptyCosmeticEquip,readCosmeticEquip,writeCosmeticEquip,equipLocalCosmetic,effectiveCosmeticEquip,cosmeticAppearanceOnly,hasCosmeticGrant} from './cosmetics.js';
const extraStages=generateStages([...coreScenarios,...campaignExpansion]);
const scenarios=[...coreScenarios,...campaignExpansion,...extraStages].map((scenario,i)=>commanderScenario(scenario,i));
const chapters=makeWorlds();
const routeParams=new URLSearchParams(window.location.search);
const dailyRoute=routeParams.get('daily')==='1';
const siteRanked=dailyRoute&&routeParams.get('siteRanked')==='1'&&window.parent!==window;
if(siteRanked)document.body.classList.add('site-ranked-embed');
let rankedBusy=false;
const siteParentOrigin=()=>{
 try{
  const parent=new URL(document.referrer).origin;
  if(parent==='https://deep-cuts-edh.pages.dev'||/^https:\/\/[a-z0-9-]+\.deep-cuts-edh\.pages\.dev$/.test(parent))return parent;
 }catch{}
 return null;
};
const siteOriginAllowed=origin=>origin==='https://deep-cuts-edh.pages.dev'
 ||/^https:\/\/[a-z0-9-]+\.deep-cuts-edh\.pages\.dev$/.test(origin);
const sendSite=message=>{
 // Referrer-Policy may intentionally remove the parent's origin in an iframe.
 // These messages carry NO credentials, account IDs, or trusted success claims;
 // only the website's own server verifies the submitted public move.
 if(siteRanked)window.parent.postMessage(message,siteParentOrigin()||'*');
};
const dailyDate=dailyUtcDate();
const dailyBound=dailyRoute?bindDailyScenario(dailyEntryForDate(dailyDate),scenarios):null;
const dailyIndex=dailyBound?scenarios.findIndex(s=>s.id===dailyBound.puzzleId):-1;
// Daily practice is immediately playable with the original Classic controls.
// Verified site-ranked scoring still requires an explicit server-approved start.
let dailySession=dailyRoute?'practice':'preview',dailyRecord=null,dailyPracticeMoves=0,dailyExpired=false;
let masteryLedger=readLocalMastery(localStorage);
let localCosmetics=readCosmeticEquip(localStorage,masteryLedger);
let masteryRun=emptyMasteryRun();
let masteryTransitionHistory=[];
const isDaily=()=>dailyRoute&&dailyIndex>=0;
const dailyReady=()=>isDaily()&&!dailyExpired&&!rankedBusy&&dailyUtcDate()===dailyDate&&['practice','scored'].includes(dailySession)&&game?.status==='playing';
const scoredDaily=()=>isDaily()&&dailySession==='scored';

const $=id=>document.getElementById(id);
const spellVfx=createSpellVfxController(document,window);
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
const failedCardImages=new Set();
function fallbackCard(name,className=''){
 return renderCardFallback(name,CARDS[name]||LANDS[name]||{},className,printedText(name));
}
const thumb=(name,kind='small',className='')=>{
 const url=imageUrl(name,kind);
 return url&&!failedCardImages.has(url)?`<img class="${className}" data-preview="${esc(name)}" src="${esc(url)}" alt="${esc(name)} card image from Scryfall" loading="eager" draggable="false">`:
 fallbackCard(name,className);
};
// A cached image URL can fail independently of the metadata API. Replace just
// that element, preserving an in-progress drag, target choice and game state.
document.addEventListener('error',event=>{
 const img=event.target;
 if(!(img instanceof HTMLImageElement)||!img.dataset.preview)return;
 failedCardImages.add(img.src);
 const holder=document.createElement('span');
 holder.innerHTML=fallbackCard(img.dataset.preview,img.className);
 img.replaceWith(holder.firstElementChild);
},true);
function cardFromScryfall(c){
 const face=c.card_faces?.[0]||c;
 const image=c.image_uris||face.image_uris||{};
 const copy=key=>typeof image[key]==='string'?image[key]:'';
 return {name:c.name,images:{small:copy('small'),normal:copy('normal')||copy('large'),art:copy('art_crop')},
  oracle:c.oracle_text||face.oracle_text||'',artist:c.artist||face.artist||'',
  page:/^https:\/\/scryfall\.com\//.test(c.scryfall_uri||'')?c.scryfall_uri:cardLink(c.name)};
}
function refreshScryfallCards(){
 // An async card-image refresh must never destroy the drag source or its
 // highlighted creature while the player is choosing where to release.
 if(dragSession||dragTouch?.moved){artRefreshPending=true;return;}
 artRefreshPending=false;render();
}
function flushScryfallRefresh(){
 if(!artRefreshPending||dragSession||dragTouch?.moved)return;
 artRefreshPending=false;render();
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
   if(names.every(n=>scryfallCatalog.has(n))){assetStatus('SCRYFALL IMAGES');refreshScryfallCards();return;}
  }
 }catch{}
 assetStatus('LOADING SCRYFALL…');
 try{
  // Scryfall collection accepts at most 75 identifiers; use 50-card
  // requests to accommodate creature/enchantment/artifact-heavy decks.
  for(let i=0;i<names.length;i+=50){
   const group=names.slice(i,i+50).filter(name=>!scryfallCatalog.has(name));
   if(!group.length)continue;
   const res=await fetch('https://api.scryfall.com/cards/collection',{
    method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify({identifiers:group.map(name=>({name}))})});
   if(res.status===429||res.status===403)throw Error('Scryfall temporarily unavailable');
   if(!res.ok)throw Error('Scryfall collection HTTP '+res.status);
   const doc=await res.json();if(!Array.isArray(doc.data))throw Error('Invalid card collection');
   putScryfallCards(doc.data);
   if(i+50<names.length)await new Promise(resolve=>setTimeout(resolve,120));
  }
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
 refreshScryfallCards();
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
 const art=e.target.closest?.('[data-preview]');if(!art||dragSession||e.pointerType==='touch')return;
 if(art.contains(e.relatedTarget))return;
 showCardPreview(art.dataset.preview,e.clientX,e.clientY);
});
document.addEventListener('pointermove',e=>{
 if(!previewName||dragSession||e.pointerType==='touch')return;
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
let index=0,selectedGalaxy=0,selectedWorld=0,returnMapFocus=null,game,history=[],hint=false,progress={},dragTouch=null,pendingPlay=null,armedCard=null,dragSession=null,artRefreshPending=false;
try{progress=JSON.parse(localStorage.getItem(progressKey)||'{}')||{};}catch{}
const save=()=>{try{localStorage.setItem(progressKey,JSON.stringify(progress))}catch{}};
function pips(obj,raw=false){let out=[];for(const c of ['generic','W','U','B','R','G','C']){const n=obj?.[c]||0;
 if(c==='generic'){if(n)out.push(`<span class="mana-pip generic" title="${n} generic">${n}</span>`);continue;}
 for(let j=0;j<n;j++)out.push(`<span class="mana-pip ${c}" title="${c} mana">${glyph[c]}</span>`);
 }return out.join('')||(raw?'':'<span class="empty-mana">EMPTY</span>');}
function titleForTarget(id){return id==null?'No target':labelTarget(game,id)}
function objectiveText(s){const o=s.objective;if(o.type==='winKeepUnit')return`Defeat the opponent and keep ${s.units.find(u=>u.id===o.unitId)?.card||'the required creature'} on your battlefield.`;if(o.type==='survive')return'Survive with at least 1 life.';
 if(o.type==='win')return'Deal lethal damage to the opponent and survive.';
 if(o.type==='keepN')return`Keep at least ${o.count} friendly creatures alive.`;
 return`Keep ${s.units.find(u=>u.id===o.unitId)?.card||'the required creature'} ${o.type==='keepUnit'?'on the battlefield':'out of the graveyard'}.`;
}
function changeCase(n,force=false){
 if(dailyRoute&&!force)return;
 spellVfx.cancel();closeWorldMap(false);clearDragFeedback();
 index=Math.max(0,Math.min(scenarios.length-1,n));selectedWorld=Math.floor(index/10);selectedGalaxy=Math.floor(index/50);
 if(!dailyRoute)try{localStorage.setItem('dc-stackbreaker-last-level',String(index));}catch{}
 game=createGame(scenarios[index]);history=[];hint=false;pendingPlay=null;armedCard=null;
 masteryRun=emptyMasteryRun();masteryTransitionHistory=[];render();
}
function shortCard(u){
 const gone=u.zone!=='battlefield';const ability=game.hand.find(a=>a.sourceId===u.id&&!game.used.includes(a.id));
 const active=ability&&game.status==='playing'&&legalActions(game).includes(ability.id);
 const power=creaturePower(u),toughness=creatureToughness(u),printed=CARDS[u.card];
 // Keep the original Scryfall print fully intact. Show actual CURRENT P/T
 // over its printed corner, with separately visible counters and stat boosts.
 // Marked damage is tracked separately and never reduces toughness.
 const stat=presentCreaturePT(u,printed,power,toughness);
 const flags=[u.indestructible?'INDESTRUCTIBLE':'',u.hexproof?'HEXPROOF':'',u.damage?`${u.damage} DAMAGE`:''].filter(Boolean).join(' · ');
 const statBadges=stat.badges.length?
  `<span class="pt-badges" data-pt-badges aria-hidden="true">${stat.badges.map(b=>`<span class="pt-modifier ${b.kind==='counter'?'pt-counter':'pt-boost'}" data-pt-modifier="${esc(b.kind)}">${esc(b.text)}</span>`).join('')}</span>`:'';
 const currentPT=stat.showCurrent?
  `<span class="pt-replacement" data-modified-pt aria-hidden="true">${esc(stat.text)}</span>`:'';
 const altered=statBadges+currentPT;
 const status=flags?`<span class="flags">${esc(flags)}</span>`:'';
 return `<div class="battle-unit"><button type="button" class="battle-card ${gone?'off':''} ${ability?'has-ability':''} ${active?'can-activate':''}" data-unit="${esc(u.id)}" ${ability?'data-activate-source="'+esc(ability.id)+'"':''} aria-label="${esc(u.card)}, ${esc(stat.accessible||'Printed power and toughness '+power+'/'+toughness+'.')} ${esc(flags)} ${active?'Activate its printed ability.':'View or target this card.'}"><span class="battle-card-face">${thumb(u.card,'normal','battle-image')}${altered}</span>${status}</button></div>`;
}
function landCard(l){const c=LANDS[l.card],m=c.mana;return `<button class="land-card ${m} ${l.tapped?'tapped':''}" type="button" data-land="${esc(l.id)}" ${l.tapped||game.status!=='playing'?'disabled':''} title="${esc(l.card+' — '+c.oracle)}" aria-label="${l.tapped?'Tapped':'Tap'} ${esc(l.card)} for ${m} mana">${thumb(l.card,'normal','land-image')}<span class="tap-label">${l.tapped?'TAPPED':`TAP · ${m}`}</span></button>`;}
function stackCard(item,i){
 const ability=printedText(item.card)||'';
 return `<li class="stack-entry ${i===0?'on-top':''}" data-stack-target="${esc(item.id)}"><span class="stack-rank">${i===0?'TOP':i+1}</span><span class="stack-art">${thumb(item.card,'art','stack-art-image')}</span><div class="stack-details"><b>${esc(item.card)}${item.spell===false?' · ABILITY':''}</b><span class="stack-oracle">${esc(ability)}</span><small>${item.controller==='player'?'YOU':'OPPONENT'}${item.targetId?' → '+esc(labelTarget(game,item.targetId)):''}</small></div></li>`;
}
function handCard(a){
 const card=CARDS[a.card],land=!!LANDS[a.card];
 const kind=land?'Land':card?.type||'Card';
 const guidance=land?'Play on your main phase with an empty stack.':card?.flash||card?.type==='Instant'?'May be cast while responding.':'Normally requires your main phase and an empty stack.';
 return `<div class="hand-card ${armedCard===a.id?'armed':''}" data-drag-card="${esc(a.id)}" draggable="true" role="button" tabindex="0" aria-label="${esc(a.card)}. ${esc(kind)}. ${guidance}">${thumb(a.card,'normal','hand-image')}</div>`;
}
function renderPlayPrompt(){
 const el=$('playPrompt');if(!el)return;
 if(!pendingPlay){el.hidden=true;el.innerHTML='';return;}
 const p=pendingPlay;el.hidden=false;
 if(p.phase==='target'){
  el.innerHTML=`<div class="prompt-header"><b>Choose a target</b><button type="button" data-cancel-play aria-label="Cancel casting">✕</button></div><div class="prompt-options">${p.targets.map(t=>`<button type="button" data-choose-target="${esc(t??'__none__')}">${esc(t==null?'No target':labelTarget(game,t))}</button>`).join('')}</div><small>Or tap a highlighted card or life total.</small>`;
 }else{
  el.innerHTML=`<div class="prompt-header"><b>Choose mana for the generic cost</b><button type="button" data-cancel-play aria-label="Cancel casting">✕</button></div><div class="prompt-options">${p.payments.map((op,i)=>`<button type="button" data-choose-payment="${i}">${esc(op.label)}</button>`).join('')}</div>`;
 }
 document.querySelectorAll('[data-unit],[data-stack-target],[data-target-person]').forEach(node=>{
   const id=node.dataset.unit??node.dataset.stackTarget??node.dataset.targetPerson;
   node.classList.toggle('targetable',p.phase==='target'&&p.targets.includes(id));
 });
}
function submitCast(id,target,spend){try{pushState(activate(game,id,target,spend),{type:'cast',actionId:id,targetId:target,genericSpend:spend});notify(siteRanked&&scoredDaily()?'Verifying the cast with Deep Cuts EDH…':'Spell or ability placed on the stack.');}catch(error){pendingPlay=null;render();notify(error.message);}}
function chooseTarget(target){if(!pendingPlay||pendingPlay.phase!=='target'||!pendingPlay.targets.includes(target))return;
 pendingPlay.target=target;const p=pendingPlay;
 if(p.payments.length>1){p.phase='payment';renderPlayPrompt();return;}
 pendingPlay=null;submitCast(p.id,target,p.payments[0]?.spend??null);
}
function choosePayment(i){const p=pendingPlay;if(!p||p.phase!=='payment'||!p.payments[i])return;
 pendingPlay=null;submitCast(p.id,p.target,p.payments[i].spend);
}
function beginPlay(id,dropTarget=null,requireDirectTarget=false,dropZone=null){
 if(dailyRoute&&!dailyReady()){notify('Choose practice or start your scored attempt first.');return;}
 const action=game.hand.find(a=>a.id===id&&!a.sourceId&&!game.used.includes(a.id));if(!action){notify('That card is unavailable.');return;}
 if(LANDS[action.card]){
  if(dropZone&&dropZone!=='fieldDrop'){notify('A land can only be played onto the battlefield, not onto the stack.');return;}
  try{pushState(playLand(game,id),{type:'play-land',handId:id});notify('Land played without using the stack.');}
  catch(error){notify(error.message);}
  return;
 }
 if(!legalActions(game).includes(id)){
  const c=CARDS[action.card];
  const mainOnly=c&&(c.type.startsWith('Creature')||c.type.startsWith('Enchantment')||c.type.startsWith('Artifact')||c.type.startsWith('Sorcery'))&&!c.flash;
  notify(mainOnly?'That card cannot be cast while responding. Normally you must wait for your own main phase and an empty stack.':'This card needs enough mana, a legal target, and the correct timing.');
  return;
 }
 const targets=legalTargets(game,action),payments=paymentOptions(game,CARDS[action.card].cost);
 if(!targets.length||!payments.length){notify('No legal target or mana payment.');return;}
 const targeted=targets.some(target=>target!==null);
 // Pointer casting: choosing a target IS the drop; a generic zone must never
 // silently choose the only creature or display a catch-all target picker.
 if(requireDirectTarget&&targeted&&!targets.includes(dropTarget)){
  const rule=CARDS[action.card].targetRule||'';
  notify(rule.startsWith('creature')?'Drop the spell directly onto a glowing legal creature.':
   rule.startsWith('stack:')?'Drop the spell directly onto the glowing spell on the stack.':
   'Drop the spell directly onto a glowing legal target.');return;
 }
 const chosen=targets.includes(dropTarget)?dropTarget:requireDirectTarget?null:targets.length===1?targets[0]:undefined;
 pendingPlay={id,targets,payments,target:chosen,phase:chosen===undefined?'target':payments.length>1?'payment':'done'};
 armedCard=null;
 if(pendingPlay.phase==='done'){pendingPlay=null;submitCast(id,chosen,payments[0]?.spend??null);}
 else{render();renderPlayPrompt();notify(chosen===undefined?'Choose a legal target.':'Choose which mana to spend.');}
}
function activateFromBattlefield(id){
 if(dailyRoute&&!dailyReady())return;
 const a=game.hand.find(x=>x.id===id&&x.sourceId);
 if(!a||!legalActions(game).includes(id)){notify('This card does not have an available activated ability.');return;}
 const targets=legalTargets(game,a);
 if(targets.length===1){submitCast(id,targets[0],null);return;}
 pendingPlay={id,targets,payments:[{spend:null,label:'Ability'}],target:undefined,phase:'target'};render();renderPlayPrompt();
}
function targetFromElement(element){
 const target=element?.closest?.('[data-unit],[data-stack-target],[data-target-person]');
 return target?.dataset.unit??target?.dataset.stackTarget??target?.dataset.targetPerson??null;
}
function targetNodeFromElement(element){return element?.closest?.('[data-unit],[data-stack-target],[data-target-person]')??null;}
function clearDragFeedback(){
 for(const node of document.querySelectorAll('.drop-ready,.drop-target-legal,.drop-target-hover'))
  node.classList.remove('drop-ready','drop-target-legal','drop-target-hover');
 dragSession=null;
}
function paintLegalDragTargets(){
 if(!dragSession?.available)return;
 if(!dragSession.targeted){
  for(const node of [$('fieldDrop'),$('stackDrop')])node?.classList.add('drop-target-legal');
 }else for(const node of document.querySelectorAll('[data-unit],[data-stack-target],[data-target-person]')){
  if(dragSession.targets.includes(targetFromElement(node)))node.classList.add('drop-target-legal');
 }
}
function startDragFeedback(id){
 clearDragFeedback();closeCardPreview();
 const action=game.hand.find(a=>a.id===id&&!a.sourceId&&!game.used.includes(a.id));
 if(!action)return;
 const available=legalActions(game).includes(id);
 const targets=legalTargets(game,action),targeted=targets.some(x=>x!==null);
 dragSession={id,available,targets,targeted};
 paintLegalDragTargets();
}
function updateDragFeedback(element){
 if(!dragSession)return;
 const chosen=dragSession.available?(dragSession.targeted?targetNodeFromElement(element):element?.closest?.('#stackDrop,#fieldDrop')):null;
 const valid=chosen&&(!dragSession.targeted||dragSession.targets.includes(targetFromElement(chosen)))?chosen:null;
 const cls=dragSession.targeted?'drop-target-hover':'drop-ready';
 // Retain the currently highlighted node between dragover events for a stable,
 // unmistakable outline. It should only move when the actual target changes.
 for(const node of document.querySelectorAll('.drop-target-hover,.drop-ready')){
  if(node!==valid)node.classList.remove('drop-target-hover','drop-ready');
 }
 if(valid)valid.classList.add(cls);
}
function render(){closeCardPreview();const s=game,p=scenarios[index],worldIndex=Math.floor(index/10),galaxyIndex=Math.floor(index/50),localLevel=index%10+1; $('missionTier').textContent='GALAXY '+(galaxyIndex+1)+' · WORLD '+(worldIndex%5+1);$('missionNum').textContent=(galaxyIndex+1)+'.'+(worldIndex%5+1)+'-'+localLevel;$('scenarioTitle').textContent=p.title;
 $('scenarioSelect').innerHTML=scenarios.map((o,i)=>`<option value="${i}" ${i===index?'selected':''}>${Math.floor(i/50)+1}.${Math.floor(i%50/10)+1}-${i%10+1} ${esc(o.title)}${progress[o.id]?' ★':''}</option>`).join('');
 $('playerLife').textContent=s.life.player;$('opponentLife').textContent=s.life.opponent;$('manaPool').innerHTML=pips(s.mana);
 $('priority').textContent=s.status==='playing'?'● PRIORITY: YOU':s.status==='won'?'✓ SURVIVED':'✕ DEFEATED';$('objective').textContent=objectiveText(s);$('objectiveShort').textContent=p.difficulty?.discipline?`G${p.difficulty.galaxy} · ${p.difficulty.discipline.toUpperCase()}`:p.tier.toUpperCase();
 const activeCreatures=s.units.filter(u=>u.zone==='battlefield'),activeEnchantments=(s.enchantments||[]).filter(e=>e.zone==='battlefield');
 $('battlefield').innerHTML=[...activeCreatures.map(shortCard),...activeEnchantments.map(e=>`<div class="battle-card" role="img" aria-label="${esc(e.card)}, enchantment on battlefield">${thumb(e.card,'normal','battle-image')}</div>`)].join('')||'<span class="empty-creatures">No permanents in this case</span>';
 $('lands').innerHTML=s.lands.length?s.lands.map(landCard).join(''):'<span class="empty-creatures">No lands needed — activate your creature’s ability</span>';
 $('stackCount').textContent=String(s.stack.length).padStart(2,'0');$('stack').innerHTML=s.stack.length?[...s.stack].reverse().map(stackCard).join(''):'<li class="stack-empty">Empty stack</li>';
 const remaining=s.hand.filter(a=>!a.sourceId&&!s.used.includes(a.id));$('handCount').textContent=remaining.length+' CARDS';$('hand').classList.toggle('many',remaining.length>3);$('hand').innerHTML=remaining.map(handCard).join('')||'<span class="empty-creatures">Your hand is empty</span>';
 $('passButton').disabled=s.status!=='playing'||(dailyRoute&&!dailyReady());$('undoButton').disabled=!history.length||(dailyRoute&&dailySession!=='practice');$('prevButton').disabled=dailyRoute||index===0;$('prevButton').textContent='← PREV';$('nextButton').disabled=dailyRoute||index===scenarios.length-1;$('nextButton').textContent=index%10===9?'NEXT WORLD →':'NEXT →';$('mapButton').setAttribute('aria-label',`Open chapter map for ${chapters[worldIndex].name}`);
 $('resultMini').className='result-mini'+(s.status==='won'?' won':s.status==='lost'?' lost':'');$('resultEyebrow').textContent=s.status==='won'?'✓ CASE SOLVED':s.status==='lost'?'✕ TRY AGAIN':'YOUR MOVE';
 $('resultTitle').textContent=s.status==='won'?(index%10===9?'★ Chapter completed — claim your flag on the map!':'Next case is ready'):s.status==='lost'?'Reset or undo to retry':'Tap lands, drag a spell, or activate a creature';
 if(dailyRoute){
  $('scenarioSelect').disabled=true;$('mapButton').disabled=true;
  $('restartButton').disabled=dailySession!=='practice'||dailyExpired;
  $('hintButton').disabled=dailySession!=='practice'||dailyExpired;
  $('passButton').disabled=!dailyReady();
  $('game').classList.add('daily-game');
 }
 $('scenarioIntro').textContent=p.intro;$('objectiveLong').textContent=objectiveText(s);$('hintText').hidden=!hint;$('hintText').textContent=p.hint;$('hintButton').setAttribute('aria-expanded',String(hint));
 $('resultExplanation').textContent=s.status==='playing'?'Complete the case to see the rules explanation.':p.explanation;
 if(s.status==='won'){const par=p.par||2,stars=s.used.length<=par?3:s.used.length===par+1?2:1;if(!dailyRoute){progress[p.id]=Math.max(progress[p.id]||0,stars);save();}$('resultStars').textContent='★'.repeat(stars)+'☆'.repeat(3-stars);}else $('resultStars').textContent='';
 renderPlayPrompt();$('completed').textContent=Object.keys(progress).filter(id=>scenarios.some(s=>s.id===id)).length+' / '+scenarios.length+' SOLVED';$('log').innerHTML=s.log.slice(-14).reverse().map(x=>`<li>${esc(x)}</li>`).join('');$('version').textContent=RULES_VERSION;$('live').textContent=s.log.at(-1)||'Tap a land to produce mana.';
 if(dragSession)paintLegalDragTargets();
 refreshHandArrows();
 renderMasteryPanel();
 renderCosmeticGallery();
 if(dailyRoute)renderDailyStatus();
}

function renderMasteryPanel(){
 const panel=$('masteryPanel');
 if(!panel)return;
 const items=evaluateMastery(masteryLedger);
 const won=items.filter(x=>x.unlocked);
 $('masteryCount').textContent=won.length+' / '+items.length+' LOCAL MILESTONES';
 $('masterySummary').textContent=Object.keys(masteryLedger.wins).length+
  ' unique Classic puzzles recorded since mastery was introduced · LOCAL / UNVERIFIED';
 $('masteryList').innerHTML=items.map(a=>{
  const title=esc(a.name);
  const description=esc(a.description);
  const state=a.lockedReason?'FUTURE · '+esc(a.lockedReason):
   a.unlocked?'UNLOCKED LOCALLY':a.progress+' / '+a.threshold;
  return '<li class="mastery-item '+(a.unlocked?'is-unlocked':a.lockedReason?'is-locked':'')+'">'+
   '<span class="mastery-symbol" aria-hidden="true">'+(a.unlocked?'✦':a.lockedReason?'◇':'✧')+'</span>'+
   '<span class="mastery-info"><strong>'+title+'</strong><small>'+description+'</small></span>'+
   '<span class="mastery-state">'+state+'</span></li>';
 }).join('');
}

function renderCosmeticGallery(){
 const gallery=$('cosmeticGallery');
 if(!gallery)return;
 localCosmetics=effectiveCosmeticEquip(localCosmetics,masteryLedger);
 const appearance=cosmeticAppearanceOnly(localCosmetics);
 const preview=$('cosmeticsPreview');
 preview.setAttribute('data-frame',appearance.frame);
 preview.setAttribute('data-vfx',appearance.vfx);
 $('cosmeticsTitle').textContent=appearance.label;
 $('cosmeticsPreviewText').textContent=
  (appearance.frame==='none'?'Default':'Equipped '+appearance.frame)+' frame · '+
  (appearance.vfx==='none'?'default':'Equipped '+appearance.vfx)+' spell effects · LOCAL / UNVERIFIED';
 const titles={title:'TITLES',frame:'MANA FRAMES',vfx:'SPELL EFFECT STYLES'};
 gallery.innerHTML=COSMETIC_TYPES.map(type=>{
  const options=[{id:null,name:'Default',achievementId:null},...cosmeticChoices(type)];
  return '<section class="cosmetics-group" aria-label="'+titles[type]+'"><h3>'+titles[type]+'</h3><div class="cosmetics-options">'+
   options.map(option=>{
    const id=option.id;
    const owned=id===null||hasCosmeticGrant(masteryLedger,type,id);
    const selected=localCosmetics[type]===id;
    const lockedLabel=owned?(selected?'EQUIPPED':option.starter?'STARTER · EQUIP':'EQUIP'):'LOCKED';
    const action=id===null?'':esc(id);
    const swatch=type==='title'?'✧':'✦';
    return '<button type="button" class="cosmetic-choice" data-cosmetic-type="'+type+
     '" data-cosmetic-id="'+action+'" aria-pressed="'+String(selected)+'"'+(owned?'':' disabled')+
     ' aria-label="'+esc(option.name)+' — '+lockedLabel+'">'+
     '<span><span class="cosmetic-swatch" aria-hidden="true">'+swatch+'</span> '+esc(option.name)+'</span>'+
     '<small>'+lockedLabel+'</small></button>';
   }).join('')+'</div></section>';
 }).join('');
}
function equipSelectedCosmetic(type,id){
 const result=equipLocalCosmetic(localCosmetics,masteryLedger,type,id);
 if(!result.ok){$('cosmeticStatus').textContent=result.reason;return;}
 if(!writeCosmeticEquip(localStorage,result.equip,masteryLedger)){
  $('cosmeticStatus').textContent='Local storage unavailable; this change was not saved.';return;
 }
 localCosmetics=result.equip;
 renderCosmeticGallery();
 $('cosmeticStatus').textContent=id===null?'Default '+type+' restored · LOCAL / UNVERIFIED':
  (COSMETIC_META[id]||id)+' equipped locally · LOCAL / UNVERIFIED';
}
function decoratedSpellEvent(event){
 if(!event)return event;
 const effective=effectiveCosmeticEquip(localCosmetics,masteryLedger);
 return {...event,cosmeticTheme:effective.vfx};
}
function updateDailyCountdown(){
 if(!dailyRoute)return;
 $('dailyCountdown').textContent=dailyCountdown();
 const expired=dailyUtcDate()!==dailyDate;
 if(expired&&!dailyExpired){
  dailyExpired=true;
  if(dailySession==='scored'&&dailyRecord?.status==='playing'){
   dailyRecord={...dailyRecord,status:'expired',completed:false};
   writeLocalDaily(localStorage,dailyRecord);
  }
  spellVfx.cancel();render();
 }
}
function renderDailyStatus(){
 if(!dailyRoute)return;
 const active=!!dailyBound&&!dailyExpired&&dailyUtcDate()===dailyDate;
 $('dailyDate').textContent=active?'Challenge '+dailyDate+' UTC · '+dailyBound.difficulty:
  dailyExpired?'This UTC day has ended. Reload for the next challenge.':
  'No dated puzzle is published for this UTC date. A new manifest is needed.';
 $('dailyStart').disabled=siteRanked||!active;$('dailyPractice').disabled=siteRanked||!active;
 if(siteRanked){$('dailyStart').hidden=true;$('dailyPractice').hidden=true;$('dailyCopy').hidden=true;}
 $('dailyStart').textContent=dailyRecord?dailyRecord.status==='playing'?'RESUME LOCAL SCORED ATTEMPT':'VIEW RECORDED ATTEMPT':'START LOCAL SCORED ATTEMPT';
 $('scenarioSelect').closest('.mission-picker')?.classList.toggle('daily-picker-locked',true);
 const summary=dailySession==='scored'&&dailyRecord?
  (dailyRecord.status==='playing'?'Scored attempt in progress':dailyRecord.status==='won'?'Daily solved locally':dailyRecord.status==='expired'?'Attempt expired at UTC midnight':'Daily attempt ended without a win')+
  ' · '+dailyRecord.acceptedActionCount+' accepted actions · LOCAL / UNVERIFIED':
  dailySession==='practice'?'Unlimited practice · '+dailyPracticeMoves+' accepted actions · hints, undo, and reset allowed · NO SCORE':
  dailyRecord?'Local scored start already saved for today. Resume or practice freely.':
  'Choose unlimited practice or start one local scored attempt (no hints, undo or retry).';
 $('dailyStatus').textContent=summary;
 const result=dailySession==='scored'?dailyRecord:
  dailySession==='practice'&&game?.status!=='playing'?{status:game.status,acceptedActionCount:dailyPracticeMoves}:null;
 $('dailyResult').hidden=!result;
 if(result){
  $('dailyActions').textContent=result.acceptedActionCount+' accepted actions · '+result.status.toUpperCase();
  $('dailyShareText').value=dailyShareText(dailyBound,result);
 }
}
function startDailyPractice(){
 if(siteRanked){notify('Your one official run is controlled by the website. Normal Stackbreaker remains unlimited outside Daily.');return;}
 if(!dailyBound||dailyExpired)return;
 dailySession='practice';dailyPracticeMoves=0;
 changeCase(dailyIndex,true);
 notify('Unlimited local practice. Does not earn a verified daily score.');
}
function startDailyScored(){
 if(siteRanked){notify('Use the website verified-attempt control. A local result cannot grant ranked credit.');return;}
 if(!dailyBound||dailyExpired)return;
 if(dailyRecord){
  dailySession='scored';spellVfx.cancel();clearDragFeedback();closeWorldMap(false);
  game=structuredClone(dailyRecord.state);history=[];hint=false;pendingPlay=null;armedCard=null;
  render();return;
 }
 const initial=createGame(scenarios[dailyIndex]);
 dailyRecord=localDailyStart(dailyBound,initial);
 if(!writeLocalDaily(localStorage,dailyRecord)){
  dailyRecord=null;notify('Local storage is unavailable. Use unlimited practice instead.');return;
 }
 dailySession='scored';spellVfx.cancel();clearDragFeedback();game=initial;
 history=[];hint=false;pendingPlay=null;armedCard=null;
 render();notify('Local scored attempt started. No hints, undo, or resets. Unverified preview.');
}
async function copyDailyShare(){
 const text=$('dailyShareText').value;if(!text)return;
 try{
  if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);
  else{$('dailyShareText').focus();$('dailyShareText').select();if(!document.execCommand('copy'))throw Error('Manual copy needed');}
  notify('Spoiler-free LOCAL / UNVERIFIED result copied.');
 }catch{notify('Select the result text and copy it manually.');}
}

function refreshHandArrows(){
 const row=$('hand');const prev=$('handPrev'),next=$('handNext');
 if(!row||!prev||!next)return;
 prev.disabled=row.scrollLeft<=2;
 next.disabled=row.scrollLeft+row.clientWidth>=row.scrollWidth-2;
}
function scrollHand(direction){const row=$('hand');if(!row)return;
 row.scrollBy({left:direction*Math.max(100,Math.floor(row.clientWidth*.7)),behavior:'smooth'});
}
$('handPrev').addEventListener('click',()=>scrollHand(-1));
$('handNext').addEventListener('click',()=>scrollHand(1));
$('hand').addEventListener('scroll',refreshHandArrows,{passive:true});
function notify(message){$('live').textContent=message;}
function pushState(s,instruction=null){
 if(dailyRoute&&!dailyReady())return;
 if(siteRanked&&scoredDaily()){
  if(!instruction||rankedBusy)return;
  rankedBusy=true;
  sendSite({type:'dc-sb-ranked-move',move:instruction,puzzleId:dailyBound?.puzzleId,
   day:dailyDate});
  notify('Verifying this move against the authoritative website game…');
  return;
 }
 spellVfx.cancel();clearDragFeedback();
 if(scoredDaily()){
  dailyRecord=dailyAcceptedTransition(dailyRecord,game,s);
  writeLocalDaily(localStorage,dailyRecord);
 }else if(dailyRoute&&JSON.stringify(game)!==JSON.stringify(s))dailyPracticeMoves++;
 let unlocked=[];
 if(!dailyRoute){
  masteryTransitionHistory.push(masteryRun);
  masteryRun=appendMasteryTransition(masteryRun,game,s);
  if(game.status==='playing'&&s.status==='won'){
   const completed=completeMasteryWin(masteryLedger,scenarios[index],s,masteryRun,scenarios);
   masteryLedger=completed.ledger;
   writeLocalMastery(localStorage,masteryLedger);
   unlocked=completed.newUnlocks;
  }
 }
 history.push(structuredClone(game));game=s;pendingPlay=null;armedCard=null;render();
 if(unlocked.length){
  const names=unlocked.map(id=>MASTERY_CATALOG.achievements.find(a=>a.id===id)?.name||id);
  notify('✦ LOCAL MASTERY UNLOCK: '+names.join(', ')+' · UNVERIFIED PREVIEW');
 }
}
function applyLand(id){
 if(dailyRoute&&!dailyReady())return;
 try{
  const before=game;
  const land=before.lands.find(l=>l.id===id);
  const node=[...document.querySelectorAll('[data-land]')].find(el=>el.dataset.land===id);
  const rect=node?.getBoundingClientRect();
  const point=rect?{x:rect.left+rect.width/2,y:rect.top+rect.height/2}:null;
  const after=tapLand(before,id);
  const actuallyTapped=!!land&&!land.tapped&&after.lands.find(l=>l.id===id)?.tapped;
  pushState(after,{type:'tap',landId:id});
  if(actuallyTapped&&point){
   try{
    spellVfx.play({card:land.card,fxType:'tap',verifiedTap:true,cosmeticTheme:effectiveCosmeticEquip(localCosmetics,masteryLedger).vfx,colors:[LANDS[land.card]?.mana||'C'],
     sourceStackId:id,outcome:'resolved'},
     {source:point,target:point});
   }catch(_vfxError){}
  }
 }catch(e){notify(e.message)}
}
function applyPass(){
 if(dailyRoute&&!dailyReady())return;
 pendingPlay=null;
 try{
  const before=game,after=pass(before);
  // Capture actual resolved action and geometry before the UI rerenders.
  let event=null,anchors=null;
  try{
   event=describeSpellResolution(before,after);
   anchors=event?captureSpellAnchors(document,event):null;
  }catch(_vfxError){event=null;anchors=null;}
  pushState(after,{type:'pass'});
  if(event){
   notify(describeSpellVfxForA11y(event));
   try{spellVfx.play(decoratedSpellEvent(event),anchors)}catch(_vfxError){}
  }
 }catch(e){notify(e.message)}
}
function undo(){
 if(dailyRoute&&dailySession!=='practice')return;
 spellVfx.cancel();pendingPlay=null;armedCard=null;
 if(!history.length){render();return;}
 game=history.pop();
 if(!dailyRoute)masteryRun=markMasteryRunUnclean(masteryTransitionHistory.pop()||emptyMasteryRun());
 if(dailyRoute)dailyPracticeMoves=Math.max(0,dailyPracticeMoves-1);
 render();
}
$('lands').addEventListener('click',e=>{const btn=e.target.closest('[data-land]');if(btn)applyLand(btn.dataset.land)});
$('battlefield').addEventListener('click',e=>{
 const unit=e.target.closest('[data-unit]');if(!unit)return;
 if(previewLongPress){previewLongPress=false;return;}
 if(pendingPlay?.phase==='target'&&pendingPlay.targets.includes(unit.dataset.unit)){chooseTarget(unit.dataset.unit);return;}
 if(unit.dataset.activateSource)activateFromBattlefield(unit.dataset.activateSource);
});
// Mobile: tap an ability-bearing card to activate it, or hold to read the full Scryfall card.
let previewLongPress=false,previewHold=null;
$('battlefield').addEventListener('pointerdown',e=>{
 if(e.pointerType!=='touch')return;
 const card=e.target.closest('[data-unit]');if(!card?.dataset.activateSource)return;
 const unit=game.units.find(u=>u.id===card.dataset.unit);if(!unit)return;
 previewLongPress=false;
 const startX=e.clientX,startY=e.clientY;
 previewHold={x:startX,y:startY,alarm:setTimeout(()=>{
  if(!previewHold)return;
  showCardPreview(unit.card,startX,startY);
  previewLongPress=true;
 },500)};
});
$('battlefield').addEventListener('pointermove',e=>{
 if(previewHold&&Math.hypot(e.clientX-previewHold.x,e.clientY-previewHold.y)>9){clearTimeout(previewHold.alarm);previewHold=null;}
});
for(const event of ['pointerup','pointercancel'])$('battlefield').addEventListener(event,()=>{
 if(previewHold){clearTimeout(previewHold.alarm);previewHold=null;}
});
$('stack').addEventListener('click',e=>{
 const item=e.target.closest('[data-stack-target]');if(item&&pendingPlay?.phase==='target')chooseTarget(item.dataset.stackTarget);
});
for(const life of document.querySelectorAll('[data-target-person]'))life.addEventListener('click',()=>{
 if(pendingPlay?.phase==='target')chooseTarget(life.dataset.targetPerson);
});
$('hand').addEventListener('click',e=>{
 if(dragTouch?.moved)return;
 const c=e.target.closest('[data-drag-card]');if(!c||!matchMedia('(hover:none)').matches)return;
 // On touch a short tap previews the printed card; only drag/drop casts.
});
$('playPrompt').addEventListener('click',e=>{
 if(e.target.closest('[data-cancel-play]')){pendingPlay=null;render();return;}
 const t=e.target.closest('[data-choose-target]');if(t)chooseTarget(t.dataset.chooseTarget==='__none__'?null:t.dataset.chooseTarget);
 const p=e.target.closest('[data-choose-payment]');if(p)choosePayment(Number(p.dataset.choosePayment));
});
// Five themed chapter maps retain access to old and new levels. Visiting a
// stage never erases prior stars; chapter boss flags are earned on victory.
function chapterForLevel(levelIndex){return chapters[Math.floor(levelIndex/6)];}
function renderWorldMap(){
 const galaxy=GALAXIES[selectedGalaxy],world=chapters[selectedWorld];if(!galaxy||!world)return;
 $('galaxyTabs').innerHTML=GALAXIES.map((g,i)=>{
 const cleared=scenarios.slice(i*50,(i+1)*50).filter(p=>progress[p.id]>0).length;
 return `<button type="button" class="galaxy-tab ${i===selectedGalaxy?'current':''}" data-galaxy-index="${i}" aria-current="${i===selectedGalaxy?'true':'false'}" style="--galaxy-accent:${g.color}"><span>${g.icon}</span><b>G${i+1}</b><small>${cleared}/50</small></button>`;
 }).join('');
 $('worldTabs').innerHTML=chapters.slice(selectedGalaxy*5,selectedGalaxy*5+5).map((w,i)=>{
 const wi=selectedGalaxy*5+i,cleared=scenarios.slice(w.start-1,w.end).filter(p=>progress[p.id]>0).length;
 return `<button type="button" class="world-tab ${wi===selectedWorld?'current':''}" data-world-index="${wi}" aria-current="${wi===selectedWorld?'true':'false'}" style="--world-accent:${w.color}"><span>${w.icon}</span><b>W${i+1}</b><small>${cleared}/10</small></button>`;
 }).join('');
 const cleared=scenarios.slice(world.start-1,world.end).filter(p=>progress[p.id]>0).length;
 const nodes=scenarios.slice(world.start-1,world.end).map((p,i)=>{
 const n=world.start-1,absolute=n+i,score=Math.max(0,Math.min(3,progress[p.id]||0)),boss=i===9;
 return `<button type="button" class="map-level ${absolute===index?'active':''} ${score?'cleared':''} ${boss?'boss':''}" data-level-index="${absolute}" aria-label="Galaxy ${selectedGalaxy+1} World ${selectedWorld%5+1} level ${i+1}: ${esc(p.title)}" ${absolute===index?'aria-current="step"':''}><span class="map-node"><span>${boss?'♜':score?'⚑':i+1}</span></span><b>${selectedGalaxy+1}.${selectedWorld%5+1}-${i+1}</b><span class="map-stars">${score?'★'.repeat(score)+'☆'.repeat(3-score):boss?'BOSS':'OPEN'}</span></button>`;
 }).join('');
 $('worldStage').style.setProperty('--world-color',world.color);$('worldStage').dataset.terrain=world.terrain;
 $('worldStage').innerHTML=`<div class="world-sky" aria-hidden="true"><span>${galaxy.icon}</span><i>✦</i><i>✧</i></div><div class="world-heading"><small>GALAXY ${selectedGalaxy+1}/5 · WORLD ${selectedWorld%5+1}/5</small><h3>${esc(world.name)}</h3><p>${esc(galaxy.subtitle)} · ${esc(world.subtitle)}</p></div><div class="world-levels">${nodes}</div><div class="world-boss">${cleared===10?'★ WORLD COMPLETE':'⚑ '+cleared+' / 10 FLAGS PLANTED'} · ${esc(world.boss)}</div>`;
 $('worldMapProgress').textContent=Object.keys(progress).filter(id=>scenarios.some(p=>p.id===id)).length+' / '+scenarios.length+' levels cleared';
}
function openWorldMap(){
 if(dailyRoute||dragSession||dragTouch?.moved||pendingPlay)return;
 returnMapFocus=document.activeElement;selectedGalaxy=Math.floor(index/50);selectedWorld=Math.floor(index/10);
 const map=$('worldMap');map.hidden=false;map.setAttribute('aria-hidden','false');
 $('mapButton').setAttribute('aria-expanded','true');renderWorldMap();$('closeMapButton').focus();
}
function closeWorldMap(restoreFocus=true){
 const map=$('worldMap');if(!map||map.hidden)return;
 map.hidden=true;map.setAttribute('aria-hidden','true');$('mapButton').setAttribute('aria-expanded','false');
 if(restoreFocus)(returnMapFocus?.isConnected?returnMapFocus:$('mapButton')).focus();
}
$('mapButton').addEventListener('click',openWorldMap);
$('closeMapButton').addEventListener('click',()=>closeWorldMap());
$('galaxyTabs').addEventListener('click',e=>{const node=e.target.closest('[data-galaxy-index]');if(node){selectedGalaxy=Number(node.dataset.galaxyIndex);selectedWorld=selectedGalaxy*5;renderWorldMap();}});
$('worldTabs').addEventListener('click',e=>{const node=e.target.closest('[data-world-index]');if(node){selectedWorld=Number(node.dataset.worldIndex);renderWorldMap();}});
$('worldStage').addEventListener('click',e=>{const node=e.target.closest('[data-level-index]');if(node)changeCase(Number(node.dataset.levelIndex));});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&!$('worldMap').hidden){e.preventDefault();closeWorldMap();return;}
 if($('worldMap').hidden||e.key!=='Tab')return;
 const focusable=[...$('worldMap').querySelectorAll('button:not([disabled])')];if(!focusable.length)return;
 if(e.shiftKey&&document.activeElement===focusable[0]){e.preventDefault();focusable.at(-1).focus();}
 else if(!e.shiftKey&&document.activeElement===focusable.at(-1)){e.preventDefault();focusable[0].focus();}
});

$('cosmeticGallery').addEventListener('click',e=>{
 const button=e.target.closest('button[data-cosmetic-type]');
 if(!button||button.disabled)return;
 const id=button.dataset.cosmeticId||null;
 equipSelectedCosmetic(button.dataset.cosmeticType,id);
});
$('passButton').addEventListener('click',applyPass);$('undoButton').addEventListener('click',undo);$('restartButton').addEventListener('click',()=>{if(dailyRoute){if(dailySession==='practice')startDailyPractice();}else changeCase(index);});$('prevButton').addEventListener('click',()=>changeCase(index-1));$('nextButton').addEventListener('click',()=>{if(index<scenarios.length-1)changeCase(index+1)});
$('scenarioSelect').addEventListener('change',e=>changeCase(Number(e.target.value)));
$('hintButton').addEventListener('click',()=>{if(dailyRoute&&dailySession!=='practice')return;hint=!hint;if(hint&&!dailyRoute)masteryRun=markMasteryRunUnclean(masteryRun);render()});
// Desktop: legal targets get a soft glow; the one under the dragged card
// brightens to confirm that releasing here will cast the spell at it.
$('hand').addEventListener('dragstart',e=>{const source=e.target.closest('[data-drag-card]');if(!source||game.status!=='playing'){e.preventDefault();return;}
 e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',source.dataset.dragCard);
 source.classList.add('dragging');startDragFeedback(source.dataset.dragCard);
});
$('hand').addEventListener('dragend',()=>{clearDragFeedback();document.querySelectorAll('.dragging').forEach(n=>n.classList.remove('dragging'));flushScryfallRefresh();});
for(const zone of [$('stackDrop'),$('fieldDrop')]){
 zone.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='move';updateDragFeedback(e.target);});
 zone.addEventListener('dragleave',e=>{if(!zone.contains(e.relatedTarget))updateDragFeedback(null);});
 zone.addEventListener('drop',e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain');const target=targetFromElement(e.target);
  clearDragFeedback();if(id)beginPlay(id,target,true,zone.id);});
}
// Touch/pen dragging uses pointer coordinates instead of unreliable native HTML
// drag/drop. The dragged card is non-interactive so the target underneath glows.
$('hand').addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;const card=e.target.closest('[data-drag-card]');if(!card)return;
 dragTouch={id:card.dataset.dragCard,x:e.clientX,y:e.clientY,moved:false,ghost:null};});
document.addEventListener('pointermove',e=>{if(!dragTouch)return;const d=dragTouch;
 if(!d.moved&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>9){d.moved=true;startDragFeedback(d.id);d.ghost=document.createElement('div');d.ghost.className='drag-ghost';
 const a=game.hand.find(x=>x.id===d.id);d.ghost.innerHTML=thumb(a.card,'small','drag-card-image');document.body.append(d.ghost);}
 if(!d.moved)return;e.preventDefault();d.ghost.style.left=e.clientX+'px';d.ghost.style.top=e.clientY+'px';
 updateDragFeedback(document.elementFromPoint(e.clientX,e.clientY));
},{passive:false});
function finishTouch(e){if(!dragTouch)return;const d=dragTouch;dragTouch=null;
 const el=d.moved?document.elementFromPoint(e.clientX,e.clientY):null;
 const zone=el?.closest?.('#stackDrop,#fieldDrop');const target=targetFromElement(el);
 d.ghost?.remove();clearDragFeedback();
 if(zone)beginPlay(d.id,target,true,zone.id);
 flushScryfallRefresh();
}
document.addEventListener('pointerup',finishTouch);
document.addEventListener('pointercancel',()=>{
 // Browsers fire pointercancel when a native mouse HTML5 drag begins.
 // That is not a touch-drag cancellation: preserve native drag target glow.
 if(!dragTouch)return;
 dragTouch.ghost?.remove();dragTouch=null;clearDragFeedback();flushScryfallRefresh();
});
// Accessible non-pointer alternative: focus a hand card, press Enter, focus battlefield/stack, press Enter.
$('hand').addEventListener('keydown',e=>{const card=e.target.closest('[data-drag-card]');if(card&&['Enter',' '].includes(e.key)){e.preventDefault();armedCard=card.dataset.dragCard;render();notify('Card selected. Focus the battlefield or stack and press Enter to place it.');}});
for(const zone of [$('stackDrop'),$('fieldDrop')])zone.addEventListener('keydown',e=>{if(armedCard&&['Enter',' '].includes(e.key)){e.preventDefault();beginPlay(armedCard,null,false,zone.id);}});
document.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;
 if(e.key==='Escape'&&pendingPlay){pendingPlay=null;render();return;}
 if(e.key===' '&&document.activeElement===document.body){e.preventDefault();applyPass();}
 else if(e.key.toLowerCase()==='z'&&document.activeElement===document.body)undo();
});
let lastLevel=0;try{lastLevel=Number(localStorage.getItem('dc-stackbreaker-last-level')||'0')||0;}catch{}
if(dailyRoute){
 if(dailyBound){
  dailyRecord=siteRanked?null:readLocalDaily(localStorage,dailyBound);
  changeCase(dailyIndex,true);
 }else changeCase(0,true);
 $('dailyBanner').hidden=false;
 updateDailyCountdown();
 window.setInterval(updateDailyCountdown,1000);
 $('dailyStart').addEventListener('click',startDailyScored);
 $('dailyPractice').addEventListener('click',startDailyPractice);
 $('dailyCopy').addEventListener('click',copyDailyShare);
 renderDailyStatus();
}else changeCase(lastLevel);
fetchScryfallCatalog();
if(siteRanked){
 window.addEventListener('message',event=>{
  if(event.source!==window.parent||!siteOriginAllowed(event.origin))return;
  const data=event.data;
  if(!data||typeof data!=='object')return;
  if(data.type==='dc-sb-ranked-state'){
   if(!dailyBound||data.puzzleId!==dailyBound.puzzleId||data.day!==dailyDate
    ||data.state?.id!==dailyBound.puzzleId||!['started','won','lost'].includes(data.status)
    ||!Number.isInteger(data.moves)||data.moves<0||data.moves>140)return;
   rankedBusy=false;
   dailySession='scored';
   dailyRecord={status:data.status==='started'?'playing':data.status,
    acceptedActionCount:data.moves,localUnverified:false};
   spellVfx.cancel();clearDragFeedback();
   game=structuredClone(data.state);
   pendingPlay=null;armedCard=null;history=[];hint=false;
   render();
   notify(data.status==='started'?'Verified attempt resumed · all moves replayed by website server.':
    'Website server confirmed outcome: '+data.status.toUpperCase());
  }else if(data.type==='dc-sb-ranked-error'){
   rankedBusy=false;
   notify('Server rejected or could not verify action. Refresh to recover your official attempt.');
  }
 });
 // This is a purely presentational message: the website never trusts it for scores.
 const reportLayout=()=>{
  if(!siteRanked)return;
  const height=Math.ceil(document.body.getBoundingClientRect().height);
  if(height>=500&&height<=3000)sendSite({type:'dc-sb-ranked-layout',height});
 };
 const frameObserver=new ResizeObserver(()=>requestAnimationFrame(reportLayout));
 frameObserver.observe(document.body);
 window.addEventListener('resize',reportLayout,{passive:true});
 window.addEventListener('load',reportLayout,{once:true});
 requestAnimationFrame(reportLayout);
 sendSite({type:'dc-sb-ranked-ready',day:dailyDate,puzzleId:dailyBound?.puzzleId||null});
}
