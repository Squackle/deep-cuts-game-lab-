// ARCHAMANCY deterministic foundation. No DOM, wall clock, or external imports.
export function createEngine(seed=1){
 const W=1000,H=600, tickMs=100;
 const path=[[0,110],[875,110],[875,300],[125,300],[125,490],[1000,490]];
 const lengths=path.slice(1).map((p,i)=>Math.abs(p[0]-path[i][0])+Math.abs(p[1]-path[i][1]));
 const distance=lengths.reduce((a,b)=>a+b,0);
 const pads=[];
 for(const y of [47,175,235,365,425,553])for(const x of [220,400,580,760])pads.push({id:pads.length,x,y,bonus:pads.length===20?"spring":pads.length===7?"height":null});
 const roster={
 legion:{name:"Legion Hall",color:"W",cost:95,role:"Soldiers block and fight ground enemies.",range:150,interval:15,kind:"troops",cap:3,hp:45,damage:8},
 arcanum:{name:"Arcanum",color:"U",cost:100,role:"Magical attack slows ground and flying enemies.",range:165,interval:10,kind:"arcane",damage:16},
 necropolis:{name:"Necropolis",color:"B",cost:105,role:"Fragile undead swarm; replaces casualties quickly.",range:150,interval:9,kind:"troops",cap:4,hp:25,damage:6},
 pyre:{name:"Pyre Battery",color:"R",cost:125,role:"Physical splash damage against ground targets.",range:178,interval:17,kind:"splash",damage:32},
 grove:{name:"Mana Grove",color:"G",cost:85,role:"Produces mana during active waves; upgrades improve income.",range:0,interval:20,kind:"farm",income:5}
 };
 const types={raider:{hp:38,speed:12,armor:0,resist:0,reward:9,attack:6},runner:{hp:27,speed:19,armor:0,resist:0,reward:10,attack:5},armored:{hp:95,speed:8,armor:45,resist:5,reward:16,attack:12},wing:{hp:42,speed:16,armor:0,resist:15,reward:12,attack:0,flying:true}};
 const waves=[["raider:10"],["raider:12","runner:6"],["armored:7","raider:12"],["wing:9","runner:12"],["armored:12","wing:10","raider:12"]];
 const stats={damage:0,manaEarned:0,farmMana:0,killMana:0,waveMana:0,spent:0,refunds:0,kills:0,leaks:0,summoned:0,fallen:0,casts:0};
 const state={seed:seed>>>0,rng:seed>>>0||1,tick:0,wave:0,phase:"ready",mana:350,health:20,towers:{},enemies:[],troops:[],queue:[],nextSpawn:0,nextId:1,stats,events:[],sequence:0,commands:[]};
 function rand(){let x=state.rng;x^=x<<13;x^=x>>>17;x^=x<<5;state.rng=x>>>0;return state.rng;}
 function pointAt(n){let p=Math.max(0,Math.min(distance,n));for(let i=0;i<lengths.length;i++){if(p<=lengths[i]){const [x,y]=path[i], [a,b]=path[i+1];return {x:x+Math.sign(a-x)*p,y:y+Math.sign(b-y)*p};}p-=lengths[i];}return {x:1000,y:490};}
 function nearestPath(x,y){let best=Infinity,result=0,travel=0;for(let i=0;i<lengths.length;i++){const [a,b]=path[i], [c,d]=path[i+1],l=lengths[i];let t=Math.max(0,Math.min(l,(x-a)*Math.sign(c-a)+(y-b)*Math.sign(d-b)));const q=pointAt(travel+t),dd=(q.x-x)**2+(q.y-y)**2;if(dd<best){best=dd;result=travel+t;}travel+=l;}return result;}
 const d2=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;
 function emit(type,data={}){state.events.push({seq:++state.sequence,tick:state.tick,type,...data});if(state.events.length>160)state.events.shift();}
 function earn(amount,why,tower){state.mana+=amount;stats.manaEarned+=amount;stats[why+"Mana"]+=amount;if(tower)tower.mana+=amount;emit("mana",{amount,why,tower:tower?.id??null});}
 function spend(amount){if(state.mana<amount)return false;state.mana-=amount;stats.spent+=amount;return true;}
 function upgradeCost(t){return t.tier>=3?null:Math.floor(roster[t.kind].cost*(t.tier===1?1.15:1.9));}
 function startWave(){state.wave++;state.phase="active";state.queue=waves[state.wave-1].flatMap(s=>{const [k,n]=s.split(":");return Array(Number(n)).fill(k);});
 // Seeded shuffle: the wave composition remains predictable, exact ordering is reproducible.
 for(let i=state.queue.length-1;i>0;i--){const j=rand()%(i+1);[state.queue[i],state.queue[j]]=[state.queue[j],state.queue[i]];}
 state.nextSpawn=state.tick+1;emit("waveStart",{wave:state.wave});}
 function command(c){
 if(!c||typeof c!=="object"||!["ready","active"].includes(state.phase))return false;
 let ok=false;const p=Number.isInteger(c.pad)?pads[c.pad]:null,t=p?state.towers[p.id]:null;
 if(c.type==="wave"&&state.phase==="ready"&&state.wave<waves.length){startWave();ok=true;}
 if(c.type==="build"&&p&&!t&&Object.hasOwn(roster,c.kind)){const def=roster[c.kind];if(spend(def.cost)){state.towers[p.id]={id:p.id,kind:c.kind,tier:1,paid:def.cost,next:state.tick+1,rally:nearestPath(p.x,p.y),mana:0,damage:0,summons:0};emit("build",{pad:p.id,kind:c.kind});ok=true;}}
 if(c.type==="upgrade"&&t){const price=upgradeCost(t);if(price!==null&&spend(price)){t.paid+=price;t.tier++;emit("upgrade",{pad:t.id,tier:t.tier});ok=true;}}
 if(c.type==="sell"&&t){const amount=Math.floor(t.paid*.7);state.mana+=amount;stats.refunds+=amount;delete state.towers[p.id];state.troops=state.troops.filter(u=>u.source!==p.id);emit("sell",{pad:p.id,amount});ok=true;}
 if(c.type==="rally"&&t&&roster[t.kind].kind==="troops"&&Number.isFinite(c.x)&&Number.isFinite(c.y)){const pos=nearestPath(c.x,c.y);if(d2(pointAt(pos),p)<=roster[t.kind].range**2){t.rally=pos;emit("rally",{pad:p.id,progress:pos});ok=true;}}
 if(ok)state.commands.push({tick:state.tick,command:JSON.parse(JSON.stringify(c))});return ok;
 }
 function hurt(e,raw,magic,source){if(e.hp<=0)return;const n=Math.min(e.hp,Math.max(1,Math.floor(raw*(100-(magic?e.resist:e.armor))/100)));e.hp-=n;stats.damage+=n;if(source)source.damage+=n;if(e.hp===0){stats.kills++;earn(e.reward,"kill");emit("enemyKilled",{id:e.id,source:source?.id??null});}}
 function enemyPos(e){return pointAt(e.progress);}
 function step(){
 if(state.phase!=="active")return;
 state.tick++;
 if(state.queue.length&&state.tick>=state.nextSpawn){const kind=state.queue.shift(),def=types[kind];state.enemies.push({id:state.nextId++,kind,...def,maxHp:def.hp,progress:0,slowUntil:0,nextAttack:0});state.nextSpawn=state.tick+7;}
 for(const t of Object.values(state.towers)){
 const def=roster[t.kind],p=pads[t.id];if(state.tick<t.next)continue;
 if(def.kind==="farm"){earn(def.income*[1,3,7][t.tier-1]*(p.bonus==="spring"?2:1),"farm",t);t.next=state.tick+def.interval;continue;}
 if(def.kind==="troops"){const own=state.troops.filter(u=>u.source===t.id&&u.hp>0);if(own.length<def.cap+t.tier-1){const hp=def.hp+10*(t.tier-1);state.troops.push({id:state.nextId++,source:t.id,hp,maxHp:hp,progress:t.rally,next:state.tick+5,damage:def.damage+4*(t.tier-1)});stats.summoned++;t.summons++;emit("summon",{source:t.id});}t.next=state.tick+def.interval;continue;}
 const range=def.range+(p.bonus==="height"?30:0);
 const target=state.enemies.filter(e=>e.hp>0&&(def.kind!=="splash"||!e.flying)&&d2(enemyPos(e),p)<=range**2).sort((a,b)=>b.progress-a.progress||a.id-b.id)[0];
 if(!target)continue;
 const damage=def.damage+Math.floor(def.damage*.7)*(t.tier-1);
 if(def.kind==="arcane"){hurt(target,damage,true,t);target.slowUntil=state.tick+10;}
 else for(const e of state.enemies)if(!e.flying&&e.hp>0&&d2(enemyPos(target),enemyPos(e))<=55**2)hurt(e,damage,false,t);
 t.next=state.tick+def.interval;emit("towerAttack",{source:t.id,target:target.id});
 }
 const blocked=new Set();
 for(const u of state.troops){
 if(u.hp<=0)continue;const t=state.towers[u.source];if(!t)continue;
 const diff=t.rally-u.progress;u.progress+=Math.sign(diff)*Math.min(10,Math.abs(diff));
 const e=state.enemies.filter(e=>e.hp>0&&!e.flying&&!blocked.has(e.id)&&Math.abs(e.progress-u.progress)<=28).sort((a,b)=>b.progress-a.progress||a.id-b.id)[0];
 if(!e)continue;blocked.add(e.id);
 if(state.tick>=u.next){hurt(e,u.damage,false,t);u.next=state.tick+8;}
 if(e.hp>0&&state.tick>=e.nextAttack){u.hp=Math.max(0,u.hp-e.attack);e.nextAttack=state.tick+10;if(!u.hp){stats.fallen++;emit("creatureDeath",{source:u.source,id:u.id});}}
 }
 for(const e of state.enemies){if(e.hp<=0)continue;if(!blocked.has(e.id))e.progress+=e.slowUntil>state.tick?Math.max(1,Math.floor(e.speed/2)):e.speed;if(e.progress>=distance){state.health=Math.max(0,state.health-1);stats.leaks++;e.escaped=true;emit("leak",{id:e.id});}}
 state.troops=state.troops.filter(u=>u.hp>0);state.enemies=state.enemies.filter(e=>e.hp>0&&!e.escaped);
 if(state.health<=0){state.phase="lost";emit("gameOver",{won:false});return;}
 if(!state.queue.length&&!state.enemies.length){earn(35+state.wave*10,"wave");emit("waveComplete",{wave:state.wave});state.phase=state.wave===waves.length?"won":"ready";if(state.phase==="won")emit("gameOver",{won:true});}
 }
 return {state,map:{width:W,height:H,path,pads,distance},roster,types,waves,pointAt,nearestPath,upgradeCost,command,step,tickMs};
}
