import {createArt} from "./art.mjs";

// Read-only collection: inspect all sixteen legends without altering a saved battle or commander unlocks.
export function legendRows({definitions,unlocked=[],starter,last,starterIds=[],requirement=()=>null}){
 const owned=new Set(unlocked);
 return Object.entries(definitions).map(([id,d])=>({
  id,name:d.name,color:d.color,colors:d.colors,archetype:d.archetype,desc:d.desc,
  hp:d.hp,damage:d.damage,owned:owned.has(id),
  starterChoice:!starter&&starterIds.includes(id),selected:owned.has(id)&&last===id,
  requirement:owned.has(id)?null:requirement(id)
 }));
}
export function mountLegendGallery({doc,host,tiles,read,getArt,colors,beforeOpen=()=>{}}){
 const el=(tag,cls="",value="")=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(value)n.textContent=value;return n;};
 const trigger=el("button","icon-tile legend-tile");trigger.type="button";
 const icon=el("span","tile-ico","♜");icon.setAttribute("aria-hidden","true");
 const count=el("small");trigger.append(icon,doc.createTextNode("Legends"),count);tiles.append(trigger);
 const dialog=el("dialog","legend-gallery");dialog.id="legendGalleryDialog";dialog.setAttribute("aria-labelledby","legendGalleryTitle");
 const header=el("div","legend-header"),heading=el("div"),kicker=el("span","legend-kicker","THE HALL OF LEGENDS");
 const title=el("h2","","Commander collection");title.id="legendGalleryTitle";heading.append(kicker,title);
 const close=el("button","legend-close","Close");close.type="button";close.addEventListener("click",()=>dialog.close());header.append(heading,close);
 const summary=el("p","legend-summary"),filters=el("div","legend-filters"),grid=el("div","legend-grid");
 filters.setAttribute("aria-label","Filter commanders");filters.setAttribute("role","group");
 dialog.append(header,summary,filters,grid);host.append(dialog);
 let filter="all";const cards=new Map(),scratch=el("canvas");scratch.width=224;scratch.height=224;
 const ctx=scratch.getContext("2d");if(ctx)ctx.scale(2.8,2.8);
 const painter=ctx?createArt(ctx,{res:2}):null;
 const choices=[["all","All legends"],["owned","Unlocked"],["locked","Locked"]];
 for(const [id,label] of choices){const b=el("button","",label);b.type="button";b.dataset.filter=id;b.addEventListener("click",()=>{filter=id;applyFilter();});filters.append(b);}
 function updateBadge(){const rows=legendRows(read());count.textContent=rows.filter(r=>r.owned).length+" of "+rows.length;trigger.setAttribute("aria-label","Commander collection, "+count.textContent+" unlocked");}
 function applyFilter(){
  for(const b of filters.children)b.setAttribute("aria-pressed",String(b.dataset.filter===filter));
  let shown=0;for(const {node,row} of cards.values()){node.hidden=filter==="owned"?!row.owned:filter==="locked"?row.owned:false;if(!node.hidden)shown++;}
  summary.textContent=Array.from(cards.values()).filter(c=>c.row.owned).length+" of "+cards.size+" legends unlocked · "+shown+" shown. Browse abilities and unlock requirements. Commander selection still occurs before battle.";
 }
 function refreshArt(name){
  if(!dialog.open)return;
  for(const {row,art,credit} of cards.values()){if(row.name!==name)continue;const data=getArt(name);if(data){art.style.setProperty("--art",'url("'+data.art+'")');art.classList.add("has-art");credit.textContent="Art: "+data.artist;}}
 }
 function model(row){
  const c=el("canvas","legend-model");c.width=c.height=224;c.setAttribute("aria-hidden","true");
  if(painter&&ctx){try{ctx.clearRect(0,0,80,80);painter.unit(row.id,40,68,{ally:true,flying:row.id==="urdragon",hp:1,time:0,id:0,animate:false});c.getContext("2d")?.drawImage(scratch,0,0);}catch{/* Text remains usable if canvas is unavailable. */}}
  return c;
 }
 function render(){
  cards.clear();grid.replaceChildren();
  for(const row of legendRows(read())){
   const node=el("article","legend-card"+(row.owned?" is-unlocked":" is-locked"));node.style.setProperty("--school",colors[row.color]||colors.C||"#c5c9cc");
   const art=el("div","legend-art"),credit=el("span","legend-credit");
   const status=el("span","legend-state",row.selected?"Active legend":row.owned?"Unlocked":row.starterChoice?"Starter choice":"Locked");
   art.append(model(row),status,credit);
   const info=el("div","legend-info"),name=el("h3","",row.name),meta=el("p","legend-meta",[row.colors,row.archetype].filter(Boolean).join(" · "));
   const numbers=el("div","legend-numbers");
   numbers.append(el("span","",row.hp+" HP"),el("span","",row.id==="urdragon"?"Flying":row.damage+" attack"));
   const desc=el("p","legend-desc",row.desc);
   info.append(name,meta,numbers,desc);
   if(!row.owned)info.append(el("p","legend-requirement",row.starterChoice?"Available when choosing your first commander.":row.requirement||"Locked"));
   node.append(art,info);grid.append(node);cards.set(row.id,{node,row,art,credit});
   const data=getArt(row.name);if(data){art.style.setProperty("--art",'url("'+data.art+'")');art.classList.add("has-art");credit.textContent="Art: "+data.artist;}
  }
  filter="all";applyFilter();updateBadge();
 }
 trigger.addEventListener("click",()=>{beforeOpen();render();dialog.showModal();close.focus();});
 return {updateBadge,refreshArt,dialog};
}
