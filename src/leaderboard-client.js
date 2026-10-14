import {API_URL} from "./integration.js";
import {RULES_VERSION} from "./engine.js";
const SAFE_SEED=()=>Math.floor(Math.random()*4294967295)||1;
export class LeaderboardClient{
 constructor(endpoint=API_URL){this.endpoint=endpoint;this.session=null;this.events=[];this.error="";}
 async request(body){
  const res=await fetch(this.endpoint,{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",cache:"no-store",body:JSON.stringify(body)});
  const json=await res.json();
  if(!res.ok)throw Error(json?.error||"Leaderboard request failed.");
  return json;
 }
 async start(){
  this.session=null;this.events=[];this.error="";
  try{
   const data=await this.request({action:"start"});
   if(data.rulesVersion!==RULES_VERSION)throw Error("Leaderboard rules version mismatch.");
   this.session={token:data.token,seed:data.seed};
   return {seed:data.seed,ranked:true};
  }catch(error){this.error=String(error.message||error);return {seed:SAFE_SEED(),ranked:false}}
 }
 action(tick,kind,value){
  if(!this.session)return;
  if(this.events.length>=2200)return;
  this.events.push([tick,kind,value]);
 }
 async submit(run,alias,profileHandle){
  if(!this.session)throw Error("This is a practice run. Only server-seeded runs can be ranked.");
  const session=this.session;
  this.session=null; // Prevent accidental double submit on repeated clicks.
  return this.request({action:"submit",token:session.token,events:this.events,alias,profileHandle,
   summary:{score:run.score,kills:run.kills,evolutionsChosen:run.evolutionsChosen,ticks:run.runTicks}});
 }
 async load(){
  const r=await fetch(this.endpoint,{cache:"no-store",credentials:"same-origin"});
  const data=await r.json();if(!r.ok)throw Error(data.error||"Unable to fetch leaderboard.");
  return data;
 }
}
