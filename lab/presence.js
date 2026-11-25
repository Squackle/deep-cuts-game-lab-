/* Lab-only presence heartbeat: one random browser key; background tabs retain leases.
 * Shared storage is an optimization, not a lock or identity system.
 */
(()=>{
 "use strict";
 const KEY="deepcuts-lab-presence-session-v1",LAST_PAGE="deepcuts-lab-presence-page-v1";
 const LEASE="deepcuts-lab-presence-lease-v2",COUNT="deepcuts-lab-presence-count-v2";
 const ENDPOINT="/api/lab-presence",INTERVAL=30000;
 const route=location.pathname;
 const within=base=>route===base||route.startsWith(base+"/");
 const page=within("/lab/command-center")?"Command Center":
   within("/stackbreaker/final-turn")?"Stackbreaker: Final Turn":
   within("/stackbreaker")?"Stackbreaker":
   within("/mana-heist")?"Mana Heist":
   within("/hive-run")?"Hive Run":
   within("/graftbound")?"GRAFTBOUND":
   within("/archemancy")||within("/archamancy")?"ARCHEMANCY":"Game Lab";
 const pages=new Set(["Game Lab","Hive Run","Stackbreaker","Stackbreaker: Final Turn","Mana Heist","Command Center","GRAFTBOUND","ARCHEMANCY"]);
 const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[47][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
 let session;
 try{
  session=localStorage.getItem(KEY);
  if(!uuid.test(session||"")){
   session=crypto.randomUUID();
   localStorage.setItem(KEY,session);
  }
 }catch{
  session=crypto.randomUUID();
 }
 const now=()=>Date.now();
 function read(key){try{return JSON.parse(localStorage.getItem(key)||"null")}catch{return null}}
 function write(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
 function fresh(item,ttl){return !!item&&Number.isFinite(item.at)&&now()-item.at>=0&&now()-item.at<ttl}
 function rememberPage(){
  if(document.visibilityState==="hidden")return;
  write(LAST_PAGE,{page,at:now()});
 }
 function preferredPage(){
  const item=read(LAST_PAGE);
  return fresh(item,86_400_000)&&pages.has(item.page)?item.page:page;
 }
 let localLease=null,localCount=null;
 const latest=(a,b)=>(a?.at||0)>=(b?.at||0)?a:b;
 async function touch(){
  const target=preferredPage(),lease=latest(localLease,read(LEASE));
  // Same browser, same page: skip redundant focus/pageshow/timer writes.
  if(fresh(lease,INTERVAL)&&lease.session===session&&lease.page===target)return;
  try{
   const response=await fetch(ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({session,page:target}),cache:"no-store",keepalive:true,signal:AbortSignal.timeout(8000)});
   if(response.ok){localLease={session,page:target,at:now()};write(LEASE,localLease);}
  }catch{} // Retry at the next normal pulse; failures never extend the cached lease.
 }
 const pill=document.createElement("div");
 pill.className="lab-presence-pill";
 pill.setAttribute("role","status");
 pill.setAttribute("aria-label","Browsers currently connected to the Game Lab");
 pill.textContent="● — ONLINE";
 document.body.append(pill);
 function render(count){
  pill.textContent="● "+count.toLocaleString()+" ONLINE";
  pill.title="Game Lab only · open browsers, not logged-in members";
 }
 async function refresh(){
  const cached=latest(localCount,read(COUNT));
  if(fresh(cached,INTERVAL)&&Number.isSafeInteger(cached.count)&&cached.count>=0){render(cached.count);return;}
  try{
   const response=await fetch(ENDPOINT,{cache:"no-store",signal:AbortSignal.timeout(8000)});
   if(!response.ok)throw Error("Unavailable");
   const count=(await response.json()).online;
   if(!Number.isSafeInteger(count)||count<0)throw Error("Invalid count");
   localCount={count,at:now()};write(COUNT,localCount);render(count);
  }catch{
   pill.textContent="● — ONLINE";
   pill.title="Lab online count temporarily unavailable";
  }
 }
 // At most one in-flight pulse per tab. A page switch during a request is queued
 // once so a foreground route change is not silently lost.
 let pending=false,queued=false;
 const pulse=async()=>{
  if(pending){queued=true;return;}
  pending=true;
  try{await touch();await refresh();window.dispatchEvent(new Event("lab-presence-update"));}
  finally{
   pending=false;
   if(queued){queued=false;void pulse();}
  }
 };
 rememberPage();
 window.addEventListener("focus",()=>{rememberPage();pulse()});
 document.addEventListener("visibilitychange",()=>{if(!document.hidden){rememberPage();pulse()}});
 window.addEventListener("pageshow",pulse);
 window.addEventListener("online",pulse);
 window.setInterval(pulse,INTERVAL);
 pulse();
})();
