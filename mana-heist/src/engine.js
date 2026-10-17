// Mana Heist: Landfall v0.2 — original land-mana puzzle model.
// No DOM, server identities, external assets, RNG, or production score calls.
// Uses the validated Mana Engine 2.0 ability/payment kernel for advanced mana sources.
import {SOURCES, modesFor, payments} from "./mana-engine-v2.js";
export const VERSION="mh-landfall-0.2.0";
export const COLORS=["W","U","B","R","G","C"];
const zero=()=>Object.fromEntries(COLORS.map(c=>[c,0]));
const sum=v=>Object.values(v).reduce((a,b)=>a+b,0);
export const CARDS={
 plains:{name:"Plains",kind:"basic",colors:["W"],types:["Plains"],flavor:"Basic · Plains"},
 island:{name:"Island",kind:"basic",colors:["U"],types:["Island"],flavor:"Basic · Island"},
 swamp:{name:"Swamp",kind:"basic",colors:["B"],types:["Swamp"],flavor:"Basic · Swamp"},
 mountain:{name:"Mountain",kind:"basic",colors:["R"],types:["Mountain"],flavor:"Basic · Mountain"},
 forest:{name:"Forest",kind:"basic",colors:["G"],types:["Forest"],flavor:"Basic · Forest"},
 dualUR:{name:"Volcanic Island",kind:"dual",colors:["U","R"],types:["Island","Mountain"],flavor:"Original dual · Island / Mountain"},
 dualWU:{name:"Tundra",kind:"dual",colors:["W","U"],types:["Plains","Island"],flavor:"Original dual · Plains / Island"},
 dualUG:{name:"Tropical Island",kind:"dual",colors:["U","G"],types:["Island","Forest"],flavor:"Original dual · Island / Forest"},
 dualWB:{name:"Scrubland",kind:"dual",colors:["W","B"],types:["Plains","Swamp"],flavor:"Original dual · Plains / Swamp"},
 dualBR:{name:"Badlands",kind:"dual",colors:["B","R"],types:["Swamp","Mountain"],flavor:"Original dual · Swamp / Mountain"},
 shockUR:{name:"Steam Vents",kind:"shock",colors:["U","R"],types:["Island","Mountain"],flavor:"Shock · Island / Mountain"},
 shockBG:{name:"Overgrown Tomb",kind:"shock",colors:["B","G"],types:["Swamp","Forest"],flavor:"Shock · Swamp / Forest"},
 shockBR:{name:"Blood Crypt",kind:"shock",colors:["B","R"],types:["Swamp","Mountain"],flavor:"Shock · Swamp / Mountain"},
 shockWU:{name:"Hallowed Fountain",kind:"shock",colors:["W","U"],types:["Plains","Island"],flavor:"Shock · Plains / Island"},
 painUR:{name:"Shivan Reef",kind:"pain",colors:["U","R","C"],types:[],flavor:"Pain land · U / R / colorless"},
 painUB:{name:"Underground River",kind:"pain",colors:["U","B","C"],types:[],flavor:"Pain land · U / B / colorless"},
 painBG:{name:"Llanowar Wastes",kind:"pain",colors:["B","G","C"],types:[],flavor:"Pain land · B / G / colorless"},
 checkUB:{name:"Drowned Catacomb",kind:"check",colors:["U","B"],types:[],check:["Island","Swamp"],flavor:"Check land · needs Island or Swamp"},
 checkUR:{name:"Sulfur Falls",kind:"check",colors:["U","R"],types:[],check:["Island","Mountain"],flavor:"Check land · needs Island or Mountain"},
 checkWG:{name:"Sunpetal Grove",kind:"check",colors:["W","G"],types:[],check:["Plains","Forest"],flavor:"Check land · needs Plains or Forest"},
 fetchUR:{name:"Scalding Tarn",kind:"fetch",colors:[],types:[],fetch:["Island","Mountain"],flavor:"Fetch land · search Island / Mountain"},
 fetchBG:{name:"Verdant Catacombs",kind:"fetch",colors:[],types:[],fetch:["Swamp","Forest"],flavor:"Fetch land · search Swamp / Forest"},
 bounceUG:{name:"Simic Growth Chamber",kind:"bounce",colors:["U","G"],types:[],flavor:"Bounce land · makes U or G; returns a land"},
 relic:{name:"Wastes",kind:"utility",colors:["C"],types:[],flavor:"Utility land · adds colorless"},
 signet:{name:"Azorius Signet",kind:"artifact",colors:[],types:[],v2:"signet",flavor:"Artifact · pay {1}, tap for W and U"},
 bluffs:{name:"Cascade Bluffs",kind:"filter",colors:[],types:[],v2:"bluffs",flavor:"Filter land · pay U/R, tap for two colored mana"},
 solring:{name:"Sol Ring",kind:"artifact",colors:[],types:[],v2:"solring",flavor:"Artifact · tap for two colorless"},
 coffers:{name:"Cabal Coffers",kind:"mana-engine",colors:[],types:[],v2:"coffers",flavor:"Pay {2}, tap for B per Swamp"},
 urborg:{name:"Urborg, Tomb of Yawgmoth",kind:"mana-engine",colors:[],types:[],v2:"urborg",flavor:"All lands are also Swamps"},
 nykthos:{name:"Nykthos, Shrine to Nyx",kind:"mana-engine",colors:[],types:[],v2:"nykthos",flavor:"Tap for colorless or pay {2} for devotion"},
 lotus:{name:"Lotus Field",kind:"mana-engine",colors:[],types:[],v2:"lotus",flavor:"Tap for three mana of one color"},
 ziggurat:{name:"Ancient Ziggurat",kind:"mana-engine",colors:[],types:[],v2:"ziggurat",flavor:"Mana may be spent only on creature spells"},
 treasure:{name:"Treasure",kind:"artifact",colors:[],types:[],v2:"treasure",flavor:"Tap and sacrifice: add one mana of any color"},
 petal:{name:"Lotus Petal",kind:"artifact",colors:[],types:[],v2:"petal",flavor:"Sacrifice: add one mana of any color"},
 confluence:{name:"Mana Confluence",kind:"mana-engine",colors:[],types:[],v2:"confluence",flavor:"Pay 1 life and tap for any color"},
 command:{name:"Command Tower",kind:"mana-engine",colors:[],types:[],v2:"command",flavor:"Add one color from commander identity"},
 ritual:{name:"Dark Ritual",kind:"instant",colors:[],types:[],manaSpell:{cost:{B:1},output:["B","B","B"]},flavor:"Instant · spend B to add BBB"},
 pyretic:{name:"Pyretic Ritual",kind:"instant",colors:[],types:[],manaSpell:{cost:{N:1,R:1},output:["R","R","R"]},flavor:"Instant · spend 1R to add RRR"}
};
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
export function validate(level){
 if(!level||level.version!==VERSION||!/^mh-[\w-]+$/.test(level.id||""))throw Error("Invalid puzzle version/id");
 if(!Number.isInteger(level.turnLimit)||level.turnLimit<1||level.turnLimit>6||!Number.isInteger(level.life)||level.life<1||level.life>30)throw Error("Invalid turn limit/life");
 if(!Array.isArray(level.hand)||!Array.isArray(level.field)||!Array.isArray(level.library)||!Array.isArray(level.stages)||!level.stages.length||level.stages.length>5)throw Error("Invalid puzzle lists");
 const unique=new Set();
 for(const c of [...level.hand,...level.field,...level.library]){
  if(!c||typeof c.id!=="string"||!/^[-\w]{1,30}$/.test(c.id)||unique.has(c.id)||!CARDS[c.card])throw Error("Duplicate land ID or unknown card");
  unique.add(c.id);
 }
 if(level.hand.length+level.field.length+level.library.length>18)throw Error("Too many mana sources");
 if([...level.field,...level.library].some(x=>CARDS[x.card].kind==="instant"))throw Error("Mana instants must begin in hand");
 if(level.hand.filter(x=>CARDS[x.card].kind==="instant").length>3)throw Error("Too many mana instants");
 for(const stage of level.stages){
  if(!stage||typeof stage.name!=="string"||stage.name.length>80||!stage.name.trim())throw Error("Invalid spell");
  const cost=stage.cost;
  if(!cost||typeof cost!=="object"||Array.isArray(cost)||!Object.keys(cost).length)throw Error("Invalid mana cost");
  for(const [key,n] of Object.entries(cost))if(![...COLORS,"N"].includes(key)||!Number.isInteger(n)||n<0||n>16)throw Error("Invalid mana cost");
  if(sum(cost)<1||sum(cost)>16||stage.effect&&!["untap"].includes(stage.effect))throw Error("Invalid spell effect");
 }
 return true;
}
export function initial(level){validate(level);return {turn:1,life:level.life,played:0,stage:0,pool:zero(),manaUnits:[],manaSerial:0,graveyard:[],hand:level.hand.map(x=>x.id),field:level.field.map(x=>({id:x.id,tapped:false})),spentLife:0,actions:0};}
export function lookup(level,id){return [...level.hand,...level.field,...level.library].find(x=>x.id===id);}
export function getCard(level,id){const l=lookup(level,id);return l?CARDS[l.card]:null;}
export function poolLabel(p){return COLORS.map(c=>p[c]?p[c]+c:"").filter(Boolean).join(" · ")||"empty";}
export function payOptions(pool,cost){
 const required=zero();
 for(const c of COLORS)required[c]=cost[c]||0;
 if(COLORS.some(c=>required[c]>pool[c]))return [];
 const generic=cost.N||0;
 const available=COLORS.map(c=>pool[c]-required[c]);
 if(available.reduce((a,b)=>a+b,0)<generic)return [];
 const result=[];
 const walk=(i,left,chosen)=>{
  if(i===COLORS.length){if(left===0){const spend={...required};COLORS.forEach((c,j)=>spend[c]+=chosen[j]||0);result.push(spend);}return;}
  for(let n=0;n<=Math.min(left,available[i]);n++)walk(i+1,left-n,[...chosen,n]);
 };
 walk(0,generic,[]);
 return result;
}
// Convert legacy battlefield references to a rules-kernel snapshot. The
// original 250 puzzles still control the turn structure and save format.
function rulesBoard(level,s){
 return {permanents:s.field.map(f=>{
  const c=getCard(level,f.id),key=lookup(level,f.id).card;
  return {id:f.id,key:c.v2||key,tapped:f.tapped,types:c.types,type:c.kind==="artifact"?"Artifact":"Land"};
 })};
}
function advancedModes(level,s,f){
 const card=getCard(level,f.id);
 if(!card.v2&&!s.field.some(x=>lookup(level,x.id)?.card==="urborg"))return [];
 const board=rulesBoard(level,s);
 const source=board.permanents.find(p=>p.id===f.id);
 // A normal land granted a black-mana ability by Urborg also participates.
 if(!card.v2){
  if(card.kind==="fetch")return [];
  return [{id:"urborg-black",label:"Tap: Add B (Urborg)",tap:true,life:0,cost:{},output:["B"]}];
 }
 return modesFor({devotion:level.devotion||{},commanderColors:level.commanderColors||["W","U","B","R","G"]},board,source);
}
function spendUnits(units,cost,context){
 return payments(units,cost,context);
}
function payableCasts(s,cost,context){
 if(!s.manaUnits?.some(u=>u.restriction))return payOptions(s.pool,cost);
 const found=new Map();
 for(const ids of spendUnits(s.manaUnits,cost,context)){
  const spend=zero();
  for(const id of ids){const unit=s.manaUnits.find(u=>u.id===id);spend[unit.color]++;}
  found.set(JSON.stringify(spend),spend);
 }
 return [...found.values()];
}
function enterTapped(level,state,land,shock){
 const card=CARDS[land.card];
 if(card.kind==="shock")return !shock;
 if(card.kind==="bounce")return true;
 if(card.kind==="check")return !state.field.some(f=>card.check.some(t=>getCard(level,f.id).types.includes(t)));
 return false;
}
export function actions(level,s){
 if(s.stage===level.stages.length)return [];
 const out=[];
 if(!s.played)for(const id of s.hand){
  const c=getCard(level,id);
  if(c.kind==="instant")continue;
  const options=c.kind==="shock"?[false,true]:[false];
  if(c.kind==="bounce"&&s.field.length===0)continue;
  for(const shock of options){
   if(shock&&s.life<=2)continue;
   if(c.kind==="bounce")for(const f of s.field)out.push({type:"play",id,shock,returnId:f.id});
   else out.push({type:"play",id,shock});
  }
 }
 // Rituals are *spells* cast from hand, unlike mana abilities (rule 605).
 // They consume mana, resolve and go to the graveyard, and create new mana.
 for(const id of s.hand){
  const card=getCard(level,id);
  if(card.kind!=="instant"||!card.manaSpell)continue;
  for(const spend of spendUnits(s.manaUnits||[],card.manaSpell.cost,{kind:"spell",spellType:"instant"})){
   out.push({type:"ritual",id,spend,output:[...card.manaSpell.output]});
  }
 }
 for(const f of s.field){
  const card=getCard(level,f.id);
  if(!f.tapped&&card.kind!=="fetch")for(const color of (card.kind==="bounce"?["U"]:card.colors)){
   if(card.kind==="pain"&&color!=="C"&&s.life<=1)continue;
   out.push({type:"tap",id:f.id,color});
  }
  if(!f.tapped||getCard(level,f.id).v2==="petal"){
   for(const mode of advancedModes(level,s,f)){
    if(mode.tap&&f.tapped||s.life<=mode.life)continue;
    for(const spend of spendUnits(s.manaUnits||[],mode.cost,{kind:"activation"})){
     out.push({type:"activate",id:f.id,mode:mode.id,spend,output:[...mode.output]});
    }
   }
  }
  if(!f.tapped&&card.kind==="fetch"&&s.life>1)for(const land of level.library){
   const target=CARDS[land.card];
   if(!card.fetch.some(t=>target.types.includes(t)))continue;
   for(const shock of target.kind==="shock"?[false,true]:[false]){
    if(shock&&s.life<=3)continue;
    out.push({type:"fetch",id:f.id,targetId:land.id,shock});
   }
  }
 }
 const stage=level.stages[s.stage];
 for(const spend of payableCasts(s,stage.cost,{kind:"spell",spellType:stage.spellType||"sorcery"})){
  if(stage.effect==="untap"){
   for(const f of s.field.filter(f=>f.tapped&&getCard(level,f.id).kind!=="fetch"))out.push({type:"cast",spend,untapId:f.id});
  }else out.push({type:"cast",spend});
 }
 if(s.turn<level.turnLimit)out.push({type:"end"});
 return out;
}
const signature=a=>JSON.stringify(a);
export function reduce(level,s,action){
 if(!action||typeof action!=="object")return {ok:false,error:"Choose an action."};
 if(s.stage===level.stages.length)return {ok:false,error:"Vault already cracked."};
 if(!actions(level,s).some(a=>signature(a)===signature(action)))return {ok:false,error:explain(level,s,action)};
 const n={...s,pool:{...s.pool},manaUnits:[...(s.manaUnits||[])],manaSerial:s.manaSerial||0,graveyard:[...(s.graveyard||[])],hand:[...s.hand],field:s.field.map(f=>({...f})),actions:s.actions+1};
 const addMana=(color,source,restriction=null)=>{
  n.pool[color]++;
  n.manaUnits.push({id:"m"+(++n.manaSerial),color,source,restriction});
 };
 const removeMana=(ids)=>{
  const gone=new Set(ids);
  for(const u of n.manaUnits)if(gone.has(u.id))n.pool[u.color]--;
  n.manaUnits=n.manaUnits.filter(u=>!gone.has(u.id));
 };
 if(action.type==="play"){
  const land=lookup(level,action.id);
  n.hand.splice(n.hand.indexOf(action.id),1);
  n.played=1;
  if(action.shock){n.life-=2;n.spentLife+=2;}
  if(action.returnId){
   const returned=n.field.find(f=>f.id===action.returnId);
   n.field=n.field.filter(f=>f.id!==action.returnId);
   n.hand.push(returned.id);
  }
  n.field.push({id:land.id,tapped:enterTapped(level,s,land,action.shock)});
 }
 if(action.type==="ritual"){
  const card=getCard(level,action.id);
  removeMana(action.spend);
  n.hand=n.hand.filter(id=>id!==action.id);
  n.graveyard.push(action.id);
  for(const color of card.manaSpell.output)addMana(color,action.id);
 }
 if(action.type==="tap"){
  n.field.find(f=>f.id===action.id).tapped=true;
  addMana(action.color,action.id);
  // Unlike single-color duals, Simic Growth Chamber adds G AND U at once.
  if(getCard(level,action.id).kind==="bounce")addMana(action.color==="G"?"U":"G",action.id);
  if(getCard(level,action.id).kind==="pain"&&action.color!=="C"){n.life--;n.spentLife++;}
 }
 if(action.type==="fetch"){
  n.field=n.field.filter(f=>f.id!==action.id);
  n.life--;n.spentLife++;
  if(action.shock){n.life-=2;n.spentLife+=2;}
  const land=lookup(level,action.targetId);
  n.field.push({id:land.id,tapped:enterTapped(level,n,land,action.shock)});
 }
 if(action.type==="activate"){
  const f=n.field.find(f=>f.id===action.id),mode=advancedModes(level,s,f).find(m=>m.id===action.mode);
  removeMana(action.spend);
  n.life-=mode.life;n.spentLife+=mode.life;
  if(mode.tap)f.tapped=true;
  if(mode.sacrifice)n.field=n.field.filter(f=>f.id!==action.id);
  for(const color of mode.output)addMana(color,action.id,mode.restriction||null);
 }
 if(action.type==="cast"){
  const available=spendUnits(n.manaUnits,level.stages[n.stage].cost,{kind:"spell",spellType:level.stages[n.stage].spellType||"sorcery"});
  const chosen=available.find(ids=>{
   const counts=zero();
   for(const id of ids){counts[n.manaUnits.find(u=>u.id===id).color]++;}
   return COLORS.every(c=>counts[c]===action.spend[c]);
  });
  if(!chosen)throw Error("Cast payment lacks a legal mana-unit allocation");
  removeMana(chosen);
  n.stage++;
  if(action.untapId)n.field.find(f=>f.id===action.untapId).tapped=false;
 }
 if(action.type==="end"){
  n.turn++;n.played=0;n.pool=zero();n.manaUnits=[];
  for(const f of n.field)f.tapped=false;
 }
 return {ok:true,state:n};
}
function explain(level,s,a){
 if(a.type==="play")return s.played?"You already played a land this turn.":"That land cannot be played now.";
 if(a.type==="tap")return "This land is tapped, missing, or cannot safely produce that color.";
 if(a.type==="ritual")return "A ritual is cast from hand. Make enough legal mana to pay its spell cost first.";
 if(a.type==="fetch")return "No legal fetch target, or insufficient life.";
 if(a.type==="cast")return "Not enough legally spendable mana, or the chosen payment/untap target is illegal.";
 if(a.type==="activate")return "That mana source is tapped, cannot pay its activation cost, or has an invalid ability choice.";
 if(a.type==="end")return "The last turn has passed. Undo or reset this heist.";
 return "That move isn't legal.";
}
export function key(s){
 return JSON.stringify([s.turn,s.life,s.played,s.stage,COLORS.map(c=>s.pool[c]),[...s.hand].sort(),s.field.map(x=>x.id+":"+Number(x.tapped)).sort(),(s.manaUnits||[]).filter(u=>u.restriction).map(u=>u.color+":"+u.restriction).sort()]);
}
export function completed(level,s){return s.stage===level.stages.length;}
export function medal(level,s,par){
 if(!completed(level,s))return 0;
 if(s.turn<=par.turn&&s.spentLife<=par.spentLife)return 3;
 if(s.turn<=par.turn+1&&s.life>0)return 2;
 return 1;
}
export function labelAction(level,a){
 if(a.type==="play")return "Play "+getCard(level,a.id).name+(a.shock?" · pay 2 life":a.returnId?" · return "+getCard(level,a.returnId).name:"");
 if(a.type==="tap")return "Tap "+getCard(level,a.id).name+" for "+(getCard(level,a.id).kind==="bounce"?"G and U":a.color);
 if(a.type==="activate")return "Activate "+getCard(level,a.id).name+" for "+a.output.join("+");
 if(a.type==="ritual")return "Cast "+getCard(level,a.id).name+" · "+a.output.join("+")+" mana";
 if(a.type==="fetch")return "Fetch "+getCard(level,a.targetId).name+(a.shock?" · shock in":"");
 if(a.type==="cast")return "Cast "+level.stages[0].name; // UI overrides stage name context.
 return "End turn and untap";
}
