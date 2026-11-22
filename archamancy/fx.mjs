// Visual feedback layer: reads engine events and health changes, draws short-lived effects.
// Purely cosmetic. It never changes the simulation.
export function createFx(ctx,{maxParticles=260}={}){
 const parts=[],texts=[],seenHp=new Map(),lastPos=new Map();let clock=0,lastSeq=0,shakeUntil=0,shakePower=0,flashUntil=0;
 const rnd=()=>Math.random();
 function burst(x,y,color,n=8,speed=1.6,life=420,size=2.6){for(let i=0;i<n&&parts.length<maxParticles;i++){const a=rnd()*Math.PI*2,v=speed*(.4+rnd());parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-.6,g:.05,born:clock,life:life*(.6+rnd()*.6),color,size:size*(.6+rnd()*.7)});}}
 function ring(x,y,color,r=30,life=380){parts.push({x,y,ring:r,born:clock,life,color});}
 function float(x,y,text,color,size=13,life=900){if(texts.length>40)texts.shift();texts.push({x,y,text,color,size,born:clock,life});}
 function shake(power,ms){shakePower=Math.max(shakePower,power);shakeUntil=Math.max(shakeUntil,clock+ms);}
 // Call once per frame before drawing. Returns UI cues for the HUD (banners, flashes).
 function update(game,now){
  clock=now;const s=game.state,cues=[];
  // Hit sparks where health dropped since the last frame; numbers only on bosses and titans to keep the field clean.
  const live=new Set();
  for(const e of s.enemies){live.add(e.id);const q=game.pointAt(e.progress),y=q.y-(e.flying?21:10);lastPos.set(e.id,{x:q.x,y,kind:e.kind});const prev=seenHp.get(e.id);
   if(prev!==undefined&&e.hp<prev){const def=game.types[e.kind];if(parts.length<maxParticles*.7)burst(q.x+(rnd()-.5)*8,y,"#ffe3a3",2,1.1,220,2);cues.push({type:"sound",name:"hit"});if(def.boss){const key="dmg"+e.id,t=texts.find(t=>t.key===key&&now-t.born<300);if(t){t.amount+=prev-e.hp;t.text="-"+t.amount.toLocaleString("en-US");}else{const f={x:q.x+(rnd()-.5)*16,y:y-28,text:"-"+(prev-e.hp).toLocaleString("en-US"),color:"#fff1cf",size:12,born:now,life:700,key,amount:prev-e.hp};texts.push(f);}}}
   seenHp.set(e.id,e.hp);}
  for(const id of seenHp.keys())if(!live.has(id))seenHp.delete(id);
  for(const ev of s.events){if(ev.seq<=lastSeq)continue;
   if(ev.type==="enemyKilled"){const p=lastPos.get(ev.id);if(p){const def=game.types[p.kind];burst(p.x,p.y,def.boss?"#f6c45b":"#d9d2bf",def.boss?26:9,def.boss?2.6:1.5,def.boss?800:450,def.boss?3.6:2.4);float(p.x,p.y-14,"+"+def.reward,"#f2cf6b",def.boss?16:11,800);cues.push({type:"sound",name:def.boss&&p.kind!=="titan"?"bossDown":"kill"});if(def.boss&&p.kind!=="titan"){shake(7,450);cues.push({type:"banner",title:def.name+" falls!",sub:"",tone:"win"});}}}
   else if(ev.type==="leak"){const p=lastPos.get(ev.id),boss=p&&game.types[p.kind].boss;shake(boss?9:4,boss?420:220);flashUntil=now+260;cues.push({type:"leak",amount:boss?3:1},{type:"sound",name:"leak"});if(p)ring(950,483,"#f06b5b",44,500);}
   else if(ev.type==="waveStart"){const spec=game.waveSpec(ev.wave),boss=spec.map(x=>x.split(":")[0]).find(k=>game.types[k].boss&&k!=="titan");const fliers=spec.some(x=>game.types[x.split(":")[0]]?.flying);cues.push({type:"banner",title:"Wave "+ev.wave,sub:boss?"Boss: "+game.types[boss].name:fliers?"Flyers incoming · ground-only towers can’t hit them":ev.early?"Called early · +"+ev.bonus+" mana":"",tone:boss?"boss":"wave"},{type:"sound",name:boss?"boss":"wave"});if(boss)shake(5,500);}
   else if(ev.type==="build"||ev.type==="upgrade"){const p=game.map.pads[ev.pad];if(p){ring(p.x,p.y,"#f2db9e",ev.type==="upgrade"?40:32,450);burst(p.x,p.y+4,"#b7a17b",12,1.8,500,3);if(ev.type==="upgrade")burst(p.x,p.y-30,"#fff1cf",10,1.4,600,2.4);}cues.push({type:"sound",name:ev.type});}
   else if(ev.type==="bossSmash"){const p=lastPos.get(ev.id);if(p)ring(p.x,p.y+8,"#e0573f",36,320);shake(2.5,140);cues.push({type:"sound",name:"smash"});}
   else if(ev.type==="towerAttack"){const t=s.towers[ev.source],k=t&&game.roster[t.kind]?.kind;if(k)cues.push({type:"sound",name:"shot_"+k});}
   else if(ev.type==="sell")cues.push({type:"sound",name:"sell"});
   else if(ev.type==="spellCast")cues.push({type:"sound",name:"cast"});
   else if(ev.type==="gameOver")cues.push({type:"gameOver",won:!!ev.won,stars:ev.stars||0},{type:"sound",name:ev.won?"victory":"defeat"});
   else if(ev.type==="deathExplosion"){/* drawn by engine effects already */}
   else if(ev.type==="bossAbility"){const names={warcry:"War cry! Nearby enemies speed up",brood:"The Matron births Shade Stalkers",silenceWarning:"The Hierophant marks two towers",silence:"Towers silenced!",phaseWarning:"The Tyrant is shifting",phase:"The Tyrant becomes "+(ev.phase==="iron"?"immune to physical damage":"immune to magic")};if(names[ev.ability])cues.push({type:"toast",text:names[ev.ability]},{type:"sound",name:"ability"});if(ev.ability==="silence"||ev.ability==="phase")shake(4,260);}
   else if(ev.type==="commanderFall")cues.push({type:"toast",text:"Your commander has fallen. Returning soon."});
  }
  lastSeq=s.sequence;
  for(const id of lastPos.keys())if(!live.has(id)&&!s.events.some(e=>e.id===id))lastPos.delete(id);
  return cues;
 }
 function offset(now){if(now>shakeUntil)return {x:0,y:0};const k=(shakeUntil-now)/300,p=shakePower*Math.min(1,k);return {x:(rnd()-.5)*p,y:(rnd()-.5)*p};}
 // Drifting fireflies over the forest, for a living map.
 const motes=Array.from({length:22},(_,i)=>({x:(i*397)%1000,y:(i*233)%600,p:i*1.7,s:.6+(i%5)*.15}));
 function ambient(now){const t=now/1000;for(const m of motes){const x=(m.x+Math.sin(t*.3*m.s+m.p)*40+t*6*m.s)%1000,y=m.y+Math.cos(t*.4*m.s+m.p)*25,a=.25+.35*Math.max(0,Math.sin(t*1.3+m.p));ctx.globalAlpha=a;ctx.fillStyle="#f6f0a8";ctx.beginPath();ctx.arc(x,y,1.8,0,Math.PI*2);ctx.fill();ctx.globalAlpha=a*.25;ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
 function draw(now){
  for(let i=parts.length-1;i>=0;i--){const p=parts[i],t=(now-p.born)/p.life;if(t>=1){parts.splice(i,1);continue;}
   if(p.ring){ctx.globalAlpha=(1-t)*.8;ctx.strokeStyle=p.color;ctx.lineWidth=3*(1-t)+1;ctx.beginPath();ctx.ellipse(p.x,p.y,p.ring*(.4+t*.8),p.ring*(.4+t*.8)*.6,0,0,Math.PI*2);ctx.stroke();continue;}
   const age=now-p.born;const x=p.x+p.vx*age/16,y=p.y+p.vy*age/16+p.g*(age/16)**2/2;ctx.globalAlpha=1-t;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(x,y,p.size*(1-t*.5),0,Math.PI*2);ctx.fill();}
  ctx.textAlign="center";
  for(let i=texts.length-1;i>=0;i--){const f=texts[i],t=(now-f.born)/f.life;if(t>=1){texts.splice(i,1);continue;}const y=f.y-t*26;ctx.globalAlpha=t<.7?1:(1-t)/.3;ctx.font="800 "+f.size+"px system-ui";ctx.lineWidth=3;ctx.strokeStyle="#0b130f";ctx.strokeText(f.text,f.x,y);ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,y);}
  ctx.textAlign="start";ctx.globalAlpha=1;
  if(now<flashUntil){ctx.globalAlpha=(flashUntil-now)/260*.25;ctx.fillStyle="#c0392b";ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.globalAlpha=1;}
 }
 function reset(){parts.length=0;texts.length=0;seenHp.clear();lastPos.clear();lastSeq=0;shakeUntil=0;flashUntil=0;}
 return {update,draw,ambient,offset,reset,sync:game=>{lastSeq=game.state.sequence;}};
}
