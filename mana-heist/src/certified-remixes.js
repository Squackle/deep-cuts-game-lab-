// Five genuinely different hand-authored mana tests inside existing Galaxy VI-X
// IDs. Revision 4 receives a distinct save key. Previous revision-3 medals
// remain archived verbatim, never treated as scores on changed board states.
// This is a *supported mechanics subset*, not a full Oracle game engine.
import {VERSION,actions,initial,reduce,completed} from "./engine.js";
const card=(id,name)=>({id,card:name});
const cards=names=>names.map((name,i)=>card("f"+i,name));
const ward=(name,cost)=>({name,cost});
const plans=[
 [
  ["activate","f1","stone-C"],["activate","f2","filter"],["activate","f0","fellwar-U"],["cast"],
  ["activate","f3","talisman-B"],["tap","f4","R"],["cast"]
 ],
 [
  ["activate","f0","fellwar-W"],["activate","f1","talisman-B"],["cast"],
  ["tap","f2","U"],["tap","f3","R"],["cast"],["end"],
  ["activate","f0","fellwar-G"],["activate","f1","talisman-C"],["tap","f4","C"],["cast"]
 ],
 [
  ["activate","f2","sol"],["activate","f3","filter"],["cast"],
  ["activate","f0","fellwar-B"],["activate","f1","talisman-U"],["tap","f4","U"],["cast"],["end"],
  ["activate","f2","sol"],["activate","f3","filter"],["cast"],
  ["activate","f0","fellwar-R"],["tap","f6","R"],["tap","f4","U"],["tap","f7","C"],["cast"]
 ],
 [
  ["activate","f2","sol"],["activate","f3","filter"],["cast"],
  ["activate","f0","fellwar-G"],["tap","f4","G"],["tap","f5","U"],["cast"],["end"],
  ["activate","f1","talisman-B"],["activate","f0","fellwar-B"],["tap","f6","R"],["cast"],
  ["activate","f2","sol"],["activate","f8","prism-R"],["tap","f5","U"],["cast"],["end"],
  ["activate","f0","fellwar-G"],["tap","f4","G"],["activate","f2","sol"],["activate","f3","filter"],["activate","f1","talisman-B"],["cast"]
 ],
 [
  ["activate","f2","thran-CCC"],["activate","f3","filter"],["activate","f4","prism-G"],["cast"],
  ["activate","f0","fellwar-R"],["activate","f1","talisman-B"],["tap","f6","U"],["tap","f7","R"],["cast"],["end"],
  ["activate","f2","thran-CCC"],["activate","f4","prism-W"],["activate","f3","filter"],["cast"],
  ["activate","f0","fellwar-G"],["activate","f1","talisman-U"],["tap","f8","G"],["tap","f9","C"],["cast"],["end"],
  ["activate","f2","thran-CCC"],["activate","f3","filter"],["activate","f4","prism-B"],["activate","f0","fellwar-B"],["cast"],
  ["tap","f5","W"],["tap","f6","U"],["tap","f7","R"],["tap","f8","G"],["tap","f9","C"],["activate","f10","petal-B"],["cast"]
 ]
];
const specs=[
 {
  id:"mh-251",galaxy:5,turnLimit:1,life:2,family:"borrowed-filter",
  title:"THE BORROWED SIGNET",chapter:"THE RIVAL'S COLORS",
  briefing:"Use colorless from Wastes to power Azorius Signet. Fellwar Stone must supply blue from the opponent-land palette so the first ward gets WUU. Save Mountain and the Talisman's risky black mode for the second ward.",
  field:cards(["fellwar","relic","signet","talisman","mountain"]),opponentLandColors:["U","R"],
  stages:[ward("Filter the Borrowed Blue",{W:1,U:2}),ward("Pay the Black Toll",{B:1,R:1})]
 },
 {
  id:"mh-301",galaxy:6,turnLimit:2,life:3,family:"talisman-turns",
  title:"THE SECOND-TURN PALETTE",chapter:"THE RIVAL'S COLORS",
  briefing:"This rival's lands can make white or green. On turn one combine Fellwar white with Talisman black, then spend Island and Mountain on the second ward. Untap next turn and switch Fellwar to green and Talisman to safe colorless for the final double-colorless demand.",
  field:cards(["fellwar","talisman","island","mountain","relic"]),opponentLandColors:["W","G"],
  stages:[ward("Pay the Rival's Tribute",{W:1,B:1}),ward("Open the Tide Furnace",{U:1,R:1}),ward("The Colorless Green Lock",{G:1,C:2})]
 },
 {
  id:"mh-351",galaxy:7,turnLimit:2,life:2,family:"survival-chain",
  title:"THE SURVIVAL CIRCUIT",chapter:"THE LAST LIFE",
  briefing:"Power Signet from Sol Ring, preserve one true colorless for its ward, then take exactly one Talisman damage to pair blue with Fellwar black. The second turn needs another Signet activation and then two separate red sources. You cannot safely take a second Talisman hit.",
  field:cards(["fellwar","talisman","solring","signet","island","plains","mountain","relic"]),opponentLandColors:["B","R"],
  stages:[ward("Three-Part Converter",{W:1,U:1,C:1}),ward("The Last Life Ledger",{B:1,U:2}),ward("Rebuild the Circuit",{W:1,U:1,C:1}),ward("The Red Escape",{R:2,U:1,C:1})]
 },
 {
  id:"mh-401",galaxy:8,turnLimit:3,life:3,family:"life-ledger",
  title:"THE THREE-TURN LEDGER",chapter:"THE RIVAL'S COLORS",
  briefing:"Three turns and five seals. Route Sol Ring through Signet, use Fellwar Stone for green and later black, then balance Talisman damage against its safe colorless. Save enough life to generate black again on the final turn.",
  field:cards(["fellwar","talisman","solring","signet","forest","island","mountain","relic","prism"]),opponentLandColors:["G","B"],
  stages:[ward("The Sol Ring Contract",{W:1,U:1,C:1}),ward("Green on Credit",{G:2,U:1}),ward("Black-Red Settlement",{B:2,R:1}),ward("The Prismatic Receipt",{R:1,U:1,C:1}),ward("The Final Accounting",{G:2,W:1,U:1,B:1,C:1})]
 },
 {
  id:"mh-451",galaxy:9,turnLimit:3,life:3,family:"final-precision",
  title:"THE PRISMATIC DEBT",chapter:"THE SIX-WARD GAUNTLET",
  briefing:"Six seals over three turns. Thran Dynamo powers Signet and Prismatic Lens while preserving real colorless. Fellwar Stone uses the opposing red, green or black lands; two Talisman damage choices leave one life. Finish with a single Lotus Petal and all SIX mana symbols, where colorless cannot be replaced by a generic payment.",
  field:cards(["fellwar","talisman","thran","signet","prism","plains","island","mountain","forest","relic","petal","treasure"]),
  opponentLandColors:["R","G","B"],
  stages:[ward("The Triple Converter",{W:1,U:1,G:1,C:1}),ward("The First Debt",{R:2,B:1,U:1}),ward("Another White Dividend",{W:2,U:1,C:1}),ward("The Green-Blue Settlement",{G:2,U:1,C:1}),ward("The Black Prism",{W:1,U:1,B:2,C:1}),ward("The Six-Color Balance",{W:1,U:1,B:1,R:1,G:1,C:1})]
 }
];
export const REMIXED_IDS=Object.freeze(specs.map(s=>s.id));
export const REMIX_KEY="dc-mana-heist-certified-remixes-v1";
export const REMIXES=Object.freeze(specs.map((spec,index)=>Object.freeze({
 ...spec,version:VERSION,rank:5,world:0,revision:4,curated:"mana-verified-remix-4.0",
 hand:[],library:[],mastery:{family:spec.family,turns:spec.turnLimit,wards:spec.stages.length,world:0,position:0,uniqueMechanic:"opponent-palette+talisman-damage+multi-ward"}
})));
export function remixFor(i){return Number.isInteger(i)&&i>=250&&i<500?REMIXES.find(x=>x.id==="mh-"+String(i+1).padStart(3,"0"))||null:null;}
export function validateRemixBests(raw){
 const out={};
 if(!raw||raw.v!==1||!raw.bests||typeof raw.bests!=="object"||Array.isArray(raw.bests))return out;
 for(const id of REMIXED_IDS){
  const r=raw.bests[id];if(!r)continue;
  const spec=REMIXES.find(s=>s.id===id);
  if(Number.isInteger(r.turn)&&r.turn>=1&&r.turn<=spec.turnLimit&&Number.isInteger(r.spentLife)&&r.spentLife>=0&&r.spentLife<spec.life&&Number.isInteger(r.actions)&&r.actions>0&&r.actions<=140)
   out[id]={turn:r.turn,spentLife:r.spentLife,actions:r.actions};
 }
 return out;
}
export function certifyRemix(level){
 const n=REMIXED_IDS.indexOf(level?.id);
 if(n<0||level.revision!==4)throw Error("Unrecognized remix puzzle");
 let state=initial(level);const trace=[];
 for(const step of plans[n]){
  const [type,id,detail]=step;
  const candidates=actions(level,state).filter(a=>a.type===type&&(!id||a.id===id)&&
   (type==="activate"?a.mode===detail:type==="tap"?a.color===detail:true));
  const colorlessCost=a=>(a.spend||[]).filter(mid=>state.manaUnits.some(u=>u.id===mid&&u.color==="C")).length;
  const action=candidates.sort((a,b)=>colorlessCost(b)-colorlessCost(a))[0];
  if(!action)throw Error("Invalid remix proof "+level.id+" "+JSON.stringify(step)+" / turn "+state.turn+", ward "+state.stage+", pool "+JSON.stringify(state.pool));
  const out=reduce(level,state,action);
  if(!out.ok)throw Error("Illegal remix proof "+level.id+": "+out.error);
  state=out.state;trace.push(action);
 }
 if(!completed(level,state))throw Error("Unfinished remix proof "+level.id);
 return {status:"solved",turn:state.turn,spentLife:state.spentLife,actions:trace,steps:trace.length,
  certification:"Hand-authored legal reference route. Optimality and unique solution not established."};
}
