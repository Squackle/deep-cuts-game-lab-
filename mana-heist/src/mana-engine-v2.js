// Mana Heist 2.0: independent, pure advanced-mana rules kernel.
// This is a supported-mechanics subset, NOT a complete Magic rules engine.
// It runs alongside unchanged Landfall v0.2 saves/250-level campaign.
export const ENGINE_VERSION="mh-mana-lab-2.0.0";
export const COLORS=["W","U","B","R","G","C"];
export const FIVE=COLORS.slice(0,5);
export const PHASES=["main1","combat","main2","end"];
const names={W:"White",U:"Blue",B:"Black",R:"Red",G:"Green",C:"Colorless"};
const D=({id,label,output=[],cost={},tap=true,sacrifice=false,life=0})=>({id,label,output,cost,tap,sacrifice,life});
const single=(key,name,color,types=[])=>({key,name,type:"Land",types,abilities:[D({id:"tap-"+color,label:"Tap: Add "+color,output:[color]})]});
const any=(prefix,colors,options={})=>colors.map(c=>D({id:prefix+"-"+c,label:(options.life?"Pay 1 life, ":"")+"Tap: Add "+c,output:[c],life:options.life?1:0,tap:options.tap!==false,sacrifice:!!options.sacrifice}));
const both=(a,b)=>D({id:"tap-pair",label:"Tap: Add "+a+" and "+b,output:[a,b]});
export const SOURCES=Object.freeze({
 plains:single("plains","Plains","W",["Plains"]),
 island:single("island","Island","U",["Island"]),
 swamp:single("swamp","Swamp","B",["Swamp"]),
 mountain:single("mountain","Mountain","R",["Mountain"]),
 forest:single("forest","Forest","G",["Forest"]),
 wastes:single("wastes","Wastes","C"),
 volcanic:{name:"Volcanic Island",type:"Land",types:["Island","Mountain"],abilities:[...any("dual",["U","R"])]},
 simic:{name:"Simic Growth Chamber",type:"Land",types:[],abilities:[both("G","U")],note:"Starts on the battlefield after its enter-tapped/return-land event."},
 signet:{name:"Azorius Signet",type:"Artifact",types:[],abilities:[D({id:"filter",label:"Pay {1}, tap: Add W and U",cost:{N:1},output:["W","U"]})]},
 bluffs:{name:"Cascade Bluffs",type:"Land",types:[],abilities:[
 D({id:"colorless",label:"Tap: Add C",output:["C"]}),
 ...["U","R"].flatMap(input=>[["U","U"],["U","R"],["R","R"]].map((out,i)=>D({id:"filter-"+input+"-"+i,label:"Pay "+input+", tap: Add "+out.join(" + "),cost:{[input]:1},output:out})))
 ]},
 coffers:{name:"Cabal Coffers",type:"Land",types:[],abilities:[],dynamic:"coffers"},
 urborg:{name:"Urborg, Tomb of Yawgmoth",type:"Land",types:[],abilities:[],static:"all-swamps"},
 nykthos:{name:"Nykthos, Shrine to Nyx",type:"Land",types:[],abilities:[D({id:"colorless",label:"Tap: Add C",output:["C"]})],dynamic:"devotion"},
 lotus:{name:"Lotus Field",type:"Land",types:[],abilities:[],dynamic:"lotus",note:"Starts on the battlefield after its enter-tapped/sacrifice-two-lands event."},
 ziggurat:{name:"Ancient Ziggurat",type:"Land",types:[],abilities:[],dynamic:"ziggurat"},
 solring:{name:"Sol Ring",type:"Artifact",types:[],abilities:[D({id:"sol",label:"Tap: Add C + C",output:["C","C"]})]},
 command:{name:"Command Tower",type:"Land",types:[],abilities:[],dynamic:"command"},
 petal:{name:"Lotus Petal",type:"Artifact",types:[],abilities:[],dynamic:"petal"},
 treasure:{name:"Treasure token",type:"Artifact",types:[],abilities:[],dynamic:"treasure"},
 confluence:{name:"Mana Confluence",type:"Land",types:[],abilities:[],dynamic:"confluence"}
});
const copy=value=>JSON.parse(JSON.stringify(value));
const sum=c=>Object.values(c||{}).reduce((x,y)=>x+y,0);
const validCost=c=>c&&Object.entries(c).every(([k,v])=>[...COLORS,"N"].includes(k)&&Number.isInteger(v)&&v>=0);
export function validateScenario(s){
 if(!s||!s.id||!Array.isArray(s.sources)||!Array.isArray(s.goals)||!s.goals.length)throw Error("Invalid scenario");
 const ids=new Set();
 for(const p of s.sources){if(!SOURCES[p.key]||!p.id||ids.has(p.id))throw Error("Unknown or duplicate source: "+p?.id);ids.add(p.id);}
 for(const g of s.goals)if(!validCost(g.cost)||!sum(g.cost)||!["creature","instant","sorcery","artifact"].includes(g.spellType))throw Error("Invalid spell cost/type");
 return true;
}
export function initial(s){
 validateScenario(s);
 return {version:ENGINE_VERSION,turn:1,phase:s.startPhase||"main1",life:s.life||20,
  pool:[],permanents:s.sources.map(x=>({id:x.id,key:x.key,tapped:!!x.tapped})),
  cast:0,serial:0,history:[]};
}
export const complete=(scenario,state)=>state.cast>=scenario.goals.length;
export function effectiveTypes(state,permanent){
 const c=SOURCES[permanent.key];const types=[...c.types];
 if(c.type==="Land"&&state.permanents.some(p=>p.key==="urborg")&&!types.includes("Swamp"))types.push("Swamp");
 return types;
}
function modesFor(scenario,state,permanent){
 const card=SOURCES[permanent.key];const modes=[...card.abilities];
 const dynamic=card.dynamic;
 if(dynamic==="coffers"){
  const n=state.permanents.filter(p=>effectiveTypes(state,p).includes("Swamp")).length;
  modes.push(D({id:"coffers",label:"Pay {2}, tap: Add "+n+" black",cost:{N:2},output:Array(n).fill("B")}));
 }
 if(dynamic==="devotion"){
  for(const color of FIVE){
   const n=scenario.devotion?.[color]||0;
   if(n>0)modes.push(D({id:"devotion-"+color,label:"Pay {2}, tap: Add "+n+" "+names[color],cost:{N:2},output:Array(n).fill(color)}));
  }
 }
 if(dynamic==="lotus")for(const c of FIVE)modes.push(D({id:"lotus-"+c,label:"Tap: Add "+c+" + "+c+" + "+c,output:[c,c,c]}));
 if(dynamic==="ziggurat")for(const c of FIVE)modes.push({...D({id:"ziggurat-"+c,label:"Tap: "+c+" (creature spells only)",output:[c]}),restriction:"creature"});
 if(dynamic==="confluence")for(const c of FIVE)modes.push(D({id:"confluence-"+c,label:"Pay 1 life, tap: Add "+c,life:1,output:[c]}));
 if(dynamic==="command")for(const c of scenario.commanderColors||FIVE)modes.push(D({id:"command-"+c,label:"Tap: Add "+c+" (commander color identity)",output:[c]}));
 if(dynamic==="petal")for(const c of FIVE)modes.push(D({id:"petal-"+c,label:"Sacrifice: Add "+c,output:[c],tap:false,sacrifice:true}));
 if(dynamic==="treasure")for(const c of FIVE)modes.push(D({id:"treasure-"+c,label:"Tap, sacrifice: Add "+c,output:[c],sacrifice:true}));
 // Urborg's static ability grants every land a separate tap-for-black mode.
 if(card.type==="Land"&&state.permanents.some(p=>p.key==="urborg")&&!modes.some(m=>m.id==="urborg-black")){
  modes.push(D({id:"urborg-black",label:"Tap: Add B (Urborg)",output:["B"]}));
 }
 return modes.filter(m=>m.output.length>0);
}
function usable(mana,context){
 return !mana.restriction||(mana.restriction==="creature"&&context.kind==="spell"&&context.spellType==="creature");
}
// Return explicit and distinct legal mana unit payments, not aggregate color counts.
// We cannot assume that two {U} from different sources have the same restrictions.
export function payments(pool,cost,context={kind:"activation"}){
 if(!validCost(cost))return [];
 const requirements=COLORS.flatMap(c=>Array(cost[c]||0).fill(c));
 const generic=cost.N||0,needed=requirements.length+generic;
 if(!needed)return [[]];
 if(pool.length<needed)return [];
 const options=[],seen=new Set();
 function walk(req,left,chosen){
  if(req===requirements.length){
   if(left===0){
    const ids=[...chosen].sort(),sig=ids.join(",");
    if(!seen.has(sig)){seen.add(sig);options.push(ids);}
    return;
   }
   const start=chosen.length?0:0;
   for(let i=start;i<pool.length;i++){
    const u=pool[i];
    if(chosen.includes(u.id)||!usable(u,context))continue;
    walk(req,left-1,[...chosen,u.id]);
   }
   return;
  }
  const symbol=requirements[req];
  for(const u of pool){
   if(u.color!==symbol||chosen.includes(u.id)||!usable(u,context))continue;
   walk(req+1,left,[...chosen,u.id]);
  }
 }
 walk(0,generic,[]);
 return options;
}
export function legalActions(scenario,state){
 if(complete(scenario,state))return [];
 const out=[];
 for(const p of state.permanents){
  const card=SOURCES[p.key];
  for(const mode of modesFor(scenario,state,p)){
   if(mode.tap&&p.tapped)continue;
   if(state.life<=mode.life)continue;
   for(const spend of payments(state.pool,mode.cost,{kind:"activation"})){
    out.push({type:"activate",source:p.id,mode:mode.id,spend,output:[...mode.output]});
   }
  }
 }
 const goal=scenario.goals[state.cast];
 if((!goal.when||state.phase===goal.when)&&
    (goal.spellType==="instant"||goal.spellType==="creature"||goal.spellType==="artifact"||["main1","main2"].includes(state.phase))){
  for(const spend of payments(state.pool,goal.cost,{kind:"spell",spellType:goal.spellType})){
   out.push({type:"cast",spend});
  }
 }
 if(state.phase!=="end"||state.turn<(scenario.turnLimit||1))out.push({type:"advance"});
 return out;
}
export function apply(scenario,state,action){
 if(complete(scenario,state))return {ok:false,error:"Challenge already completed."};
 const legal=legalActions(scenario,state).find(a=>JSON.stringify(a)===JSON.stringify(action));
 if(!legal)return {ok:false,error:"Illegal mana action or payment."};
 const s=copy(state),a=legal;
 if(a.type==="advance"){
  s.pool=[];
  const pos=PHASES.indexOf(s.phase);
  if(pos<PHASES.length-1)s.phase=PHASES[pos+1];
  else {s.phase="main1";s.turn++;for(const p of s.permanents)p.tapped=false;}
 }
 if(a.type==="activate"){
  const p=s.permanents.find(x=>x.id===a.source);
  const mode=modesFor(scenario,s,p).find(m=>m.id===a.mode);
  s.pool=s.pool.filter(x=>!a.spend.includes(x.id));
  s.life-=mode.life;
  if(mode.tap)p.tapped=true;
  if(mode.sacrifice)s.permanents=s.permanents.filter(x=>x.id!==p.id);
  for(const color of mode.output){
   const id="m"+(++s.serial);
   s.pool.push({id,color,source:a.source,restriction:mode.restriction||null});
  }
 }
 if(a.type==="cast"){
  s.pool=s.pool.filter(x=>!a.spend.includes(x.id));
  s.cast++;
 }
 s.history.push({type:a.type,source:a.source||null,mode:a.mode||null,spend:a.spend||[],phase:s.phase});
 return {ok:true,state:s};
}
export function stateKey(s){
 return JSON.stringify([s.turn,s.phase,s.life,s.cast,s.permanents.map(p=>p.id+":"+p.key+":"+Number(p.tapped)).sort(),s.pool.map(m=>m.color+":"+(m.restriction||"")).sort()]);
}
// Explicit resource-limited reachability for micro-puzzle demos; inconclusive != impossible.
export function solve(scenario,{maxStates=25000}={}){
 const start=initial(scenario),queue=[{state:start,steps:[]}],seen=new Set([stateKey(start)]);
 for(let at=0;at<queue.length;at++){
  const node=queue[at];
  if(complete(scenario,node.state))return {status:"solved",steps:node.steps,explored:seen.size};
  for(const action of legalActions(scenario,node.state)){
   const result=apply(scenario,node.state,action);
   if(!result.ok)throw Error("Kernel parity error");
   const key=stateKey(result.state);
   if(seen.has(key))continue;
   if(seen.size>=maxStates)return {status:"inconclusive",explored:seen.size};
   seen.add(key);queue.push({state:result.state,steps:[...node.steps,action]});
  }
 }
 return {status:"unsolvable",explored:seen.size};
}
export function actionLabel(scenario,state,action){
 if(action.type==="advance")return "Advance step / phase (floating mana empties)";
 if(action.type==="cast")return "Cast "+scenario.goals[state.cast].name+" · spend "+action.spend.map(id=>state.pool.find(x=>x.id===id)?.color).join("+");
 const p=state.permanents.find(x=>x.id===action.source);
 const mode=modesFor(scenario,state,p).find(m=>m.id===action.mode);
 const paid=action.spend.length?" · pay "+action.spend.map(id=>state.pool.find(x=>x.id===id)?.color).join("+"):"";
 return mode.label+paid;
}
