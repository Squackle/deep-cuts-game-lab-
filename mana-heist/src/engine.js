// Mana Heist: Landfall v0.2 — original land-mana puzzle model.
// No DOM, server identities, external assets, RNG, or production score calls.
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
 relic:{name:"Wastes",kind:"utility",colors:["C"],types:[],flavor:"Utility land · adds colorless"}
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
 if(level.hand.length+level.field.length+level.library.length>10)throw Error("Too many lands");
 for(const stage of level.stages){
  if(!stage||typeof stage.name!=="string"||stage.name.length>80||!stage.name.trim())throw Error("Invalid spell");
  const cost=stage.cost;
  if(!cost||typeof cost!=="object"||Array.isArray(cost)||!Object.keys(cost).length)throw Error("Invalid mana cost");
  for(const [key,n] of Object.entries(cost))if(![...COLORS,"N"].includes(key)||!Number.isInteger(n)||n<0||n>8)throw Error("Invalid mana cost");
  if(sum(cost)<1||sum(cost)>10||stage.effect&&!["untap"].includes(stage.effect))throw Error("Invalid spell effect");
 }
 return true;
}
export function initial(level){validate(level);return {turn:1,life:level.life,played:0,stage:0,pool:zero(),hand:level.hand.map(x=>x.id),field:level.field.map(x=>({id:x.id,tapped:false})),spentLife:0,actions:0};}
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
  const options=c.kind==="shock"?[false,true]:[false];
  if(c.kind==="bounce"&&s.field.length===0)continue;
  for(const shock of options){
   if(shock&&s.life<=2)continue;
   if(c.kind==="bounce")for(const f of s.field)out.push({type:"play",id,shock,returnId:f.id});
   else out.push({type:"play",id,shock});
  }
 }
 for(const f of s.field){
  const card=getCard(level,f.id);
  if(!f.tapped&&card.kind!=="fetch")for(const color of card.colors){
   if(card.kind==="pain"&&color!=="C"&&s.life<=1)continue;
   out.push({type:"tap",id:f.id,color});
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
 for(const spend of payOptions(s.pool,stage.cost)){
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
 const n={...s,pool:{...s.pool},hand:[...s.hand],field:s.field.map(f=>({...f})),actions:s.actions+1};
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
 if(action.type==="tap"){
  n.field.find(f=>f.id===action.id).tapped=true;
  n.pool[action.color]++;
  if(getCard(level,action.id).kind==="pain"&&action.color!=="C"){n.life--;n.spentLife++;}
 }
 if(action.type==="fetch"){
  n.field=n.field.filter(f=>f.id!==action.id);
  n.life--;n.spentLife++;
  if(action.shock){n.life-=2;n.spentLife+=2;}
  const land=lookup(level,action.targetId);
  n.field.push({id:land.id,tapped:enterTapped(level,n,land,action.shock)});
 }
 if(action.type==="cast"){
  COLORS.forEach(c=>n.pool[c]-=action.spend[c]);
  n.stage++;
  if(action.untapId)n.field.find(f=>f.id===action.untapId).tapped=false;
 }
 if(action.type==="end"){
  n.turn++;n.played=0;n.pool=zero();
  for(const f of n.field)f.tapped=false;
 }
 return {ok:true,state:n};
}
function explain(level,s,a){
 if(a.type==="play")return s.played?"You already played a land this turn.":"That land cannot be played now.";
 if(a.type==="tap")return "This land is tapped, missing, or cannot safely produce that color.";
 if(a.type==="fetch")return "No legal fetch target, or insufficient life.";
 if(a.type==="cast")return "Not enough mana, or the chosen payment/untap target is illegal.";
 if(a.type==="end")return "The last turn has passed. Undo or reset this heist.";
 return "That move isn't legal.";
}
export function key(s){
 return JSON.stringify([s.turn,s.life,s.played,s.stage,COLORS.map(c=>s.pool[c]),[...s.hand].sort(),s.field.map(x=>x.id+":"+Number(x.tapped)).sort()]);
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
 if(a.type==="tap")return "Tap "+getCard(level,a.id).name+" for "+a.color;
 if(a.type==="fetch")return "Fetch "+getCard(level,a.targetId).name+(a.shock?" · shock in":"");
 if(a.type==="cast")return "Cast "+level.stages[0].name; // UI overrides stage name context.
 return "End turn and untap";
}
