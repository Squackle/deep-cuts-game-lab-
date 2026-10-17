/* Lab-only presence heartbeat: open browser counts regardless of inactivity.
 * Local storage shares a random browser key among tabs (no user identity).
 * This module never runs or sends data to the public Deep Cuts EDH website.
 */
(()=>{
 "use strict";
 const KEY="deepcuts-lab-presence-session-v1",LAST_PAGE="deepcuts-lab-presence-page-v1";
 const ENDPOINT="/api/lab-presence",INTERVAL=30000;
 const route=location.pathname;
 const page=route.startsWith("/lab/command-center")?"Command Center":
   route.startsWith("/lab/")?"Game Lab":
   route.startsWith("/stackbreaker/final-turn")?"Stackbreaker: Final Turn":
   route.startsWith("/stackbreaker")?"Stackbreaker":
   route.startsWith("/mana-heist")?"Mana Heist":"Hive Run";
 let session;
 try{
  session=localStorage.getItem(KEY);
  if(!/^[a-f0-9-]{36}$/i.test(session||"")){
   session=crypto.randomUUID();
   localStorage.setItem(KEY,session);
  }
 }catch{
  // Restricted browsers still work; cross-tab deduplication needs storage.
  session=crypto.randomUUID();
 }
 const now=()=>Date.now();
 function rememberPage(){
  if(document.visibilityState==="hidden")return;
  try{localStorage.setItem(LAST_PAGE,JSON.stringify({page,at:now()}))}catch{}
 }
 function preferredPage(){
  try{
   const item=JSON.parse(localStorage.getItem(LAST_PAGE)||"null");
   if(item&&Number.isFinite(item.at)&&now()-item.at<86_400_000)return item.page;
  }catch{}
  return page;
 }
 async function touch(){
  try{
   await fetch(ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({session,page:preferredPage()}),cache:"no-store",keepalive:true});
  }catch{} // Browser resumes automatically after network sleep/disconnect.
 }
 const pill=document.createElement("div");
 pill.className="lab-presence-pill";
 pill.setAttribute("role","status");
 pill.setAttribute("aria-label","Browsers currently connected to the Game Lab");
 pill.textContent="● — ONLINE";
 document.body.append(pill);
 async function refresh(){
  try{
   const response=await fetch(ENDPOINT,{cache:"no-store"});
   if(!response.ok)throw Error("Unavailable");
   const count=(await response.json()).online;
   if(!Number.isSafeInteger(count)||count<0)throw Error("Invalid count");
   pill.textContent="● "+count.toLocaleString()+" ONLINE";
   pill.title="Game Lab only · open browsers, not logged-in members";
  }catch{
   pill.textContent="● — ONLINE";
   pill.title="Lab online count temporarily unavailable";
  }
 }
 const pulse=async()=>{await touch();await refresh();window.dispatchEvent(new Event("lab-presence-update"));};
 rememberPage();
 window.addEventListener("focus",()=>{rememberPage();pulse()});
 document.addEventListener("visibilitychange",()=>{if(!document.hidden){rememberPage();pulse()}});
 window.addEventListener("pageshow",pulse);
 window.addEventListener("online",pulse);
 window.setInterval(pulse,INTERVAL);
 pulse();
})();
