/* Experimental Game Lab presence; no main-site accounts, scores or D1 access.
 * A browser installation has one opaque UUID across tabs, refreshed regardless
 * of focus or activity. Expiry handles closed/crashed/suspended connections.
 */
const TTL_SECONDS=180;
const PAGES=new Set(["Game Lab","Hive Run","Stackbreaker","Stackbreaker: Final Turn","Mana Heist","Command Center"]);
const ID=/^[a-f0-9]{8}-[a-f0-9]{4}-[47][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{
 "Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Robots-Tag":"noindex","Access-Control-Allow-Origin":"null"
}});
function sameOrigin(request){
 const origin=request.headers.get("Origin");
 if(origin){try{if(new URL(origin).origin!==new URL(request.url).origin)return false}catch{return false}}
 const fetchSite=request.headers.get("Sec-Fetch-Site");
 return fetchSite!=="cross-site";
}
function dataStore(env){return env?.LAB_PRESENCE}
export async function onRequestGet({env}){
 if(!dataStore(env))return reply({error:"Lab presence is not configured.",labOnly:true},503);
 try{
  const pages={},seen=new Set();let cursor,scans=0;
  do{
   const batch=await env.LAB_PRESENCE.list({prefix:"lab-browser:",limit:1000,...(cursor?{cursor}:{})});
   for(const item of batch.keys||[]){
    if(seen.has(item.name))continue;
    seen.add(item.name);
    const page=PAGES.has(item.metadata?.page)?item.metadata.page:"Game Lab";
    pages[page]=(pages[page]||0)+1;
   }
   cursor=batch.list_complete?null:batch.cursor;
   scans++;
  }while(cursor&&scans<10);
  return reply({labOnly:true,online:seen.size,registeredMembers:null,
   registeredMembersNote:"No registered-member database exists in the Game Lab.",
   pages,updatedAt:new Date().toISOString(),approximate:true,truncated:!!cursor});
 }catch{return reply({error:"Lab presence temporarily unavailable.",labOnly:true},503)}
}
export async function onRequestPost({request,env}){
 if(!dataStore(env))return reply({error:"Lab presence is not configured.",labOnly:true},503);
 if(!sameOrigin(request))return reply({error:"Same-origin Lab requests only."},403);
 if(Number(request.headers.get("Content-Length")||0)>4096)return reply({error:"Payload too large."},413);
 let payload;
 try{payload=await request.json()}catch{return reply({error:"Invalid JSON."},400)}
 const session=payload?.session,page=payload?.page;
 if(typeof session!=="string"||!ID.test(session)||!PAGES.has(page))
  return reply({error:"Invalid anonymous browser session or Lab page."},400);
 try{
  await env.LAB_PRESENCE.put("lab-browser:"+session,"1",{
   expirationTtl:TTL_SECONDS,metadata:{page}
  });
  return reply({ok:true,labOnly:true,leaseSeconds:TTL_SECONDS});
 }catch{return reply({error:"Lab presence temporarily unavailable."},503)}
}
