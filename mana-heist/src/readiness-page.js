import {structuralAudit,auditCsv} from "./readiness-audit.js";
const el=id=>document.getElementById(id);
const statuses={
 SIMILAR_BOARD:"Similar board",
 REPEATED_FAMILY:"Repeated family",
 INHERITED_TEMPLATE_ROUTE:"Inherited route",
 MISSING_LEGAL_REFERENCE:"Failed route",
 PROOF_INCONCLUSIVE:"Inconclusive"
};
function item(tag,text,cls){
 const node=document.createElement(tag);node.textContent=String(text);
 if(cls)node.className=cls;
 return node;
}
function download(content,filename,type){
 const blob=new Blob([content],{type}),url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download=filename;
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function paintRow(row){
 const tr=document.createElement("tr");
 // Vault IDs remain inspectable labels rather than fake deep links.
 // A visitor can return to the actual game using the separate header link.
 const id=document.createElement("td");
 id.textContent=row.id+" · "+row.title;
 tr.append(id);
 for(const text of [
  "G"+row.galaxy+" · W"+row.world,
  row.origin,
  row.family+" ("+row.lineageGroupSize+")",
  row.exactBoardGroupSize>1?row.exactBoardGroupSize+" similar":"—",
  row.complexity+" / "+row.difficultyEstimate
 ])tr.append(item("td",text));
 const notes=document.createElement("td");
 if(!row.flags.length)notes.append(item("span","No structural flag","quiet"));
 for(const flag of row.flags)notes.append(item("span",statuses[flag]||flag,"flag"));
 tr.append(notes);
 return tr;
}
function bootstrap(){
 const report=structuralAudit(),s=report.summary;
 const numbers=[
  [s.scoredVaults,"Scored vaults"],
  [s.originalAuthored,"Original authored"],
  [s.templateVariants,"Template-derived"],
  [s.revisedBoards,"Changed boards"],
  [s.repeatedFamilyCandidates,"Repeated-family candidates"],
  [s.similarBoardCandidates,"Similar-board candidates"]
 ];
 const metrics=el("auditMetrics");
 for(const [number,label] of numbers){
  const box=document.createElement("div");box.className="metric";
  box.append(item("strong",number),item("span",label));metrics.append(box);
 }
 el("auditStatus").textContent="500 definitions indexed · legal proof execution is a separate CI gate · 0 human stage reviews recorded.";
 for(const g of report.galaxies){
  const opt=document.createElement("option");
  opt.value=String(g.galaxy);opt.textContent=g.galaxy+" · "+g.name;
  el("auditGalaxy").append(opt);
 }
 function refresh(){
  const g=el("auditGalaxy").value,focus=el("auditFilter").value,q=el("auditSearch").value.trim().toLowerCase();
  // Original first 18 stage IDs are mh-01..mh-18, whereas later IDs are
  // three-digit. Accept mh-001 aliases without ever changing saved IDs.
  const numeric=/^mh-0*([1-9][0-9]*)$/.exec(q);
  const canonical=numeric?"mh-"+String(Number(numeric[1])).padStart(Number(numeric[1])<=18?2:3,"0"):null;
  const filtered=report.rows.filter(row=>
   (g==="all"||String(row.galaxy)===g)&&
   (focus==="all"||
    focus==="template"&&row.origin==="template-variant"||
    focus==="lineage"&&row.flags.includes("REPEATED_FAMILY")||
    focus==="similar"&&row.flags.includes("SIMILAR_BOARD")||
    focus==="revised"&&row.revision>0)&&
   (!q||row.id===canonical||(row.id+" "+row.title+" "+row.family+" "+row.origin).toLowerCase().includes(q)));
  el("auditTable").replaceChildren(...filtered.map(paintRow));
  el("auditMatchCount").textContent="Showing "+filtered.length+" of 500 vaults. These are structural review candidates, not verified duplicates.";
 }
 for(const id of ["auditGalaxy","auditFilter","auditSearch"])
  el(id).addEventListener(id==="auditSearch"?"input":"change",refresh);
 el("auditDownloadCsv").addEventListener("click",()=>download(auditCsv(report),"mana-heist-500-vault-structure-audit.csv","text/csv;charset=utf-8"));
 el("auditDownloadJson").addEventListener("click",()=>download(JSON.stringify(report,null,2),"mana-heist-500-vault-structure-audit.json","application/json"));
 refresh();
}
try{bootstrap();}
catch(error){el("auditStatus").textContent="The readiness inventory could not load: "+String(error?.message||error).slice(0,150);}
