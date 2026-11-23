// ARCHAMANCY beta simulation: fixed ticks, original data-driven rules, DOM independent.
// Bump only when the saved run format changes, so saves survive ordinary updates.
export const SAVE_FORMAT=1;
export const VERSION="0.1.0-beta.13.38";
// Status effects from towers (ticks are 100 ms): Pyre blasts burn, Thornheart poisons (stacking), Arcanum freezes (slow), Hex curses (+35% damage taken).
export const BURN=10,POISON=30,POISON_STACKS=3,SPREAD_HIT=.5,SPREAD_MAX=8,BROOD_REVEAL=30,SPLASH_EDGE=.75,TOWER_BURN=9;
// Enemy health multiplier per difficulty. Gauntlet stars: 3 at 18+ fortress left, 2 at 10+, otherwise 1.
// Boss smash hits every ground troop in reach for 3× the boss attack.
export const SMASH=3;
// A boss breaks a sustained blockade after twelve seconds; its push lasts three seconds.
// Physical-immune non-bosses retain their existing six-second shove rule.
export const BOSS_HOLD_TICKS=120,BOSS_PUSH_TICKS=30,BOSS_WARN_TICKS=20;
// Below 40% health a boss cracks: any immunity drops to 50% resistance, so a one-sided defence can still finish it.
export const CRACK_AT=.4,CRACKED_RESIST=50;
// A boss that leaks costs 3 health, 2 if it is under two-thirds health, 1 if it is under a third.
export const crackable=e=>e.baseArmor>=100||e.baseResist>=100||e.ability==="phase";
export const bossLeakCost=e=>e.hp>e.maxHp*2/3?3:e.hp>e.maxHp/3?2:1;
// Seasons repaint a battlefield (terrain.mjs reads game.map.season). Summer is the original look.
export const SEASONS=["summer","autumn","winter"];
export const DIFFICULTY={easy:.85,normal:1.1,hard:1.45};
// Battlefields. A road is one or more segments; a segment with `next` feeds into that segment where it ends.
// Enemies take turns entering at each entrance. Pads are [x,y,bonus].
const hollowPads=[];for(const y of [47,175,235,365,425,553])for(const x of [220,400,580,760])hollowPads.push([x,y,hollowPads.length===20?"spring":hollowPads.length===7?"height":null]);
export const MAPS={
 hollow:{name:"The Hollow Road",blurb:"One long winding road.",segments:[{pts:[[0,110],[875,110],[875,300],[125,300],[125,490],[1000,490]],next:null}],entrances:[0],commander:[0,.42],pads:hollowPads,rubble:{7:120,13:70,18:70},labels:[["THE HOLLOW ROAD",12,82],["VERDANT KEEP",885,548]]},
 confluence:{name:"The Confluence",blurb:"Two roads enter and merge into one before the keep. Shorter roads, so fliers here are a little lighter.",airScale:.85,segments:[{pts:[[0,80],[740,80],[740,200],[210,200],[210,300]],next:2},{pts:[[0,520],[740,520],[740,400],[210,400],[210,300]],next:2},{pts:[[210,300],[1000,300]],next:null}],entrances:[0,1],commander:[2,.3],rubble:{1:120,10:80,13:80},
  pads:[[300,140],[440,140,"height"],[580,140],[320,250],[460,250],[600,250],[860,150],[860,235],[955,140],[300,460],[440,460],[580,460],[320,350],[460,350],[600,350],[860,450],[860,365],[955,460],[105,190],[105,300,"spring"],[105,410]],
  labels:[["NORTH FORD",110,45],["SOUTH FORD",110,570],["THE CONFLUENCE",226,288],["VERDANT KEEP",890,402]]},
 // Winter-only map. The middle leg crosses a frozen lake: ground enemies slow down on the ice, fliers ignore it and are a little tougher here.
 frostfen:{name:"Frostfen Crossing",blurb:"A winter road across a frozen lake. Ground enemies slow down on the ice; fliers don't, and they're tougher here.",seasons:["winter"],airScale:1.15,
  segments:[{pts:[[0,90],[230,90],[230,510],[500,510],[500,90],[770,90],[770,510],[1000,510]],next:null}],entrances:[0],commander:[0,.3],
  ice:[[420,180,580,420]],rubble:{5:120,14:80,20:80},
  pads:[[110,200],[110,320,"spring"],[110,440],[110,550],[190,570],[365,60],[365,170],[365,260,"height"],[365,350],[365,440],[365,570],[635,170],[635,260],[635,350],[635,440],[635,560],[890,60],[890,160],[890,270],[890,380],[960,420]],
  labels:[["FROSTFEN CROSSING",12,62],["THE FROZEN LAKE",430,170],["WINTER KEEP",880,560]]},
 // A mountain pass. The middle leg runs through a tunnel under Greyhorn Peak: ground enemies inside it can't be seen, targeted or blocked; fliers cross over the peak.
 pass:{name:"Greyhorn Pass",blurb:"A mountain road through a tunnel. Ground enemies can't be seen or hit inside it, so guard the far end. Fliers cross over the peak.",airScale:.9,
  segments:[{pts:[[0,90],[640,90],[640,260],[150,260],[150,470],[1000,470]],next:null}],entrances:[0],commander:[0,.6],
  tunnel:[[300,215,520,305]],rubble:{4:120,12:80,17:80},
  pads:[[220,175],[560,175,"height"],[300,46],[480,46],[730,130],[730,230],[860,150],[860,270,"spring"],[960,210],[60,340],[60,440],[250,365],[420,375],[580,360],[730,350],[870,370],[300,555],[520,555],[740,555],[880,555]],
  labels:[["GREYHORN PASS",12,62],["THE TUNNEL",350,250],["MOUNTAIN KEEP",880,430]]},
 // Volcanic caldera. The road spirals in to a keep at the centre. Lava vents [x,y,radius] erupt every VENT_EVERY ticks during waves,
 // scorching ground enemies and your own troops nearby. Fliers are unharmed. Ash palette, no seasons.
 caldera:{name:"Emberfall Caldera",blurb:"The road spirals into a volcano. Lava vents erupt every 15 seconds and scorch ground enemies, and your own troops, standing near them.",seasons:["summer"],palette:"ember",airScale:1.1,
  segments:[{pts:[[0,90],[860,90],[860,510],[140,510],[140,250],[640,250],[640,370],[330,370]],next:null}],entrances:[0],commander:[0,.45],
  vents:[[500,170,90],[480,440,80],[760,330,110]],rubble:{2:120,8:80,13:80},
  pads:[[220,170],[360,170],[640,170],[760,170],[400,440],[560,440],[760,440],[470,310],[560,310],[940,200],[940,330,"height"],[940,450],[60,330],[60,440],[300,40],[600,40],[300,565,"spring"],[550,565],[800,565],[230,440]],
  labels:[["EMBERFALL CALDERA",12,62],["THE CALDERA",400,320],["CALDERA KEEP",300,330]]}
};
// Lava vents erupt every this many ticks of a wave (15 s); the last VENT_WARN ticks before an eruption glow as a warning.
// An eruption takes this share of max health from ground enemies (bosses less) and from troops in its radius.
export const VENT_EVERY=150,VENT_WARN=25,VENT_HIT=.12,VENT_BOSS=.04,VENT_TROOP=.3;
// Ground enemies on ice move at this share of their speed.
export const ICE_SLOW=.7;
// Ticks from a tower firing to its shot landing; matches how long the projectile is drawn.
export const FLIGHT=5,CHAIN_FLIGHT=3;
// A tower's death bursts (Funeral enchantment, Powderkeg Legion) fire at most once per this many ticks, so a mass of dying troops cannot chain-detonate a whole wave.
export const DEATH_BURST_GAP=10;
// Twins (Anointed Procession) doubles a troop tower's numbers; each troop is a lighter token at this share of health and damage.
export const TWIN_SCALE=.7;
const SPARE=new Set(["arcane","strike","mirror","hex"]);
// Star upgrades: permanent perks bought with Gauntlet stars, three ranks each. Rank n costs PERK_COSTS[n-1] stars.
export const PERK_COSTS=[1,2,3];
// Onslaught: in a Gauntlet with this on, the next wave arrives this many ticks after the last one started, cleared road or not.
export const ONSLAUGHT_GAP=300;
// Onslaught holds its next wave while this many waves are still on the road (same cap as calling early).
export const ONSLAUGHT_MAX=3;
// Toxrill slime counters (cap and share of full health per counter) and Torbran's extra red damage per hit, before late-wave scaling.
export const SLIME_MAX=5,SLIME_HP=.03,TORBRAN_BONUS=4,ZOMBIE_LIFE=100;
// Commander abilities: one tap power per commander, during waves, then a cooldown (seconds). Themes follow each card's Scryfall text (checked 2026-11-22).
export const ABILITIES={
 krenko:{name:"Mob Rally",cooldown:40,text:"Create Goblin tokens equal to the goblins you control (at least 3)."},
 talrand:{name:"Drake Squall",cooldown:40,text:"Create three 2/2 flying Drake tokens."},
 omnath:{name:"Mana Bloom",cooldown:60,text:"Gain mana equal to 10% of your unspent mana (40 to 250)."},
 edgar:{name:"Blood Charge",cooldown:45,text:"Create two Vampire tokens, then every Vampire gets a +1/+1 counter (more attack and health)."},
 lightpaws:{name:"Emperor's Aura",cooldown:45,text:"Light-Paws gains an Aura (+8 attack, more health) and wards every troop near her."},
 meren:{name:"Grave Return",cooldown:45,text:"Return your four most recently fallen troops to their towers."},
 teysa:{name:"Lifelink Vigil",cooldown:60,text:"Fully heal every troop and restore 1 fortress health."},
 korvold:{name:"Royal Feast",cooldown:40,text:"Sacrifice your three weakest troops. Each one grows Korvold and draws a card."},
 atraxa:{name:"Proliferate",cooldown:45,text:"Proliferate now: every tower gains a growth counter, Atraxa grows, and every troop gains a ward."},
 toxrill:{name:"Slime Tide",cooldown:45,text:"Put two slime counters on every enemy near Toxrill."},
 torbran:{name:"Red Fell Fury",cooldown:45,text:"Torbran hits every enemy near him for twice his attack, and for 10 seconds the extra red damage is tripled."},
 urza:{name:"Shuffle and Exile",cooldown:50,text:"Draw a card. The next spell you cast costs no mana."},
 heliod:{name:"Sun's Blessing",cooldown:45,text:"Heliod and every troop get a +1/+1 counter, and for 10 seconds troops have lifelink: their hits heal them."},
 wilhelt:{name:"Rotcleave",cooldown:40,text:"Create three decayed Zombie tokens beside Wilhelt."},
 kaalia:{name:"Call of the Vast",cooldown:50,text:"Put an Angel, a Demon and a Dragon onto the field at once, attacking beside Kaalia."},
 urdragon:{name:"Dragon Tempest",cooldown:45,text:"Breathe fire on every enemy near The Ur-Dragon for four times her attack, then draw a card."}
};
// Towers that aim at one enemy can switch targeting.
export const TARGET_MODES=["first","last","strong","close"],AIMED=["arcane","strike","splash","chain","hex","root","mirror"];
export const PERKS={
 W:{name:"White Mastery",color:"W",text:"White towers: +8% damage and +10% troop health per rank."},
 U:{name:"Blue Mastery",color:"U",text:"Blue towers: +8% damage and +10% troop health per rank."},
 B:{name:"Black Mastery",color:"B",text:"Black towers: +8% damage and +10% troop health per rank."},
 R:{name:"Red Mastery",color:"R",text:"Red towers: +8% damage and +10% troop health per rank."},
 G:{name:"Green Mastery",color:"G",text:"Green towers: +8% damage and +10% troop health per rank."},
 treasury:{name:"War Chest",text:"Start each run with +30 mana per rank."},
 spellcraft:{name:"Spellcraft",text:"Spells cost 5% less mana per rank."},
 command:{name:"Commander Training",text:"Your commander gets +10% health and damage per rank."}
};
export function createEngine(seed=1,mode="campaign",mapId="hollow"){
 if(!Object.hasOwn(MAPS,mapId))mapId="hollow";
 const M=MAPS[mapId],W=1000,H=600,tickMs=100;
 // Each segment owns its own stretch of the progress number line, with a gap between segments.
 const segs=[];{let off=0;for(const s of M.segments){const pts=s.pts,lengths=pts.slice(1).map((p,i)=>Math.abs(p[0]-pts[i][0])+Math.abs(p[1]-pts[i][1])),len=lengths.reduce((a,b)=>a+b,0);segs.push({pts,lengths,len,off,next:s.next});off+=len+600;}}
 for(const s of segs){let t=0,n=s.next;while(n!=null){t+=segs[n].len;n=segs[n].next;}s.tail=t;}
 const exitSeg=segs.find(s=>s.next==null),distance=exitSeg.off+exitSeg.len,path=segs[0].pts,routeLength=segs[M.entrances[0]].len+segs[M.entrances[0]].tail;
 const pads=M.pads.map(([x,y,bonus],id)=>({id,x,y,bonus:bonus||null}));
 const segOf=p=>{let s=segs[0];for(const t of segs)if(p>=t.off)s=t;return s;};
 // Road left to walk before the keep. Targeting "first" means the least road left.
 const remaining=p=>{const s=segOf(p);return Math.max(0,s.off+s.len-p)+s.tail;};
 const junction=s=>s.next!=null?s.off+s.len:s.off;
 const clampRoad=p=>{const s=segOf(p);return Math.max(s.off,Math.min(s.off+s.len,p));};
 // Troops and the commander walk to a target, through the junction when it is on another segment.
 function stepToward(p,target,speed){target=clampRoad(target);const a=segOf(p),b=segOf(target);if(a===b){const d=target-p;return p+Math.sign(d)*Math.min(speed,Math.abs(d));}const j=junction(a);if(p===j)return junction(b);return p+Math.sign(j-p)*Math.min(speed,Math.abs(j-p));}
 const commanderStart=segs[M.commander[0]].off+Math.round(segs[M.commander[0]].len*M.commander[1]);
 const roster={};
 function tower(id,name,color,cost,kind,range,interval,damage,role,more={}){roster[id]={name,color,cost,kind,range,interval,damage,role,...more};}
 tower("legion","Legion Hall","W",95,"troops",150,15,8,"Armored soldiers block the road.",{cap:3,hp:70});
 tower("chapel","Dawn Chapel","W",105,"heal",170,12,12,"Heals and wards nearby troops.");
 tower("judgment","Judgment Spire","W",120,"strike",200,12,28,"Long-range physical strikes ignore half armor.");
 tower("arcanum","Arcanum","U",100,"arcane",165,10,16,"Frost magic freezes ground and flying enemies, slowing them.");
 tower("library","Arcane Library","U",110,"draw",0,95,0,"Draws cards during battle when hand has room.");
 tower("mirror","Mirrorworks","U",130,"mirror",165,18,16,"Copies a nearby offensive tower's basic attack power.");
 tower("necropolis","Necropolis","B",105,"troops",150,9,6,"Rapid undead reinforcements; death triggers.",{cap:4,hp:32});
 tower("foundry","Soul Foundry","B",100,"soul",180,45,0,"Nearby deaths earn mana; periodically sacrifices a weak troop.");
 tower("hex","Hex Sanctum","B",105,"hex",175,12,12,"Curses enemies to receive extra damage.");
 tower("pyre","Pyre Battery","R",125,"splash",178,17,32,"Physical blast against groups of ground enemies. Sets them on fire.");
 tower("goblin","Goblin Warcamp","R",90,"troops",160,8,10,"Fast, fragile goblin fighters.",{cap:4,hp:30});
 tower("storm","Storm Engine","R",135,"chain",190,18,25,"Lightning jumps across nearby enemies.");
 tower("grove","Mana Grove","G",85,"farm",0,20,0,"Steady mana all wave long, up to a fixed harvest per wave.",{income:3});
 tower("beast","Beast Den","G",150,"troops",180,24,25,"Durable beasts with growing attack power.",{cap:2,hp:160});
 tower("thorn","Thornheart","G",115,"root",155,14,18,"Roots grounded enemies and poisons them. Poison stacks.");
 const branches={"legion":[["Knight Vanguard","Royal Paladins","Heavier troops with shields and stronger melee.",{"hp":0.65,"melee":0.25,"ward":16}],["Legion Swarm","Grand Battalion","Additional soldiers and faster reinforcement.",{"cap":2,"haste":0.22,"melee":0.3,"hp":0.25}]],"chapel":[["Divine Protection","Sanctuary of Dawn","Stronger healing and wards.",{"heal":0.4,"ward":14}],["Holy Retribution","Solar Judgment","Smite the foremost enemy during healing pulses.",{"smite":55}]],"judgment":[["Titan Slayer","Godpiercer","Bonus damage to Titans and armor, with full armor penetration.",{"boss":0.65,"pierce":1}],["Radiant Barrage","Crown of Arrows","Fire a second bolt at tier III and a third bolt at tier IV.",{"extra":1,"extraPower":0.55}]],"arcanum":[["Deep Freeze","Absolute Winter","Longer slows and short roots on targets.",{"slow":10,"root":4}],["Archmage","Aether Archon","More magical damage and range.",{"power":0.38,"range":25}]],"library":[["Grand Archivist","Infinite Archives","Draw faster; return a spent non-recursion spell when library is empty.",{"haste":0.4,"recycle":1}],["Chronomancer","Clockwork Athenaeum","Accelerate nearby tower cooldowns.",{"accelerate":5,"aura":150}]],"mirror":[["Endless Reflections","Hall of Echoes","Reflect attacks onto a second enemy.",{"extra":1,"extraPower":0.55}],["Spell Amplifier","Prismatic Nexus","Amplified copied damage and longer range.",{"power":0.45,"range":25}]],"necropolis":[["Undead Legion","Gravehost","More undead and faster respawning.",{"cap":2,"haste":0.25}],["Lich Citadel","Sepulchral Monarch","Innate death blasts; Blood Artist amplifies them.",{"death":30}]],"foundry":[["Soul Harvester","Soul Vault","Earn more mana from nearby deaths.",{"soul":0.35}],["Sacrificial Altar","Altar of the Void","Sacrifice more frequently; sacrifice releases a blast.",{"haste":0.35,"altar":75}]],"hex":[["Spreading Curse","Plague Cathedral","Curse and damage multiple enemies around the target.",{"spread":60}],["Doom Sigil","Final Omen","Higher damage and longer curse; extra damage against bosses.",{"power":0.3,"boss":0.35,"curse":25}]],"pyre":[["Inferno Cannon","Solar Furnace","Blasts burn far longer.",{"burn":15}],["Siege Artillery","Worldbreaker","Larger explosions and greater armored-target damage.",{"radius":30,"armor":0.4}]],"goblin":[["Goblin Horde","Goblin King’s Warband","Larger, faster-spawning goblin horde.",{"cap":2,"haste":0.28}],["Bomb Brigade","Powderkeg Legion","Goblin deaths create explosive bursts.",{"death":35}]],"storm":[["Chain Tempest","Living Storm","More chain targets and wider jump radius.",{"chains":2,"radius":40}],["Thunderstrike","Heaven’s Hammer","Concentrated high damage and boss bonus.",{"power":0.45,"boss":0.35}]],"grove":[["Ancient Worldtree","Worldroot","Larger per-wave harvest budget.",{"farmCap":0.25}],["Mana Nexus","Leyline Convergence","Faster harvesting and modest extra capacity.",{"farmRate":0.65,"farmCap":0.08}]],"beast":[["Beast Pack","Primal Stampede","More beasts with rapid reinforcement.",{"cap":2,"haste":0.25}],["Colossal Titan","Ancient Behemoth","Massive beasts with greater health and damage.",{"hp":0.8,"melee":0.55,"giant":1}]],"thorn":[["Grasping Forest","Elder Wildwood","Roots spread around the target.",{"spread":65,"root":7}],["Venom Thicket","Nightshade Heart","Poison stacks twice as high and lasts longer.",{"burn":40,"power":0.2}]]};
 function branchSpec(t){return t?.branch?branches[t.kind][t.branch==="A"?0:1]:null;}
 function bonus(t,k){const v=branchSpec(t)?.[3][k]||0;return v*(t.tier===4?1.6:1);}
 // Crown of Arrows gains an actual third target at tier IV rather than just a fractional bonus.
 function extraShots(t){return t.kind==="judgment"&&t.branch==="B"&&t.tier===4?2:Math.floor(bonus(t,"extra"));}
 function branchName(t){const b=branchSpec(t);return b?b[t.tier===4?1:0]:roster[t.kind].name;}
 // [role in the wave, card type line · power/toughness, short name for alerts]
 const enemyCards={raider:["Raider","Creature — Goblin Warrior · 2/2"],runner:["Runner","Creature — Human Monk · 1/2"],armored:["Armored brute","Creature — Treefolk Warrior · 2/10"],wing:["Flier","Creature — Zombie Bird · 2/2"],mage:["Spellcaster","Creature — Human Wizard Sorcerer · 1/1"],regen:["Regenerator","Creature — Troll · 5/5"],titan:["Titan","Creature — Giant · 6/6"],stalker:["Shrouded stalker","Creature — Human Rogue · 1/1"],warden:["Magic-immune warden","Artifact Creature — Turtle Warrior · 4/4"],golem:["Physical-immune juggernaut","Artifact Creature — Juggernaut · */*"],grimgut:["Boss, wave 5","Legendary Creature — Human · 3/3","Lovisa"],matron:["Boss, wave 10","Legendary Creature — Faerie Wizard · 5/5","Oona"],colossus:["Boss, wave 15","Artifact Creature — Golem · 11/11","Darksteel Colossus"],hierophant:["Boss, wave 20","Legendary Creature — Angel · 7/7","Iona"],tyrant:["Final boss, wave 25","Legendary Creature — Eldrazi · 15/15","Emrakul"]};
 const types={raider:{hp:38,speed:12,armor:0,resist:0,reward:9,attack:6},runner:{hp:27,speed:19,armor:0,resist:0,reward:10,attack:5},armored:{hp:95,speed:8,armor:45,resist:5,reward:16,attack:12},wing:{hp:42,speed:16,armor:0,resist:15,reward:12,attack:0,flying:true},mage:{hp:62,speed:11,armor:5,resist:45,reward:15,attack:18},regen:{hp:120,speed:9,armor:10,resist:15,reward:20,attack:15,regen:2},titan:{hp:650,speed:5,armor:30,resist:25,reward:120,attack:45,boss:true},
  stalker:{hp:45,speed:16,armor:0,resist:10,reward:12,attack:6,shroud:true,name:"Invisible Stalker",trait:"Shrouded: towers can only target it near a Judgment Spire, Hex Sanctum or your troops, or for 3 s after any damage reveals it."},
  warden:{hp:110,speed:9,armor:25,resist:100,reward:18,attack:14,name:"Kappa Cannoneer",trait:"Immune to magic damage."},
  golem:{hp:150,speed:7,armor:100,resist:20,reward:20,attack:16,name:"Darksteel Juggernaut",trait:"Immune to physical damage (Godpiercer still hurts it)."},
  grimgut:{hp:1300,speed:6,armor:25,resist:10,reward:150,attack:30,boss:true,ability:"warcry",name:"Lovisa Coldeyes",trait:"Boss. Every 8 s, a war cry hastes nearby enemies for 3 s."},
  matron:{hp:1600,speed:6,armor:10,resist:35,reward:200,attack:30,boss:true,shroud:true,ability:"brood",name:"Oona, Queen of the Fae",trait:"Boss. Shrouded, and every 8 s she births two Invisible Stalkers (up to 8)."},
  colossus:{hp:1900,speed:4,armor:100,resist:30,reward:260,attack:60,boss:true,name:"Darksteel Colossus",trait:"Boss. Immune to physical damage. Troops can only hold it for a few seconds. Cracks below 40% health: immunity drops to 50% resistance."},
  hierophant:{hp:2050,speed:5,armor:30,resist:100,reward:320,attack:45,boss:true,ability:"silence",name:"Iona, Shield of Emeria",trait:"Boss. Immune to magic. Every 10 s marks the two nearest towers, then silences them for 4 s. Cracks below 40% health: immunity drops to 50% resistance."},
  tyrant:{hp:3200,speed:4,armor:40,resist:40,reward:500,attack:70,boss:true,ability:"phase",name:"Emrakul, the Aeons Torn",trait:"Final boss. Every 8 s, after a warning, swaps between physical immunity and magic immunity. Cracks below 40% health: immunity drops to 50% resistance."}
 };
 for(const [k,t] of Object.entries(types))t.name=t.name||({raider:"Goblin Raider",runner:"Monastery Swiftspear",armored:"Indomitable Ancients",wing:"Carrion Crow",mage:"Prodigal Sorcerer",regen:"Mossbridge Troll",titan:"Primeval Titan"})[k];
 // Every enemy is a real Magic card (names, type lines and power/toughness checked on Scryfall). Stats and abilities are the game's own; the card is the look.
 // Non-enumerable, so they stay out of each enemy's copied state (save files and replays are unchanged apart from the name).
 for(const [k,c] of Object.entries(enemyCards))Object.defineProperties(types[k],{role:{value:c[0]},card:{value:c[1]},short:{value:c[2]||types[k].name}});
 // Hand-designed Gauntlet: traits arrive gradually, a named boss closes every fifth wave.
 const campaign=[
  "raider:10","raider:12 runner:6","armored:7 raider:12","wing:7 runner:12","raider:12 armored:8 wing:6 grimgut:1",
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
  toxrill:{name:"Toxrill, the Corrosive",color:"B",colors:"B",archetype:"Slime counters",hp:380,damage:24,desc:"Every 10 seconds, puts a slime counter on every enemy (up to 5 each). Each counter weakens its attack and eats away its health. Slimed enemies that die leave a Slug token (up to 8)."},
  torbran:{name:"Torbran, Thane of Red Fell",color:"R",colors:"R",archetype:"Red damage",hp:320,damage:16,desc:"Red towers and red troops deal extra damage on every hit (+4, growing with later waves)."},
  urza:{name:"Urza, Lord High Artificer",color:"U",colors:"U",archetype:"Artifacts",hp:240,damage:10,desc:"Brings a Construct token that grows with every tower you control and returns 20 seconds after it falls. Each wave, your towers tap for 4 mana each (up to 60)."},
  heliod:{name:"Heliod, Sun-Crowned",color:"W",colors:"W",archetype:"Lifegain",hp:300,damage:14,desc:"Every 10 seconds, every troop gains life (heals 25%), and each time that happens your three strongest troops get a +1/+1 counter (up to 5 each). Heliod gains +3 attack each time (up to +200). Indestructible: comes back twice as fast after falling."},
  wilhelt:{name:"Wilhelt, the Rotcleaver",color:"B",colors:"UB",archetype:"Zombies",hp:260,damage:14,desc:"Whenever a troop from your towers dies, create a 2/2 Zombie token with decayed: it crumbles after 10 seconds (up to 10). Every 10 seconds, sacrifices a Zombie to draw a card."},
  kaalia:{name:"Kaalia of the Vast",color:"R",colors:"RWB",archetype:"Angels, Demons, Dragons",hp:280,damage:18,desc:"Every 12 seconds while she is fighting, puts an Angel, a Demon or a Dragon onto the field attacking beside her (one of each at most)."},
  urdragon:{name:"The Ur-Dragon",color:"R",colors:"WUBRG",archetype:"Dragons",hp:500,damage:40,desc:"Flies over the road: every 1.5 seconds breathes fire on the 3 leading enemies in reach, fliers included, for triple damage to bosses. Does not block."}
 };
 // Card types checked against Scryfall (2026-11-22). Talrand reacts to instants and sorceries; Light-Paws to Auras and Equipment.
 const TYPES={legion:"Instant",ward:"Instant",rally:"Sorcery",twins:"Enchantment",valor:"Enchantment",inquiry:"Sorcery",reflection:"Sorcery",echo:"Instant",freeze:"Sorcery",reset:"Instant",raise:"Enchantment — Aura",offering:"Instant",recall:"Sorcery",funeral:"Creature — Vampire",deathmark:"Sorcery",meteor:"Sorcery",flame:"Sorcery",cascade:"Sorcery",lightning:"Sorcery",bloodrush:"Instant",wild:"Enchantment — Aura",root:"Instant",bloom:"Creature — Beast",verdant:"Enchantment",awaken:"Creature — Spirit",prism:"Legendary Artifact",resonance:"Artifact",matrix:"Artifact — Equipment",forge:"Artifact Creature — Construct",blade:"Artifact — Equipment"};
 for(const [id,type] of Object.entries(TYPES))cards[id].type=type;
 const isInstantOrSorcery=id=>/^(Instant|Sorcery)$/.test(cards[id]?.type),ENCHANTMENTS=Object.keys(TYPES).filter(id=>/Aura|Equipment/.test(TYPES[id])),TOKEN_CAP={goblin:12,drake:8,vampire:10,slug:8,construct:1,zombie:10,angel:1,demon:1,dragon:1};
 const commanderReach=220,commanderRespawn=200;
 const defaultDeck=["meteor","wild","legion","inquiry","funeral","offering","twins","echo","freeze","raise","resonance","reset","cascade","ward","root","recall","matrix","forge","valor","bloom","flame","rally","reflection","deathmark","bloodrush","lightning","verdant","awaken","prism","blade"];
 const stats={hazardDamage:0,damage:0,towerDamage:0,troopDamage:0,deathDamage:0,spellDamage:0,manaEarned:0,farmMana:0,killMana:0,waveMana:0,earlyMana:0,earlyCalls:0,soulMana:0,spellMana:0,sandboxMana:0,commanderMana:0,commanderDamage:0,commanderArmyDamage:0,returns:0,sacrifices:0,spent:0,refunds:0,kills:0,leaks:0,summoned:0,fallen:0,casts:0,draws:0,triggers:0,healing:0,control:0,blockedEnemyTicks:0,bossBlockedTicks:0,commanderBlockedTicks:0,commanderArmyBlockedTicks:0};
 const state={locked:[],rubble:mode==="sandbox"?{}:{...(M.rubble||{})},onslaught:false,perks:null,mapId,initialMode:["campaign","endless","sandbox"].includes(mode)?mode:"campaign",seed:seed>>>0,rng:seed>>>0||1,mode:["campaign","endless","sandbox"].includes(mode)?mode:"campaign",tick:0,wave:0,phase:"ready",mana:350,health:20,towers:{},enemies:[],troops:[],queue:[],nextSpawn:0,nextId:1,stats,events:[],sequence:0,commands:[],library:[],hand:[],discard:[],deck:defaultDeck.slice(),echo:false,prism:0,storm:0,fallen:[],waveHistory:[],towerHistory:[], farmPaid:{}, soulPaid:{}, pendingWaves:[], lastWaveTick:0, bonusDeadline:0, lastWaveSpawned:false, waveCalls:[], commander:null, difficulty:"normal", season:M.seasons?.[0]||"summer", stars:0, cmdOwner:{id:"cmd",uid:0,damage:0,troopDamage:0,summons:0}, cmdSummons:0, enemyKills:{}, enemyLeaks:{}, cardCasts:{}, effects:[], projectiles:[],inFlight:[]};
 const d2=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;
 const perk=k=>state.perks?.[k]||0;
 function rand(){let x=state.rng;x^=x<<13;x^=x>>>17;x^=x<<5;return state.rng=x>>>0;}
 function shuffle(a){for(let i=a.length-1;i>0;i--){const j=rand()%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
 // Tunnels (map.tunnel): ground enemies on this stretch of road are out of sight. Nothing can target, hit or block them there.
 function deep(n){if(!M.tunnel)return false;const q=pointAt(n);return M.tunnel.some(r=>q.x>=r[0]&&q.x<=r[2]&&q.y>=r[1]&&q.y<=r[3]);}
 function inTunnel(e){return !e.flying&&!!M.tunnel&&deep(e.progress);}
 function onIce(e){if(e.flying||!M.ice)return false;const q=pointAt(e.progress);return M.ice.some(r=>q.x>=r[0]&&q.x<=r[2]&&q.y>=r[1]&&q.y<=r[3]);}
 function pointAt(n){const s=segOf(n),{pts,lengths}=s;let p=Math.max(0,Math.min(s.len,n-s.off));for(let i=0;i<lengths.length;i++){if(p<=lengths[i]){const [x,y]=pts[i],[a,b]=pts[i+1];return {x:x+Math.sign(a-x)*p,y:y+Math.sign(b-y)*p};}p-=lengths[i];}const [x,y]=pts.at(-1);return {x,y};}
 function nearestPath(x,y){let best=Infinity,result=0;for(const s of segs){let travel=s.off;for(let i=0;i<s.lengths.length;i++){const [a,b]=s.pts[i],[c,d]=s.pts[i+1],l=s.lengths[i],t=Math.max(0,Math.min(l,(x-a)*Math.sign(c-a)+(y-b)*Math.sign(d-b))),dd=d2(pointAt(travel+t),{x,y});if(dd<best){best=dd;result=travel+t;}travel+=l;}}return result;}
 function emit(type,data={}){state.events.push({seq:++state.sequence,tick:state.tick,type,...data});if(state.events.length>200)state.events.shift();}
 function shot(kind,a,b,target=null){state.projectiles.push({kind,x:a.x,y:a.y,tx:b.x,ty:b.y,targetId:target?.id??null,targetFlying:!!target?.flying,start:state.tick,duration:kind==="chain"||kind==="melee"?CHAIN_FLIGHT:FLIGHT});if(state.projectiles.length>240)state.projectiles.shift();}
 function effect(x,y,color,r=28){state.effects.push({x,y,color,r,until:state.tick+7});if(state.effects.length>100)state.effects.shift();}
 function earn(amount,why,t){state.mana+=amount;stats.manaEarned+=amount;stats[why+"Mana"]+=amount;if(t)t.mana+=amount;emit("mana",{amount,why,tower:t?.id??null});}
 function spend(amount){if(state.mana<amount)return false;state.mana-=amount;stats.spent+=amount;return true;}
 function draw(n=1){for(let i=0;i<n&&state.hand.length<5&&state.library.length;i++){state.hand.push(state.library.shift());stats.draws++;emit("draw",{card:state.hand.at(-1)});}}
 function resetDeck(deck){state.deck=deck.slice();state.library=shuffle(deck.slice());state.hand=[];state.discard=[];draw(4);}
 resetDeck(defaultDeck);
 // Late-game power: spells, burns, troops, death blasts and commanders grow with enemy health so they stay relevant in Endless.
 // Troops can't hurt physical-immune enemies, so they only hold one for 6 seconds before it shoves past for 3.
 const logPush=(k,v,cap=80)=>{const a=state[k]||(state[k]=[]);a.push(v);if(a.length>cap)a.shift();};
 // Tower shots land when their projectile arrives (FLIGHT ticks, the projectile's draw time). Splash and spreads hit where the target is then,
 // or where it was if it already died; single-target shots at a dead enemy fizzle. Each record is plain data so saves and replays keep it.
 function alive(id){return state.enemies.find(x=>x.id===id&&x.hp>0&&!x.escaped)||null;}
 function land(rec){const t=state.towers[rec.tower],target=alive(rec.target);if(target&&rec.inc)target.incoming=Math.max(0,(target.incoming||0)-rec.inc);if(!t||t.uid!==rec.uid)return;
 const d=roster[t.kind],p=pads[t.id];
 const k=d.kind,tier=t.tier,range=d.range+(p.bonus==="height"?30:0)+bonus(t,"range"),power=Math.round((d.damage+t.growth*6)*[1,1.8,3.3,8][tier-1]*(1+bonus(t,"power"))*(1+.08*perk(d.color)))*(t.matrixUntil>state.tick?2:1),hitPower=e=>power*(1+(e.boss?bonus(t,"boss"):0)+(e.armor>0?bonus(t,"armor"):0));
 const e=target,q=e?enemyPos(e):{x:rec.x,y:rec.y};
 if(k==="arcane"&&e){hurt(e,power,true,t);e.slowUntil=state.tick+12+Math.floor(bonus(t,"slow"));if(bonus(t,"root"))e.rootUntil=Math.max(e.rootUntil,state.tick+Math.floor(bonus(t,"root")));t.control++;stats.control++;}
 if(k==="strike"&&e)hurt(e,hitPower(e),false,t,bonus(t,"pierce")?2:true);
 if(k==="splash")for(const x of area(q,60+8*tier+bonus(t,"radius")))if(!x.flying){hurt(x,x===e?hitPower(x):Math.round(hitPower(x)*SPLASH_EDGE),false,t);const burn=BURN+Math.floor(bonus(t,"burn"));if(state.tick+burn>=x.burnUntil){x.burnUntil=state.tick+burn;x.burnSource=t.uid;}}
 if(k==="chain")for(const [n,id] of (rec.chain||[]).entries()){const x=alive(id);if(x)hurt(x,Math.max(1,Math.round(hitPower(x)*Math.pow(.78,n))),true,t);}
 if(k==="hex"){for(const x of bonus(t,"spread")?area(q,bonus(t,"spread")):e?[e]:[]){x.curseUntil=state.tick+35+Math.floor(bonus(t,"curse"));hurt(x,hitPower(x),true,t);}}
 if(k==="root"){for(const x of bonus(t,"spread")?area(q,bonus(t,"spread")).filter(x=>!x.flying).sort((a,b)=>(a===e?-1:b===e?1:0)||d2(enemyPos(a),q)-d2(enemyPos(b),q)||a.id-b.id).slice(0,SPREAD_MAX):e?[e]:[]){x.rootUntil=state.tick+7+tier*2+Math.floor(bonus(t,"root"));hurt(x,x===e?power:Math.round(power*SPREAD_HIT),false,t);const venom=bonus(t,"burn")?1:0;const live=x.poisonUntil>state.tick?x.poisonStacks:0;x.poisonStacks=x===e||!bonus(t,"spread")?Math.min(POISON_STACKS+3*venom,live+1):Math.max(live,1);x.poisonUntil=state.tick+POISON+20*venom;x.poisonSource=t.uid;stats.control++;t.control++;}}
 if(k==="mirror"&&e){const other=Object.values(state.towers).filter(o=>["arcane","strike","splash","chain","hex","root"].includes(roster[o.kind].kind)&&d2(pads[o.id],p)<=200**2).sort((a,b)=>roster[b.kind].damage*b.tier-roster[a.kind].damage*a.tier||a.id-b.id)[0];hurt(e,other?Math.round(roster[other.kind].damage*other.tier*(.8+.35*tier)*(1+bonus(t,"power"))):power,true,t);if(other)stats.triggers++;}
 if(rec.extra){const nx=extraShots(t);for(const [j,id] of rec.extra.entries()){const x=alive(id);if(x)hurt(x,power*(j<nx?bonus(t,"extraPower"):.6),k==="mirror",t);}}
 effect(q.x,q.y,({W:"#f5df9e",U:"#76bdf1",B:"#ba8ad8",R:"#f7a564",G:"#8ed28e"})[d.color],k==="splash"?60:18);
 }
 function expectHit(e,raw,magic,pierce){const r=magic?e.resist:e.armor*(pierce===2?0:pierce?.5:1);return r>=100?0:Math.floor(raw*(100-r)/100*(e.curseUntil>state.tick||e.markUntil>state.tick?1.35:1));}
 function holdable(e){if((!e.boss&&e.baseArmor<100)||e.kind==="titan")return true;if(e.pushUntil>state.tick)return false;
  if(e.heldAt!==state.tick){e.held=e.heldAt===state.tick-1?(e.held||0)+1:1;e.heldAt=state.tick;
   const limit=e.baseArmor>=100?60:BOSS_HOLD_TICKS;
   if(e.boss&&e.held===limit-BOSS_WARN_TICKS){const q=enemyPos(e);effect(q.x,q.y,"#f7ac63",54);emit("bossAbility",{boss:e.kind,ability:"breakthroughWarning"});}
   if(e.held>=limit){e.held=0;e.pushUntil=state.tick+(e.boss?BOSS_PUSH_TICKS:30);
    if(e.boss){const q=enemyPos(e);effect(q.x,q.y,"#f46f41",72);emit("bossAbility",{boss:e.kind,ability:"breakthrough"});}return false;}}
  return true;}
 // Commander health keeps pace with later waves (enemy hits grow with the square root of the wave scale).
 function scaleCommander(){const cm=state.commander;if(!cm)return;const base=commanders[cm.id].hp*(1+.1*perk("command")),want=Math.round(base*late(.4)),had=cm.baseHp||Math.round(base);if(want>had){cm.maxHp+=want-had;if(!cm.dead)cm.hp+=want-had;cm.baseHp=want;}}
 function late(k=.8){return Math.pow(scale(Math.max(1,state.wave)),k);}
 function commanderAlive(id){const c=state.commander;return !!c&&!c.dead&&(!id||c.id===id);}
 function castCost(id){if(state.freeCast)return 0;const c=cards[id]?.cost??0;return Math.round(c*(1-.05*perk("spellcraft")));}
 function makeToken(model,hp,damage,flier=false){hp=Math.round(hp*late(.6));damage=Math.round(damage*late(.8));const c=state.commander;if(!c||state.troops.length>=220||state.troops.filter(u=>u.source==="cmd"&&u.model===model&&u.hp>0).length>=TOKEN_CAP[model])return false;state.troops.push({id:state.nextId++,source:"cmd",sourceUid:0,hp,maxHp:hp,progress:c.progress,next:state.tick+5,damage,revived:false,model,ward:0,flier});stats.summoned++;state.cmdOwner.summons++;emit("summon",{source:"cmd"});return true;}
 // Toxrill: each slime counter (up to 5) takes 10% off the enemy's attack and 4% of its full health.
 function slime(e,n=1){for(let i=0;i<n&&e.hp>0&&(e.slime||0)<SLIME_MAX;i++){e.slime=(e.slime||0)+1;e.attack=Math.max(1,Math.round(e.attack*.9));const before=stats.commanderDamage;hurt(e,Math.max(1,Math.round(e.maxHp*SLIME_HP)),false,null,2,"commander");state.commander.damage+=stats.commanderDamage-before;if(e.hp===0)state.commander.kills++;}}
 function zombie(){if(!makeToken("zombie",40,14))return false;state.troops.at(-1).expires=state.tick+ZOMBIE_LIFE;return true;}
 function counter(u){if((u.counters||0)>=5)return;u.counters=(u.counters||0)+1;const add=Math.round(12*late(.6));u.maxHp+=add;u.hp+=add;u.damage+=Math.round(3*late(.8));}
 const KAALIA_CALLS=[["angel",120,18,true],["demon",220,28,false],["dragon",150,30,true]];
 function urzaConstruct(){const n=Object.keys(state.towers).length;return makeToken("construct",80+20*n,10+3*n);}
 function useAbility(){const cm=state.commander,id=cm.id,q=pointAt(cm.progress);
  if(id==="krenko"){const n=Math.max(3,state.troops.filter(u=>u.source==="cmd"&&u.model==="goblin"&&u.hp>0).length);let made=0;for(let i=0;i<n;i++)if(makeToken("goblin",30,8))made++;return made>0;}
  if(id==="talrand"){let made=0;for(let i=0;i<3;i++)if(makeToken("drake",40,14,true))made++;return made>0;}
  if(id==="omnath"){earn(Math.max(40,Math.min(250,Math.floor(state.mana*.1))),"commander");return true;}
  if(id==="edgar"){makeToken("vampire",30,10);makeToken("vampire",30,10);for(const u of state.troops)if(u.source==="cmd"&&u.model==="vampire"&&u.hp>0){const add=Math.round(10*late(.6));u.maxHp+=add;u.hp+=add;u.damage+=Math.round(4*late(.8));}cm.growth=Math.min(200,cm.growth+4);return true;}
  if(id==="lightpaws"){if(cm.voltron<15){cm.voltron++;cm.growth+=8;const add=Math.round(40*late(.6));cm.maxHp+=add;cm.hp+=add;}for(const u of state.troops)if(u.hp>0&&d2(pointAt(u.progress),q)<=200*200)u.ward=Math.max(u.ward,30);effect(q.x,q.y,"#f5df9e",200);return true;}
  if(id==="meren"){let n=0;for(let i=state.fallen.length-1;i>=0&&n<4;i--){const u=state.fallen[i],t=state.towers[u.source];if(!t||t.uid!==u.sourceUid||roster[t.kind].kind!=="troops")continue;if(!makeTroop(t,{hp:u.hp,damage:u.damage,model:u.model,revived:true}))break;state.fallen.splice(i,1);n++;}return n>0;}
  if(id==="teysa"){for(const u of state.troops)if(u.hp>0){stats.healing+=u.maxHp-u.hp;u.hp=u.maxHp;}state.health=Math.min(20,state.health+1);effect(q.x,q.y,"#f5df9e",120);return true;}
  if(id==="korvold"){const weak=state.troops.filter(u=>u.hp>0&&!u.dead).sort((a,b)=>a.hp-b.hp||a.id-b.id).slice(0,3);for(const u of weak)die(u,true);return weak.length>0;}
  if(id==="atraxa"){for(const t of Object.values(state.towers))t.growth=Math.min(10,t.growth+1);cm.growth=Math.min(200,cm.growth+4);for(const u of state.troops)if(u.hp>0)u.ward=Math.max(u.ward,20);stats.triggers++;return true;}
  if(id==="toxrill"){const hit=area(q,220);for(const e of hit)slime(e,2);effect(q.x,q.y,"#ba8ad8",220);return hit.length>0;}
  if(id==="torbran"){cm.furyUntil=state.tick+100;const dmg=Math.round((cm.attack+cm.growth)*late()*(1+.1*perk("command"))*2),before=stats.commanderDamage;for(const e of area(q,160)){hurt(e,dmg,false,null,false,"commander");if(e.hp===0)cm.kills++;}cm.damage+=stats.commanderDamage-before;effect(q.x,q.y,"#f7a564",160);return true;}
  if(id==="urza"){draw(1);state.freeCast=true;return true;}
  if(id==="heliod"){for(const u of state.troops)if(u.hp>0)counter(u);cm.growth=Math.min(200,cm.growth+3);state.lifelinkUntil=state.tick+100;effect(q.x,q.y,"#f5df9e",160);return true;}
  if(id==="wilhelt"){let n=0;for(let i=0;i<3;i++)if(zombie())n++;return n>0;}
  if(id==="kaalia"){let n=0;for(const c of KAALIA_CALLS)if(makeToken(...c))n++;return n>0;}
  if(id==="urdragon"){const hit=area(q,210);if(!hit.length)return false;const dmg=Math.round((cm.attack+cm.growth)*late()*(1+.1*perk("command"))*4);const before=stats.commanderDamage;for(const e of hit){hurt(e,e.boss?dmg*2:dmg,true,null,false,"commander");if(e.hp===0)cm.kills++;}cm.damage+=stats.commanderDamage-before;effect(q.x,q.y,"#f7a564",210);draw(1);return true;}
  return false;}
 // A hurt commander steps back behind nearby troops and heals there; with no troops around it stands and fights.
const RETREAT_AT=.35,RETREAT_UNTIL=.7,RETREAT_REGEN=.005,RETREAT_LOOK=140;
function commanderSpot(cm){
  if(cm.retreat&&(cm.hp>=cm.maxHp*RETREAT_UNTIL||!state.enemies.some(e=>e.hp>0&&!e.flying&&!e.escaped&&Math.abs(e.progress-cm.target)<=RETREAT_LOOK)))cm.retreat=0;
  if(!cm.retreat&&cm.hp<cm.maxHp*RETREAT_AT&&state.enemies.some(e=>e.hp>0&&!e.flying&&!e.escaped&&Math.abs(e.progress-cm.progress)<=60)){
    const line=state.troops.filter(u=>u.hp>0&&!u.flier&&Math.abs((u.source==="cmd"?cm.target:u.progress)-cm.progress)<=RETREAT_LOOK).map(u=>u.source==="cmd"?cm.target:u.progress);
    if(line.length){const spot=Math.min(distance-10,Math.max(...line)+30);if(spot>cm.progress+8){cm.retreat=spot;stats.commanderRetreats=(stats.commanderRetreats||0)+1;emit("commanderRetreat",{id:cm.id});}}
  }
  return cm.retreat||cm.target;
}
function commanderPos(){return pointAt(state.commander.progress);}
 function farmMultiplier(t){return (pads[t.id].bonus==="spring"?1.35:1)*(1+Math.min(3,t.growth)*.1);}
 function farmLimit(t){return Math.floor([22,65,165,400][t.tier-1]*farmMultiplier(t)*(1+bonus(t,"farmCap")));}
 // Soul Foundry income is capped per wave, like Mana Groves, so troop death loops cannot snowball mana.
 // Waves called while others are still on the road share one budget: one wave's worth for every wave started since the road was last clear.
 // (Older saves have no groupWaves; the waves still on the road stand in.)
 const groupWaves=()=>Math.max(1,state.groupWaves??state.pendingWaves?.length??1);
 function soulBudget(t){return Math.floor([40,80,140,220][t.tier-1]*(1+bonus(t,"soul"))*groupWaves());}
 function farmBudget(t){return farmLimit(t)*groupWaves();}
 // Groves pace their per-wave budget over the time the road should take to clear, so they keep paying all wave instead of
 // filling up in the first ~15 seconds and going quiet. The estimate is how long the slowest enemy needs to walk out unimpeded,
 // so it stretches on its own while enemies are held up. Whatever is still unpaid when the road clears is paid then (harvestRest).
 let roadMemo=-1,roadLeft=0;
 function roadTicksLeft(){if(roadMemo===state.tick)return roadLeft;roadMemo=state.tick;let most=0;
  const entry=Math.max(...M.entrances.map(i=>remaining(segs[i].off)));
  for(const v of state.queue){const sp=types[v.kind]?.speed||1;most=Math.max(most,(v.due||state.tick)-state.tick+entry/sp);}
  for(const e of state.enemies){if(e.hp>0&&!e.escaped)most=Math.max(most,remaining(e.progress)/Math.max(1,e.slowUntil>state.tick?(e.speed||1)/2:e.speed||1));}
  return roadLeft=most;}
 // A grove that stood through the whole wave group gets the rest of its budget when the road clears. One built or upgraded
 // mid-group keeps the old rule (it paces what time is left), so a last-second build cannot claim a full wave's harvest.
 function harvestRest(){for(const t of Object.values(state.towers)){if(roster[t.kind].kind!=="farm"||(t.harvestFrom??0)>(state.groupStart??0))continue;const left=farmBudget(t)-(state.farmPaid[t.id]||0);if(left>0){state.farmPaid[t.id]=(state.farmPaid[t.id]||0)+left;earn(left,"farm",t);}}}
 function upgradeCost(t){return t.tier>=4?null:Math.floor(roster[t.kind].cost*[1.4,4.2,17][t.tier-1]);}
 function branchOptions(t){return branches[t.kind].map((b,i)=>({id:i===0?"A":"B",name:b[0],ultimate:b[1],description:b[2]}));}
 function enemyPos(e){return pointAt(e.progress);}
 // First priority is distance travelled along the road, not x/y position or distance to the tower.
 const firstOrder=(a,b)=>remaining(a.progress)-remaining(b.progress)||a.id-b.id;
 // The enemy in `list` that passes `ok` and comes first in firstOrder: the same pick as list.filter(ok).sort(firstOrder)[0],
 // in one pass. Troops run this every tick, so it matters with big armies.
 function frontmost(list,ok){let best=null,left=0;for(const e of list){if(!ok(e))continue;const r=remaining(e.progress);if(!best||r<left||(r===left&&e.id<best.id)){best=e;left=r;}}return best;}
 // Targeting modes a player can pick per tower. Ties fall back to First.
 const TARGET_ORDERS={first:()=>firstOrder,last:()=>(a,b)=>remaining(b.progress)-remaining(a.progress)||a.id-b.id,strong:()=>(a,b)=>b.hp-a.hp||firstOrder(a,b),close:o=>(a,b)=>d2(enemyPos(a),o)-d2(enemyPos(b),o)||firstOrder(a,b)};
 function firstEnemy(origin,range,groundOnly=false,damage=null,mode="first",spare=false){let best=null;const order=Object.hasOwn(TARGET_ORDERS,mode)?TARGET_ORDERS[mode](origin):firstOrder;for(const e of state.enemies){if(e.hp<=0||e.escaped||!e.revealed||inTunnel(e)||(groundOnly&&e.flying)||(damage==="magic"&&e.resist>=100)||(damage==="physical"&&e.armor>=100)||d2(enemyPos(e),origin)>range*range||(spare&&(e.incoming||0)>=e.hp))continue;if(!best||order(e,best)<0)best=e;}return best;}
 function scale(w){return Math.min(1e8,Math.round((1+Math.max(0,w-5)*.24)*Math.pow(1.12,Math.max(0,Math.min(w,25)-10))*Math.pow(1.18,Math.max(0,w-25))*100)/100);}
 function spawnEnemy(kind,w){if(types[kind].boss)state.bossSpawns=(state.bossSpawns||0)+1;const def=types[kind],hp=Math.ceil(def.hp*scale(w)*(DIFFICULTY[state.difficulty]||1)*(def.flying?M.airScale||1:1));state.enemies.push({id:state.nextId++,wave:w,kind,...def,hp,maxHp:hp,attack:Math.ceil(def.attack*Math.sqrt(scale(w))),progress:segs[M.entrances[(state.spawned=(state.spawned||0)+1)%M.entrances.length]].off,slowUntil:0,rootUntil:0,curseUntil:0,markUntil:0,hasteUntil:0,revealed:!def.shroud,abilityAt:0,phase:def.ability==="phase"?"iron":null,phaseAt:0,baseArmor:def.armor,baseResist:def.resist,burnUntil:0,burnSource:null,poisonUntil:0,poisonStacks:0,poisonSource:null,nextAttack:0});}
 // At most three waves can be on the road at once, so early calls cannot stack a whole campaign into one fight.
 function canCallEarly(){return state.phase==="active"&&(state.pendingWaves?.length||0)<3&&(state.mode!=="campaign"||state.wave<25)&&state.queue.length+state.enemies.length<3000;}
 function earlyBonus(){return canCallEarly()&&state.lastWaveSpawned?Math.max(0,Math.min(40,Math.ceil(40*(state.bonusDeadline-state.tick)/Math.max(1,state.bonusDeadline-state.lastWaveTick)))):0;}
 function earlySeconds(){return Math.max(0,Math.ceil((state.bonusDeadline-state.tick)/10));}
 function startWave(early=false,auto=false){
 const bonus=early&&!auto?earlyBonus():0;state.wave++;state.phase="active";scaleCommander();if(commanderAlive("urza")){earn(Math.min(60,4*Object.keys(state.towers).length),"commander");urzaConstruct();}
 const spacing=Math.max(2,7-Math.floor(state.wave/9));
 const next=shuffle(waveSpec(state.wave).flatMap(s=>{const [k,n]=s.split(":");return Array(Number(n)).fill(k).map(kind=>({kind,wave:state.wave}));}));
 next.forEach((v,i)=>v.due=state.tick+1+i*spacing);
 state.groupWaves=early?(state.groupWaves??state.pendingWaves.length)+1:1;
 if(early){state.queue.push(...next);state.queue.sort((a,b)=>a.due-b.due||a.wave-b.wave);if(!auto)stats.earlyCalls++;if(bonus){earn(bonus,"early");}}
 else{state.queue=next;state.storm=0;state.farmPaid={};state.soulPaid={};state.groupStart=state.tick;}
 state.pendingWaves=early?[...state.pendingWaves,state.wave]:[state.wave];
 state.early=early;state.lastWaveTick=state.tick;state.bonusDeadline=state.tick+Math.max(200,next.length*spacing+80);state.lastWaveSpawned=false;
 state.waveCalls.push({wave:state.wave,tick:state.tick,early,bonus,...(auto?{auto:true}:{})});if(state.waveCalls.length>120)state.waveCalls.shift();
 draw();emit("waveStart",{wave:state.wave,early,bonus});
 if(state.commander){const c=state.commander,max=Math.round((commanders[c.id].hp+40*(c.voltron||0))*late(.6)*(1+.1*perk("command")));c.hp=Math.min(max,c.hp+Math.max(0,max-c.maxHp));c.maxHp=max;}
 }
 function hurt(e,raw,magic,t,pierce=false,source=t?"tower":"spell"){if(e.hp<=0)return;if(t&&t!==state.cmdOwner&&roster[t.kind]?.color==="R"&&commanderAlive("torbran"))raw+=Math.round(TORBRAN_BONUS*late()*(state.commander.furyUntil>state.tick?3:1));e.exposedUntil=state.tick+30;const resistance=magic?e.resist:e.armor*(pierce===2?0:pierce?.5:1);if(resistance>=100){stats.immuneHits=(stats.immuneHits||0)+1;stats.immuneDamage=(stats.immuneDamage||0)+Math.round(raw);if(t){t.immuneHits=(t.immuneHits||0)+1;}return;}if(resistance>0){const lost=Math.round(raw*Math.min(resistance,100)/100);stats.resistedDamage=(stats.resistedDamage||0)+lost;if(t)t.resisted=(t.resisted||0)+lost;}const n=Math.min(e.hp,Math.max(1,Math.floor(raw*(100-resistance)/100*(e.curseUntil>state.tick||e.markUntil>state.tick?1.35:1))));e.hp-=n;stats.damage+=n;stats[source+"Damage"]+=n;if(t&&t===state.cmdOwner)stats.commanderArmyDamage+=n;if(t){t.damage+=n;t[source+"Damage"]=(t[source+"Damage"]||0)+n;}if(e.hp===0){stats.kills++;state.enemyKills[e.kind]=(state.enemyKills[e.kind]||0)+1;earn(e.reward,"kill");if(e.markUntil>state.tick)earn(6,"spell");if(e.slime&&commanderAlive("toxrill"))makeToken("slug",24,6);emit("enemyKilled",{id:e.id,source:t?.id??null});}}
 function area(q,r){return state.enemies.filter(e=>e.hp>0&&!inTunnel(e)&&d2(enemyPos(e),q)<=r*r);}
 function troopCap(t){const d=roster[t.kind];return (d.cap+t.tier-1+Math.floor(bonus(t,"cap")))*(t.twins?2:1);}
 // Barracks are fully manned the moment they are built or upgraded between waves, so their fighters are always visible.
 function muster(t){if(state.phase==="active"||roster[t.kind].kind!=="troops")return;let n=state.troops.filter(u=>u.source===t.id&&u.hp>0).length;while(n<troopCap(t)&&makeTroop(t))n++;}
 // Troops leave their tower, reach the road at the nearest point, then run to the rally.
const TROOP_EXIT=4,TROOP_T4=1.6,TROOP_LATE=.75;
function troopDoor(t){if(t.door==null){const p=pads[t.id];t.door=Math.round(nearestPath(p.x,p.y));}return t.door;}
function makeTroop(t,opts={}){if(state.troops.length>=220)return false;const def=roster[t.kind];if(def.kind!=="troops")return false;const hp=opts.hp??Math.round(late(.6)*((def.hp+30*(t.tier-1))*(t.construct?1.6:1)*(1+bonus(t,"hp"))+(t.blade?40:0))*(1+.1*perk(def.color))*(t.twins?TWIN_SCALE:1)*(t.tier===4?TROOP_T4:1)),damage=opts.damage??Math.round(late(TROOP_LATE)*(def.damage+5*(t.tier-1)+t.growth*4)*(1+bonus(t,"melee"))*(t.blade?1.4:1)*(1+.08*perk(def.color))*(t.twins?TWIN_SCALE:1)*(t.tier===4?TROOP_T4:1));state.troops.push({id:state.nextId++,source:t.id,sourceUid:t.uid,hp,maxHp:hp,progress:troopDoor(t),next:state.tick+5,leave:state.tick+TROOP_EXIT,damage,revived:!!opts.revived,model:opts.model||(bonus(t,"giant")?"bloom":t.construct?"construct":t.kind),ward:Math.round(bonus(t,"ward"))});stats.summoned++;t.summons++;if(opts.revived)stats.returns++;emit("summon",{source:t.id});if(commanderAlive("edgar")&&++state.cmdSummons%3===0)makeToken("vampire",30,10);return true;}
 // A death is processed once; explosions can kill enemies but cannot cause more friendly deaths.
 // Provenance and per-tick entity caps keep the supported trigger graph finite.
 // Bosses stop for whoever blocks them and smash every ground troop (and the commander) within reach.
 function smash(e){const reach=32,hit=Math.round(e.attack*SMASH);for(const u of state.troops){if(u.hp<=0||u.flier||Math.abs(u.progress-e.progress)>reach)continue;const absorbed=Math.min(u.ward,hit);u.ward-=absorbed;u.hp=Math.max(0,u.hp-hit+absorbed);if(!u.hp)die(u);}
  const cm=state.commander;if(cm&&!cm.dead&&cm.id!=="urdragon"&&Math.abs(cm.progress-e.progress)<=reach){cm.hp=Math.max(0,cm.hp-hit);if(!cm.hp){cm.dead=true;cm.deaths++;logPush("commanderDeaths",{wave:state.wave,tick:state.tick,by:e.kind,boss:true,at:Math.round(cm.progress),maxHp:cm.maxHp},40);cm.respawnAt=state.tick+(cm.id==="heliod"?commanderRespawn/2:commanderRespawn);emit("commanderFall",{id:cm.id});}}
  e.nextAttack=state.tick+14;state.effects.push({x:pointAt(e.progress).x,y:pointAt(e.progress).y,r:reach+8,color:"#e0573f",until:state.tick+5});emit("bossSmash",{id:e.id});}
 function die(u,sacrificed=false){if(u.dead)return;u.dead=true;u.hp=0;if(u.source!=="cmd"&&commanderAlive("wilhelt"))zombie();stats.fallen++;if(state.fallen.length>=200)state.fallen.shift();state.fallen.push({source:u.source,sourceUid:u.sourceUid,hp:u.maxHp,damage:u.damage,model:u.model,revived:u.revived});emit(sacrificed?"sacrifice":"creatureDeath",{source:u.source,id:u.id});if(sacrificed){stats.sacrifices++;if(commanderAlive("korvold")){state.commander.growth=Math.min(200,state.commander.growth+4);draw(1);}}const source=state.towers[u.source],q=pointAt(u.progress);if(!source)return;const mult=(source.resonance?2:1)*(commanderAlive("teysa")?2:1);if((source.funeral||bonus(source,"death"))&&state.tick>=(source.burstReady||0)){source.burstReady=state.tick+DEATH_BURST_GAP;for(let i=0;i<mult;i++){for(const e of area(q,94))hurt(e,Math.round(((source.funeral?24+source.tier*5:0)+bonus(source,"death"))*late(.5)*(source.twins?TWIN_SCALE:1)),true,source,false,"death");stats.triggers++;}effect(q.x,q.y,"#c19be9",94);emit("deathExplosion",{source:source.id,count:mult});}for(const t of Object.values(state.towers))if(t.kind==="foundry"&&d2(pads[t.id],q)<=roster.foundry.range**2){const room=soulBudget(t)-(state.soulPaid[t.id]||0),gain=Math.max(0,Math.min(room,Math.floor((8+5*t.tier)*mult*(1+bonus(t,"soul")))));if(gain){earn(gain,"soul",t);state.soulPaid[t.id]=(state.soulPaid[t.id]||0)+gain;}stats.triggers+=mult;}}
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
  if(id==="lightning"){const first=frontmost(state.enemies,e=>e.hp>0&&!e.escaped&&!inTunnel(e)&&d2(enemyPos(e),q)<=150*150);if(first){let n=0,from={x:q.x,y:0};const hit=new Set();for(let e=first;e&&n<6;n++){hit.add(e.id);const pos=enemyPos(e);shot("chain",from,pos,e);from=pos;hurt(e,Math.round(90*Math.pow(.85,n)*late()),true,null);e=frontmost(state.enemies,x=>x.hp>0&&!x.escaped&&!inTunnel(x)&&!hit.has(x.id)&&d2(enemyPos(x),pos)<=120*120);}}effect(q.x,q.y,"#ffe27a",60);}
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
 if(c.type==="ability"&&state.phase==="active"&&commanderAlive()&&state.tick>=(state.commander.abilityAt||0)&&useAbility()){state.commander.abilityAt=state.tick+ABILITIES[state.commander.id].cooldown*10;state.commander.abilities=(state.commander.abilities||0)+1;emit("commanderAbility",{id:state.commander.id});ok=true;}
 // Towers the player has not reached the level for yet. Set once, before wave 1; never in the Proving Grounds.
 if(c.type==="locks"&&state.mode!=="sandbox"&&state.wave===0&&state.phase==="ready"&&!Object.keys(state.towers).length&&Array.isArray(c.towers)){state.locked=[...new Set(c.towers.filter(k=>typeof k==="string"&&Object.hasOwn(roster,k)))];ok=true;}
 if(c.type==="unlock"&&state.locked?.includes(c.kind)){state.locked=state.locked.filter(k=>k!==c.kind);ok=true;}
 if(c.type==="onslaught"&&state.mode==="campaign"&&state.wave===0&&state.phase==="ready"){state.onslaught=!!c.on;ok=true;}
 if(c.type==="perks"&&state.wave===0&&state.phase==="ready"&&state.mode!=="sandbox"&&!state.perks&&!Object.keys(state.towers).length&&c.perks&&typeof c.perks==="object"){const p={};for(const k of Object.keys(PERKS)){const n=c.perks[k];if(Number.isInteger(n)&&n>=1&&n<=3)p[k]=n;}state.perks=p;state.mana+=30*perk("treasury");const cm=state.commander;if(cm){cm.maxHp=cm.hp=Math.round(commanders[cm.id].hp*(1+.1*perk("command")));}emit("perks",{perks:p});ok=true;}
 if(c.type==="season"&&state.wave===0&&state.phase==="ready"&&SEASONS.includes(c.season)&&(!M.seasons||M.seasons.includes(c.season))){state.season=c.season;emit("season",{season:c.season});ok=true;}
 if(c.type==="difficulty"&&state.wave===0&&state.phase==="ready"&&state.mode!=="sandbox"&&Object.hasOwn(DIFFICULTY,c.level)){state.difficulty=c.level;emit("difficulty",{level:c.level});ok=true;}
 if(c.type==="continue"&&state.phase==="won"){state.mode="endless";state.phase="ready";ok=true;}
 if(!["ready","active"].includes(state.phase)&&!ok)return false;
 if(c.type==="wave"&&state.phase==="ready"){startWave();ok=true;}
 if(c.type==="early"&&canCallEarly()){startWave(true);ok=true;}
 if(c.type==="clear"&&p&&state.rubble?.[p.id]&&state.phase!=="won"&&state.phase!=="lost"&&spend(state.rubble[p.id])){const cost=state.rubble[p.id];delete state.rubble[p.id];emit("clear",{pad:p.id,cost});ok=true;}
 if(c.type==="build"&&p&&!t&&!state.rubble?.[p.id]&&!state.locked?.includes(c.kind)&&Object.hasOwn(roster,c.kind)&&spend(roster[c.kind].cost)){const d=roster[c.kind];state.towers[p.id]={id:p.id,uid:state.nextId++,kind:c.kind,tier:1,branch:null,paid:d.cost,next:state.tick+1,rally:nearestPath(p.x,p.y),mana:0,damage:0,summons:0,healing:0,control:0,draws:0,growth:0,matrixUntil:0,builtWave:state.wave,harvestFrom:state.tick};emit("build",{pad:p.id,kind:c.kind});muster(state.towers[p.id]);ok=true;}
 if(c.type==="upgrade"&&t){const n=upgradeCost(t),choice=t.tier===2; if(n!==null&&(!choice||["A","B"].includes(c.branch))&&(!c.branch||choice)&&spend(n)){if(choice)t.branch=c.branch;t.paid+=n;t.tier++;(t.upgrades||(t.upgrades=[])).push(state.wave);emit("upgrade",{pad:t.id,tier:t.tier,branch:t.branch});muster(t);ok=true;}}
 if(c.type==="sell"&&t){const amount=Math.floor(t.paid*.7);state.mana+=amount;stats.refunds+=amount;state.towerHistory.push({...t,sold:true,soldWave:state.wave});delete state.towers[p.id];state.troops=state.troops.filter(u=>u.source!==p.id);emit("sell",{pad:p.id,amount});ok=true;}
 if(c.type==="target"&&t&&AIMED.includes(roster[t.kind].kind)&&TARGET_MODES.includes(c.mode)){t.target=c.mode;ok=true;}
 if(c.type==="rally"&&t&&roster[t.kind].kind==="troops"&&Number.isFinite(c.x)&&Number.isFinite(c.y)){const pos=nearestPath(c.x,c.y);if(!deep(pos)&&d2(pointAt(pos),p)<=roster[t.kind].range**2){t.rally=pos;ok=true;}}
 if(c.type==="commander"&&state.wave===0&&state.phase==="ready"&&(c.id===null||Object.hasOwn(commanders,c.id))){const d=commanders[c.id];state.commander=d?{id:c.id,hp:Math.round(d.hp*(1+.1*perk("command"))),maxHp:Math.round(d.hp*(1+.1*perk("command"))),attack:d.damage,growth:0,progress:commanderStart,target:commanderStart,next:0,dead:false,respawnAt:0,kills:0,damage:0,deaths:0,voltron:0}:null;emit("commander",{id:c.id});ok=true;}
 if(c.type==="commanderMove"&&state.commander&&Number.isFinite(c.x)&&Number.isFinite(c.y)&&c.x>=0&&c.y>=0&&c.x<=W&&c.y<=H&&!deep(Math.round(nearestPath(c.x,c.y)))){state.commander.target=Math.round(nearestPath(c.x,c.y));state.commander.retreat=0;if(state.phase!=="active"&&!state.commander.dead)state.commander.progress=state.commander.target;ok=true;}
 if(c.type==="deck"&&state.wave===0&&state.phase==="ready"&&Array.isArray(c.deck)&&c.deck.length===30&&c.deck.every(k=>Object.hasOwn(cards,k))&&c.deck.every(k=>c.deck.filter(x=>x===k).length<=3)){resetDeck(c.deck);ok=true;}
 if(c.type==="cast"&&Number.isInteger(c.index)){const id=state.hand[c.index],spec=cards[id];if(spec&&allowedTarget(id,c)&&spend(castCost(id))){const free=!!state.freeCast;state.freeCast=false;const copy=(state.echo||state.prism>0)&&COPYABLE.includes(id);state.hand.splice(c.index,1);state.storm++;stats.casts++;state.cardCasts[id]=(state.cardCasts[id]||0)+1;logPush("castLog",{card:id,wave:state.wave,tick:state.tick,cost:free?0:castCost(id),mana:state.mana,enemies:state.enemies.length,damage0:stats.damage},80);emit("spellCast",{card:id});if(copy){if(state.echo)state.echo=false;else state.prism--;}resolve(id,c);if(copy)resolve(id,c,true);state.discard.push(id);if(commanderAlive("talrand")&&isInstantOrSorcery(id))makeToken("drake",40,14,true);if(commanderAlive("lightpaws")&&ENCHANTMENTS.includes(id)&&state.commander.voltron<15){const c=state.commander;c.voltron++;c.growth+=8;const add=Math.round(40*late(.6));c.maxHp+=add;c.hp+=add;}ok=true;}}
 if(c.type==="discard"&&Number.isInteger(c.index)&&state.hand[c.index]){state.discard.push(state.hand.splice(c.index,1)[0]);ok=true;}
 if(state.mode==="sandbox"){
  if(c.type==="sandboxMana"&&Number.isInteger(c.amount)&&c.amount>0&&c.amount<=1000000){earn(c.amount,"sandbox");ok=true;}
  if(c.type==="sandboxCard"&&Object.hasOwn(cards,c.card)&&state.hand.length<5){state.hand.push(c.card);ok=true;}
  if(c.type==="sandboxEnemy"&&Object.hasOwn(types,c.enemy)&&Number.isInteger(c.count)&&c.count>0&&c.count<=50&&state.enemies.length+c.count<=300){if(state.phase==="ready"){state.phase="active";state.early=true;}for(let i=0;i<c.count;i++){spawnEnemy(c.enemy,Math.max(1,state.wave));state.enemies.at(-1).progress+=i*15;}ok=true;}
  if(c.type==="sandboxClear"){state.enemies=[];state.queue=[];state.pendingWaves=[];state.phase="ready";ok=true;}
  if(c.type==="sandboxHeal"){state.health=20;ok=true;}
 }
 if(ok){state.commands.push({tick:state.tick,command:JSON.parse(JSON.stringify(c))});if(state.commands.length>20000)state.commands.shift();}return ok;
 }
 function onslaughtLeft(){return state.onslaught&&state.mode==="campaign"&&state.wave>=1&&state.wave<25&&["ready","active"].includes(state.phase)?Math.max(0,state.lastWaveTick+ONSLAUGHT_GAP-state.tick):null;}
 function step(){
 // Onslaught keeps the clock running between waves and sends the next wave on time.
 if(state.phase==="ready"&&onslaughtLeft()!==null){state.tick++;if(onslaughtLeft()===0)startWave();return;}
 if(state.phase!=="active")return;if(onslaughtLeft()===0&&state.pendingWaves.length<ONSLAUGHT_MAX)startWave(true,true);state.tick++;state.effects=state.effects.filter(e=>e.until>state.tick);state.projectiles=state.projectiles.filter(e=>e.start+e.duration>state.tick);
 if(M.vents&&state.tick%VENT_EVERY===0)for(const [vx,vy,vr] of M.vents){const at={x:vx,y:vy};effect(vx,vy,"#ff7a2e",vr);emit("eruption",{x:vx,y:vy});
  for(const e of state.enemies)if(e.hp>0&&!e.flying&&!e.escaped&&d2(enemyPos(e),at)<=vr*vr)hurt(e,Math.round(e.maxHp*(e.boss?VENT_BOSS:VENT_HIT)),false,null,2,"hazard");
  for(const u of state.troops)if(u.hp>0&&!u.dead&&!u.flier&&d2(pointAt(u.progress),at)<=vr*vr){u.hp=Math.max(0,u.hp-Math.ceil(u.maxHp*VENT_TROOP));if(!u.hp)die(u);}}
 for(let n=0;n<8&&state.queue.length&&state.queue[0].due<=state.tick;n++){const v=state.queue.shift();spawnEnemy(v.kind,v.wave);if(v.wave===state.wave)state.lastWaveSpawned=true;}
 for(const e of state.enemies){if(e.hp<=0)continue;if(e.regen&&state.tick%10===0)e.hp=Math.min(e.maxHp,e.hp+e.regen);if(e.burnUntil>state.tick&&state.tick%5===0){const source=e.burnSource,owner=source===null?null:Object.values(state.towers).find(t=>t.uid===source)||state.towerHistory.find(t=>t.uid===source);hurt(e,Math.round((source===null?12:TOWER_BURN)*late()),true,owner||null,false,source===null?"spell":"tower");}
  // Poison stacks, ignores armor, and wears off all at once.
  if(e.poisonUntil>state.tick){if(state.tick%5===2&&e.hp>0){const owner=Object.values(state.towers).find(t=>t.uid===e.poisonSource)||state.towerHistory.find(t=>t.uid===e.poisonSource);hurt(e,Math.round(4*e.poisonStacks*late()),false,owner||null,2,"tower");}}else e.poisonStacks=0;}
 const revealers=Object.values(state.towers).filter(t=>["strike","hex"].includes(roster[t.kind].kind)),allies=[...state.troops.filter(u=>u.hp>0).map(u=>pointAt(u.progress)),...(state.commander&&!state.commander.dead?[pointAt(state.commander.progress)]:[])];
 for(const e of state.enemies){if(e.hp<=0)continue;const q=enemyPos(e);if(types[e.kind].shroud)e.revealed=e.exposedUntil>state.tick||revealers.some(t=>d2(pads[t.id],q)<=(roster[t.kind].range+(pads[t.id].bonus==="height"?30:0)+bonus(t,"range"))**2)||allies.some(a=>d2(a,q)<=70*70);
  if(!e.ability||remaining(e.progress)>=routeLength)continue;
  if(e.ability==="warcry"&&state.tick>=e.abilityAt){e.abilityAt=state.tick+80;for(const x of area(q,130))x.hasteUntil=state.tick+30;effect(q.x,q.y,"#e5694f",130);emit("bossAbility",{boss:e.kind,ability:"warcry"});}
  if(e.ability==="brood"&&state.tick>=e.abilityAt&&(e.brood||0)<8){e.abilityAt=state.tick+80;e.exposedUntil=Math.max(e.exposedUntil||0,state.tick+BROOD_REVEAL);e.brood=(e.brood||0)+2;if(state.queue.length+state.enemies.length<2998)for(let i=0;i<2;i++){spawnEnemy("stalker",state.wave);const s2=state.enemies.at(-1);s2.progress=Math.max(segOf(e.progress).off,e.progress-10-i*8);}emit("bossAbility",{boss:e.kind,ability:"brood"});}
  if(e.ability==="silence"){if(!e.silenceAt&&state.tick>=e.abilityAt){e.silenceTargets=Object.values(state.towers).filter(t=>d2(pads[t.id],q)<=260*260).sort((a,b)=>d2(pads[a.id],q)-d2(pads[b.id],q)||a.id-b.id).slice(0,2).map(t=>t.uid);for(const t of Object.values(state.towers))if(e.silenceTargets.includes(t.uid)){t.silenceWarnUntil=state.tick+20;effect(pads[t.id].x,pads[t.id].y,"#c48df0",34);}e.silenceAt=state.tick+20;emit("bossAbility",{boss:e.kind,ability:"silenceWarning"});}
   if(e.silenceAt&&state.tick>=e.silenceAt){for(const t of Object.values(state.towers))if(e.silenceTargets.includes(t.uid)){t.silencedUntil=state.tick+40;stats.silenced=(stats.silenced||0)+1;}e.silenceAt=0;e.abilityAt=state.tick+100;emit("bossAbility",{boss:e.kind,ability:"silence"});}}
  if(e.ability==="phase"){if(!e.phaseAt)e.phaseAt=state.tick+80;if(state.tick===e.phaseAt-15){effect(q.x,q.y,e.phase==="iron"?"#76bdf1":"#d9d3c3",70);emit("bossAbility",{boss:e.kind,ability:"phaseWarning"});}if(state.tick>=e.phaseAt){e.phase=e.phase==="iron"?"spell":"iron";e.phaseAt=state.tick+80;emit("bossAbility",{boss:e.kind,ability:"phase",phase:e.phase});}e.armor=e.phase==="iron"?100:e.baseArmor;e.resist=e.phase==="spell"?100:e.baseResist;if(e.cracked){e.armor=Math.min(e.armor,CRACKED_RESIST);e.resist=Math.min(e.resist,CRACKED_RESIST);}}
 }
 if(state.inFlight.length){const due=state.inFlight.filter(r=>r.at<=state.tick);state.inFlight=state.inFlight.filter(r=>r.at>state.tick);for(const r of due)land(r);}
 for(const t of Object.values(state.towers)){
 const d=roster[t.kind],p=pads[t.id];if(state.tick<t.next)continue;if(t.silencedUntil>state.tick){t.next=t.silencedUntil;continue;}
 const k=d.kind,tier=t.tier,range=d.range+(p.bonus==="height"?30:0)+bonus(t,"range"),power=Math.round((d.damage+t.growth*6)*[1,1.8,3.3,8][tier-1]*(1+bonus(t,"power"))*(1+.08*perk(d.color)))*(t.matrixUntil>state.tick?2:1),hitPower=e=>power*(1+(e.boss?bonus(t,"boss"):0)+(e.armor>0?bonus(t,"armor"):0));
 if(k==="farm"){const left=farmBudget(t)-(state.farmPaid[t.id]||0),speed=(1+bonus(t,"farmRate"))*(commanderAlive("omnath")?1.25:1),rate=Math.floor([3,7,16,34][tier-1]*farmMultiplier(t)*speed),pulses=Math.max(1,Math.floor(roadTicksLeft()/speed/d.interval));let n=0;if(left>0){t.harvestCarry=(t.harvestCarry||0)+left/pulses;n=Math.min(left,rate,Math.floor(t.harvestCarry));t.harvestCarry=Math.min(1,t.harvestCarry-n);}if(n){state.farmPaid[t.id]=(state.farmPaid[t.id]||0)+n;earn(n,"farm",t);}}
 else if(k==="draw"){const before=stats.draws;draw(tier>=3?2:1);if(bonus(t,"recycle")&&!state.library.length&&state.hand.length<5){const i=state.discard.findIndex(id=>!["recall","inquiry","echo","reset"].includes(id));if(i>=0){state.hand.push(state.discard.splice(i,1)[0]);stats.triggers++;stats.draws++;}}if(bonus(t,"accelerate"))for(const o of Object.values(state.towers))if(o!==t&&o.kind!=="library"&&d2(pads[o.id],p)<=bonus(t,"aura")**2)o.next=Math.max(state.tick+1,o.next-Math.floor(bonus(t,"accelerate")));t.draws+=stats.draws-before;}
 else if(k==="troops"){const n=state.troops.filter(u=>u.source===t.id&&u.hp>0).length,cap=troopCap(t);for(let i=0;i<(t.twins?2:1)&&n+i<cap;i++)makeTroop(t);}
 else if(k==="heal"){for(const u of state.troops)if(u.hp>0&&d2(pointAt(u.progress),p)<=range**2){const h=Math.min(Math.round(power*(1+bonus(t,"heal"))),u.maxHp-u.hp);u.hp+=h;u.ward=Math.max(u.ward,tier*4+Math.floor(bonus(t,"ward")));stats.healing+=h;t.healing+=h;if(h>0)shot("heal",{x:p.x,y:p.y-21},pointAt(u.progress));}if(bonus(t,"smite")){const e=firstEnemy(p,range);if(e){hurt(e,bonus(t,"smite"),true,t);shot("strike",{x:p.x,y:p.y-20},enemyPos(e),e);}}}
 else if(k==="soul"){const u=state.troops.filter(u=>u.hp>0&&d2(pointAt(u.progress),p)<=range**2&&u.hp<=u.maxHp*.55).sort((a,b)=>a.hp-b.hp||a.id-b.id)[0];if(u){const q=pointAt(u.progress);die(u,true);if(bonus(t,"altar")){for(const e of area(q,100))hurt(e,bonus(t,"altar"),true,t,false,"death");effect(q.x,q.y,"#ba8ad8",100);}}}
 else {
 const e=firstEnemy(p,range,k==="splash"||k==="root",["arcane","chain","hex","mirror"].includes(k)?"magic":k==="strike"&&bonus(t,"pierce")?null:["strike","splash","root"].includes(k)?"physical":null,t.target,SPARE.has(k));if(!e){t.idle=(t.idle||0)+1;continue;}t.shots=(t.shots||0)+1;const q=enemyPos(e);
 const rec={at:state.tick+(k==="chain"?CHAIN_FLIGHT:FLIGHT),tower:t.id,uid:t.uid,target:e.id,x:q.x,y:q.y};
 if(k==="chain"){let n=0,from={x:p.x,y:p.y-28};rec.chain=[];for(const x of [e,...area(q,110+bonus(t,"radius")).filter(x=>x.id!==e.id).sort(firstOrder)]){if(n++>=tier+2+Math.floor(bonus(t,"chains")))break;const pos=enemyPos(x),to={x:pos.x,y:pos.y-(x.flying?21:8)};shot("chain",from,to,x);from=to;rec.chain.push(x.id);}}
 const reflect=t.reflectUntil>state.tick?1:0;if(extraShots(t)||reflect){const more=state.enemies.filter(x=>x.hp>0&&x.id!==e.id&&!x.escaped&&!inTunnel(x)&&d2(enemyPos(x),p)<=range**2).sort(firstOrder).slice(0,extraShots(t)+reflect);rec.extra=more.map(x=>x.id);for(const x of more)shot(k,{x:p.x,y:p.y-28},enemyPos(x),x);}
 if(SPARE.has(k)){rec.inc=expectHit(e,hitPower(e),k!=="strike",k==="strike"?(bonus(t,"pierce")?2:true):false);e.incoming=(e.incoming||0)+rec.inc;}
 state.inFlight.push(rec);
 if(k!=="chain")shot(k,{x:p.x,y:p.y-28},{x:q.x,y:q.y-(e.flying?21:8)},e);emit("towerAttack",{source:t.id,target:e.id,progress:e.progress});
 }
 t.next=state.tick+(k==="farm"?d.interval:Math.max(t.awakenUntil>state.tick?2:3,Math.round((d.interval-(tier-1)*2)*(1-Math.min(.65,bonus(t,"haste")))*(t.awakenUntil>state.tick?.5:1))));
 }
 const blocked=new Set(),blockOwner=new Map();
 for(const u of state.troops){if(u.hp<=0)continue;if(u.expires&&state.tick>=u.expires){die(u,true);continue;}const cmd=u.source==="cmd",t=cmd?state.cmdOwner:state.towers[u.source];if(!t||(cmd&&!state.commander))continue;const diff=(cmd?(state.commander.retreat?state.commander.target:state.commander.progress)+((u.id%5)-2)*6:t.rally)-u.progress;if(u.leave>state.tick)continue;u.progress=stepToward(u.progress,u.progress+diff,10);const e=frontmost(state.enemies,e=>Math.abs(e.progress-u.progress)<=28&&e.hp>0&&!inTunnel(e)&&(!e.flying||u.flier)&&!blocked.has(e.id));if(!e)continue;if(!e.flying&&holdable(e)){blocked.add(e.id);blockOwner.set(e.id,t);}if(state.tick>=u.next){shot("melee",pointAt(u.progress),enemyPos(e));hurt(e,u.damage,false,t,false,"troop");if(state.lifelinkUntil>state.tick&&u.hp<u.maxHp){const h=Math.min(u.maxHp-u.hp,Math.ceil(u.damage/2));u.hp+=h;stats.healing+=h;}u.next=state.tick+(t.rushUntil>state.tick?4:8);}if(e.hp>0&&state.tick>=e.nextAttack){if(e.boss){smash(e);}else{const absorbed=Math.min(u.ward,e.attack);u.ward-=absorbed;u.hp=Math.max(0,u.hp-e.attack+absorbed);e.nextAttack=state.tick+10;if(!u.hp)die(u);}}}
 const cm=state.commander;
 if(cm&&cm.dead&&state.tick>=cm.respawnAt){cm.dead=false;cm.hp=cm.maxHp;cm.retreat=0;cm.progress=cm.target;emit("commanderReturn",{id:cm.id});}
 if(cm&&!cm.dead){cm.progress=stepToward(cm.progress,commanderSpot(cm),14);if(cm.retreat&&cm.hp<cm.maxHp&&!state.enemies.some(e=>e.hp>0&&!e.flying&&Math.abs(e.progress-cm.progress)<=30))cm.hp=Math.min(cm.maxHp,cm.hp+Math.ceil(cm.maxHp*RETREAT_REGEN));const here=pointAt(cm.progress);
  const power=Math.round((cm.attack+cm.growth)*late()*(1+.1*perk("command")))+(cm.id==="omnath"?Math.min(200,Math.floor(state.mana/50)):0);
  if(cm.id==="krenko"&&state.tick%80===0){const n=Math.max(1,state.troops.filter(u=>u.source==="cmd"&&u.hp>0).length);for(let i=0;i<n;i++)if(!makeToken("goblin",30,8))break;}
  if(cm.id==="meren"&&state.tick%100===0){for(let i=state.fallen.length-1;i>=0;i--){const f=state.fallen[i],t=Object.values(state.towers).find(t=>t.uid===f.sourceUid);if(f.revived||!t)continue;if(makeTroop(t,{hp:f.hp,damage:f.damage,model:f.model,revived:true}))state.fallen.splice(i,1);break;}}
  if(cm.id==="atraxa"&&state.tick%100===0){for(const t of Object.values(state.towers))if((t.prolif||0)<10){t.prolif=(t.prolif||0)+1;t.growth++;}cm.growth=Math.min(200,cm.growth+4);stats.triggers++;}
  if(cm.id==="toxrill"&&state.tick%100===0){for(const e of state.enemies)if(e.hp>0&&!e.escaped&&!inTunnel(e))slime(e,1);}
  if(cm.id==="urza"&&state.tick%200===0&&!state.troops.some(u=>u.source==="cmd"&&u.model==="construct"&&u.hp>0))urzaConstruct();
  if(cm.id==="heliod"&&state.tick%100===0){let healed=false;for(const u of state.troops)if(u.hp>0&&u.hp<u.maxHp){const h=Math.min(u.maxHp-u.hp,Math.ceil(u.maxHp*.25));u.hp+=h;stats.healing+=h;healed=true;}cm.growth=Math.min(200,cm.growth+3);if(healed)for(const u of state.troops.filter(u=>u.hp>0&&(u.counters||0)<5).sort((a,b)=>b.damage-a.damage||a.id-b.id).slice(0,3))counter(u);}
  if(cm.id==="wilhelt"&&state.tick%100===0&&state.hand.length<5){const z=state.troops.find(u=>u.source==="cmd"&&u.model==="zombie"&&u.hp>0);if(z){die(z,true);draw(1);}}
  if(cm.id==="kaalia"&&state.tick%120===0&&state.enemies.some(e=>e.hp>0&&!e.escaped&&!inTunnel(e)&&Math.abs(e.progress-cm.progress)<=60)){for(let i=0;i<3;i++){const c=KAALIA_CALLS[(cm.calls=(cm.calls||0)+1)%3];if(makeToken(...c))break;}}
  if(cm.id==="urdragon"){if(state.tick>=cm.next){const targets=state.enemies.filter(e=>e.hp>0&&!e.escaped&&!inTunnel(e)&&d2(enemyPos(e),here)<=commanderReach**2).sort(firstOrder).slice(0,3);if(targets.length){const before=stats.commanderDamage;for(const x of targets){shot("splash",{x:here.x,y:here.y-30},enemyPos(x),x);hurt(x,power*(x.boss?3:1),true,null,false,"commander");if(x.hp===0)cm.kills++;}cm.damage+=stats.commanderDamage-before;cm.next=state.tick+15;}}}
  else{const near=state.enemies.filter(e=>e.hp>0&&!e.flying&&!inTunnel(e)&&Math.abs(e.progress-cm.progress)<=30).sort(firstOrder),free=near.find(e=>!blocked.has(e.id)),e=free||near[0];
  if(e){if(free&&holdable(e)){blocked.add(e.id);blockOwner.set(e.id,null);}if(state.tick>=cm.next){const before=stats.commanderDamage;shot("melee",here,enemyPos(e));hurt(e,power,false,null,false,"commander");if(e.hp===0)cm.kills++;cm.damage+=stats.commanderDamage-before;cm.next=state.tick+8;}
   if(free&&e.hp>0&&state.tick>=e.nextAttack){if(e.boss)smash(e);else{cm.hp=Math.max(0,cm.hp-e.attack);e.nextAttack=state.tick+10;}if(!cm.hp&&!cm.dead){cm.dead=true;cm.deaths++;logPush("commanderDeaths",{wave:state.wave,tick:state.tick,by:e.kind,at:Math.round(cm.progress),maxHp:cm.maxHp},40);cm.respawnAt=state.tick+(cm.id==="heliod"?commanderRespawn/2:commanderRespawn);emit("commanderFall",{id:cm.id});}}}}}
 // Count enemy-ticks actually denied movement; simultaneous held enemies are each credited once.
  // Troops, commander tokens and the commander are attributed separately.
  for(const e of state.enemies)if(e.hp>0&&blocked.has(e.id)){
   stats.blockedEnemyTicks++;if(e.boss)stats.bossBlockedTicks++;
   const owner=blockOwner.get(e.id);
   if(owner===state.cmdOwner)stats.commanderArmyBlockedTicks++;
   else if(owner){owner.blockTicks=(owner.blockTicks||0)+1;if(e.boss)owner.bossBlockTicks=(owner.bossBlockTicks||0)+1;}
   else stats.commanderBlockedTicks++;
  }
  for(const e of state.enemies){if(e.hp<=0)continue;if(!blocked.has(e.id)&&(e.rootUntil<=state.tick||e.boss)){const base=e.hasteUntil>state.tick?Math.round(e.speed*1.3):e.speed,move=e.slowUntil>state.tick?Math.max(1,Math.floor(base*(e.boss?.75:.5))):base;e.progress+=onIce(e)?Math.max(1,Math.round(move*ICE_SLOW)):move;const s=segOf(e.progress);if(s.next!=null&&e.progress>s.off+s.len)e.progress=segs[s.next].off+(e.progress-s.off-s.len);}if(e.progress>=distance){state.health=Math.max(0,state.health-(e.boss?bossLeakCost(e):1));stats.leaks++;logPush("leakLog",{wave:e.wave,kind:e.kind,tick:state.tick,hpLeft:Math.round(100*e.hp/e.maxHp),slowed:e.slowUntil>state.tick},60);state.enemyLeaks[e.kind]=(state.enemyLeaks[e.kind]||0)+1;e.escaped=true;emit("leak",{id:e.id,cost:e.boss?bossLeakCost(e):1});}}
 for(const e of state.enemies){if(!e.boss)continue;if(!e.bossRec){e.bossRec={kind:e.kind,wave:e.wave,spawnTick:state.tick,maxHp:e.maxHp,stallTicks:0,stuckAt:null};logPush("bossLog",e.bossRec,30);e.lastProg=e.progress;}const r=e.bossRec;if(!e.cracked&&crackable(e)&&e.hp>0&&e.hp<=e.maxHp*CRACK_AT){e.cracked=true;e.armor=Math.min(e.armor,CRACKED_RESIST);e.resist=Math.min(e.resist,CRACKED_RESIST);stats.bossCracks=(stats.bossCracks||0)+1;r.crackedTick=state.tick;emit("bossAbility",{boss:e.kind,ability:"cracked"});}if(e.hp<=0||e.escaped){if(!r.outcome){r.outcome=e.escaped?"leaked":"killed";r.endTick=state.tick;r.seconds=Math.round((state.tick-r.spawnTick)/10);r.hpLeft=Math.round(100*Math.max(0,e.hp)/e.maxHp);}continue;}if(e.progress===e.lastProg){r.stallTicks++;if(r.stallTicks%50===0)r.stuckAt=Math.round(e.progress);}e.lastProg=e.progress;}
 state.troops=state.troops.filter(u=>u.hp>0);state.enemies=state.enemies.filter(e=>e.hp>0&&!e.escaped);
 if(state.health<=0){if(state.mode==="sandbox"){state.health=20;}else{state.phase="lost";emit("gameOver",{won:false});return;}}
 // Each wave is recorded the moment its own enemies are gone, so stacked early calls keep separate results.
 const finishWave=wave=>{earn(35+wave*10,"wave");{const top=Object.values(state.towers).map(t=>[t.id+1,t.damage-(t.waveMark||0)]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,3);for(const t of Object.values(state.towers))t.waveMark=t.damage;logPush("waveTop",{wave,top},60);}state.waveHistory.push({wave,tick:state.tick,mana:state.mana,health:state.health,damage:stats.damage,farmMana:stats.farmMana,spent:stats.spent,kills:stats.kills,leaks:stats.leaks,casts:stats.casts,overlap:state.pendingWaves.length>1});emit("waveComplete",{wave});};
 if(state.pendingWaves?.length>1)for(const wave of state.pendingWaves.slice(0,-1))if(!state.queue.some(v=>v.wave===wave)&&!state.enemies.some(e=>e.wave===wave)){finishWave(wave);state.pendingWaves=state.pendingWaves.filter(w=>w!==wave);}
 if(!state.queue.length&&!state.enemies.length){harvestRest();for(const wave of state.pendingWaves||[])finishWave(wave);state.pendingWaves=[];state.phase=state.mode==="campaign"&&state.wave>=25?"won":"ready";if(state.phase==="ready")for(const t of Object.values(state.towers))muster(t);if(state.phase==="won"&&!state.stars){state.stars=state.health>=18?3:state.health>=10?2:1;emit("gameOver",{won:true,stars:state.stars});}}
 }
 function playtestReport(){
 const s=state;const tl=t=>({upgrades:t.upgrades?.length?t.upgrades:undefined,soldWave:t.soldWave,shots:t.shots||0,idleChecks:t.idle||0,immuneHits:t.immuneHits||undefined,resisted:t.resisted||undefined,blockTicks:t.blockTicks||0,bossBlockTicks:t.bossBlockTicks||0});
 const counts=arr=>arr.reduce((acc,k)=>(acc[k]=(acc[k]||0)+1,acc),{});
 const tower=t=>({pad:t.id+1,kind:roster[t.kind].name,builtWave:t.builtWave,...tl(t),branch:t.branch,specialization:branchName(t),tier:t.tier,sold:!!t.sold,invested:t.paid,damage:t.damage,towerDamage:t.towerDamage||0,troopDamage:t.troopDamage||0,deathDamage:t.deathDamage||0,mana:t.mana,summons:t.summons,blockedSeconds:(t.blockTicks||0)/10,bossBlockedSeconds:(t.bossBlockTicks||0)/10,healing:t.healing,control:t.control,draws:t.draws,growth:t.growth,enchantments:["twins","funeral","resonance","construct","blade"].filter(k=>t[k]),rally:roster[t.kind].kind==="troops"?Math.round(t.rally):undefined,target:t.target||undefined});
 return {game:"ARCHEMANCY",version:VERSION,schema:1,map:s.mapId,season:s.season||"summer",seed:s.seed,initialMode:s.initialMode,mode:s.mode,wave:s.wave,phase:s.phase,simulationSeconds:s.tick/10,health:s.health,mana:s.mana,difficulty:s.difficulty,onslaught:!!s.onslaught,perks:{...(s.perks||{})},stars:s.stars,enemyHealthScale:scale(Math.max(1,s.wave)),stats:{...s.stats},enemyKills:{...s.enemyKills},enemyLeaks:{...s.enemyLeaks},remainingEnemies:counts(s.enemies.filter(e=>e.hp>0&&!e.escaped).map(e=>e.kind)),queuedEnemies:counts(s.queue.map(e=>e.kind)),cardCasts:{...s.cardCasts},spellbook:counts(s.deck),hand:s.hand.slice(),library:s.library.length,graveyard:counts(s.discard),commander:s.commander?{id:s.commander.id,name:commanders[s.commander.id].name,alive:!s.commander.dead,kills:s.commander.kills,damage:s.commander.damage,armyDamage:s.cmdOwner.troopDamage||0,deaths:s.commander.deaths,attack:s.commander.attack+s.commander.growth,tokens:s.troops.filter(u=>u.source==="cmd"&&u.hp>0).length}:null,echoArmed:s.echo,prismCharges:s.prism,towers:Object.values(s.towers).map(tower),soldTowers:s.towerHistory.slice(-30).map(tower),soldTowerCount:s.towerHistory.length,waveHistory:s.waveHistory.slice(-60).map(w=>({...w})),completedWaveCount:s.waveHistory.length,waveCalls:s.waveCalls.map(w=>({...w})),pendingWaves:s.pendingWaves.slice(),leakLog:(s.leakLog||[]).slice(),bossLog:(s.bossLog||[]).map(b=>({...b,seconds:b.seconds??Math.round((s.tick-b.spawnTick)/10)})),commanderDeaths:(s.commanderDeaths||[]).slice(),castLog:(s.castLog||[]).slice(),waveTop:(s.waveTop||[]).slice()};
 }
 // Save and resume. A snapshot is the whole run state as plain JSON; restore only accepts a matching save format and known content.
 function snapshot(){const keep={...state,events:[],effects:[],projectiles:[],commands:state.commands.slice(-400)};return {format:SAVE_FORMAT,version:VERSION,savedAt:Date.now(),state:JSON.parse(JSON.stringify(keep))};}
 function restore(save){try{const s=save?.state;if(save?.format!==SAVE_FORMAT||!s||typeof s!=="object")return false;if((s.mapId||"hollow")!==mapId||!["campaign","endless","sandbox"].includes(s.mode)||!["ready","active"].includes(s.phase))return false;if(!Number.isFinite(s.tick)||!Number.isFinite(s.mana)||!Number.isFinite(s.health)||s.health<=0)return false;
  if(!Object.values(s.towers||{}).every(t=>Object.hasOwn(roster,t.kind)&&pads[t.id]))return false;if(![...(s.hand||[]),...(s.library||[]),...(s.discard||[])].every(id=>Object.hasOwn(cards,id)))return false;if(s.commander&&!Object.hasOwn(commanders,s.commander.id))return false;if(!(s.enemies||[]).every(e=>Object.hasOwn(types,e.kind)))return false;
  const copy=JSON.parse(JSON.stringify(s));for(const k of new Set([...Object.keys(state),...Object.keys(copy)])){if(k==="stats"||k==="__proto__"||k==="constructor"||k==="prototype"||!Object.hasOwn(copy,k))continue;state[k]=copy[k];}Object.assign(stats,copy.stats||{});if(!Object.hasOwn(copy,"rubble"))state.rubble={};if(!SEASONS.includes(state.season)||(M.seasons&&!M.seasons.includes(state.season)))state.season=M.seasons?.[0]||"summer";relinkBossRecords();state.events=[];state.effects=[];state.projectiles=[];return true;}catch{return false;}}
 // A boss's record is shared by the boss and the boss log, so later updates (outcome, stalls, crack) show in the report.
 // A save stores them as two separate copies; reconnect each boss to its own log entry so a resumed run reports them.
 function relinkBossRecords(){const log=state.bossLog||[],used=new Set();for(const e of state.enemies){if(!e.bossRec)continue;const want=JSON.stringify(e.bossRec),i=log.findIndex((b,j)=>!used.has(j)&&JSON.stringify(b)===want);if(i>=0){used.add(i);e.bossRec=log[i];}}}
 return {onslaughtLeft,abilityReady:()=>!!state.commander&&!state.commander.dead&&state.tick>=(state.commander.abilityAt||0),snapshot,restore,commanders,commanderAlive,castCost,commanderRespawn,branchOptions,branchName,bonus,playtestReport,canCallEarly,earlyBonus,earlySeconds,farmLimit,farmBudget,scale,state,map:{id:mapId,get season(){return SEASONS.includes(state.season)?state.season:"summer";},name:M.name,width:W,height:H,path,segments:segs.map(s=>s.pts),spans:segs.map(s=>[s.off,s.off+s.len]),entrances:M.entrances.map(i=>segs[i].pts[0]),keep:{x:exitSeg.pts.at(-1)[0],y:exitSeg.pts.at(-1)[1]},labels:M.labels,seasons:M.seasons||SEASONS,ice:(M.ice||[]).map(r=>({x:r[0],y:r[1],w:r[2]-r[0],h:r[3]-r[1]})),palette:M.palette||null,vents:(M.vents||[]).map(v=>({x:v[0],y:v[1],r:v[2]})),tunnel:(M.tunnel||[]).map(r=>({x:r[0],y:r[1],w:r[2]-r[0],h:r[3]-r[1]})),pads,distance},roster,types,waves,waveSpec,cards,pointAt,nearestPath,inTunnel,upgradeCost,command,step,tickMs};
}
