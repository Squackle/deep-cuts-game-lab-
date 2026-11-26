export const CONFLUENCE_PILOT = {
 id: "troll-ford",
 mapId: "confluence",
 name: "Troll Ford",
 briefing: "Trolls regain health. Concentrate fire where the roads merge, then prepare for flyers in wave 4.",
 waves: [
  "raider:10 runner:2",
  "raider:10 regen:1",
  "runner:8 armored:3 regen:2",
  "raider:12 wing:6",
  "armored:6 runner:9 regen:3",
  "regen:5 armored:8 wing:8"
 ]
};

// Authored phase lineups use enemy:count pairs. Each phase builds pressure over
// its waves and ends with an extra group, while the engine handles spawn order.
const LINEUPS = {
 patrol:"raider:10 runner:3", charge:"runner:12 raider:5", armor:"armored:6 raider:6",
 flight:"wing:9 runner:5", split:"wing:5 armored:4 raider:5", troll:"regen:3 raider:6",
 heavy:"regen:4 armored:5", siege:"armored:8 mage:4 runner:5", shroud:"stalker:5 mage:4 raider:6",
 ward:"warden:4 runner:8", iron:"golem:4 armored:4 raider:6", magic:"mage:6 runner:7",
 mixed:"warden:3 golem:3 wing:5 raider:6", ashes:"golem:3 wing:7 armored:5", rush:"runner:13 wing:5"
};

function phases(specs){
 const waves=[];
 for(const [length,formation,reinforcement] of specs){
  for(let i=0;i<length;i++){
   const lineup=new Map();
   for(const group of LINEUPS[formation].split(" ")){
    const [kind,count]=group.split(":");
    lineup.set(kind,Number(count)+Math.floor(i*Number(count)/length));
   }
   if(i===length-1&&reinforcement){
    const [kind,count]=reinforcement.split(":");
    lineup.set(kind,(lineup.get(kind)||0)+Number(count));
   }
   waves.push([...lineup].map(([kind,count])=>kind+":"+count).join(" "));
  }
 }
 return waves;
}

function entry(mapId,id,name,briefing,specs,rules={}){
 return {mapId,id,name,briefing,waves:phases(specs),...rules};
}
const chapter=(mapId,rows)=>rows.map(([id,name,briefing,specs,rules])=>entry(mapId,id,name,briefing,specs,rules));
const hollow=chapter("hollow",[
 ["road-patrol","Road Patrol","Use the bends to give your towers another shot at the raiders.",[[4,"patrol"],[4,"charge"],[4,"armor","armored:3"]]],
 ["canopy-crossing","Canopy Crossing","Hold a ground defense while flyers cross each bend.",[[4,"armor"],[5,"flight"],[5,"split","wing:6"]]],
 ["the-veiled-road","The Veiled Road","Reveal the stalkers before they reach the last bend.",[[5,"patrol"],[5,"shroud"],[6,"ward","matron:1"]]]
]);
const confluence=chapter("confluence",[
 ["split-current","Split Current","Armor enters from the north; regenerating trolls enter from the south. Plan for both lanes and the merge.",[[4,"patrol"],[5,"heavy"],[5,"split"],[4,"heavy","regen:5"]],{lanes:{armored:0,regen:1}}],
 ["river-watch","River Watch","Place air cover across both approaches, then build for the armored escort at the merge.",[[4,"troll"],[5,"flight"],[5,"armor"],[5,"split","wing:6"]]],
 ["silent-water","Silent Water","Spread your strongest towers before waves of magic-immune enemies and a silencing boss arrive.",[[5,"heavy"],[5,"ward"],[5,"shroud"],[5,"siege","hierophant:1"]]]
]);
const frostfen=chapter("frostfen",[
 ["white-river","White River","Use the ice to slow the ground route while flyers take the same crossings at speed.",[[4,"patrol"],[5,"charge"],[4,"flight"],[3,"split","wing:5"]]],
 ["rimeguard","Rimeguard","Hold armored ground enemies on the ice. Leave enough mana for a second damage type.",[[4,"charge"],[5,"armor"],[5,"iron"],[4,"siege","golem:5"]]],
 ["lanterns-in-the-snow","Lanterns in the Snow","Reveal shrouded enemies near each approach before the northern waves converge.",[[5,"magic"],[5,"shroud"],[5,"flight"],[4,"split","stalker:6"]]],
 ["cold-snap","Cold Snap","Keep ranged towers ready when the freeze takes your blockers out of the fight.",[[5,"armor"],[5,"heavy"],[5,"ward"],[5,"siege","isu:1"]]]
]);
const pass=chapter("pass",[
 ["the-exposed-road","The Exposed Road","Put your longest firing arcs on the visible road outside the tunnel.",[[4,"patrol"],[5,"charge"],[4,"armor"],[3,"charge","runner:8"]]],
 ["under-the-ridge","Under the Ridge","Set troop rallies near the tunnel exits where blockers can intercept enemies again.",[[5,"charge"],[5,"troll"],[5,"armor"],[3,"heavy","regen:4"]]],
 ["sky-over-greyhorn","Sky Over Greyhorn","Keep anti-air in range while your ground defenses watch the exits.",[[4,"siege"],[5,"flight"],[5,"rush"],[5,"split","wing:8"]]],
 ["tyrant-at-the-gate","Tyrant at the Gate","Prepare for Kazuul to add more armored escorts to the enemies emerging from the pass.",[[5,"armor"],[5,"iron"],[5,"shroud"],[5,"siege","kazuul:1"]]]
]);
const caldera=chapter("caldera",[
 ["vent-watch","Vent Watch","Read each vent warning and keep troops mobile around the exposed road.",[[4,"patrol"],[5,"armor"],[5,"charge"],[3,"heavy","armored:5"]]],
 ["cinder-skies","Cinder Skies","Pair air cover with a ground defense that keeps working as vents erupt.",[[4,"armor"],[5,"flight"],[5,"ashes"],[4,"rush","wing:8"]]],
 ["basalt-line","Basalt Line","Mix physical and magical damage to handle both immunity types.",[[5,"siege"],[5,"iron"],[5,"ward"],[4,"mixed","golem:2"]]],
 ["inferno-march","Inferno March","Spread the troop rallies before Inferno Titan arrives with a flying escort.",[[5,"ashes"],[5,"heavy"],[5,"ward"],[5,"split","infernotitan:1"]]]
]);

const stages={hollow,confluence:[CONFLUENCE_PILOT,...confluence],frostfen,pass,caldera};
export const CHAPTERS=Object.fromEntries(Object.entries(stages).map(([mapId,missions])=>[
 mapId,[...missions,{id:mapId+"-finale",mapId,name:"Regional Gauntlet",briefing:"Clear all 25 waves and face the regional boss.",finale:true}]
]));

const spellDeck={deck:"meteor flame freeze lightning root inquiry deathmark".split(" ")};
const restrictions={
 spells:{...spellDeck},
 pads:{towerLimit:6},
 timed:{onslaught:true},
 supplies:{mana:250}
};
const challenges={
 hollow:[
  ["rain-of-fire","Rain of Fire","Use the fixed spellbook to thin clumps at each bend.","spells",[[6,"patrol"],[6,"armor"],[6,"siege","grimgut:1"]]],
  ["few-stones","Few Stones","Hold the whole road with at most six towers.","pads",[[5,"charge"],[6,"split"],[7,"heavy","regen:5"]]],
  ["relentless-road","Relentless Road","Waves arrive automatically. Keep one upgrade ahead.","timed",[[6,"patrol"],[6,"flight"],[7,"shroud","matron:1"]]],
  ["lean-reserves","Lean Reserves","Start with 250 mana and build an opening that pays for itself.","supplies",[[5,"patrol"],[6,"troll"],[7,"mixed"]]]
 ],
 confluence:[
  ["forked-lightning","Forked Lightning","Time spells at the merge to cover both lanes with the fixed spellbook.","spells",[[5,"troll"],[7,"split"],[7,"mixed"]]],
  ["six-at-the-fork","Six at the Fork","Use at most six towers. Make each placement cover several stretches of road.","pads",[[6,"heavy"],[6,"rush"],[7,"siege"]]],
  ["spring-flood","Spring Flood","Waves arrive automatically from the two approaches.","timed",[[6,"charge"],[6,"troll"],[7,"heavy","lorthos:1"]]],
  ["last-purse","Last Purse","Open both approaches with only 250 mana.","supplies",[[6,"patrol"],[6,"split"],[6,"ward"]]]
 ],
 frostfen:[
  ["winter-magics","Winter Magics","Work with a fixed spellbook. Time spells where ice holds enemies together.","spells",[[6,"charge"],[7,"iron"],[7,"magic","isu:1"]]],
  ["ice-watch","Ice Watch","Choose at most six towers to cover both ground and air traffic.","pads",[[6,"armor"],[6,"flight"],[7,"split"]]],
  ["blizzard-clock","Blizzard Clock","Build while automatic waves keep coming through the ice.","timed",[[6,"patrol"],[6,"shroud"],[7,"rush"]]]
 ],
 pass:[
  ["outside-the-tunnel","Outside the Tunnel","Cover both tunnel exits with at most six towers.","pads",[[5,"charge"],[7,"heavy"],[7,"siege"]]],
  ["mountain-spellbook","Mountain Spellbook","Time the fixed spellbook at the exposed entrances and exits.","spells",[[6,"armor"],[6,"ward"],[8,"iron","kazuul:1"]]],
  ["closing-pass","Closing Pass","Get the road covered before automatic waves stack at the exits.","timed",[[6,"patrol"],[6,"rush"],[7,"armor"]]]
 ],
 caldera:[
  ["embers-at-speed","Embers at Speed","Build during automatic waves and keep troops away from vent warnings.","timed",[[6,"charge"],[6,"ashes"],[7,"heavy"]]],
  ["scorched-spellbook","Scorched Spellbook","Use the fixed spellbook on mixed ground and air threats.","spells",[[6,"armor"],[7,"rush"],[7,"ashes","infernotitan:1"]]],
  ["six-in-the-fire","Six in the Fire","Keep at most six towers and cover targets from both damage types.","pads",[[6,"split"],[6,"iron"],[8,"armor","warden:3"]]],
  ["embers-on-credit","Embers on Credit","Start with 250 mana and build a defense that works around timed vents.","supplies",[[6,"patrol"],[6,"ashes"],[7,"siege"]]]
 ]
};
export const CHALLENGES=Object.entries(challenges).flatMap(([mapId,rows])=>rows.map(([id,name,briefing,rule,specs])=>
 entry(mapId,id,name,briefing,specs,{...restrictions[rule],category:"challenge"})));

const trials=[
 ["hollow","krenko","Mob Muster","Build a goblin line and grow the army before the armored rush.","legion ward offering funeral flame meteor",[[5,"patrol"],[5,"charge"],[5,"armor"]]],
 ["hollow","talrand","Drake Patrol","Cast spells early to build an air force before the flier waves.","inquiry meteor flame lightning freeze root",[[4,"patrol"],[5,"flight"],[5,"rush"]]],
 ["hollow","edgar","The Third Summon","Keep troops cycling so Edgar can fill the road with Vampires.","legion ward twins valor recall rally",[[4,"patrol"],[5,"charge"],[6,"siege"]]],
 ["confluence","teysa","Last Rites","Enchant troop towers and let Teysa turn troop deaths into damage.","funeral offering recall legion ward rally",[[4,"patrol"],[5,"troll"],[6,"heavy"]]],
 ["confluence","korvold","Price of Power","Spend troops with Culling the Weak to grow Korvold and refill your hand.","offering legion rally recall raise funeral",[[4,"charge"],[5,"troll"],[6,"siege"]]],
 ["confluence","meren","Back to the Line","Cycle returning troops into the lane that needs help most.","rally raise recall legion valor ward",[[4,"patrol"],[5,"troll"],[5,"split"]]],
 ["frostfen","omnath","Mana on Ice","Use Groves early, then spend your reserve when the flyers show up.","wild root freeze bloom inquiry verdant",[[5,"patrol"],[5,"split"],[5,"ward"]]],
 ["frostfen","heliod","Sun Over Snow","Keep troops alive with healing and wards while Heliod adds counters.","ward legion rally valor twins blade",[[5,"charge"],[5,"armor"],[5,"heavy"]]],
 ["pass","urza","Clockwork Exit","Spread your tower network to power Urza’s Construct at the tunnel exit.","forge matrix blade prism resonance inquiry",[[5,"patrol"],[5,"armor"],[5,"iron"]]],
 ["pass","wilhelt","The Second Horde","Keep Zombie towers near the exits so deaths sustain your second line.","raise funeral recall offering ward legion",[[4,"charge"],[6,"troll"],[5,"siege"]]],
 ["caldera","torbran","Red Furnace","Keep red towers firing through armored waves and time spells around vents.","meteor flame cascade lightning bloodrush root",[[4,"patrol"],[5,"ashes"],[6,"armor"]]],
 ["caldera","urdragon","High Flight","Use the Ur-Dragon’s flying attacks while ground towers hold the bends.","lightning freeze ward deathmark meteor inquiry",[[5,"split"],[5,"flight"],[5,"ashes","titan:1"]]]
];
export const COMMANDER_TRIALS=trials.map(([mapId,commander,name,briefing,deck,specs])=>
 entry(mapId,"trial-"+commander,name,briefing,specs,{commander,deck:deck.split(" "),category:"commander"}));

export const MISSIONS=Object.fromEntries([...Object.values(CHAPTERS).flat(),...CHALLENGES,...COMMANDER_TRIALS]
 .filter(mission=>!mission.finale).map(mission=>[mission.id,mission]));
export const MISSION_RUN_KEY="archemancy.mission-run.v1";
