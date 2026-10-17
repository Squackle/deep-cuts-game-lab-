// One full-size hover preview of the SAME current physical card printing.
// Paint directly from its already-loaded <img> to a canvas: no extra Scryfall
// redirect is issued, so randomized reprints cannot change on mouse-over.
export function installCardMagnifier({battlefield,hand,panel,canvas,title,canShow=()=>true}){
 if(!battlefield||!hand||!panel||!canvas||!title)throw Error("Missing magnifier elements");
 const ctx=canvas.getContext("2d");
 let current=null,serial=0;
 function hide(){current=null;serial++;panel.hidden=true;panel.setAttribute("aria-hidden","true");}
 function paint(card){
  const image=card.querySelector(".mtg-card-image");
  if(!image)return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(image.complete&&image.naturalWidth>0){
   try{ctx.drawImage(image,0,0,canvas.width,canvas.height);}
   catch{ctx.fillStyle="#1c3030";ctx.fillRect(0,0,canvas.width,canvas.height);}
   return true;
  }
  ctx.fillStyle="#183132";ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle="#e4cca0";ctx.font="24px Georgia";
  ctx.fillText("Loading card artwork…",34,canvas.height/2);
  const token=serial;
  image.addEventListener("load",()=>{if(current===card&&token===serial)paint(card);},{once:true});
  return false;
 }
 function locate(card){
  const r=card.getBoundingClientRect(),width=Math.min(320,innerWidth-24),height=Math.min(475,innerHeight-20);
  const x=r.right+18+width<innerWidth-9?r.right+18:Math.max(8,r.left-width-18);
  const y=Math.max(9,Math.min(innerHeight-height-9,r.top-38));
  panel.style.left=x+"px";panel.style.top=y+"px";
 }
 function show(card){
  if(!card||!canShow()||(panel.hidden===false&&current===card))return;
  const id=card.dataset.cardid;if(!id)return;
  current=card;serial++;
  title.textContent=card.dataset.zone==="field"?"LAND IN PLAY":"LAND IN HAND";
  panel.hidden=false;panel.setAttribute("aria-hidden","false");
  locate(card);paint(card);
 }
 for(const zone of [battlefield,hand]){
  zone.addEventListener("pointerover",event=>{
   if(event.pointerType==="touch")return;
   const card=event.target.closest(".land-card[data-cardid]");
   if(card&&zone.contains(card)&&!card.contains(event.relatedTarget))show(card);
  });
  zone.addEventListener("pointerout",event=>{
   if(current&&!current.contains(event.relatedTarget))hide();
  });
  zone.addEventListener("focusin",event=>{
   const card=event.target.closest(".land-card[data-cardid]");
   if(card)show(card);
  });
  zone.addEventListener("focusout",event=>{if(current&&!current.contains(event.relatedTarget))hide();});
  zone.addEventListener("pointerdown",hide,true);
 }
 document.addEventListener("keydown",event=>{if(event.key==="Escape")hide();});
 window.addEventListener("resize",hide,{passive:true});
 return {hide};
}
