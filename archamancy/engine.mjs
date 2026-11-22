// ARCHAMANCY beta simulation: fixed ticks, original data-driven rules, DOM independent.
export const VERSION="0.1.0-beta.12.3";
// Enemy health multiplier per difficulty. Gauntlet stars: 3 at 18+ fortress left, 2 at 10+, otherwise 1.
// Boss smash hits every ground troop in reach for 3× the boss attack.
export const SMASH=3;
export const DIFFICULTY={easy:.7,normal:1,hard:1.35};
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
 const branches={"legion":[["Knight Vanguard","Royal Paladins","Heavier troops with shields and stronger melee.",{"hp":0.65,"melee":0.25,"ward":16}],["Legion Swarm","Grand Battalion","Additional soldiers and faster reinforcement.",{"cap":2,"haste":0.22}]],"chapel":[["Divine Protection","Sanctuary of Dawn","Stronger healing and wards.",{"heal":0.4,"ward":14}],["Holy Retribution","Solar Judgment","Smite the foremost enemy during healing pulses.",{"smite":55}]],"judgment":[["Titan Slayer","Godpiercer","Bonus damage to Titans and armor, with full armor penetration.",{"boss":0.65,"pierce":1}],["Radiant Barrage","Crown of Arrows","Fire a second bolt at another leading enemy.",{"extra":1,"extraPower":0.55}]],"arcanum":[["Deep Freeze","Absolute Winter","Longer slows and short roots on targets.",{"slow":10,"root":4}],["Archmage","Aether Archon","More magical damage and range.",{"power":0.38,"range":25}]],"library":[["Grand Archivist","Infinite Archives","Draw faster; return a spent non-recursion spell when library is empty.",{"haste":0.4,"recycle":1}],["Chronomancer","Clockwork Athenaeum","Accelerate nearby tower cooldowns.",{"accelerate":5,"aura":150}]],"mirror":[["Endless Reflections","Hall of Echoes","Reflect attacks onto a second enemy.",{"extra":1,"extraPower":0.55}],["Spell Amplifier","Prismatic Nexus","Amplified copied damage and longer range.",{"power":0.45,"range":25}]],"necropolis":[["Undead Legion","Gravehost","More undead and faster respawning.",{"cap":2,"haste":0.25}],["Lich Citadel","Sepulchral Monarch","Innate death blasts; Blood Artist amplifies them.",{"death":30}]],"foundry":[["Soul Harvester","Soul Vault","Earn more mana from nearby deaths.",{"soul":0.35}],["Sacrificial Altar","Altar of the Void","Sacrifice more frequently; sacrifice releases a blast.",{"haste":0.35,"altar":75}]],"hex":[["Spreading Curse","Plague Cathedral","Curse and damage multiple enemies around the target.",{"spread":60}],["Doom Sigil","Final Omen","Higher damage and longer curse; extra damage against bosses.",{"power":0.3,"boss":0.35,"curse":25}]],"pyre":[["Inferno Cannon","Solar Furnace","Burn enemies caught in the blast.",{"burn":25}],["Siege Artillery","Worldbreaker","Larger explosions and greater armored-target damage.",{"radius":30,"armor":0.4}]],"goblin":[["Goblin Horde","Goblin King’s Warband","Larger, faster-spawning goblin horde.",{"cap":2,"haste":0.28}],["Bomb Brigade","Powderkeg Legion","Goblin deaths create explosive bursts.",{"death":35}]],"storm":[["Chain Tempest","Living Storm","More chain targets and wider jump radius.",{"chains":2,"radius":40}],["Thunderstrike","Heaven’s Hammer","Concentrated high damage and boss bonus.",{"power":0.45,"boss":0.35}]],"grove":[["Ancient Worldtree","Worldroot","Larger per-wave harvest budget.",{"farmCap":0.25}],["Mana Nexus","Leyline Convergence","Faster harvesting and modest extra capacity.",{"farmRate":0.65,"farmCap":0.08}]],"beast":[["Beast Pack","Primal Stampede","More beasts with rapid reinforcement.",{"cap":2,"haste":0.25}],["Colossal Titan","Ancient Behemoth","Massive beasts with greater health and damage.",{"hp":0.8,"melee":0.55,"giant":1}]],"thorn":[["Grasping Forest","Elder Wildwood","Roots spread around the target.",{"spread":65,"root":7}],["Venom Thicket","Nightshade Heart","Poisoned targets take repeated damage.",{"burn":40,"power":0.2}]]};
 function branchSpec(t){return t?.branch?branches[t.kind][t.branch==="A"?0:1]:null;}
 function bonus(t,k){const v=branchSpec(t)?.[3][k]||0;return v*(t.tier===4?1.6:1);}
 function branchName(t){const b=branchSpec(t);return b?b[t.tier===4?1:0]:roster[t.kind].name;}
 const types={raider:{hp:38,speed:12,armor:0,resist:0,reward:9,attack:6},runner:{hp:27,speed:19,armor:0,resist:0,reward:10,attack:5},armored:{hp:95,speed:8,armor:45,resist:5,reward:16,attack:12},wing:{hp:42,speed:16,armor:0,resist:15,reward:12,attack:0,flying:true},mage:{hp:62,speed:11,armor:5,resist:45,reward:15,attack:18},regen:{hp:120,speed:9,armor:10,resist:15,reward:20,attack:15,regen:2},titan:{hp:650,speed:5,armor:30,resist:25,reward:120,attack:45,boss:true},
  stalker:{hp:45,speed:16,armor:0,resist:10,reward:12,attack:6,shroud:true,name:"Shade Stalker",trait:"Shrouded: towers can only target it near a Judgment Spire, Hex Sanctum or your troops, or for 3 s after any damage reveals it."},
  warden:{hp:110,speed:9,armor:25,resist:100,reward:18,attack:14,name:"Spellward Warden",trait:"Immune to magic damage."},
  golem:{hp:150,speed:7,armor:100,resist:20,reward:20,attack:16,name:"Ironhide Golem",trait:"Immune to physical damage (Godpiercer still hurts it)."},
  grimgut:{hp:1300,speed:6,armor:25,resist:10,reward:150,attack:30,boss:true,ability:"warcry",name:"Grimgut, Raider King",trait:"Boss. Every 8 s, a war cry hastes nearby enemies for 3 s."},
  matron:{hp:1600,speed:6,armor:10,resist:35,reward:200,attack:30,boss:true,shroud:true,ability:"brood",name:"The Veiled Matron",trait:"Boss. Shrouded, and every 8 s she births two Shade Stalkers (up to 8)."},
  colossus:{hp:2200,speed:4,armor:100,resist:30,reward:260,attack:60,boss:true,name:"Ironclad Colossus",trait:"Boss. Immune to physical damage."},
  hierophant:{hp:2400,speed:5,armor:30,resist:100,reward:320,attack:45,boss:true,ability:"silence",name:"Spellbane Hierophant",trait:"Boss. Immune to magic. Every 10 s marks the two nearest towers, then silences them for 4 s."},
  tyrant:{hp:3200,speed:4,armor:40,resist:40,reward:500,attack:70,boss:true,ability:"phase",name:"The Hollow Tyrant",trait:"Final boss. Every 8 s, after a warning, swaps between physical immunity and magic immunity."}
 };
 for(const [k,t] of Object.entries(types))t.name=t.name||({raider:"Raider",runner:"Runner",armored:"Armored Brute",wing:"Carrion Wing",mage:"Hex Mage",regen:"Mossback Troll",titan:"Titan"})[k];
 // Hand-designed Gauntlet: traits arrive gradually, a named boss closes every fifth wave.
 const campaign=[
  "raider:10","raider:12 runner:6","armored:7 raider:12","wing:9 runner:12","raider:12 armored:8 wing:6 grimgut:1",
  "raider:14 runner:6 armored:3 wing:4 stalker:3","raider:15 runner:6 armored:3 wing:4 mage:1 stalker:3","raider:16 runner:7 armored:4 wing:4 mage:2 warden:2","raider:17 runner:7 armored:4 wing:5 mage:2 stalker:4 warden:2","raider:16 runner:8 armored:5 wing:5 mage:2 regen:2 titan:1 matron:1",
  "raider:19 runner:8 armored:5 wing:5 mage:2 regen:2 golem:2","raider:20 runner:9 armored:6 wing:6 mage:3 regen:2 stalker:4 warden:3","raider:21 runner:9 armored:6 wing:6 mage:3 regen:2 golem:3","raider:22 runner:10 armored:7 wing:6 mage:3 regen:2 stalker:5 warden:3 golem:2","raider:20 runner:10 armored:12 wing:9 mage:3 regen:3 titan:2 golem:3 colossus:1",
  "raider:24 runner:11 armored:12 wing:10 mage:4 regen:3 stalker:5 warden:4","raider:25 runner:11 armored:13 wing:11 mage:4 regen:3 golem:4 warden:4","raider:26 runner:12 armored:14 wing:11 mage:4 regen:3 stalker:6 golem:4","raider:27 runner:12 armored:15 wing:12 mage:4 regen:3 stalker:6 warden:5 golem:4","raider:26 runner:13 armored:16 wing:13 mage:5 regen:4 titan:2 warden:6 hierophant:1",
  "raider:28 runner:13 armored:16 wing:13 mage:5 regen:4 stalker:7 golem:5","raider:28 runner:14 armored:17 wing:14 mage:5 regen:4 warden:6 golem:5","raider:28 runner:14 armored:18 wing:14 mage:5 regen:4 stalker:8 warden:6 golem:5","raider:28 runner:15 armored:19 wing:15 mage:6 regen:4 stalker:8 warden:7 golem:6","raider:28 runner:15 armored:20 wing:16 mage:6 regen:5 titan:3 stalker:6 warden:6 golem:6 tyrant:1"
 ].map(w=>w.split(" "));
 const bossCycle=["grimgut","matron","colossus","hierophant","tyrant"];
 function waveSpec(n){if(!(n>=1))return [];if(n<=25)return campaign[n-1].slice();const a=["raider:28","runner:"+Math.min(20,3+Math.floor(n/2)),"armored:"+Math.min(30,Math.floor(n*.8)),"wing:"+Math.min(28,Math.floor(n*.65)),"mage:"+Math.min(12,Math.floor(n/4)),"regen:"+Math.min(12,Math.floor(n/5)),"stalker:"+Math.min(14,Math.floor(n/3)),"warden:"+Math.min(12,Math.floor(n/4)),"golem:"+Math.min(12,Math.floor(n/4))];if(n%5===0)a.push("titan:"+Math.min(8,Math.floor(n/7)+1),bossCycle[(n/5-1)%5]+":1");return a;}
 const waves=Array.from({length:25},(_,i)=>waveSpec(i+1));
 const cards={};
 function card(id,name,color,cost,target,desc){cards[id]={name,color,cost,target,desc};}
 card("legion","Raise the Alarm","W",35,"tower","Summon 2 extra troops at a troop tower.");
 card("ward","Make a Stand","W",25,"tower","Shield troops near a tower and heal 40 HP.");
 card("twins","Anointed Procession","W",60,"tower","Enchant a troop tower to spawn twins.");
 card("rally","Return to the Ranks","W",40,"tower","Return the two most recent fallen troops from any tower to this troop tower, warded.");
 card("valor","Intangible Virtue","W",65,"tower","Troops gain permanent power on this tower's future summons.");
 card("inquiry","Divination","U",18,"none","Draw two cards, up to hand capacity.");
 card("echo","Twincast","U",30,"none","Copy the next eligible targeted spell.");
 card("freeze","Sleep","U",44,"ground","Freeze enemies near a chosen point.");
 card("reflection","Rite of Replication","U",50,"tower","For 10 seconds an attacking tower also strikes a second leading enemy at 60% power.");
 card("reset","Twiddle","U",30,"tower","Reset a tower's cooldown.");
 card("raise","Animate Dead","B",48,"tower","Return up to three fallen troops from this tower once.");
 card("offering","Culling the Weak","B",0,"tower","Sacrifice a troop to generate mana.");
 card("recall","Grim Discovery","B",35,"none","Return most recent eligible discarded card.");
 card("funeral","Blood Artist","B",55,"tower","Enchant a troop tower: deaths explode.");
 card("deathmark","Deathmark","B",40,"ground","Mark enemies near a point for 10 seconds: +35% damage taken, 6 mana when each dies.");
 card("meteor","Fireball","R",70,"ground","Deal 150 magical damage in an area.");
 card("flame","Pyroclasm","R",35,"ground","Burn enemies for 5.5 seconds.");
 card("bloodrush","Temur Battle Rage","R",30,"tower","A troop tower's soldiers pay 15% of their health to attack twice as fast for 10 seconds.");
 card("lightning","Chain Lightning","R",50,"ground","Lightning leaps from the leading enemy near a point through up to 6 foes, 90 magical damage, fading 15% per jump.");
 card("cascade","Grapeshot","R",85,"ground","Magic blast grows with spells cast this wave.");
 card("wild","Wild Growth","G",45,"tower","Improve farm income by 10% (up to 30%), or troop/attack power.");
 card("root","Root Snare","G",28,"ground","Root ground enemies in a large area.");
 card("verdant","Parallel Lives","G",55,"tower","Copy up to 6 living troops of a troop tower as healthy tokens.");
 card("awaken","Seedborn Muse","G",70,"tower","For 15 seconds a non-farm, non-library tower acts twice as fast (troop towers reinforce twice as fast).");
 card("bloom","Craterhoof Behemoth","G",60,"tower","Summon one mighty beast from a troop tower.");
 card("prism","Lithoform Engine","C",45,"none","Copy each of the next two eligible targeted spells (not stacked with Twincast).");
 card("resonance","Strionic Resonator","C",80,"tower","Double this tower's eligible death triggers.");
 card("matrix","Fireshrieker","C",65,"tower","Double eligible attack output for 8 seconds.");
 card("blade","Loxodon Warhammer","C",60,"tower","Equip a troop tower: current and future troops gain +60% attack and +40 health.");
 card("forge","Steel Overseer","C",55,"tower","Enchant a troop tower to raise tougher constructs.");
 // Commanders: one physical hero per run, chosen before wave 1. Passives work only while the commander is alive.
 // Commanders are real Magic: The Gathering legends (unofficial fan content). One per run, chosen before wave 1.
 // Passives work only while the commander is alive; every token and growth effect has a cap.
 const commanders={
  krenko:{name:"Krenko, Mob Boss",color:"R",colors:"R",archetype:"Goblin tokens",hp:220,damage:12,desc:"Every 8 seconds, creates Goblin tokens equal to the goblins already following him (at least 1, up to 12)."},
  talrand:{name:"Talrand, Sky Summoner",color:"U",colors:"U",archetype:"Spellslinger",hp:200,damage:12,desc:"Whenever you cast an instant or sorcery, create a 2/2 flying Drake token that can strike fliers (up to 8)."},
  omnath:{name:"Omnath, Locus of Mana",color:"G",colors:"G",archetype:"Ramp",hp:300,damage:14,desc:"Mana Groves harvest 25% faster (wave budgets unchanged). Omnath gets +1 attack for every 50 unspent mana (up to +200)."},
  edgar:{name:"Edgar Markov",color:"B",colors:"RWB",archetype:"Vampire tokens",hp:260,damage:18,desc:"For every 3 troops your towers summon, create a 1/1 Vampire token beside Edgar (up to 10)."},
  lightpaws:{name:"Light-Paws, Emperor's Voice",color:"W",colors:"W",archetype:"Voltron",hp:300,damage:20,desc:"Whenever you cast an Aura or Equipment card (Animate Dead, Wild Growth, Fireshrieker, Loxodon Warhammer), she gains +8 attack and +40 health (up to 15 times)."},
  meren:{name:"Meren of Clan Nel Toth",color:"B",colors:"BG",archetype:"Recursion",hp:260,damage:14,desc:"Every 10 seconds, returns your most recently fallen troop to its tower."},
  teysa:{name:"Teysa Karlov",color:"W",colors:"WB",archetype:"Death triggers",hp:240,damage:12,desc:"Death triggers happen twice: Blood Artist blasts, death-blast towers and Soul Foundry income."},
  korvold:{name:"Korvold, Fae-Cursed King",color:"R",colors:"BRG",archetype:"Sacrifice",hp:360,damage:22,desc:"Whenever a troop is sacrificed, Korvold gains +4 attack (up to +200) and you draw a card."},
  atraxa:{name:"Atraxa, Praetors' Voice",color:"G",colors:"GWUB",archetype:"Counters",hp:340,damage:20,desc:"Every 10 seconds, proliferate: every tower gains a growth counter (up to 10 each) and Atraxa gains +4 attack."},
  urdragon:{name:"The Ur-Dragon",color:"R",colors:"WUBRG",archetype:"Dragons",hp:500,damage:40,desc:"Flies over the road: every 1.5 seconds breathes fire on the 3 leading enemies in reach, fliers included, for triple damage to bosses. Does not block."}
 };
 // Card types checked against Scryfall (2026-11-22). Talrand reacts to instants and sorceries; Light-Paws to Auras and Equipment.
 const TYPES={legion:"Instant",ward:"Instant",rally:"Sorcery",twins:"Enchantment",valor:"Enchantment",inquiry:"Sorcery",reflection:"Sorcery",echo:"Instant",freeze:"Sorcery",reset:"Instant",raise:"Enchantment — Aura",offering:"Instant",recall:"Sorcery",funeral:"Creature — Vampire",deathmark:"Sorcery",meteor:"Sorcery",flame:"Sorcery",cascade:"Sorcery",lightning:"Sorcery",bloodrush:"Instant",wild:"Enchantment — Aura",root:"Instant",bloom:"Creature — Beast",verdant:"Enchantment",awaken:"Creature — Spirit",prism:"Legendary Artifact",resonance:"Artifact",matrix:"Artifact — Equipment",forge:"Artifact Creature — Construct",blade:"Artifact — Equipment"};
 for(const [id,type] of Object.entries(TYPES))cards[id].type=type;
 const isInstantOrSorcery=id=>/^(Instant|Sorcery)$/.test(cards[id]?.type),ENCHANTMENTS=Object.keys(TYPES).filter(id=>/Aura|Equipment/.test(TYPES[id])),TOKEN_CAP={goblin:12,drake:8,vampire:10};
 const commanderReach=220,commanderRespawn=200;
 const defaultDeck=["meteor","wild","legion","inquiry","funeral","offering","twins","echo","freeze","raise","resonance","reset","cascade","ward","root","recall","matrix","forge","valor","bloom","flame","rally","reflection","deathmark","bloodrush","lightning","verdant","awaken","prism","blade"];
 const stats={damage:0,towerDamage:0,troopDamage:0,deathDamage:0,spellDamage:0,manaEarned:0,farmMana:0,killMana:0,waveMana:0,earlyMana:0,earlyCalls:0,soulMana:0,spellMana:0,sandboxMana:0,commanderMana:0,commanderDamage:0,commanderArmyDamage:0,returns:0,sacrifices:0,spent:0,refunds:0,kills:0,leaks:0,summoned:0,fallen:0,casts:0,draws:0,triggers:0,healing:0,control:0};
 const state={initialMode:["campaign","endless","sandbox"].includes(mode)?mode:"campaign",seed:seed>>>0,rng:seed>>>0||1,mode:["campaign","endless","sandbox"].includes(mode)?mode:"campaign",tick:0,wave:0,phase:"ready",mana:350,health:20,towers:{},enemies:[],troops:[],queue:[],nextSpawn:0,nextId:1,stats,events:[],sequence:0,commands:[],library:[],hand:[],discard:[],deck:defaultDeck.slice(),echo:false,prism:0,storm:0,fallen:[],waveHistory:[],towerHistory:[], farmPaid:{}, pendingWaves:[], lastWaveTick:0, bonusDeadline:0, lastWaveSpawned:false, waveCalls:[], commander:null, difficulty:"normal", stars:0, cmdOwner:{id:"cmd",uid:0,damage:0,troopDamage:0,summons:0}, cmdSummons:0, enemyKills:{}, enemyLeaks:{}, cardCasts:{}, effects:[], projectiles:[]};
 const d2=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;
 function rand(){let x=state.rng;x^=x<<13;x^=x>>>17;x^=x<<5;return state.rng=x>>>0;}
 function shuffle(a){for(let i=a.length-1;i>0;i--){const j=rand()%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
 function pointAt(n){let p=Math.max(0,Math.min(distance,n));for(let i=0;i<lengths.length;i++){if(p<=lengths[i]){const [x,y]=path[i],[a,b]=path[i+1];return {x:x+Math.sign(a-x)*p,y:y+Math.sign(b-y)*p};}p-=lengths[i];}return {x:1000,y:490};}
 function nearestPath(x,y){let best=Infinity,result=0,travel=0;for(let i=0;i<lengths.length;i++){const [a,b]=path[i],[c,d]=path[i+1],l=lengths[i],t=Math.max(0,Math.min(l,(x-a)*Math.sign(c-a)+(y-b)*Math.sign(d-b))),dd=d2(pointAt(travel+t),{x,y});if(dd<best){best=dd;result=travel+t;}travel+=l;}return result;}
 function emit(type,data={}){state.events.push({seq:++state.sequence,tick:state.tick,type,...data});if(state.events.length>200)state.events.shift();}
 function shot(kind,a,b,target=null){state.projectiles.push({kind,x:a.x,y:a.y,tx:b.x,ty:b.y,targetId:target?.id??null,targetFlying:!!target?.flying,start:state.tick,duration:kind==="chain"||kind==="melee"?3:5});if(state.projectiles.length>240)state.projectiles.shift();}
 function effect(x,y,color,r=28){state.effects.push({x,y,color,r,until:state.tick+7});if(state.effects.length>100)state.effects.shift();}
 function earn(amount,why,t){state.mana+=amount;stats.manaEarned+=amount;stats[why+"Mana"]+=amount;if(t)t.mana+=amount;emit("mana",{amount,why,tower:t?.id??null});}
 function spend(amount){if(state.mana<amount)return false;state.mana-=amount;stats.spent+=amount;return true;}
 function draw(n=1){for(let i=0;i<n&&state.hand.length<5&&state.library.length;i++){state.hand.push(state.library.shift());stats.draws++;emit("draw",{card:state.hand.at(-1)});}}
 function resetDeck(deck){state.deck=deck.slice();state.library=shuffle(deck.slice());state.hand=[];state.discard=[];draw(4);}
 resetDeck(defaultDeck);
 // Late-game power: spells, burns, troops, death blasts and commanders grow with enemy health so they stay relevant in Endless.
 function late(k=.8){return Math.pow(scale(Math.max(1,state.wave)),k);}
 function commanderAlive(id){const c=state.commander;return !!c&&!c.dead&&(!id||c.id===id);}
 function castCost(id){return cards[id]?.cost??0;}
 function makeToken(model,hp,damage,flier=false){hp=Math.round(hp*late(.6));damage=Math.round(damage*late(.8));const c=state.commander;if(!c||state.troops.length>=220||state.troops.filter(u=>u.source==="cmd"&&u.model===model&&u.hp>0).length>=TOKEN_CAP[model])return false;state.troops.push({id:state.nextId++,source:"cmd",sourceUid:0,hp,maxHp:hp,progress:c.progress,next:state.tick+5,damage,revived:false,model,ward:0,flier});stats.summoned++;state.cmdOwner.summons++;emit("summon",{source:"cmd"});return true;}
 function commanderPos(){return pointAt(state.commander.progress);}
 function farmMultiplier(t){return (pads[t.id].bonus==="spring"?1.35:1)*(1+Math.min(3,t.growth)*.1);}
 function farmLimit(t){return Math.floor([22,65,165,400][t.tier-1]*farmMultiplier(t)*(1+bonus(t,"farmCap")));}
 function farmBudget(t){return farmLimit(t)*Math.max(1,state.pendingWaves?.length||1);}
 function upgradeCost(t){return t.tier>=4?null:Math.floor(roster[t.kind].cost*[1.4,4.2,17][t.tier-1]);}
 function branchOptions(t){return branches[t.kind].map((b,i)=>({id:i===0?"A":"B",name:b[0],ultimate:b[1],description:b[2]}));}
 function enemyPos(e){return pointAt(e.progress);}
 // First priority is distance travelled along the road, not x/y position or distance to the tower.
 const firstOrder=(a,b)=>b.progress-a.progress||a.id-b.id;
 function firstEnemy(origin,range,groundOnly=false,damage=null){let best=null;for(const e of state.enemies){if(e.hp<=0||e.escaped||!e.revealed||(groundOnly&&e.flying)||(damage==="magic"&&e.resist>=100)||(damage==="physical"&&e.armor>=100)||d2(enemyPos(e),origin)>range*range)continue;if(!best||firstOrder(e,best)<0)best=e;}return best;}
 function scale(w){return Math.min(1e8,Math.round((1+Math.max(0,w-5)*.24)*Math.pow(1.12,Math.max(0,Math.min(w,25)-10))*Math.pow(1.18,Math.max(0,w-25))*100)/100);}
 function spawnEnemy(kind,w){const def=types[kind],hp=Math.ceil(def.hp*scale(w)*(DIFFICULTY[state.difficulty]||1));state.enemies.push({id:state.nextId++,kind,...def,hp,maxHp:hp,attack:Math.ceil(def.attack*Math.sqrt(scale(w))),progress:0,slowUntil:0,rootUntil:0,curseUntil:0,markUntil:0,hasteUntil:0,revealed:!def.shroud,abilityAt:0,phase:def.ability==="phase"?"iron":null,phaseAt:0,baseArmor:def.armor,baseResist:def.resist,burnUntil:0,burnSource:null,nextAttack:0});}
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
 if(state.commander){const c=state.commander,max=Math.round((commanders[c.id].hp+40*(c.voltron||0))*late(.6));c.hp=Math.min(max,c.hp+Math.max(0,max-c.maxHp));c.maxHp=max;}
 }
 function hurt(e,raw,magic,t,pierce=false,source=t?"tower":"spell"){if(e.hp<=0)return;e.exposedUntil=state.tick+30;const resistance=magic?e.resist:e.armor*(pierce===2?0:pierce?.5:1);if(resistance>=100)return;const n=Math.min(e.hp,Math.max(1,Math.floor(raw*(100-resistance)/100*(e.curseUntil>state.tick||e.markUntil>state.tick?1.35:1))));e.hp-=n;stats.damage+=n;stats[source+"Damage"]+=n;if(t&&t===state.cmdOwner)stats.commanderArmyDamage+=n;if(t){t.damage+=n;t[source+"Damage"]=(t[source+"Damage"]||0)+n;}if(e.hp===0){stats.kills++;state.enemyKills[e.kind]=(state.enemyKills[e.kind]||0)+1;earn(e.reward,"kill");if(e.markUntil>state.tick)earn(6,"spell");emit("enemyKilled",{id:e.id,source:t?.id??null});}}
 function area(q,r){return state.enemies.filter(e=>e.hp>0&&d2(enemyPos(e),q)<=r*r);}
 function makeTroop(t,opts={}){if(state.troops.length>=220)return false;const def=roster[t.kind];if(def.kind!=="troops")return false;const hp=opts.hp??Math.round(late(.6)*((def.hp+30*(t.tier-1))*(t.construct?1.6:1)*(1+bonus(t,"hp"))+(t.blade?40:0))),damage=opts.damage??Math.round(late(.6)*(def.damage+5*(t.tier-1)+t.growth*4)*(1+bonus(t,"melee"))*(t.blade?1.6:1));state.troops.push({id:state.nextId++,source:t.id,sourceUid:t.uid,hp,maxHp:hp,progress:t.rally,next:state.tick+5,damage,revived:!!opts.revived,model:opts.model||(bonus(t,"giant")?"bloom":t.construct?"construct":t.kind),ward:Math.round(bonus(t,"ward"))});stats.summoned++;t.summons++;if(opts.revived)stats.returns++;emit("summon",{source:t.id});if(commanderAlive("edgar")&&++state.cmdSummons%3===0)makeToken("vampire",30,10);return true;}
 // A death is processed once; explosions can kill enemies but cannot cause more friendly deaths.
 // Provenance and per-tick entity caps keep the supported trigger graph finite.
 // Bosses stop for whoever blocks them and smash every ground troop (and the commander) within reach.
 function smash(e){const reach=32,hit=Math.round(e.attack*SMASH);for(const u of state.troops){if(u.hp<=0||u.flier||Math.abs(u.progress-e.progress)>reach)continue;const absorbed=Math.min(u.ward,hit);u.ward-=absorbed;u.hp=Math.max(0,u.hp-hit+absorbed);if(!u.hp)die(u);}
  const cm=state.commander;if(cm&&!cm.dead&&cm.id!=="urdragon"&&Math.abs(cm.progress-e.progress)<=reach){cm.hp=Math.max(0,cm.hp-hit);if(!cm.hp){cm.dead=true;cm.deaths++;cm.respawnAt=state.tick+commanderRespawn;emit("commanderFall",{id:cm.id});}}
  e.nextAttack=state.tick+14;state.effects.push({x:pointAt(e.progress).x,y:pointAt(e.progress).y,r:reach+8,color:"#e0573f",until:state.tick+5});emit("bossSmash",{id:e.id});}
 function die(u,sacrificed=false){if(u.dead)return;u.dead=true;u.hp=0;stats.fallen++;if(state.fallen.length>=200)state.fallen.shift();state.fallen.push({source:u.source,sourceUid:u.sourceUid,hp:u.maxHp,damage:u.damage,model:u.model,revived:u.revived});emit(sacrificed?"sacrifice":"creatureDeath",{source:u.source,id:u.id});if(sacrificed){stats.sacrifices++;if(commanderAlive("korvold")){state.commander.growth=Math.min(200,state.commander.growth+4);draw(1);}}const source=state.towers[u.source],q=pointAt(u.progress);if(!source)return;const mult=(source.resonance?2:1)*(commanderAlive("teysa")?2:1);if(source.funeral||bonus(source,"death")){for(let i=0;i<mult;i++){for(const e of area(q,94))hurt(e,Math.round(((source.funeral?45+source.tier*8:0)+bonus(source,"death"))*late(.6)),true,source,false,"death");stats.triggers++;}effect(q.x,q.y,"#c19be9",94);emit("deathExplosion",{source:source.id,count:mult});}for(const t of Object.values(state.towers))if(t.kind==="foundry"&&d2(pads[t.id],q)<=roster.foundry.range**2){earn(Math.floor((8+5*t.tier)*mult*(1+bonus(t,"soul"))),"soul",t);stats.triggers+=mult;}}
 function allowedTarget(id,c){const spec=cards[id];if(!spec)return false;if(spec.target==="none"){if(id==="inquiry")return state.library.length>0;if(id==="echo")return !state.echo&&!state.prism;if(id==="prism")return !state.prism&&!state.echo;if(id==="recall")return state.discard.some(k=>k!=="recall");return true;}if(spec.target==="ground")return state.phase==="active"&&Number.isFinite(c.x)&&Number.isFinite(c.y)&&c.x>=0&&c.y>=0&&c.x<=W&&c.y<=H;const t=Number.isInteger(c.pad)?state.towers[c.pad]:null;if(!t)return false;const troop=["legion","twins","valor","raise","offering","funeral","bloom","forge","rally","bloodrush","verdant","blade"];if(troop.includes(id)&&roster[t.kind].kind!=="troops")return false;if(id==="offering")return state.troops.some(u=>u.source===t.id&&u.hp>0&&!u.dead);if(id==="raise")return state.fallen.some(u=>u.sourceUid===t.uid&&!u.revived);if(id==="funeral")return !t.funeral;if(id==="twins")return !t.twins;if(id==="resonance")return !t.resonance;if(id==="forge")return !t.construct;if(id==="reset")return t.next>state.tick;if(id==="rally")return state.fallen.some(u=>!u.revived);if(id==="verdant")return state.troops.some(u=>u.source===t.id&&u.hp>0&&!u.dead);if(id==="blade")return !t.blade;if(id==="reflection")return ATTACKERS.includes(roster[t.kind].kind);if(id==="awaken")return !["farm","draw"].includes(roster[t.kind].kind);return true;}
 const ATTACKERS=["arcane","strike","splash","chain","hex","root","mirror"];
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
  if(id==="meteor"||id==="cascade"){for(const e of area(q,110))hurt(e,Math.round((id==="meteor"?150:65+state.storm*40)*late()),true,null);effect(q.x,q.y,"#ffb66b",110);}
  if(id==="flame"){for(const e of area(q,125)){e.burnUntil=state.tick+55;e.burnSource=null;}effect(q.x,q.y,"#f48656",125);}
  if(id==="bloom")makeTroop(t,{hp:350,damage:45+t.growth*4,model:"bloom"});
  if(id==="resonance")t.resonance=true;
  if(id==="matrix")t.matrixUntil=state.tick+80;
  if(id==="forge")t.construct=true;
  if(id==="rally"){let n=0;for(let i=state.fallen.length-1;i>=0&&n<2;i--){const u=state.fallen[i];if(u.revived)continue;if(!makeTroop(t,{hp:u.hp,damage:u.damage,model:u.model,revived:true}))break;state.troops.at(-1).ward=20;state.fallen.splice(i,1);n++;}}
  if(id==="reflection")t.reflectUntil=Math.max(t.reflectUntil||0,state.tick+100);
  if(id==="deathmark"){for(const e of area(q,120)){e.markUntil=Math.max(e.markUntil,state.tick+100);stats.control++;}effect(q.x,q.y,"#9f6cc9",120);}
  if(id==="bloodrush"){t.rushUntil=Math.max(t.rushUntil||0,state.tick+100);for(const u of state.troops)if(u.source===t.id&&u.hp>0)u.hp=Math.max(1,u.hp-Math.floor(u.maxHp*.15));}
  if(id==="lightning"){const first=state.enemies.filter(e=>e.hp>0&&!e.escaped&&d2(enemyPos(e),q)<=150*150).sort(firstOrder)[0];if(first){let n=0,from={x:q.x,y:0};const hit=new Set();for(let e=first;e&&n<6;n++){hit.add(e.id);const pos=enemyPos(e);shot("chain",from,pos,e);from=pos;hurt(e,Math.round(90*Math.pow(.85,n)*late()),true,null);e=state.enemies.filter(x=>x.hp>0&&!x.escaped&&!hit.has(x.id)&&d2(enemyPos(x),pos)<=120*120).sort(firstOrder)[0];}}effect(q.x,q.y,"#ffe27a",60);}
  if(id==="verdant"){const live=state.troops.filter(u=>u.source===t.id&&u.hp>0&&!u.dead).slice(0,6);for(const u of live)if(!makeTroop(t,{hp:u.maxHp,damage:u.damage,model:u.model}))break;}
  if(id==="awaken"){t.awakenUntil=Math.max(t.awakenUntil||0,state.tick+150);t.next=Math.min(t.next,state.tick+1);}
  if(id==="prism")state.prism=2;
  if(id==="blade"){t.blade=true;for(const u of state.troops)if(u.source===t.id&&u.hp>0){u.damage=Math.round(u.damage*1.6);u.maxHp+=40;u.hp+=40;}}
  if(copied){stats.triggers++;emit("spellCopy",{card:id});}
 }
 // Copies resolve once each and never re-arm copying, so copy chains stay finite.
 const COPYABLE=["meteor","flame","cascade","freeze","root","ward","legion","lightning","deathmark","rally","verdant","bloodrush"];
 function command(c){
 if(!c||typeof c!=="object")return false;
 const p=Number.isInteger(c.pad)?pads[c.pad]:null,t=p?state.towers[p.id]:null;
 let ok=false;
 if(c.type==="difficulty"&&state.wave===0&&state.phase==="ready"&&state.mode!=="sandbox"&&Object.hasOwn(DIFFICULTY,c.level)){state.difficulty=c.level;emit("difficulty",{level:c.level});ok=true;}
 if(c.type==="continue"&&state.phase==="won"){state.mode="endless";state.phase="ready";ok=true;}
 if(!["ready","active"].includes(state.phase)&&!ok)return false;
 if(c.type==="wave"&&state.phase==="ready"){startWave();ok=true;}
 if(c.type==="early"&&canCallEarly()){startWave(true);ok=true;}
 if(c.type==="build"&&p&&!t&&Object.hasOwn(roster,c.kind)&&spend(roster[c.kind].cost)){const d=roster[c.kind];state.towers[p.id]={id:p.id,uid:state.nextId++,kind:c.kind,tier:1,branch:null,paid:d.cost,next:state.tick+1,rally:nearestPath(p.x,p.y),mana:0,damage:0,summons:0,healing:0,control:0,draws:0,growth:0,matrixUntil:0};emit("build",{pad:p.id,kind:c.kind});ok=true;}
 if(c.type==="upgrade"&&t){const n=upgradeCost(t),choice=t.tier===2; if(n!==null&&(!choice||["A","B"].includes(c.branch))&&(!c.branch||choice)&&spend(n)){if(choice)t.branch=c.branch;t.paid+=n;t.tier++;emit("upgrade",{pad:t.id,tier:t.tier,branch:t.branch});ok=true;}}
 if(c.type==="sell"&&t){const amount=Math.floor(t.paid*.7);state.mana+=amount;stats.refunds+=amount;state.towerHistory.push({...t,sold:true});delete state.towers[p.id];state.troops=state.troops.filter(u=>u.source!==p.id);emit("sell",{pad:p.id,amount});ok=true;}
 if(c.type==="rally"&&t&&roster[t.kind].kind==="troops"&&Number.isFinite(c.x)&&Number.isFinite(c.y)){const pos=nearestPath(c.x,c.y);if(d2(pointAt(pos),p)<=roster[t.kind].range**2){t.rally=pos;ok=true;}}
 if(c.type==="commander"&&state.wave===0&&state.phase==="ready"&&(c.id===null||Object.hasOwn(commanders,c.id))){const d=commanders[c.id];state.commander=d?{id:c.id,hp:d.hp,maxHp:d.hp,attack:d.damage,growth:0,progress:Math.round(distance*.42),target:Math.round(distance*.42),next:0,dead:false,respawnAt:0,kills:0,damage:0,deaths:0,voltron:0}:null;emit("commander",{id:c.id});ok=true;}
 if(c.type==="commanderMove"&&state.commander&&Number.isFinite(c.x)&&Number.isFinite(c.y)&&c.x>=0&&c.y>=0&&c.x<=W&&c.y<=H){state.commander.target=Math.round(nearestPath(c.x,c.y));ok=true;}
 if(c.type==="deck"&&state.wave===0&&state.phase==="ready"&&Array.isArray(c.deck)&&c.deck.length===30&&c.deck.every(k=>Object.hasOwn(cards,k))&&c.deck.every(k=>c.deck.filter(x=>x===k).length<=3)){resetDeck(c.deck);ok=true;}
 if(c.type==="cast"&&Number.isInteger(c.index)){const id=state.hand[c.index],spec=cards[id];if(spec&&allowedTarget(id,c)&&spend(castCost(id))){const copy=(state.echo||state.prism>0)&&COPYABLE.includes(id);state.hand.splice(c.index,1);state.storm++;stats.casts++;state.cardCasts[id]=(state.cardCasts[id]||0)+1;emit("spellCast",{card:id});if(copy){if(state.echo)state.echo=false;else state.prism--;}resolve(id,c);if(copy)resolve(id,c,true);state.discard.push(id);if(commanderAlive("talrand")&&isInstantOrSorcery(id))makeToken("drake",40,14,true);if(commanderAlive("lightpaws")&&ENCHANTMENTS.includes(id)&&state.commander.voltron<15){const c=state.commander;c.voltron++;c.growth+=8;const add=Math.round(40*late(.6));c.maxHp+=add;c.hp+=add;}ok=true;}}
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
 for(const e of state.enemies){if(e.hp<=0)continue;if(e.regen&&state.tick%10===0)e.hp=Math.min(e.maxHp,e.hp+e.regen);if(e.burnUntil>state.tick&&state.tick%5===0){const source=e.burnSource,owner=source===null?null:Object.values(state.towers).find(t=>t.uid===source)||state.towerHistory.find(t=>t.uid===source);hurt(e,Math.round(12*late()),true,owner||null,false,source===null?"spell":"tower");}}
 const revealers=Object.values(state.towers).filter(t=>["strike","hex"].includes(roster[t.kind].kind)),allies=[...state.troops.filter(u=>u.hp>0).map(u=>pointAt(u.progress)),...(state.commander&&!state.commander.dead?[pointAt(state.commander.progress)]:[])];
 for(const e of state.enemies){if(e.hp<=0)continue;const q=enemyPos(e);if(types[e.kind].shroud)e.revealed=e.exposedUntil>state.tick||revealers.some(t=>d2(pads[t.id],q)<=(roster[t.kind].range+(pads[t.id].bonus==="height"?30:0)+bonus(t,"range"))**2)||allies.some(a=>d2(a,q)<=70*70);
  if(!e.ability||!e.progress)continue;
  if(e.ability==="warcry"&&state.tick>=e.abilityAt){e.abilityAt=state.tick+80;for(const x of area(q,130))x.hasteUntil=state.tick+30;effect(q.x,q.y,"#e5694f",130);emit("bossAbility",{boss:e.kind,ability:"warcry"});}
  if(e.ability==="brood"&&state.tick>=e.abilityAt&&(e.brood||0)<8){e.abilityAt=state.tick+80;e.brood=(e.brood||0)+2;if(state.queue.length+state.enemies.length<2998)for(let i=0;i<2;i++){spawnEnemy("stalker",state.wave);const s2=state.enemies.at(-1);s2.progress=Math.max(0,e.progress-10-i*8);}emit("bossAbility",{boss:e.kind,ability:"brood"});}
  if(e.ability==="silence"){if(!e.silenceAt&&state.tick>=e.abilityAt){e.silenceTargets=Object.values(state.towers).filter(t=>d2(pads[t.id],q)<=260*260).sort((a,b)=>d2(pads[a.id],q)-d2(pads[b.id],q)||a.id-b.id).slice(0,2).map(t=>t.uid);for(const t of Object.values(state.towers))if(e.silenceTargets.includes(t.uid)){t.silenceWarnUntil=state.tick+20;effect(pads[t.id].x,pads[t.id].y,"#c48df0",34);}e.silenceAt=state.tick+20;emit("bossAbility",{boss:e.kind,ability:"silenceWarning"});}
   if(e.silenceAt&&state.tick>=e.silenceAt){for(const t of Object.values(state.towers))if(e.silenceTargets.includes(t.uid)){t.silencedUntil=state.tick+40;stats.silenced=(stats.silenced||0)+1;}e.silenceAt=0;e.abilityAt=state.tick+100;emit("bossAbility",{boss:e.kind,ability:"silence"});}}
  if(e.ability==="phase"){if(!e.phaseAt)e.phaseAt=state.tick+80;if(state.tick===e.phaseAt-15){effect(q.x,q.y,e.phase==="iron"?"#76bdf1":"#d9d3c3",70);emit("bossAbility",{boss:e.kind,ability:"phaseWarning"});}if(state.tick>=e.phaseAt){e.phase=e.phase==="iron"?"spell":"iron";e.phaseAt=state.tick+80;emit("bossAbility",{boss:e.kind,ability:"phase",phase:e.phase});}e.armor=e.phase==="iron"?100:e.baseArmor;e.resist=e.phase==="spell"?100:e.baseResist;}
 }
 for(const t of Object.values(state.towers)){
 const d=roster[t.kind],p=pads[t.id];if(state.tick<t.next)continue;if(t.silencedUntil>state.tick){t.next=t.silencedUntil;continue;}
 const k=d.kind,tier=t.tier,range=d.range+(p.bonus==="height"?30:0)+bonus(t,"range"),power=Math.round((d.damage+t.growth*6)*[1,1.8,3.3,8][tier-1]*(1+bonus(t,"power")))*(t.matrixUntil>state.tick?2:1),hitPower=e=>power*(1+(e.boss?bonus(t,"boss"):0)+(e.armor>0?bonus(t,"armor"):0));
 if(k==="farm"){const limit=farmBudget(t),paid=state.farmPaid[t.id]||0,rate=Math.floor([3,7,16,34][tier-1]*farmMultiplier(t)*(1+bonus(t,"farmRate"))*(commanderAlive("omnath")?1.25:1));const n=Math.max(0,Math.min(rate,limit-paid));if(n){state.farmPaid[t.id]=paid+n;earn(n,"farm",t);}}
 else if(k==="draw"){const before=stats.draws;draw(tier>=3?2:1);if(bonus(t,"recycle")&&!state.library.length&&state.hand.length<5){const i=state.discard.findIndex(id=>!["recall","inquiry","echo","reset"].includes(id));if(i>=0){state.hand.push(state.discard.splice(i,1)[0]);stats.triggers++;stats.draws++;}}if(bonus(t,"accelerate"))for(const o of Object.values(state.towers))if(o!==t&&o.kind!=="library"&&d2(pads[o.id],p)<=bonus(t,"aura")**2)o.next=Math.max(state.tick+1,o.next-Math.floor(bonus(t,"accelerate")));t.draws+=stats.draws-before;}
 else if(k==="troops"){const n=state.troops.filter(u=>u.source===t.id&&u.hp>0).length,cap=d.cap+tier-1+Math.floor(bonus(t,"cap"));for(let i=0;i<(t.twins?2:1)&&n+i<cap*(t.twins?2:1);i++)makeTroop(t);}
 else if(k==="heal"){for(const u of state.troops)if(u.hp>0&&d2(pointAt(u.progress),p)<=range**2){const h=Math.min(Math.round(power*(1+bonus(t,"heal"))),u.maxHp-u.hp);u.hp+=h;u.ward=Math.max(u.ward,tier*4+Math.floor(bonus(t,"ward")));stats.healing+=h;t.healing+=h;if(h>0)shot("heal",{x:p.x,y:p.y-21},pointAt(u.progress));}if(bonus(t,"smite")){const e=firstEnemy(p,range);if(e){hurt(e,bonus(t,"smite"),true,t);shot("strike",{x:p.x,y:p.y-20},enemyPos(e),e);}}}
 else if(k==="soul"){const u=state.troops.filter(u=>u.hp>0&&d2(pointAt(u.progress),p)<=range**2&&u.hp<=u.maxHp*.55).sort((a,b)=>a.hp-b.hp||a.id-b.id)[0];if(u){const q=pointAt(u.progress);die(u,true);if(bonus(t,"altar")){for(const e of area(q,100))hurt(e,bonus(t,"altar"),true,t,false,"death");effect(q.x,q.y,"#ba8ad8",100);}}}
 else {
 const e=firstEnemy(p,range,k==="splash"||k==="root",["arcane","chain","hex","mirror"].includes(k)?"magic":k==="strike"&&bonus(t,"pierce")?null:["strike","splash","root"].includes(k)?"physical":null);if(!e)continue;const q=enemyPos(e);
 if(k==="arcane"){hurt(e,power,true,t);e.slowUntil=state.tick+12+Math.floor(bonus(t,"slow"));if(bonus(t,"root"))e.rootUntil=Math.max(e.rootUntil,state.tick+Math.floor(bonus(t,"root")));t.control++;stats.control++;}
 if(k==="strike")hurt(e,hitPower(e),false,t,bonus(t,"pierce")?2:true);
 if(k==="splash")for(const x of area(q,60+8*tier+bonus(t,"radius")))if(!x.flying){hurt(x,hitPower(x),false,t);if(bonus(t,"burn")&&state.tick+Math.floor(bonus(t,"burn"))>=x.burnUntil){x.burnUntil=state.tick+Math.floor(bonus(t,"burn"));x.burnSource=t.uid;}}
 if(k==="chain"){let n=0,from={x:p.x,y:p.y-28};for(const x of [e,...area(q,110+bonus(t,"radius")).filter(x=>x.id!==e.id).sort(firstOrder)]){if(n>=tier+2+Math.floor(bonus(t,"chains")))break;const pos=enemyPos(x),to={x:pos.x,y:pos.y-(x.flying?21:8)};shot("chain",from,to,x);from=to;hurt(x,Math.max(1,Math.round(hitPower(x)*Math.pow(.78,n++))),true,t);}}
 if(k==="hex"){for(const x of bonus(t,"spread")?area(q,bonus(t,"spread")):[e]){x.curseUntil=state.tick+35+Math.floor(bonus(t,"curse"));hurt(x,hitPower(x),true,t);}}
 if(k==="root"){for(const x of bonus(t,"spread")?area(q,bonus(t,"spread")).filter(x=>!x.flying):[e]){x.rootUntil=state.tick+7+tier*2+Math.floor(bonus(t,"root"));hurt(x,power,false,t);if(bonus(t,"burn")&&state.tick+Math.floor(bonus(t,"burn"))>=x.burnUntil){x.burnUntil=state.tick+Math.floor(bonus(t,"burn"));x.burnSource=t.uid;}stats.control++;t.control++;}}
 if(k==="mirror"){const other=Object.values(state.towers).filter(o=>["arcane","strike","splash","chain","hex","root"].includes(roster[o.kind].kind)&&d2(pads[o.id],p)<=200**2).sort((a,b)=>roster[b.kind].damage*b.tier-roster[a.kind].damage*a.tier||a.id-b.id)[0];hurt(e,other?Math.round(roster[other.kind].damage*other.tier*(.8+.35*tier)*(1+bonus(t,"power"))):power,true,t);if(other)stats.triggers++;}
 const reflect=t.reflectUntil>state.tick?1:0;if(bonus(t,"extra")||reflect){const more=state.enemies.filter(x=>x.hp>0&&x.id!==e.id&&!x.escaped&&d2(enemyPos(x),p)<=range**2).sort(firstOrder).slice(0,Math.floor(bonus(t,"extra"))+reflect);for(const [j,x] of more.entries()){hurt(x,power*(j<Math.floor(bonus(t,"extra"))?bonus(t,"extraPower"):.6),k==="mirror",t);shot(k,{x:p.x,y:p.y-28},enemyPos(x),x);}}
 if(k!=="chain")shot(k,{x:p.x,y:p.y-28},{x:q.x,y:q.y-(e.flying?21:8)},e);effect(q.x,q.y,({W:"#f5df9e",U:"#76bdf1",B:"#ba8ad8",R:"#f7a564",G:"#8ed28e"})[d.color],k==="splash"?60:18);emit("towerAttack",{source:t.id,target:e.id,progress:e.progress});
 }
 t.next=state.tick+(k==="farm"?d.interval:Math.max(t.awakenUntil>state.tick?2:3,Math.round((d.interval-(tier-1)*2)*(1-Math.min(.65,bonus(t,"haste")))*(t.awakenUntil>state.tick?.5:1))));
 }
 const blocked=new Set();
 for(const u of state.troops){if(u.hp<=0)continue;const cmd=u.source==="cmd",t=cmd?state.cmdOwner:state.towers[u.source];if(!t||(cmd&&!state.commander))continue;const diff=(cmd?state.commander.progress+((u.id%5)-2)*6:t.rally)-u.progress;u.progress+=Math.sign(diff)*Math.min(10,Math.abs(diff));const e=state.enemies.filter(e=>e.hp>0&&(!e.flying||u.flier)&&!blocked.has(e.id)&&Math.abs(e.progress-u.progress)<=28).sort(firstOrder)[0];if(!e)continue;if(!e.flying)blocked.add(e.id);if(state.tick>=u.next){shot("melee",pointAt(u.progress),enemyPos(e));hurt(e,u.damage,false,t,false,"troop");u.next=state.tick+(t.rushUntil>state.tick?4:8);}if(e.hp>0&&state.tick>=e.nextAttack){if(e.boss){smash(e);}else{const absorbed=Math.min(u.ward,e.attack);u.ward-=absorbed;u.hp=Math.max(0,u.hp-e.attack+absorbed);e.nextAttack=state.tick+10;if(!u.hp)die(u);}}}
 const cm=state.commander;
 if(cm&&cm.dead&&state.tick>=cm.respawnAt){cm.dead=false;cm.hp=cm.maxHp;cm.progress=cm.target;emit("commanderReturn",{id:cm.id});}
 if(cm&&!cm.dead){const diff=cm.target-cm.progress;cm.progress+=Math.sign(diff)*Math.min(14,Math.abs(diff));const here=pointAt(cm.progress);
  const power=Math.round((cm.attack+cm.growth)*late())+(cm.id==="omnath"?Math.min(200,Math.floor(state.mana/50)):0);
  if(cm.id==="krenko"&&state.tick%80===0){const n=Math.max(1,state.troops.filter(u=>u.source==="cmd"&&u.hp>0).length);for(let i=0;i<n;i++)if(!makeToken("goblin",30,8))break;}
  if(cm.id==="meren"&&state.tick%100===0){for(let i=state.fallen.length-1;i>=0;i--){const f=state.fallen[i],t=Object.values(state.towers).find(t=>t.uid===f.sourceUid);if(f.revived||!t)continue;if(makeTroop(t,{hp:f.hp,damage:f.damage,model:f.model,revived:true}))state.fallen.splice(i,1);break;}}
  if(cm.id==="atraxa"&&state.tick%100===0){for(const t of Object.values(state.towers))if((t.prolif||0)<10){t.prolif=(t.prolif||0)+1;t.growth++;}cm.growth=Math.min(200,cm.growth+4);stats.triggers++;}
  if(cm.id==="urdragon"){if(state.tick>=cm.next){const targets=state.enemies.filter(e=>e.hp>0&&!e.escaped&&d2(enemyPos(e),here)<=commanderReach**2).sort(firstOrder).slice(0,3);if(targets.length){const before=stats.commanderDamage;for(const x of targets){shot("splash",{x:here.x,y:here.y-30},enemyPos(x),x);hurt(x,power*(x.boss?3:1),true,null,false,"commander");if(x.hp===0)cm.kills++;}cm.damage+=stats.commanderDamage-before;cm.next=state.tick+15;}}}
  else{const near=state.enemies.filter(e=>e.hp>0&&!e.flying&&Math.abs(e.progress-cm.progress)<=30).sort(firstOrder),free=near.find(e=>!blocked.has(e.id)),e=free||near[0];
  if(e){if(free)blocked.add(e.id);if(state.tick>=cm.next){const before=stats.commanderDamage;shot("melee",here,enemyPos(e));hurt(e,power,false,null,false,"commander");if(e.hp===0)cm.kills++;cm.damage+=stats.commanderDamage-before;cm.next=state.tick+8;}
   if(free&&e.hp>0&&state.tick>=e.nextAttack){if(e.boss)smash(e);else{cm.hp=Math.max(0,cm.hp-e.attack);e.nextAttack=state.tick+10;}if(!cm.hp&&!cm.dead){cm.dead=true;cm.deaths++;cm.respawnAt=state.tick+commanderRespawn;emit("commanderFall",{id:cm.id});}}}}}
 for(const e of state.enemies){if(e.hp<=0)continue;if(!blocked.has(e.id)&&(e.rootUntil<=state.tick||e.boss)){const base=e.hasteUntil>state.tick?Math.round(e.speed*1.3):e.speed,move=e.slowUntil>state.tick?Math.max(1,Math.floor(base*(e.boss?.75:.5))):base;e.progress+=move;}if(e.progress>=distance){state.health=Math.max(0,state.health-(e.boss?3:1));stats.leaks++;state.enemyLeaks[e.kind]=(state.enemyLeaks[e.kind]||0)+1;e.escaped=true;emit("leak",{id:e.id});}}
 state.troops=state.troops.filter(u=>u.hp>0);state.enemies=state.enemies.filter(e=>e.hp>0&&!e.escaped);
 if(state.health<=0){if(state.mode==="sandbox"){state.health=20;}else{state.phase="lost";emit("gameOver",{won:false});return;}}
 if(!state.queue.length&&!state.enemies.length){for(const wave of state.pendingWaves||[]){earn(35+wave*10,"wave");state.waveHistory.push({wave,tick:state.tick,mana:state.mana,health:state.health,damage:stats.damage,farmMana:stats.farmMana,spent:stats.spent,kills:stats.kills,leaks:stats.leaks,casts:stats.casts,overlap:state.pendingWaves.length>1});emit("waveComplete",{wave});}state.pendingWaves=[];state.phase=state.mode==="campaign"&&state.wave>=25?"won":"ready";if(state.phase==="won"&&!state.stars){state.stars=state.health>=18?3:state.health>=10?2:1;emit("gameOver",{won:true,stars:state.stars});}}
 }
 function playtestReport(){
 const s=state;
 const counts=arr=>arr.reduce((acc,k)=>(acc[k]=(acc[k]||0)+1,acc),{});
 const tower=t=>({pad:t.id+1,kind:roster[t.kind].name,branch:t.branch,specialization:branchName(t),tier:t.tier,sold:!!t.sold,invested:t.paid,damage:t.damage,towerDamage:t.towerDamage||0,troopDamage:t.troopDamage||0,deathDamage:t.deathDamage||0,mana:t.mana,summons:t.summons,healing:t.healing,control:t.control,draws:t.draws,growth:t.growth,enchantments:["twins","funeral","resonance","construct","blade"].filter(k=>t[k]),rally:roster[t.kind].kind==="troops"?Math.round(t.rally):undefined});
 return {game:"ARCHEMANCY",version:VERSION,schema:1,seed:s.seed,initialMode:s.initialMode,mode:s.mode,wave:s.wave,phase:s.phase,simulationSeconds:s.tick/10,health:s.health,mana:s.mana,difficulty:s.difficulty,stars:s.stars,enemyHealthScale:scale(Math.max(1,s.wave)),stats:{...s.stats},enemyKills:{...s.enemyKills},enemyLeaks:{...s.enemyLeaks},remainingEnemies:counts(s.enemies.filter(e=>e.hp>0&&!e.escaped).map(e=>e.kind)),queuedEnemies:counts(s.queue.map(e=>e.kind)),cardCasts:{...s.cardCasts},spellbook:counts(s.deck),hand:s.hand.slice(),library:s.library.length,graveyard:counts(s.discard),commander:s.commander?{id:s.commander.id,name:commanders[s.commander.id].name,alive:!s.commander.dead,kills:s.commander.kills,damage:s.commander.damage,armyDamage:s.cmdOwner.troopDamage||0,deaths:s.commander.deaths,attack:s.commander.attack+s.commander.growth,tokens:s.troops.filter(u=>u.source==="cmd"&&u.hp>0).length}:null,echoArmed:s.echo,prismCharges:s.prism,towers:Object.values(s.towers).map(tower),soldTowers:s.towerHistory.slice(-30).map(tower),soldTowerCount:s.towerHistory.length,waveHistory:s.waveHistory.slice(-60).map(w=>({...w})),completedWaveCount:s.waveHistory.length,waveCalls:s.waveCalls.map(w=>({...w})),pendingWaves:s.pendingWaves.slice()};
 }
 return {commanders,commanderAlive,castCost,commanderRespawn,branchOptions,branchName,bonus,playtestReport,canCallEarly,earlyBonus,earlySeconds,farmLimit,farmBudget,scale,state,map:{width:W,height:H,path,pads,distance},roster,types,waves,waveSpec,cards,pointAt,nearestPath,upgradeCost,command,step,tickMs};
}
