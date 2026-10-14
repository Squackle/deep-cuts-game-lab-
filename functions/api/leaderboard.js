/**
 * Hive Run leaderboard — Cloudflare Pages Function.
 * Uses a separate Game Lab D1 database. Exact same simulation is replayed
 * server-side before publishing. No third-party account credentials accepted.
 */
import {newRun,start,step,turn,chooseMutation,RULES_VERSION} from "../../src/engine.js";
const json=(value,status=200)=>new Response(JSON.stringify(value),{
 status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}
});
const error=(message,status=400)=>json({error:message},status);
const profilePattern=/^[A-Za-z][A-Za-z0-9_]{2,23}$/;
const aliasPattern=/^[A-Za-z0-9][A-Za-z0-9 _-]{1,22}$/;
const now=()=>Math.floor(Date.now()/1000);
const MAX_EVENTS=2200,MAX_TICKS=6000;
async function subject(request){
 const ip=request.headers.get("CF-Connecting-IP")||"unknown";
 // Stable pseudonymous value for a session that may span an hourly bucket.
 // Rate-limit windows themselves are separated inside throttle().
 const bytes=new TextEncoder().encode(ip+"|hive-limit-v1");
 const digest=await crypto.subtle.digest("SHA-256",bytes);
 return Array.from(new Uint8Array(digest)).map(n=>n.toString(16).padStart(2,"0")).join("");
}
async function throttle(db,key,action,limit){
 const id=key+"|"+action;
 const bucket=new Date().toISOString().slice(0,13);
 await db.prepare("INSERT INTO hive_limits(subject,bucket,attempts) VALUES(?,?,1) ON CONFLICT(subject,bucket) DO UPDATE SET attempts=attempts+1").bind(id,bucket).run();
 const row=await db.prepare("SELECT attempts FROM hive_limits WHERE subject=? AND bucket=?").bind(id,bucket).first();
 return (row?.attempts||0)<=limit;
}
function validEvents(events){
 if(!Array.isArray(events)||events.length>MAX_EVENTS)return false;
 let last=0;
 for(const ev of events){
  if(!Array.isArray(ev)||ev.length!==3||!Number.isInteger(ev[0])||ev[0]<last||ev[0]>MAX_TICKS)return false;
  if(ev[1]==="turn"&&!["up","down","left","right"].includes(ev[2]))return false;
  if(ev[1]==="choose"&&!["W","U","B","R","G"].includes(ev[2]))return false;
  if(ev[1]!=="turn"&&ev[1]!=="choose")return false;
  last=ev[0];
 }
 return true;
}
export function replayScore(seed,events,expected){
 if(!validEvents(events)||!expected||!Number.isInteger(expected.ticks)||expected.ticks<8||expected.ticks>MAX_TICKS)
  return {ok:false,reason:"Invalid replay format."};
 const run=newRun({cols:18,rows:22,seed});
 start(run);
 let index=0,loops=0;
 while(loops++<MAX_TICKS+events.length+10){
  while(index<events.length&&events[index][0]===run.runTicks){
   const [at,kind,value]=events[index++];
   if(kind==="turn"){if(!turn(run,value))return {ok:false,reason:"Invalid turn in replay."}}
   else if(!chooseMutation(run,value))return {ok:false,reason:"Invalid mutation selection."};
  }
  if(run.status==="draft")return {ok:false,reason:"Missing mutation choice."};
  if(run.status==="over"||run.status==="won")break;
  if(run.runTicks>expected.ticks)return {ok:false,reason:"Run exceeds submitted ticks."};
  step(run);
 }
 if(index!==events.length||!["over","won"].includes(run.status))return {ok:false,reason:"Replay was incomplete."};
 const keys=["score","kills","evolutionsChosen"];
 if(!keys.every(k=>Number.isInteger(expected[k])&&expected[k]===run[k]))
  return {ok:false,reason:"Score or evolution tally does not match replay."};
 if(run.runTicks!==expected.ticks)return {ok:false,reason:"Step count does not match replay."};
 return {ok:true,score:run.score,kills:run.kills,evolutions:run.evolutionsChosen,ticks:run.runTicks};
}
export async function onRequestGet({env}){
 if(!env.HIVE_DB)return error("Leaderboard storage unavailable.",503);
 try{
  const rows=await env.HIVE_DB.prepare("SELECT id,alias,profile_handle AS profileHandle,profile_verified AS profileVerified,score,kills,evolutions,created_at AS createdAt FROM hive_scores WHERE rules_version=? ORDER BY score DESC,kills DESC,created_at ASC LIMIT 25").bind(RULES_VERSION).all();
  return json({season:"Alpha 0.4.1",rulesVersion:RULES_VERSION,verifiedScores:true,profileOwnershipVerified:false,entries:rows.results||[]});
 }catch{return error("Could not load leaderboard.",503)}
}
export async function onRequestPost({request,env}){
 if(!env.HIVE_DB)return error("Leaderboard storage unavailable.",503);
 const incoming=request.headers.get("Origin")||"";
 if(incoming!==new URL(request.url).origin)return error("Same-origin request required.",403);
 if((Number(request.headers.get("content-length")||0)>110000))return error("Replay too large.",413);
 let data;try{data=await request.json()}catch{return error("Invalid JSON.")}
 const db=env.HIVE_DB,key=await subject(request);
 try{
  if(data?.action==="start"){
   if(!await throttle(db,key,"start",16))return error("Too many games started. Try again later.",429);
   const token=crypto.randomUUID(),seed=crypto.getRandomValues(new Uint32Array(1))[0]||1;
   await db.prepare("INSERT INTO hive_sessions(token,seed,issued_at,subject) VALUES(?,?,?,?)").bind(token,seed,now(),key).run();
   return json({token,seed,rulesVersion:RULES_VERSION,sessionExpiresSeconds:7200},201);
  }
  if(data?.action!=="submit")return error("Unknown action.");
  if(!await throttle(db,key,"submit",8))return error("Submission rate limit reached.",429);
  const {token,events,summary}=data;
  if(typeof token!=="string"||!/^[-a-f0-9]{36}$/.test(token)||!validEvents(events))return error("Invalid game session or replay.");
  if(JSON.stringify(data).length>100000)return error("Replay too large.",413);
  const record=await db.prepare("SELECT seed,issued_at,used_at,subject FROM hive_sessions WHERE token=?").bind(token).first();
  if(!record||record.used_at!==null||record.subject!==key||now()-record.issued_at>7200)
   return error("Game session expired or already submitted.",409);
  const claim=await db.prepare("UPDATE hive_sessions SET used_at=? WHERE token=? AND used_at IS NULL").bind(now(),token).run();
  if((claim.meta?.changes||0)!==1)return error("This run has already been submitted.",409);
  const result=replayScore(record.seed,events,summary);
  if(!result.ok)return error("Score verification failed: "+result.reason,422);
  // Never show an external profile handle as a verified identity.
  const alias=typeof data.alias==="string"&&aliasPattern.test(data.alias.trim())?data.alias.trim():"Anonymous Hunter";
  const profileHandle=typeof data.profileHandle==="string"&&profilePattern.test(data.profileHandle)?data.profileHandle:null;
  const id=crypto.randomUUID();
  await db.prepare("INSERT INTO hive_scores(id,session_token,alias,profile_handle,profile_verified,score,kills,evolutions,ticks,rules_version,created_at) VALUES(?,?,?,?,0,?,?,?,?,?,?)")
   .bind(id,token,alias,profileHandle,result.score,result.kills,result.evolutions,result.ticks,RULES_VERSION,now()).run();
  return json({ok:true,id,score:result.score,kills:result.kills,evolutions:result.evolutions,profileVerified:false},201);
 }catch{return error("Leaderboard is temporarily unavailable.",503)}
}
