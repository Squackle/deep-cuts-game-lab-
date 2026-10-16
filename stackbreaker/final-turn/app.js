import {createDrill,openingDrill,passPriority,tapMana,castSpell,isSorceryWindow,legalCast,formatStep,SUPPORTED_CARDS} from '../src/final-turn-engine.js';
const $=id=>document.getElementById(id);
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const savedKey='dc-stackbreaker-final-turn-v1';
const imageCache=new Map();
let game=createDrill(openingDrill),notice='';
function cardArt(name){
 const url=imageCache.get(name);
 return url?'<img src="'+escapeHTML(url)+'" alt="'+escapeHTML(name)+' card image from Scryfall" loading="lazy" draggable="false">':'<span aria-hidden="true">✧</span>';
}
async function fetchArt(name){
 try{
  const r=await fetch('https://api.scryfall.com/cards/named?exact='+encodeURIComponent(name),{headers:{Accept:'application/json'}});
  if(!r.ok)return;
  const card=await r.json();
  const url=card.image_uris?.small||card.card_faces?.[0]?.image_uris?.small||'';
  if(/^https:\/\/cards\.scryfall\.io\//.test(url)){imageCache.set(name,url);render();}
 }catch{} // Artwork never blocks the game.
}
for(const name of ['Counterspell','Lava Spike','Lightning Bolt'])fetchArt(name);
function action(fn){
 try{
  const wasPlaying=game.status==='playing';game=fn(game);notice='';
  if(wasPlaying&&game.status==='won'){
   try{localStorage.setItem(savedKey,JSON.stringify({completed:['final-turn-001'],version:1}));}catch{}
  }
 }catch(e){notice=e.message||String(e);}
 render();
}
function render(){
 $('myLife').textContent=game.life.player;
 $('oppLife').textContent=game.life.opponent;
 $('turn').textContent=(game.activePlayer==='player'?'Your':"Opponent's")+' turn · Turn '+game.turn;
 $('step').textContent=formatStep(game.step);
 const stack=[...game.stack].reverse();
 $('stack').innerHTML=stack.map((item,i)=>'<li class="spell" aria-label="'+escapeHTML(item.card)+' targeting '+escapeHTML(item.target)+'"><div>'+cardArt(item.card)+'</div><div><em>'+(i===0?'TOP — NEXT TO RESOLVE':'BELOW')+'</em><b>'+escapeHTML(item.card)+'</b><small>Target: '+escapeHTML(item.target==='player'?'You':item.target==='opponent'?'Opponent':game.stack.find(x=>x.id===item.target)?.card||item.target)+'</small></div></li>').join('');
 $('emptyStack').hidden=stack.length!==0;
 $('lands').innerHTML=game.lands.map(l=>'<button class="land '+(l.mana==='R'?'red ':'')+(l.tapped?'tapped':'')+'" type="button" data-land="'+escapeHTML(l.id)+'" '+(l.tapped||game.status!=='playing'?'disabled':'')+' aria-label="'+(l.tapped?'Tapped ':'Tap ')+escapeHTML(l.card)+' for '+escapeHTML(l.mana)+' mana"><b>'+escapeHTML(l.card)+'</b><span aria-hidden="true">'+(l.mana==='U'?'◆':'✹')+'</span><small>'+(l.tapped?'TAPPED':'TAP FOR '+l.mana)+'</small></button>').join('');
 const mana=Object.entries(game.mana).filter(([,n])=>n>0).map(([c,n])=>n+' '+c);
 $('mana').textContent=mana.length?mana.join(' · '):'Empty';
 $('hand').innerHTML=game.hand.map((name,i)=>{
  const definition=SUPPORTED_CARDS[name];
  if(!definition)return '<div class="card" role="group"><b>'+escapeHTML(name)+'</b><small>Drawn card · Not playable in this prototype</small></div>';
  const can=legalCast(game,name);
  const timing=definition.type==='sorcery'&&!isSorceryWindow(game)?'Main phase only':'Tap lands for mana';
  return '<button class="card '+(can?'available':'')+'" type="button" data-card="'+escapeHTML(name)+'" '+(game.status!=='playing'?'disabled':'')+' aria-label="Cast '+escapeHTML(name)+' targeting '+escapeHTML(name==='Counterspell'?'the top spell':'opponent')+'"><div>'+cardArt(name)+'</div><b>'+escapeHTML(name)+'</b><small>'+escapeHTML(can?'CAST READY':timing)+'</small></button>';
 }).join('');
 $('handCount').textContent=game.hand.length+' cards';
 const outcome=game.status!=='playing';
 $('pass').disabled=outcome;
 $('pass').textContent=game.stack.length?'PASS / RESOLVE TOP →':'PASS / NEXT STEP →';
 $('feedback').textContent=notice||(game.status==='won'?'VICTORY! You survived the stack, then defeated the opponent.':
 game.status==='lost'?'DEFEAT — the opponent won. Restart to find the correct response.':
 game.status==='failed'?'Drill window ended without lethal. Restart to try again.':
 game.status==='draw'?'Game drawn. Restart to try again.':
 game.stack.length?'You have priority. Answer the stack, then pass to resolve.':
 isSorceryWindow(game)?'Your main phase and empty stack. Cast your sorcery to finish!':
 game.step==='endStep'?'Stack clear. Pass to finish the opponent’s turn.':
 'Stack clear. Pass to move through '+formatStep(game.step)+'.');
 $('log').innerHTML=game.log.slice(-18).map(x=>'<li>'+escapeHTML(x)+'</li>').join('');
}
$('lands').addEventListener('click',e=>{const el=e.target.closest('[data-land]');if(el)action(s=>tapMana(s,el.dataset.land));});
$('hand').addEventListener('click',e=>{
 const el=e.target.closest('[data-card]');if(!el)return;
 const name=el.dataset.card;
 const target=name==='Counterspell'?game.stack.at(-1)?.id:'opponent';
 action(s=>castSpell(s,name,target));
});
$('pass').addEventListener('click',()=>action(passPriority));
$('restart').addEventListener('click',()=>{game=createDrill(openingDrill);notice='';render();});
render();
