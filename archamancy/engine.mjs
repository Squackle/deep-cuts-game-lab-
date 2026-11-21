// ARCHAMANCY beta simulation: fixed ticks, original data-driven rules, DOM independent.
export function createEngine(seed=1,mode="campaign"){
 const W=1000,H=600,tickMs=100,path=[[0,110],[875,110],[875,300],[125,300],[125,490],[1000,490]],lengths=path.slice(1).map((p,i)=>Math.abs(p[0]-path[i][0])+Math.abs(p[1]-path[i][1])),distance=lengths.reduce((a,b)=>a+b,0);
 const pads=[];for(const y of [47,175,235,365,425,553])for(const x of [220,400,580,760])pads.push({id:pads.length,x,y,bonus:pads.length===20?"spring":pads.length===7?"height":null});
 const roster={};
 function tower(id,name,color,cost,kind,range,interval,damage,role,more={}){roster[id]={name,color,cost,kind,range,interval,damage,role,...more};}
 tower("legion","Legion Hall","W",95,"troops",150,15,8,"Armored soldiers block the road.",{cap:3,hp:70});
 tower("chapel","Dawn Chapel","W",105,"heal",170,12,12,"Heals and wards nearby troops.");
 tower("judgment","Judgment Spire","W",120,"strike",200,12,28,"Long-range physical strikes ignore half armor.");
 tower("arcanum","Arcanum","U",100,"arcane",165,10,16,"Magic slows ground and flying enemies.");
 tower("library","Arcane Library","U",110,"draw",0,95,0,"Draws cards during battle when hand has room.");
 tower("mirror","Mirrorworks","U",130,"mirror",165,18,16,"Copies a nearby offensive tower's basic attack power.");
 tower("necropolis","Necropolis","B",105,"troops",150,9,6,"Rapid undead reinforcements; death triggers.",{cap:4,hp:32});
 tower("foundry","Soul Foundry","B",100,"soul",180,45,0,"Nearby deaths earn mana; periodically sacrifices a weak troop.");
 tower("hex","Hex Sanctum","B",105,"hex",175,12,12,"Curses enemies to receive extra damage.");
 tower("pyre","Pyre Battery","R",125,"splash",178,17,32,"Physical blast against groups of ground enemies.");
 tower("goblin","Goblin Warcamp","R",90,"troops",160,8,10,"Fast, fragile goblin fighters.",{cap:4,hp:30});
 tower("storm","Storm Engine","R",135,"chain",190,18,25,"Lightning jumps across nearby enemies.");
 tower("grove","Mana Grove","G",85,"farm",0,20,0,"Passive mana income with a fixed per-wave harvest budget.",{income:3});
 tower("beast","Beast Den","G",150,"troops",180,24,25,"Durable beasts with growing attack power.",{cap:2,hp:160});
 tower("thorn","Thornheart","G",115,"root",155,14,18,"Roots grounded enemies while dealing damage.");
 const types={raider:{hp:38,speed:12,armor:0,resist:0,reward:9,attack:6},runner:{hp:27,speed:19,armor:0,resist:0,reward:10,attack:5},armored:{hp:95,speed:8,armor:45,resist:5,reward:16,attack:12},wing:{hp:42,speed:16,armor:0,resist:15,reward:12,attack:0,flying:true},mage:{hp:62,speed:11,armor:5,resist:45,reward:15,attack:18},regen:{hp:120,speed:9,armor:10,resist:15,reward:20,attack:15,regen:2},titan:{hp:650,speed:5,armor:30,resist:25,reward:120,attack:45,boss:true}};
 const initial=[["raider:10"],["raider:12","runner:6"],["armored:7","raider:12"],["wing:9","runner:12"],["armored:12","wing:10","raider:12"]];
 function waveSpec(n){if(n<=5)return initial[n-1];const a=["raider:"+Math.min(28,8+n),"runner:"+Math.min(20,3+Math.floor(n/2)),"armored:"+Math.min(16,Math.floor(n/2)),"wing:"+Math.min(15,Math.floor(n/3)+2)];if(n>=7)a.push("mage:"+Math.min(12,Math.floor(n/4)));if(n>=10)a.push("regen:"+Math.min(12,Math.floor(n/5)));if(n>=15){a[2]="armored:"+Math.min(30,Math.floor(n*.8));a[3]="wing:"+Math.min(28,Math.floor(n*.65));}if(n%5===0)a.push("titan:"+Math.min(8,Math.floor(n/7)+1));return a;}
 const waves=Array.from({length:25},(_,i)=>waveSpec(i+1));
 const cards={};
 function card(id,name,color,cost,target,desc){cards[id]={name,color,cost,target,desc};}
 card("legion","Call the Legion","W",35,"tower","Summon 2 extra troops at a troop tower.");
 card("ward","Guardian's Ward","W",25,"tower","Shield troops near a tower and heal 40 HP.");
 card("twins","Twin Battalion","W",60,"tower","Enchant a troop tower to spawn twins.");
 card("valor","Crown of Valor","W",65,"tower","Troops gain permanent power on this tower's future summons.");
 card("inquiry","Arcane Inquiry","U",18,"none","Draw two cards, up to hand capacity.");
 card("echo","Echo Spell","U",30,"none","Copy the next eligible targeted instant.");
 card("freeze","Frozen Moment","U",44,"ground","Freeze enemies near a chosen point.");
 card("reset","Temporal Reset","U",30,"tower","Reset a tower's cooldown.");
 card("raise","Raise the Fallen","B",48,"tower","Return up to three fallen troops from this tower once.");
 card("offering","Soul Offering","B",0,"tower","Sacrifice a troop to generate mana.");
 card("recall","Grave Recall","B",35,"none","Return most recent eligible discarded card.");
 card("funeral","Funeral Pact","B",55,"tower","Enchant a troop tower: deaths explode.");
 card("meteor","Meteorfall","R",70,"ground","Deal 150 magical damage in an area.");
 card("flame","Funeral Flame","R",35,"ground","Burn enemies for 5.5 seconds.");
 card("cascade","Arcane Cascade","R",85,"ground","Magic blast grows with spells cast this wave.");
 card("wild","Wild Growth","G",45,"tower","Improve farm income by 10% (up to 30%), or troop/attack power.");
 card("root","Rootbound","G",28,"ground","Root ground enemies in a large area.");
 card("bloom","Titan Bloom","G",60,"tower","Summon one mighty beast from a troop tower.");
 card("resonance","Resonance Core","C",80,"tower","Double this tower's eligible death triggers.");
 card("matrix","Replication Matrix","C",65,"tower","Double eligible attack output for 8 seconds.");
 card("forge","Construct Forge","C",55,"tower","Enchant a troop tower to raise tougher constructs.");
 const defaultDeck=["meteor","wild","legion","inquiry","funeral","offering","twins","echo","freeze","raise","resonance","reset","cascade","ward","root","recall","matrix","forge","valor","bloom","flame","meteor","wild","legion","inquiry","funeral","offering","twins","echo","freeze"];
 const stats={damage:0,manaEarned:0,farmMana:0,killMana:0,waveMana:0,earlyMana:0,earlyCalls:0,soulMana:0,spellMana:0,sandboxMana:0,spent:0,refunds:0,kills:0,leaks:0,summoned:0,fallen:0,casts:0,draws:0,triggers:0,healing:0,control:0};
 const state={initialMode:["campaign","endless","sandbox"].includes(mode)?mode:"campaign",seed:seed>>>0,rng:seed>>>0||1,mode:["campaign","endless","sandbox"].includes(mode)?mode:"campaign",tick:0,wave:0,phase:"ready",mana:350,health:20,towers:{},enemies:[],troops:[],queue:[],nextSpawn:0,nextId:1,stats,events:[],sequence:0,commands:[],library:[],hand:[],discard:[],deck:defaultDeck.slice(),echo:false,storm:0,fallen:[],waveHistory:[],towerHistory:[], farmPaid:{}, pendingWaves:[], lastWaveTick:0, bonusDeadline:0, lastWaveSpawned:false, waveCalls:[], enemyKills:{}, enemyLeaks:{}, cardCasts:{}, effects:[], projectiles:[]};
 const d2=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;
 function rand(){let x=state.rng;x^=x<<13;x^=x>>>17;x^=x<<5;return state.rng=x>>>0;}
 function shuffle(a){for(let i=a.length-1;i>0;i--){const j=rand()%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
 function pointAt(n){let p=Math.max(0,Math.min(distance,n));for(let i=0;i<lengths.length;i++){if(p<=lengths[i]){const [x,y]=path[i],[a,b]=path[i+1];return {x:x+Math.sign(a-x)*p,y:y+Math.sign(b-y)*p};}p-=lengths[i];}return {x:1000,y:490};}
 function nearestPath(x,y){let best=Infinity,result=0,travel=0;for(let i=0;i<lengths.length;i++){const [a,b]=path[i],[c,d]=path[i+1],l=lengths[i],t=Math.max(0,Math.min(l,(x-a)*Math.sign(c-a)+(y-b)*Math.sign(d-b))),dd=d2(pointAt(travel+t),{x,y});if(dd<best){best=dd;result=travel+t;}travel+=l;}return result;}
 function emit(type,data={}){state.events.push({seq:++state.sequence,tick:state.tick,type,...data});if(state.events.length>200)state.events.shift();}
 function shot(kind,a,b){state.projectiles.push({kind,x:a.x,y:a.y,tx:b.x,ty:b.y,start:state.tick,duration:kind==="chain"||kind==="melee"?3:5});if(state.projectiles.length>240)state.projectiles.shift();}
 function effect(x,y,color,r=28){state.effects.push({x,y,color,r,until:state.tick+7});if(state.effects.length>100)state.effects.shift();}
 function earn(amount,why,t){state.mana+=amount;stats.manaEarned+=amount;stats[why+"Mana"]+=amount;if(t)t.mana+=amount;emit("mana",{amount,why,tower:t?.id??null});}
 function spend(amount){if(state.mana<amount)return false;state.mana-=amount;stats.spent+=amount;return true;}
 function draw(n=1){for(let i=0;i<n&&state.hand.length<5&&state.library.length;i++){state.hand.push(state.library.shift());stats.draws++;emit("draw",{card:state.hand.at(-1)});}}
 function resetDeck(deck){state.deck=deck.slice();state.library=shuffle(deck.slice());state.hand=[];state.discard=[];draw(4);}
 resetDeck(defaultDeck);
 function farmMultiplier(t){return (pads[t.id].bonus==="spring"?1.35:1)*(1+Math.min(3,t.growth)*.1);}
 function farmLimit(t){return Math.floor([22,65,165,400][t.tier-1]*farmMultiplier(t));}
 function farmBudget(t){return farmLimit(t)*Math.max(1,state.pendingWaves?.length||1);}
 function upgradeCost(t){return t.tier>=4?null:Math.floor(roster[t.kind].cost*[1.4,3.6,12][t.tier-1]);}
 function enemyPos(e){return pointAt(e.progress);}
 function scale(w){return Math.min(1e8,Math.round((1+Math.max(0,w-5)*.24)*Math.pow(1.12,Math.max(0,Math.min(w,25)-10))*Math.pow(1.18,Math.max(0,w-25))*100)/100);}
 function spawnEnemy(kind,w){const def=types[kind],hp=Math.ceil(def.hp*scale(w));state.enemies.push({id:state.nextId++,kind,...def,hp,maxHp:hp,attack:Math.ceil(def.attack*Math.sqrt(scale(w))),progress:0,slowUntil:0,rootUntil:0,curseUntil:0,burnUntil:0,nextAttack:0});}
 function canCallEarly(){return state.phase==="active"&&(state.mode!=="campaign"||state.wave<25)&&state.queue.length+state.enemies.length<3000;}
 function earlyBonus(){return canCallEarly()&&state.lastWaveSpawned?Math.max(0,Math.min(40,Math.ceil(40*(state.bonusDeadline-state.tick)/Math.max(1,state.bonusDeadline-state.lastWaveTick)))):0;}
 function earlySeconds(){return Math.max(0,Math.ceil((state.bonusDeadline-state.tick)/10));}
 function startWave(early=false){
 const bonus=early?earlyBonus():0;state.wave++;state.phase="active";
 const spacing=Math.max(2,7-Math.floor(state.wave/9));
 const next=shuffle(waveSpec(state.wave).flatMap(s=>{const [k,n]=s.split(":");return Array(Number(n)).fill(k).map(kind=>({kind,wave:state.wave}));}));
 next.forEach((v,i)=>v.due=state.tick+1+i*spacing);
 if(early){state.queue.push(...next);state.queue.sort((a,b)=>a.due-b.due||a.wave-b.wave);stats.earlyCalls++;if(bonus){earn(bonus,"early");}}
 else{state.queue=next;state.storm=0;state.farmPaid={};}
 state.pendingWaves=early?[...state.pendingWaves,state.wave]:[state.wave];
 state.early=early;state.lastWaveTick=state.tick;state.bonusDeadline=state.tick+Math.max(200,next.length*spacing+80);state.lastWaveSpawned=false;
 state.waveCalls.push({wave:state.wave,tick:state.tick,early,bonus});if(state.waveCalls.length>120)state.waveCalls.shift();
 draw();emit("waveStart",{wave:state.wave,early,bonus});
 }
 function hurt(e,raw,magic,t,pierce=false){if(e.hp<=0)return;const resistance=magic?e.resist:e.armor*(pierce?.5:1),n=Math.min(e.hp,Math.max(1,Math.floor(raw*(100-resistance)/100*(e.curseUntil>state.tick?1.35:1))));e.hp-=n;stats.damage+=n;if(t)t.damage+=n;if(e.hp===0){stats.kills++;state.enemyKills[e.kind]=(state.enemyKills[e.kind]||0)+1;earn(e.reward,"kill");emit("enemyKilled",{id:e.id,source:t?.id??null});}}
 function area(q,r){return state.enemies.filter(e=>e.hp>0&&d2(enemyPos(e),q)<=r*r);}
 function makeTroop(t,opts={}){if(state.troops.length>=220)return false;const def=roster[t.kind];if(def.kind!=="troops")return false;const hp=opts.hp??Math.round((def.hp+30*(t.tier-1))*(t.construct?1.6:1)),damage=opts.damage??(def.damage+5*(t.tier-1)+t.growth*4);state.troops.push({id:state.nextId++,source:t.id,sourceUid:t.uid,hp,maxHp:hp,progress:t.rally,next:state.tick+5,damage,revived:!!opts.revived,model:opts.model||(t.construct?"construct":t.kind),ward:0});stats.summoned++;t.summons++;emit("summon",{source:t.id});return true;}
 // A death is processed once; explosions can kill enemies but cannot cause more friendly deaths.
 // Provenance and per-tick entity caps keep the supported trigger graph finite.
 function die(u,sacrificed=false){if(u.dead)return;u.dead=true;u.hp=0;stats.fallen++;if(state.fallen.length>=200)state.fallen.shift();state.fallen.push({source:u.source,sourceUid:u.sourceUid,hp:u.maxHp,damage:u.damage,model:u.model,revived:u.revived});emit(sacrificed?"sacrifice":"creatureDeath",{source:u.source,id:u.id});const source=state.towers[u.source],q=pointAt(u.progress);if(!source)return;const mult=source.resonance?2:1;if(source.funeral){for(let i=0;i<mult;i++){for(const e of area(q,94))hurt(e,45+source.tier*8,true,source);stats.triggers++;}effect(q.x,q.y,"#c19be9",94);emit("deathExplosion",{source:source.id,count:mult});}for(const t of Object.values(state.towers))if(t.kind==="foundry"&&d2(pads[t.id],q)<=roster.foundry.range**2){earn((8+5*t.tier)*mult,"soul",t);stats.triggers+=mult;}}
 function allowedTarget(id,c){const spec=cards[id];if(!spec)return false;if(spec.target==="none"){if(id==="inquiry")return state.library.length>0;if(id==="echo")return !state.echo;if(id==="recall")return state.discard.some(k=>k!=="recall");return true;}if(spec.target==="ground")return state.phase==="active"&&Number.isFinite(c.x)&&Number.isFinite(c.y)&&c.x>=0&&c.y>=0&&c.x<=W&&c.y<=H;const t=Number.isInteger(c.pad)?state.towers[c.pad]:null;if(!t)return false;const troop=["legion","twins","valor","raise","offering","funeral","bloom","forge"];if(troop.includes(id)&&roster[t.kind].kind!=="troops")return false;if(id==="offering")return state.troops.some(u=>u.source===t.id&&u.hp>0&&!u.dead);if(id==="raise")return state.fallen.some(u=>u.sourceUid===t.uid&&!u.revived);if(id==="funeral")return !t.funeral;if(id==="twins")return !t.twins;if(id==="resonance")return !t.resonance;if(id==="forge")return !t.construct;if(id==="reset")return t.next>state.tick;return true;}
 function resolve(id,c,copied=false){const t=state.towers[c.pad],q={x:c.x,y:c.y};
  if(id==="legion"){makeTroop(t);makeTroop(t);}
  if(id==="ward"){for(const u of state.troops)if(u.hp>0&&d2(pointAt(u.progress),pads[t.id])<=180**2){const heal=Math.min(40,u.maxHp-u.hp);u.hp+=heal;u.ward=30;stats.healing+=heal;t.healing+=heal;}}
  if(id==="twins")t.twins=true;
  if(id==="valor"||id==="wild")t.growth++;
  if(id==="inquiry")draw(2);
  if(id==="echo")state.echo=true;
  if(id==="freeze"||id==="root"){for(const e of area(q,140)){if(id==="freeze"||!e.flying){e.rootUntil=Math.max(e.rootUntil,state.tick+(id==="freeze"?25:18));stats.control++;}}effect(q.x,q.y,"#88d2ec",140);}
  if(id==="reset")t.next=state.tick;
  if(id==="raise"){let n=0;state.fallen=state.fallen.filter(u=>{if(n<3&&u.sourceUid===t.uid&&!u.revived&&makeTroop(t,{hp:u.hp,damage:u.damage,model:u.model,revived:true})){n++;return false;}return true;});}
  if(id==="offering"){const u=state.troops.find(u=>u.source===t.id&&u.hp>0&&!u.dead);if(u){die(u,true);earn(28,"spell");}}
  if(id==="recall"){const i=state.discard.findLastIndex(k=>k!=="recall");if(i>=0&&state.hand.length<5)state.hand.push(state.discard.splice(i,1)[0]);}
  if(id==="funeral")t.funeral=true;
  if(id==="meteor"||id==="cascade"){for(const e of area(q,110))hurt(e,id==="meteor"?150:65+state.storm*40,true,null);effect(q.x,q.y,"#ffb66b",110);}
  if(id==="flame"){for(const e of area(q,125))e.burnUntil=state.tick+55;effect(q.x,q.y,"#f48656",125);}
  if(id==="bloom")makeTroop(t,{hp:350,damage:45+t.growth*4,model:"bloom"});
  if(id==="resonance")t.resonance=true;
  if(id==="matrix")t.matrixUntil=state.tick+80;
  if(id==="forge")t.construct=true;
  if(copied){stats.triggers++;emit("spellCopy",{card:id});}
 }
 function command(c){
 if(!c||typeof c!=="object")return false;
 const p=Number.isInteger(c.pad)?pads[c.pad]:null,t=p?state.towers[p.id]:null;
 let ok=false;
 if(c.type==="continue"&&state.phase==="won"){state.mode="endless";state.phase="ready";ok=true;}
 if(!["ready","active"].includes(state.phase)&&!ok)return false;
 if(c.type==="wave"&&state.phase==="ready"){startWave();ok=true;}
 if(c.type==="early"&&canCallEarly()){startWave(true);ok=true;}
 if(c.type==="build"&&p&&!t&&Object.hasOwn(roster,c.kind)&&spend(roster[c.kind].cost)){const d=roster[c.kind];state.towers[p.id]={id:p.id,uid:state.nextId++,kind:c.kind,tier:1,paid:d.cost,next:state.tick+1,rally:nearestPath(p.x,p.y),mana:0,damage:0,summons:0,healing:0,control:0,draws:0,growth:0,matrixUntil:0};emit("build",{pad:p.id,kind:c.kind});ok=true;}
 if(c.type==="upgrade"&&t){const n=upgradeCost(t);if(n!==null&&spend(n)){t.paid+=n;t.tier++;emit("upgrade",{pad:t.id,tier:t.tier});ok=true;}}
 if(c.type==="sell"&&t){const amount=Math.floor(t.paid*.7);state.mana+=amount;stats.refunds+=amount;state.towerHistory.push({...t,sold:true});delete state.towers[p.id];state.troops=state.troops.filter(u=>u.source!==p.id);emit("sell",{pad:p.id,amount});ok=true;}
 if(c.type==="rally"&&t&&roster[t.kind].kind==="troops"&&Number.isFinite(c.x)&&Number.isFinite(c.y)){const pos=nearestPath(c.x,c.y);if(d2(pointAt(pos),p)<=roster[t.kind].range**2){t.rally=pos;ok=true;}}
 if(c.type==="deck"&&state.wave===0&&state.phase==="ready"&&Array.isArray(c.deck)&&c.deck.length===30&&c.deck.every(k=>Object.hasOwn(cards,k))&&c.deck.every(k=>c.deck.filter(x=>x===k).length<=3)){resetDeck(c.deck);ok=true;}
 if(c.type==="cast"&&Number.isInteger(c.index)){const id=state.hand[c.index],spec=cards[id];if(spec&&allowedTarget(id,c)&&spend(spec.cost)){const copy=state.echo&&["meteor","flame","cascade","freeze","root","ward","legion"].includes(id);state.hand.splice(c.index,1);state.storm++;stats.casts++;state.cardCasts[id]=(state.cardCasts[id]||0)+1;emit("spellCast",{card:id});if(copy)state.echo=false;resolve(id,c);if(copy)resolve(id,c,true);state.discard.push(id);ok=true;}}
 if(c.type==="discard"&&Number.isInteger(c.index)&&state.hand[c.index]){state.discard.push(state.hand.splice(c.index,1)[0]);ok=true;}
 if(state.mode==="sandbox"){
  if(c.type==="sandboxMana"&&Number.isInteger(c.amount)&&c.amount>0&&c.amount<=1000000){earn(c.amount,"sandbox");ok=true;}
  if(c.type==="sandboxCard"&&Object.hasOwn(cards,c.card)&&state.hand.length<5){state.hand.push(c.card);ok=true;}
  if(c.type==="sandboxEnemy"&&Object.hasOwn(types,c.enemy)&&Number.isInteger(c.count)&&c.count>0&&c.count<=50&&state.enemies.length+c.count<=300){if(state.phase==="ready"){state.phase="active";state.early=true;}for(let i=0;i<c.count;i++){spawnEnemy(c.enemy,Math.max(1,state.wave));state.enemies.at(-1).progress=i*15;}ok=true;}
  if(c.type==="sandboxClear"){state.enemies=[];state.queue=[];state.pendingWaves=[];state.phase="ready";ok=true;}
  if(c.type==="sandboxHeal"){state.health=20;ok=true;}
 }
 if(ok){state.commands.push({tick:state.tick,command:JSON.parse(JSON.stringify(c))});if(state.commands.length>20000)state.commands.shift();}return ok;
 }
 function step(){
 if(state.phase!=="active")return;state.tick++;state.effects=state.effects.filter(e=>e.until>state.tick);state.projectiles=state.projectiles.filter(e=>e.start+e.duration>state.tick);
 for(let n=0;n<8&&state.queue.length&&state.queue[0].due<=state.tick;n++){const v=state.queue.shift();spawnEnemy(v.kind,v.wave);if(v.wave===state.wave)state.lastWaveSpawned=true;}
 for(const e of state.enemies){if(e.hp<=0)continue;if(e.regen&&state.tick%10===0)e.hp=Math.min(e.maxHp,e.hp+e.regen);if(e.burnUntil>state.tick&&state.tick%5===0)hurt(e,12,true,null);}
 for(const t of Object.values(state.towers)){
 const d=roster[t.kind],p=pads[t.id];if(state.tick<t.next)continue;
 const k=d.kind,tier=t.tier,range=d.range+(p.bonus==="height"?30:0),power=Math.round((d.damage+t.growth*6)*[1,1.8,3.3,8][tier-1])*(t.matrixUntil>state.tick?2:1);
 if(k==="farm"){const limit=farmBudget(t),paid=state.farmPaid[t.id]||0,rate=Math.floor([3,7,16,34][tier-1]*farmMultiplier(t));const n=Math.max(0,Math.min(rate,limit-paid));if(n){state.farmPaid[t.id]=paid+n;earn(n,"farm",t);}}
 else if(k==="draw"){const before=stats.draws;draw(tier>=3?2:1);t.draws+=stats.draws-before;}
 else if(k==="troops"){const n=state.troops.filter(u=>u.source===t.id&&u.hp>0).length,cap=d.cap+tier-1;for(let i=0;i<(t.twins?2:1)&&n+i<cap*(t.twins?2:1);i++)makeTroop(t);}
 else if(k==="heal"){for(const u of state.troops)if(u.hp>0&&d2(pointAt(u.progress),p)<=range**2){const h=Math.min(power,u.maxHp-u.hp);u.hp+=h;u.ward=Math.max(u.ward,tier*4);stats.healing+=h;t.healing+=h;if(h>0)shot("heal",{x:p.x,y:p.y-21},pointAt(u.progress));}}
 else if(k==="soul"){const u=state.troops.filter(u=>u.hp>0&&d2(pointAt(u.progress),p)<=range**2&&u.hp<=u.maxHp*.55).sort((a,b)=>a.hp-b.hp||a.id-b.id)[0];if(u)die(u,true);}
 else {
 const targets=state.enemies.filter(e=>e.hp>0&&((k!=="splash"&&k!=="root")||!e.flying)&&d2(enemyPos(e),p)<=range**2).sort((a,b)=>b.progress-a.progress||a.id-b.id),e=targets[0];if(!e)continue;const q=enemyPos(e);
 if(k==="arcane"){hurt(e,power,true,t);e.slowUntil=state.tick+12;t.control++;stats.control++;}
 if(k==="strike")hurt(e,power,false,t,true);
 if(k==="splash")for(const x of area(q,60+8*tier))if(!x.flying)hurt(x,power,false,t);
 if(k==="chain"){let n=0,from={x:p.x,y:p.y-28};for(const x of [e,...area(q,110).filter(x=>x.id!==e.id)]){if(n>=tier+2)break;const pos=enemyPos(x),to={x:pos.x,y:pos.y-(x.flying?21:8)};shot("chain",from,to);from=to;hurt(x,Math.max(1,Math.round(power*Math.pow(.78,n++))),true,t);}}
 if(k==="hex"){e.curseUntil=state.tick+35;hurt(e,power,true,t);}
 if(k==="root"){e.rootUntil=state.tick+7+tier*2;hurt(e,power,false,t);stats.control++;t.control++;}
 if(k==="mirror"){const other=Object.values(state.towers).filter(o=>["arcane","strike","splash","chain","hex","root"].includes(roster[o.kind].kind)&&d2(pads[o.id],p)<=200**2).sort((a,b)=>roster[b.kind].damage*b.tier-roster[a.kind].damage*a.tier||a.id-b.id)[0];hurt(e,other?Math.round(roster[other.kind].damage*other.tier*(.8+.35*tier)):power,true,t);if(other)stats.triggers++;}
 if(k!=="chain")shot(k,{x:p.x,y:p.y-28},{x:q.x,y:q.y-(e.flying?21:8)});effect(q.x,q.y,({W:"#f5df9e",U:"#76bdf1",B:"#ba8ad8",R:"#f7a564",G:"#8ed28e"})[d.color],k==="splash"?60:18);emit("towerAttack",{source:t.id,target:e.id});
 }
 t.next=state.tick+(k==="farm"?d.interval:Math.max(3,d.interval-(tier-1)*2));
 }
 const blocked=new Set();
 for(const u of state.troops){if(u.hp<=0)continue;const t=state.towers[u.source];if(!t)continue;const diff=t.rally-u.progress;u.progress+=Math.sign(diff)*Math.min(10,Math.abs(diff));const e=state.enemies.filter(e=>e.hp>0&&!e.flying&&!blocked.has(e.id)&&Math.abs(e.progress-u.progress)<=28).sort((a,b)=>b.progress-a.progress||a.id-b.id)[0];if(!e)continue;blocked.add(e.id);if(state.tick>=u.next){shot("melee",pointAt(u.progress),enemyPos(e));hurt(e,u.damage,false,t);u.next=state.tick+8;}if(e.hp>0&&state.tick>=e.nextAttack){const absorbed=Math.min(u.ward,e.attack);u.ward-=absorbed;u.hp=Math.max(0,u.hp-e.attack+absorbed);e.nextAttack=state.tick+10;if(!u.hp)die(u);}}
 for(const e of state.enemies){if(e.hp<=0)continue;if((!blocked.has(e.id)||e.boss)&&(e.rootUntil<=state.tick||e.boss)){const move=e.slowUntil>state.tick?Math.max(1,Math.floor(e.speed*(e.boss?.75:.5))):e.speed;e.progress+=e.boss&&blocked.has(e.id)?Math.max(1,Math.floor(move*.6)):move;}if(e.progress>=distance){state.health=Math.max(0,state.health-(e.boss?3:1));stats.leaks++;state.enemyLeaks[e.kind]=(state.enemyLeaks[e.kind]||0)+1;e.escaped=true;emit("leak",{id:e.id});}}
 state.troops=state.troops.filter(u=>u.hp>0);state.enemies=state.enemies.filter(e=>e.hp>0&&!e.escaped);
 if(state.health<=0){if(state.mode==="sandbox"){state.health=20;}else{state.phase="lost";emit("gameOver",{won:false});return;}}
 if(!state.queue.length&&!state.enemies.length){for(const wave of state.pendingWaves||[]){earn(35+wave*10,"wave");state.waveHistory.push({wave,tick:state.tick,mana:state.mana,health:state.health,damage:stats.damage,farmMana:stats.farmMana,spent:stats.spent,kills:stats.kills,leaks:stats.leaks,casts:stats.casts,overlap:state.pendingWaves.length>1});emit("waveComplete",{wave});}state.pendingWaves=[];state.phase=state.mode==="campaign"&&state.wave>=25?"won":"ready";}
 }
 function playtestReport(){
 const s=state;
 const counts=arr=>arr.reduce((acc,k)=>(acc[k]=(acc[k]||0)+1,acc),{});
 const tower=t=>({pad:t.id+1,kind:roster[t.kind].name,tier:t.tier,sold:!!t.sold,invested:t.paid,damage:t.damage,mana:t.mana,summons:t.summons,healing:t.healing,control:t.control,draws:t.draws,growth:t.growth,enchantments:["twins","funeral","resonance","construct"].filter(k=>t[k]),rally:roster[t.kind].kind==="troops"?Math.round(t.rally):undefined});
 return {game:"ARCHEMANCY",version:"0.1.0-beta.4",schema:1,seed:s.seed,initialMode:s.initialMode,mode:s.mode,wave:s.wave,phase:s.phase,simulationSeconds:s.tick/10,health:s.health,mana:s.mana,enemyHealthScale:scale(Math.max(1,s.wave)),stats:{...s.stats},enemyKills:{...s.enemyKills},enemyLeaks:{...s.enemyLeaks},remainingEnemies:counts(s.enemies.filter(e=>e.hp>0&&!e.escaped).map(e=>e.kind)),queuedEnemies:counts(s.queue.map(e=>e.kind)),cardCasts:{...s.cardCasts},spellbook:counts(s.deck),hand:s.hand.slice(),library:s.library.length,graveyard:counts(s.discard),echoArmed:s.echo,towers:Object.values(s.towers).map(tower),soldTowers:s.towerHistory.slice(-30).map(tower),soldTowerCount:s.towerHistory.length,waveHistory:s.waveHistory.slice(-60).map(w=>({...w})),completedWaveCount:s.waveHistory.length,waveCalls:s.waveCalls.map(w=>({...w})),pendingWaves:s.pendingWaves.slice()};
 }
 return {playtestReport,canCallEarly,earlyBonus,earlySeconds,farmLimit,farmBudget,scale,state,map:{width:W,height:H,path,pads,distance},roster,types,waves,waveSpec,cards,pointAt,nearestPath,upgradeCost,command,step,tickMs};
}
