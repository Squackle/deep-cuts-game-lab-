(()=>{
 "use strict";
 const byId=id=>document.getElementById(id);
 const show=(id,text)=>{const e=byId(id);if(e)e.textContent=String(text)};
 const endpoint="/api/lab-presence";
 async function render(){
  try{
   const r=await fetch(endpoint,{cache:"no-store"});
   if(!r.ok)throw Error("Server unavailable");
   const data=await r.json();
   if(!data.labOnly||!Number.isSafeInteger(data.online))throw Error("Unexpected response");
   show("lab-online",data.online.toLocaleString());
   show("lab-members","—"); // No Lab identity database; never invent a member count.
   const entries=Object.entries(data.pages||{}).filter(([_,count])=>Number.isSafeInteger(count)).sort((a,b)=>b[1]-a[1]);
   show("lab-top-count",entries[0]?.[1]??0);
   show("lab-top-page",entries[0]?.[0]||"No connected Lab browsers");
   const container=byId("lab-page-breakdown");container.replaceChildren();
   for(const [name,count] of entries){
    const row=document.createElement("div");row.className="lab-command-page";
    const label=document.createElement("span");label.textContent=name;
    const value=document.createElement("strong");value.textContent=String(count);
    row.append(label,value);container.append(row);
   }
   if(!entries.length)container.textContent="No connected browser sessions yet.";
   show("lab-freshness",data.truncated?"PARTIAL · OVER 10,000 SESSIONS":"UPDATED "+new Date(data.updatedAt).toLocaleTimeString());
  }catch{
   show("lab-online","—");show("lab-top-count","—");show("lab-top-page","Unavailable");
   show("lab-freshness","PRESENCE TEMPORARILY UNAVAILABLE");
   byId("lab-page-breakdown").textContent="Waiting for the Lab presence service.";
  }
 }
 window.addEventListener("lab-presence-update",render);
 window.setInterval(render,30000);
 render();
})();
