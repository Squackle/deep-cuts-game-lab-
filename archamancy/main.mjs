import {createEngine} from './engine.mjs';
function boot(createEngine){
 const $=id=>document.getElementById(id), canvas=$("field"), ctx=canvas.getContext("2d");
 const colors={W:"#e5d4a2",U:"#77b9e6",B:"#ac8ac3",R:"#ed8b65",G:"#9bc889"};
 let game=createEngine(1), selected=null, speed=1, rallying=false, accumulator=0,last=null,lastEvent=-1;
 const buttons=[], choices={}, statEls={};
 const labels={damage:"Damage dealt",manaEarned:"Mana earned",farmMana:"Farm income",killMana:"Kill income",waveMana:"Wave rewards",spent:"Mana spent",refunds:"Resale refunds",kills:"Enemies defeated",leaks:"Enemies escaped",summoned:"Troops summoned",fallen:"Troops fallen"};
 const text=(el,value)=>{const s=String(value);if(el.textContent!==s)el.textContent=s;};
 const notice=s=>text($("notice"),s);
 function selectPad(id){selected=id;rallying=false;$("padSelect").value=id===null?"":String(id);renderHud();}
 for(const p of game.map.pads){
  const b=document.createElement("button");b.className="pad"+(p.bonus?" "+p.bonus:"");b.type="button";b.style.left=p.x/game.map.width*100+"%";b.style.top=p.y/game.map.height*100+"%";b.addEventListener("click",()=>selectPad(p.id));$("pads").append(b);buttons.push(b);
  const o=document.createElement("option");o.value=p.id;o.textContent="Pad "+(p.id+1)+(p.bonus==="spring"?" · Mana spring":p.bonus==="height"?" · High ground":"");$("padSelect").append(o);
 }
 $("padSelect").addEventListener("change",e=>selectPad(e.target.value===""?null:Number(e.target.value)));
 for(const [key,def] of Object.entries(game.roster)){
  const b=document.createElement("button");b.type="button";b.className="tower-choice";
  const stripe=document.createElement("span");stripe.className="stripe";stripe.style.background=colors[def.color];
  const body=document.createElement("span"),name=document.createElement("strong"),desc=document.createElement("small"),price=document.createElement("span");
  name.textContent=def.name;desc.textContent=def.role;body.append(name,desc);price.className="price";price.textContent=def.cost;b.append(stripe,body,price);
  b.addEventListener("click",()=>{if(game.command({type:"build",pad:selected,kind:key})){notice(def.name+" constructed.");renderHud();}else notice("Select an empty pad and make sure you have enough mana.");});
  $("buildMenu").append(b);choices[key]=b;
 }
 for(const [k,label] of Object.entries(labels)){const d=document.createElement("div"),l=document.createElement("span"),v=document.createElement("strong");d.className="stat";l.textContent=label;d.append(l,v);$("statistics").append(d);statEls[k]=v;}
 $("start").addEventListener("click",()=>{if(game.command({type:"wave"})){notice("Wave "+game.state.wave+" begins.");if(speed===0)setSpeed(1);renderHud();}});
 $("upgrade").addEventListener("click",()=>{if(game.command({type:"upgrade",pad:selected}))notice("Tower upgraded.");renderHud();});
 $("sell").addEventListener("click",()=>{if(game.command({type:"sell",pad:selected})){rallying=false;notice("Tower sold. Pad freed.");}renderHud();});
 $("rally").addEventListener("click",()=>{rallying=!rallying;notice(rallying?"Tap a road location within this tower’s rally range.":"Rally selection cancelled.");renderHud();});
 canvas.addEventListener("click",e=>{if(!rallying)return;const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*canvas.width/rect.width,y=(e.clientY-rect.top)*canvas.height/rect.height;if(game.command({type:"rally",pad:selected,x,y})){rallying=false;notice("Rally point moved.");}else notice("Choose a road position within the tower’s range.");renderHud();});
 function setSpeed(n){speed=n;accumulator=0;for(const b of document.querySelectorAll("[data-speed]"))b.setAttribute("aria-pressed",String(Number(b.dataset.speed)===n));}
 for(const b of document.querySelectorAll("[data-speed]"))b.addEventListener("click",()=>setSpeed(Number(b.dataset.speed)));
 $("restart").addEventListener("click",()=>{game=createEngine(1);selected=null;rallying=false;lastEvent=-1;setSpeed(1);$("padSelect").value="";notice("New run. Select a build pad.");renderHud();});
 function renderHud(){
  const s=game.state,terminal=s.phase==="won"||s.phase==="lost";
  text($("health"),s.health);text($("mana"),s.mana);text($("wave"),s.wave+" / "+game.waves.length);text($("enemies"),s.enemies.length+s.queue.length);text($("time"),Math.floor(s.tick/10)+"s");text($("phase"),s.phase==="won"?"VICTORY":s.phase==="lost"?"DEFEAT":s.phase==="ready"?"PREPARE":"IN COMBAT");
  text($("preview"),terminal?(s.phase==="won"?"The passage is secure.":"The fortress has fallen."):s.phase==="active"?"Remaining: "+(s.enemies.length+s.queue.length):game.waves[s.wave].map(x=>x.replace(":", " × ")).join(" · "));
  $("start").disabled=s.phase!=="ready";text($("start"),terminal?"Run finished":s.phase==="active"?"Wave in progress":"Start wave "+(s.wave+1));
  for(const p of game.map.pads){const b=buttons[p.id],t=s.towers[p.id],def=t?game.roster[t.kind]:null;b.classList.toggle("built",!!t);b.style.backgroundColor=t?colors[def.color]:"";b.setAttribute("aria-pressed",String(selected===p.id));b.setAttribute("aria-label","Pad "+(p.id+1)+(t?", "+def.name+", tier "+t.tier:p.bonus?", "+p.bonus:", empty"));text(b,t?def.color+t.tier:p.bonus==="spring"?"◆":p.bonus==="height"?"▲":"＋");}
  const pad=selected===null?null:game.map.pads[selected],t=pad?s.towers[selected]:null;
  text($("selection"),t?game.roster[t.kind].name:pad?"Build on pad "+(pad.id+1):"Select a build pad");
  text($("details"),t?"Tier "+t.tier+" · Invested "+t.paid+" mana · "+game.roster[t.kind].role:pad?(pad.bonus==="spring"?"Mana spring: doubles farm output.":pad.bonus==="height"?"High ground: +30 attack range.":"Ordinary building location."):"Select a pad on the field or in the menu.");
  $("buildMenu").hidden=!!t;$("towerActions").hidden=!t;
  if(t){const price=game.upgradeCost(t);text($("upgrade"),price===null?"Max tier":"Upgrade · "+price);$("upgrade").disabled=terminal||price===null||s.mana<price;text($("sell"),"Sell · +"+Math.floor(t.paid*.7));$("sell").disabled=terminal;$("rally").hidden=game.roster[t.kind].kind!=="troops";$("rally").disabled=terminal;$("rally").setAttribute("aria-pressed",String(rallying));text($("rally"),rallying?"Cancel rally":"Set rally point");}
  for(const [k,b] of Object.entries(choices))b.disabled=terminal||!pad||!!t||s.mana<game.roster[k].cost;
  for(const [k,el] of Object.entries(statEls))text(el,s.stats[k]);
  if(lastEvent!==s.sequence){lastEvent=s.sequence;const ol=$("eventLog");ol.replaceChildren();for(const e of s.events.slice(-12).reverse()){const li=document.createElement("li");li.textContent=(e.tick/10).toFixed(1)+"s · "+e.type+(e.amount!==undefined?" · "+e.amount+" mana":e.wave?" · wave "+e.wave:"");ol.append(li);}}
 }
 function renderField(){
  const s=game.state,{width:w,height:h,path,pads}=game.map;ctx.clearRect(0,0,w,h);
  ctx.fillStyle="#344a36";ctx.fillRect(0,0,w,h);
  // Deterministic temporary terrain texture; simulation never depends on rendering.
  for(let i=0;i<170;i++){const x=(i*137+61)%w,y=(i*79+23)%h;ctx.fillStyle=i%3?"#3e563d":"#2d412f";ctx.beginPath();ctx.ellipse(x,y,9+(i%5)*3,5+(i%4)*2,0,0,Math.PI*2);ctx.fill();}
  ctx.lineJoin="round";ctx.lineCap="round";ctx.beginPath();path.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle="#625941";ctx.lineWidth=50;ctx.stroke();ctx.strokeStyle="#b9a47a";ctx.lineWidth=38;ctx.stroke();ctx.setLineDash([10,22]);ctx.strokeStyle="#9e8c68";ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle="#d7cfab";ctx.font="bold 12px system-ui";ctx.fillText("ENTRY",10,83);ctx.fillText("FORTRESS",905,532);
  ctx.fillStyle="#776f5c";ctx.fillRect(970,455,30,70);ctx.fillStyle="#bbb295";ctx.fillRect(965,455,35,10);
  const t=selected===null?null:s.towers[selected],p=selected===null?null:pads[selected];
  if(p&&t){const r=game.roster[t.kind].range;if(r){ctx.fillStyle="#e8d7ae1a";ctx.strokeStyle="#f1db9e88";ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,r+(p.bonus==="height"&&game.roster[t.kind].kind!=="troops"?30:0),0,Math.PI*2);ctx.fill();ctx.stroke();}}
  for(const t of Object.values(s.towers)){const p=pads[t.id],def=game.roster[t.kind];if(def.kind==="troops"){const r=game.pointAt(t.rally);ctx.strokeStyle=colors[def.color];ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(r.x,r.y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=colors[def.color];ctx.fillRect(r.x-1,r.y-18,3,18);ctx.beginPath();ctx.moveTo(r.x,r.y-18);ctx.lineTo(r.x+14,r.y-13);ctx.lineTo(r.x,r.y-8);ctx.fill();}}
  for(const u of s.troops){const q=game.pointAt(u.progress),def=game.roster[s.towers[u.source].kind],offset=(u.id%5-2)*5;const x=q.x+offset,y=q.y+((u.id%3)-1)*8;ctx.fillStyle=colors[def.color];ctx.strokeStyle="#18241a";ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle="#14371d";ctx.fillRect(x-8,y-13,16,3);ctx.fillStyle="#8add91";ctx.fillRect(x-8,y-13,16*u.hp/u.maxHp,3);}
  for(const e of s.enemies){const q=game.pointAt(e.progress),x=q.x,y=q.y+(e.flying?-17:0);ctx.fillStyle=e.flying?"#e3d6b0":e.kind==="armored"?"#9d9e9d":e.kind==="runner"?"#e8ab75":"#bc6e5c";ctx.strokeStyle="#2e2520";ctx.lineWidth=2;ctx.beginPath();if(e.flying){ctx.moveTo(x,y-10);ctx.lineTo(x-12,y+7);ctx.lineTo(x+12,y+7);ctx.closePath();}else ctx.arc(x,y,e.kind==="armored"?12:9,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle="#4c2b27";ctx.fillRect(x-12,y-17,24,4);ctx.fillStyle="#e19a7d";ctx.fillRect(x-12,y-17,24*e.hp/e.maxHp,4);if(e.slowUntil>s.tick){ctx.strokeStyle="#93d0f0";ctx.beginPath();ctx.arc(x,y,14,0,Math.PI*2);ctx.stroke();}}
 }
 function frame(now){
  const elapsed=last===null?0:Math.min(250,Math.max(0,now-last));last=now;
  if(speed&&game.state.phase==="active"){accumulator+=elapsed*speed;while(accumulator>=game.tickMs&&game.state.phase==="active"){game.step();accumulator-=game.tickMs;}if(game.state.phase!=="active"){accumulator=0;notice(game.state.phase==="won"?"Victory! All five prototype waves completed.":game.state.phase==="lost"?"Defeat. Restart to try a new strategy.":"Wave complete. Prepare your next defense.");}}
  else accumulator=0;
  renderField();renderHud();requestAnimationFrame(frame);
 }
 document.addEventListener("visibilitychange",()=>{last=null;accumulator=0;});
 renderHud();requestAnimationFrame(frame);
}
boot(createEngine);
