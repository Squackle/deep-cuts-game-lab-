import {createEngine} from './engine.mjs';
function boot(createEngine){
 const $=id=>document.getElementById(id), canvas=$("field"), ctx=canvas.getContext("2d");
 const colors={W:"#e5d4a2",U:"#77b9e6",B:"#ac8ac3",R:"#ed8b65",G:"#9bc889",C:"#c5c9cc"};
 let game=createEngine(1), selected=null, speed=1, rallying=false, accumulator=0,last=null,lastEvent=-1, selectedCard=null, handKey="", deckCountKey="", contributionKey="";
 const buttons=[], choices={}, statEls={};
 const labels={damage:"Damage dealt",manaEarned:"Mana earned",farmMana:"Farm income",killMana:"Kill income",waveMana:"Wave rewards",earlyMana:"Early-call mana",earlyCalls:"Early calls",spent:"Mana spent",refunds:"Resale refunds",kills:"Enemies defeated",leaks:"Enemies escaped",summoned:"Troops summoned",fallen:"Troops fallen",casts:"Spells cast",draws:"Cards drawn",triggers:"Combo triggers",healing:"Healing restored",control:"Control applications",soulMana:"Soul income",spellMana:"Spell income",sandboxMana:"Sandbox grants"};
 const text=(el,value)=>{const s=String(value);if(el.textContent!==s)el.textContent=s;};
 const notice=s=>{text($("notice"),s);$("notice").title=s;};
 function showDialog(id){for(const d of document.querySelectorAll("dialog[open]"))d.close();$(id).showModal();accumulator=0;}
 function closeDialogs(){for(const d of document.querySelectorAll("dialog[open]"))d.close();accumulator=0;}
 $("menuOpen").addEventListener("click",()=>showDialog("menuDialog"));
 $("waveInfo").addEventListener("click",()=>showDialog("waveDialog"));
 $("statsOpen").addEventListener("click",()=>{ $("statsReport").hidden=true;text($("copyStatus"),"Copy a playtest report to paste into feedback.");showDialog("statsDialog");});
 $("copyStats").addEventListener("click",async()=>{const field=$("statsReport");const report=JSON.stringify(game.playtestReport());field.value=report;const button=$("copyStats");button.disabled=true;try{if(!navigator.clipboard?.writeText)throw Error("Clipboard unavailable");await navigator.clipboard.writeText(report);field.hidden=true;text($("copyStatus"),"Stats copied. Paste the report into ChatGPT.");}catch{field.hidden=false;field.focus();field.select();try{field.setSelectionRange(0,report.length);}catch{}text($("copyStatus"),"Automatic copying unavailable. Select and copy the report below.");}finally{button.disabled=false;}});
 $("sandboxOpen").addEventListener("click",()=>showDialog("sandboxDialog"));
 for(const b of document.querySelectorAll("[data-close]"))b.addEventListener("click",closeDialogs);
 $("clearSelection").addEventListener("click",()=>selectPad(null));
 for(const b of document.querySelectorAll("[data-school]"))b.addEventListener("click",()=>{$("colorFilter").value=b.dataset.school;renderHud();});
 $("castInstant").addEventListener("click",()=>{if(selectedCard!==null)cast(selectedCard);});
 function cast(index,target={}){const id=game.state.hand[index];if(!id)return false;if(game.command({type:"cast",index,...target})){selectedCard=null;notice(game.cards[id].name+" resolved.");renderHud();return true;}notice("Invalid spell target or insufficient mana. No mana spent.");return false;}
 function selectPad(id){if(selectedCard!==null&&id!==null&&game.cards[game.state.hand[selectedCard]]?.target==="tower"){cast(selectedCard,{pad:id});return;}selected=id;rallying=false;$("padSelect").value=id===null?"":String(id);renderHud();}
 for(const p of game.map.pads){
  const b=document.createElement("button");b.className="pad"+(p.bonus?" "+p.bonus:"");b.type="button";b.style.left=p.x/game.map.width*100+"%";b.style.top=p.y/game.map.height*100+"%";b.addEventListener("click",()=>selectPad(p.id));b.addEventListener("dragover",e=>e.preventDefault());b.addEventListener("drop",e=>{e.preventDefault();const i=Number(e.dataTransfer.getData("application/x-archamancy-card"));if(e.dataTransfer.types.includes("application/x-archamancy-card"))cast(i,{pad:p.id});});$("pads").append(b);buttons.push(b);
  const o=document.createElement("option");o.value=p.id;o.textContent="Pad "+(p.id+1)+(p.bonus==="spring"?" · Mana spring":p.bonus==="height"?" · High ground":"");$("padSelect").append(o);
 }
 $("padSelect").addEventListener("change",e=>selectPad(e.target.value===""?null:Number(e.target.value)));
 for(const [key,def] of Object.entries(game.roster)){
  const b=document.createElement("button");b.type="button";b.className="tower-choice";b.style.setProperty("--school",colors[def.color]);b.title=def.role;b.setAttribute("aria-label",def.name+", "+def.cost+" mana. "+def.role);
  const stripe=document.createElement("span");stripe.className="stripe";stripe.style.background=colors[def.color];
  const body=document.createElement("span"),name=document.createElement("strong"),desc=document.createElement("small"),price=document.createElement("span");
  name.textContent=def.name;desc.textContent=def.role;body.append(name,desc);price.className="price";price.textContent=def.cost;b.append(stripe,body,price);
  b.addEventListener("click",()=>{if(game.command({type:"build",pad:selected,kind:key})){notice(def.name+" constructed.");renderHud();}else notice("Select an empty pad and make sure you have enough mana.");});
  $("buildMenu").append(b);choices[key]=b;
 }
 for(const [k,label] of Object.entries(labels)){const d=document.createElement("div"),l=document.createElement("span"),v=document.createElement("strong");d.className="stat";l.textContent=label;d.append(l,v);$("statistics").append(d);statEls[k]=v;}
 $("colorFilter").addEventListener("change",renderHud);
 for(const [key,d] of Object.entries(game.cards)){const o=document.createElement("option");o.value=key;o.textContent=d.name;$("sandboxCard").append(o);}
 for(const key of Object.keys(game.types)){const o=document.createElement("option");o.value=key;o.textContent=key;$("sandboxEnemy").append(o);}
 for(const [id,fn] of Object.entries({addMana:()=>({type:"sandboxMana",amount:10000}),healBase:()=>({type:"sandboxHeal"}),clearEnemies:()=>({type:"sandboxClear"}),addCard:()=>({type:"sandboxCard",card:$("sandboxCard").value}),spawn:()=>({type:"sandboxEnemy",enemy:$("sandboxEnemy").value,count:10})}))$(id).addEventListener("click",()=>{notice(game.command(fn())?"Sandbox action applied.":"Sandbox action unavailable (hand or battlefield capacity may be full).");renderHud();});
 $("cancelCard").addEventListener("click",()=>{selectedCard=null;renderHud();});
 $("discard").addEventListener("click",()=>{if(selectedCard!==null&&game.command({type:"discard",index:selectedCard})){selectedCard=null;notice("Card discarded.");renderHud();}});
 function makeDeckEditor(){const list=$("deckList");list.replaceChildren();for(const [id,d] of Object.entries(game.cards)){const l=document.createElement("label"),s=document.createElement("select");l.textContent=d.name;s.dataset.card=id;for(let i=0;i<=3;i++){const o=document.createElement("option");o.value=i;o.textContent=i;s.append(o);}s.value=game.state.deck.filter(k=>k===id).length;s.addEventListener("change",updateDeckCount);l.append(s);list.append(l);}updateDeckCount();}
 function configuredDeck(){return [...$("deckList").querySelectorAll("select")].flatMap(s=>Array(Number(s.value)).fill(s.dataset.card));}
 function updateDeckCount(){const n=configuredDeck().length;text($("deckCount"),n+" / 30 cards");$("applyDeck").disabled=n!==30||game.state.wave!==0;}
 $("deckToggle").addEventListener("click",()=>{makeDeckEditor();showDialog("deckDialog");});
 $("applyDeck").addEventListener("click",()=>{if(game.command({type:"deck",deck:configuredDeck()})){selectedCard=null;closeDialogs();notice("Spellbook applied.");renderHud();}});
 $("start").addEventListener("click",()=>{if(game.command({type:game.state.phase==="won"?"continue":game.state.phase==="active"?"early":"wave"})){notice(game.state.phase==="ready"?"Endless continuation unlocked. Start the next wave.":"Wave "+game.state.wave+" begins."+(game.state.waveCalls.at(-1)?.early?" Early bonus +"+game.state.waveCalls.at(-1).bonus+" mana.":""));if(speed===0)setSpeed(1);renderHud();}});
 $("upgrade").addEventListener("click",()=>{if(game.command({type:"upgrade",pad:selected}))notice("Tower upgraded.");renderHud();});
 $("sell").addEventListener("click",()=>{if(game.command({type:"sell",pad:selected})){rallying=false;notice("Tower sold. Pad freed.");}renderHud();});
 $("rally").addEventListener("click",()=>{selectedCard=null;rallying=!rallying;notice(rallying?"Tap a road location within this tower’s rally range.":"Rally selection cancelled.");renderHud();});
 function coords(e){const rect=canvas.getBoundingClientRect();return {x:(e.clientX-rect.left)*canvas.width/rect.width,y:(e.clientY-rect.top)*canvas.height/rect.height};}
 canvas.addEventListener("dragover",e=>e.preventDefault());
 canvas.addEventListener("drop",e=>{e.preventDefault();if(e.dataTransfer.types.includes("application/x-archamancy-card"))cast(Number(e.dataTransfer.getData("application/x-archamancy-card")),coords(e));});
 canvas.addEventListener("click",e=>{const {x,y}=coords(e);if(selectedCard!==null&&game.cards[game.state.hand[selectedCard]]?.target==="ground"){cast(selectedCard,{x,y});return;}if(!rallying)return;if(game.command({type:"rally",pad:selected,x,y})){rallying=false;notice("Rally point moved.");}else notice("Choose a road position within the tower’s range.");renderHud();});
 function setSpeed(n){speed=n;accumulator=0;for(const b of document.querySelectorAll("[data-speed]"))b.setAttribute("aria-pressed",String(Number(b.dataset.speed)===n));}
 for(const b of document.querySelectorAll("[data-speed]"))b.addEventListener("click",()=>setSpeed(Number(b.dataset.speed)));
 function restart(mode){game=createEngine(1,mode);selected=null;selectedCard=null;rallying=false;lastEvent=-1;handKey="";contributionKey="";setSpeed(1);$("padSelect").value="";$("mode").value=mode;closeDialogs();notice("New "+mode+" run. Select a build pad.");renderHud();}
 $("restart").addEventListener("click",()=>restart(game.state.mode));
 $("newMode").addEventListener("click",()=>restart($("mode").value));
 function renderHud(){
  const s=game.state,terminal=s.phase==="won"||s.phase==="lost";
  text($("health"),s.health);text($("mana"),s.mana.toLocaleString("en-US"));text($("wave"),s.wave+(s.mode==="campaign"?" / 25":" / ∞"));text($("enemies"),s.enemies.length+s.queue.length);text($("time"),Math.floor(s.tick/10)+"s");text($("phase"),s.phase==="won"?"VICTORY":s.phase==="lost"?"DEFEAT":s.phase==="ready"?"PREPARE":"IN COMBAT");
  const early=game.canCallEarly(),bonus=game.earlyBonus();
  text($("preview"),terminal?(s.phase==="won"?"The passage is secure. Continue to Endless Siege.":"The fortress has fallen."):s.phase==="active"?"Remaining: "+(s.enemies.length+s.queue.length)+(early?" | Next wave "+(s.wave+1)+" · "+game.waveSpec(s.wave+1).map(x=>x.replace(":"," × ")).join(" · ")+" | Early bonus +"+bonus+" mana ("+game.earlySeconds()+"s remaining)":""):game.waveSpec(s.wave+1).map(x=>x.replace(":", " × ")).join(" · ")+" | Enemy health ×"+game.scale(s.wave+1).toFixed(2));
  $("start").disabled=s.phase==="lost"||(s.phase==="active"&&!early);text($("start"),s.phase==="won"?"Continue to endless":s.phase==="lost"?"Run finished":s.phase==="active"?(early?"Call wave "+(s.wave+1)+" · +"+bonus+" mana":s.mode==="campaign"&&s.wave>=25?"Final wave in progress":"Battlefield at capacity"):"Start wave "+(s.wave+1));
  $("sandbox").hidden=s.mode!=="sandbox";$("sandboxOpen").hidden=s.mode!=="sandbox";$("deckToggle").disabled=s.wave!==0||s.phase!=="ready";
  text($("zones"),"Library "+s.library.length+" · Graveyard "+s.discard.length+(s.echo?" · Echo armed":""));
  const activeCard=selectedCard===null?null:game.cards[s.hand[selectedCard]];
  text($("castHint"),activeCard?activeCard.desc+" "+(activeCard.target==="tower"?"Tap a tower.":activeCard.target==="ground"?"Tap the battlefield in combat.":"Tap Cast to resolve."):"Select a card to inspect and cast.");
  $("castInstant").hidden=!activeCard||activeCard.target!=="none";$("castInstant").disabled=terminal||!activeCard||s.mana<activeCard.cost;
  $("discard").disabled=selectedCard===null||terminal;$("cancelCard").disabled=selectedCard===null;
  const hk=JSON.stringify([s.hand,selectedCard]);if(handKey!==hk){handKey=hk;const hand=$("hand");hand.replaceChildren();for(const [i,id] of s.hand.entries()){const d=game.cards[id],b=document.createElement("button");b.type="button";b.className="spell";b.style.setProperty("--school",colors[d.color]);b.draggable=true;b.title=d.desc;b.setAttribute("aria-label",d.name+", "+d.cost+" mana. "+d.desc);b.dataset.index=i;b.setAttribute("aria-pressed",String(i===selectedCard));const n=document.createElement("strong"),price=document.createElement("em"),desc=document.createElement("small");n.textContent=d.name;price.textContent=d.cost+" ◈";desc.textContent=d.desc;b.append(n,price,desc);b.addEventListener("click",()=>{rallying=false;selectedCard=i;renderHud();});b.addEventListener("dragstart",e=>{e.dataTransfer.setData("application/x-archamancy-card",String(i));});hand.append(b);}}for(const b of $("hand").children){b.disabled=terminal;b.classList.toggle("unaffordable",s.mana<game.cards[s.hand[Number(b.dataset.index)]].cost);}
  for(const p of game.map.pads){const b=buttons[p.id],t=s.towers[p.id],def=t?game.roster[t.kind]:null;b.classList.toggle("built",!!t);b.style.backgroundColor=t?colors[def.color]:"";b.setAttribute("aria-pressed",String(selected===p.id));b.setAttribute("aria-label","Pad "+(p.id+1)+(t?", "+def.name+", tier "+t.tier:p.bonus?", "+p.bonus:", empty"));text(b,t?({legion:"♜",chapel:"✚",judgment:"⚔",arcanum:"✦",library:"▤",mirror:"◇",necropolis:"☠",foundry:"◈",hex:"☾",pyre:"✹",goblin:"⚑",storm:"ϟ",grove:"♣",beast:"♞",thorn:"✿"})[t.kind]+t.tier:p.bonus==="spring"?"◆":p.bonus==="height"?"▲":"＋");}
  const pad=selected===null?null:game.map.pads[selected],t=pad?s.towers[selected]:null;
  text($("selection"),t?game.roster[t.kind].name:pad?"Build on pad "+(pad.id+1):"Select a build pad");
  text($("details"),t?"T"+t.tier+" · "+(t.kind==="grove"?"Harvest "+(s.farmPaid[t.id]||0)+"/"+game.farmBudget(t)+" mana this wave group ("+game.farmLimit(t)+"/wave).":game.roster[t.kind].role):pad?(pad.bonus==="spring"?"Mana spring: +35% farm yield.":pad.bonus==="height"?"High ground: +30 attack range.":"Choose a school, then a tower."):"Tap an empty pad to build or a tower to upgrade.");
  $("clearSelection").hidden=!pad;$("schools").hidden=!!t;for(const b of document.querySelectorAll("[data-school]"))b.setAttribute("aria-pressed",String(b.dataset.school===$("colorFilter").value));
  $("buildMenu").hidden=!!t;$("towerActions").hidden=!t;
  if(t){const price=game.upgradeCost(t);text($("upgrade"),price===null?"Max tier":"Upgrade · "+price);$("upgrade").disabled=terminal||price===null||s.mana<price;text($("sell"),"Sell · +"+Math.floor(t.paid*.7));$("sell").disabled=terminal;$("rally").hidden=game.roster[t.kind].kind!=="troops";$("rally").disabled=terminal;$("rally").setAttribute("aria-pressed",String(rallying));text($("rally"),rallying?"Cancel rally":"Set rally point");}
  for(const [k,b] of Object.entries(choices)){b.disabled=terminal||!pad||!!t||s.mana<game.roster[k].cost;b.hidden=$("colorFilter").value!=="all"&&$("colorFilter").value!==game.roster[k].color;}
  const contributions=[...s.towerHistory,...Object.values(s.towers)];const ck=JSON.stringify(contributions.map(t=>[t.uid,t.tier,t.damage,t.mana,t.summons,t.healing,t.control,t.draws,t.sold]));if(ck!==contributionKey){contributionKey=ck;const list=$("contributions");list.replaceChildren();for(const t of contributions){const el=document.createElement("div");el.textContent=game.roster[t.kind].name+" · Pad "+(t.id+1)+" · T"+t.tier+(t.sold?" (sold)":"")+" — Damage "+t.damage+" | Mana "+t.mana+" | Summons "+t.summons+" | Healing "+t.healing+" | Control "+t.control+" | Draws "+t.draws;list.append(el);}}
  for(const [k,el] of Object.entries(statEls))text(el,s.stats[k].toLocaleString("en-US"));
  if(lastEvent!==s.sequence){lastEvent=s.sequence;const ol=$("eventLog");ol.replaceChildren();for(const e of s.events.slice(-12).reverse()){const li=document.createElement("li");li.textContent=(e.tick/10).toFixed(1)+"s · "+e.type+(e.amount!==undefined?" · "+e.amount+" mana":e.wave?" · wave "+e.wave:"");ol.append(li);}}
 }
 const terrain=document.createElement("canvas");terrain.width=1000;terrain.height=600;
 function paintTerrain(){
  const a=terrain.getContext("2d"),{path,pads}=game.map;
  const g=a.createLinearGradient(0,0,1000,600);g.addColorStop(0,"#152e2a");g.addColorStop(.5,"#39533c");g.addColorStop(1,"#1b302b");a.fillStyle=g;a.fillRect(0,0,1000,600);
  let seed=23921;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const near=(x,y)=>{const q=game.pointAt(game.nearestPath(x,y));return (q.x-x)**2+(q.y-y)**2<42**2||pads.some(p=>(p.x-x)**2+(p.y-y)**2<34**2);};
  for(let i=0;i<3400;i++){const x=random()*1000,y=random()*600;a.fillStyle=["#3e583f","#456145","#233f32","#527052","#6b7650"][i%5];a.globalAlpha=.24;a.beginPath();a.ellipse(x,y,2+random()*10,1+random()*4,random()*3,0,Math.PI*2);a.fill();}a.globalAlpha=1;
  // Layered stone-edged road, moss and engraved cobbles.
  a.lineJoin="round";a.lineCap="round";a.beginPath();path.forEach(([x,y],i)=>i?a.lineTo(x,y):a.moveTo(x,y));a.strokeStyle="#162822";a.lineWidth=61;a.stroke();a.strokeStyle="#766b52";a.lineWidth=52;a.stroke();a.strokeStyle="#b7a17b";a.lineWidth=39;a.stroke();a.strokeStyle="#a58e68";a.lineWidth=2;a.setLineDash([3,15]);a.stroke();a.setLineDash([]);
  for(let n=15;n<game.map.distance;n+=28){const p=game.pointAt(n);a.fillStyle="#e3cba0";a.globalAlpha=.25;a.beginPath();a.ellipse(p.x+(random()-.5)*20,p.y+(random()-.5)*20,2+random()*4,2,0,0,Math.PI*2);a.fill();}a.globalAlpha=1;
  for(let i=0;i<220;i++){const x=random()*1000,y=random()*600;if(near(x,y))continue;const h=12+random()*31;a.fillStyle="#142820";a.beginPath();a.ellipse(x+5,y+5,h*.54,h*.25,0,0,Math.PI*2);a.fill();a.fillStyle="#705945";a.fillRect(x-2,y-h*.35,4,h*.4);for(let k=0;k<3;k++){a.fillStyle=["#1c392c","#31543a","#52734a"][k];a.beginPath();a.moveTo(x,y-h*(1.25-k*.16));a.lineTo(x-h*(.38-k*.06),y-h*(.1+k*.12));a.lineTo(x+h*(.38-k*.06),y-h*(.1+k*.12));a.closePath();a.fill();}}
  for(const p of pads){a.fillStyle="#1b2d25";a.beginPath();a.ellipse(p.x,p.y+5,30,19,0,0,Math.PI*2);a.fill();a.fillStyle=p.bonus==="spring"?"#467c81":p.bonus==="height"?"#958155":"#77765a";a.beginPath();a.ellipse(p.x,p.y,28,17,0,0,Math.PI*2);a.fill();a.strokeStyle="#bdb692";a.lineWidth=2;a.stroke();if(p.bonus){a.strokeStyle=p.bonus==="spring"?"#a1e5df":"#edce80";a.beginPath();a.ellipse(p.x,p.y,35,23,0,0,Math.PI*2);a.stroke();}}
  a.fillStyle="#353f37";a.fillRect(947,434,53,96);a.fillStyle="#b1a58b";a.fillRect(950,442,50,72);a.fillStyle="#4c5e52";for(let y=445;y<515;y+=14){a.fillRect(949,y,51,2);}a.fillStyle="#252e2b";a.beginPath();a.arc(979,483,13,Math.PI,0);a.lineTo(992,513);a.lineTo(966,513);a.fill();for(let i=0;i<3;i++){a.fillStyle="#d4c2a1";a.fillRect(947+i*19,434,12,14);}
  a.fillStyle="#f4e6c1";a.font="bold 12px Georgia";a.fillText("THE HOLLOW ROAD",12,82);a.fillText("VERDANT KEEP",885,548);
  const vignette=a.createRadialGradient(500,300,160,500,300,590);vignette.addColorStop(0,"#101b1600");vignette.addColorStop(1,"#07110f99");a.fillStyle=vignette;a.fillRect(0,0,1000,600);
 }
 paintTerrain();
 function renderField(){
  const s=game.state,{width:w,height:h,path,pads}=game.map;ctx.clearRect(0,0,w,h);
  ctx.drawImage(terrain,0,0,w,h);
  const t=selected===null?null:s.towers[selected],p=selected===null?null:pads[selected];
  if(p&&t){const r=game.roster[t.kind].range;if(r){ctx.fillStyle="#e8d7ae1a";ctx.strokeStyle="#f1db9e88";ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,r+(p.bonus==="height"&&game.roster[t.kind].kind!=="troops"?30:0),0,Math.PI*2);ctx.fill();ctx.stroke();}}
  for(const t of Object.values(s.towers)){const p=pads[t.id],def=game.roster[t.kind];if(def.kind==="troops"){const r=game.pointAt(t.rally);ctx.strokeStyle=colors[def.color];ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(r.x,r.y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=colors[def.color];ctx.fillRect(r.x-1,r.y-18,3,18);ctx.beginPath();ctx.moveTo(r.x,r.y-18);ctx.lineTo(r.x+14,r.y-13);ctx.lineTo(r.x,r.y-8);ctx.fill();}}
  for(const u of s.troops){const q=game.pointAt(u.progress),def=game.roster[s.towers[u.source].kind],offset=(u.id%5-2)*5;const x=q.x+offset,y=q.y+((u.id%3)-1)*8;ctx.fillStyle=colors[def.color];ctx.strokeStyle="#18241a";ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle="#14371d";ctx.fillRect(x-8,y-13,16,3);ctx.fillStyle="#8add91";ctx.fillRect(x-8,y-13,16*u.hp/u.maxHp,3);}
  for(const e of s.enemies){const q=game.pointAt(e.progress),x=q.x,y=q.y+(e.flying?-17:0);ctx.fillStyle=e.flying?"#e3d6b0":e.kind==="armored"?"#9d9e9d":e.kind==="runner"?"#e8ab75":"#bc6e5c";ctx.strokeStyle="#2e2520";ctx.lineWidth=2;ctx.beginPath();if(e.flying){ctx.moveTo(x,y-10);ctx.lineTo(x-12,y+7);ctx.lineTo(x+12,y+7);ctx.closePath();}else ctx.arc(x,y,e.kind==="armored"?12:9,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle="#4c2b27";ctx.fillRect(x-12,y-17,24,4);ctx.fillStyle="#e19a7d";ctx.fillRect(x-12,y-17,24*e.hp/e.maxHp,4);if(e.rootUntil>s.tick||e.slowUntil>s.tick){ctx.strokeStyle="#93d0f0";ctx.beginPath();ctx.arc(x,y,14,0,Math.PI*2);ctx.stroke();}}
  for(const fx of s.effects){if(fx.until<=s.tick)continue;const alpha=(fx.until-s.tick)/7;ctx.globalAlpha=Math.min(1,alpha*.6);ctx.strokeStyle=fx.color;ctx.lineWidth=4;ctx.beginPath();ctx.arc(fx.x,fx.y,fx.r*(1.2-alpha*.4),0,Math.PI*2);ctx.stroke();ctx.globalAlpha=alpha*.14;ctx.fillStyle=fx.color;ctx.fill();ctx.globalAlpha=1;}
 }
 function frame(now){
  const elapsed=last===null?0:Math.min(250,Math.max(0,now-last));last=now;
  if(speed&&game.state.phase==="active"&&!document.querySelector("dialog[open]")){accumulator+=elapsed*speed;while(accumulator>=game.tickMs&&game.state.phase==="active"){game.step();accumulator-=game.tickMs;}if(game.state.phase!=="active"){accumulator=0;notice(game.state.phase==="won"?"Victory! All 25 Gauntlet waves completed. Continue into endless survival.":game.state.phase==="lost"?"Defeat. Restart to try a new strategy.":"Wave complete. Prepare your next defense.");}}
  else accumulator=0;
  renderField();renderHud();requestAnimationFrame(frame);
 }
 document.addEventListener("visibilitychange",()=>{last=null;accumulator=0;});
 renderHud();requestAnimationFrame(frame);
}
boot(createEngine);
