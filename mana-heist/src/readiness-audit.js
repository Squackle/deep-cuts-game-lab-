// P03/P06-P10 release-readiness baseline. Explicitly separates measured
// board STRUCTURE, legal winning-route REPLAY, and unmeasured human quality.
// No network, localStorage, score writes, art assets, or player analytics.
import {LEVELS,BASE_LEVELS,GALAXIES,CHAPTERS} from "./levels.js";
import {CARDS,VERSION,validate} from "./engine.js";
import {solve,replay} from "./solver.js";
import {certifyCapstone} from "./capstone-certificates.js";
import {certifyMastery} from "./mastery-certificates.js";
import {certifyDiverse} from "./mana-variety-certificates.js";
import {certifyRemix} from "./certified-remixes.js";
import {evaluateVault} from "./difficulty-metrics.js";

export const AUDIT_VERSION=1;
const sorted=(items)=>items.slice().sort();
const count=(items)=>Object.fromEntries([...new Set(items)].sort().map(item=>[item,items.filter(x=>x===item).length]));
const stringKeys=o=>Object.keys(o||{}).sort().map(k=>k+":"+o[k]).join(",");
const groupKey=p=>p.templateId?"inherited:"+p.templateId:
 p.mastery?.family?"mastery:"+p.revision+":"+p.mastery.family:
 p.curated?"curated:"+p.curated:
 "original:"+p.id;
const snapshot=list=>sorted((list||[]).map(c=>c.card));
export function boardFingerprint(p){
 // Excludes title, flavor, board instance IDs and cosmetic ordering; labels
 // "similar boards" for reviewer inspection, NEVER "same winning strategy".
 return JSON.stringify({
  field:snapshot(p.field),hand:snapshot(p.hand),library:snapshot(p.library),
  wards:(p.stages||[]).map(x=>stringKeys(x.cost)),
  life:p.life,turnLimit:p.turnLimit,devotion:stringKeys(p.devotion),
  opponentLandColors:sorted(p.opponentLandColors||[]),
  commanderColors:sorted(p.commanderColors||[]),
  opponentTappedLands:p.opponentTappedLands||0
 });
}
function reviewFlags(row){
 const flags=[];
 if(row.exactBoardGroupSize>1)flags.push("SIMILAR_BOARD");
 if(row.lineageGroupSize>=10)flags.push("REPEATED_FAMILY");
 if(row.origin==="template-variant")flags.push("INHERITED_TEMPLATE_ROUTE");
 if(row.proofStatus==="failed")flags.push("MISSING_LEGAL_REFERENCE");
 if(row.proofStatus==="inconclusive")flags.push("PROOF_INCONCLUSIVE");
 return flags;
}
function origin(p,i){
 if(i<BASE_LEVELS.length)return "original-authored";
 if(p.templateId)return "template-variant";
 if(p.revision===4)return "authored-remix-v4";
 if(p.revision===3)return "constructed-variety-v3";
 if(p.revision===2)return "constructed-mastery-v2";
 if(p.revision===1)return "revised-capstone-v1";
 return "other";
}
export function structuralAudit(puzzles=LEVELS){
 const lineages=puzzles.map(groupKey),boards=puzzles.map(boardFingerprint);
 const lineageCounts=count(lineages),boardCounts=count(boards);
 const rows=puzzles.map((p,i)=>{
  const cards=[...p.field,...p.hand,...p.library];
  const profile=evaluateVault(p);
  return {
   id:p.id,index:i+1,galaxy:Math.floor(i/50)+1,
   world:Math.floor(i/10)%5+1,title:p.title,
   revision:p.revision||0,origin:origin(p,i),
   family:lineages[i],lineageGroupSize:lineageCounts[lineages[i]],
   exactBoardGroupSize:boardCounts[boards[i]],
   exactBoardFingerprint:boards[i],
   sources:cards.length,sourceTypes:new Set(cards.map(c=>c.card)).size,
   manaMechanics:sorted([...new Set(cards.map(c=>CARDS[c.card]?.v2||CARDS[c.card]?.kind||"unknown"))]),
   wards:p.stages.length,turnLimit:p.turnLimit,
   complexity:profile.complexity,difficultyEstimate:profile.difficulty,
   proofStatus:"not-run",proofKind:null,referenceTurns:null,
   referenceActions:null,proofError:null,
   humanCurriculumReview:"not-performed",
   physicalDeviceReview:"not-performed",
   empiricalDifficulty:"not-measured"
  };
 });
 for(const row of rows)row.flags=reviewFlags(row);
 return finalize(rows);
}
function finalize(rows){
 const galaxies=GALAXIES.map((g,i)=>{
  const rs=rows.filter(r=>r.galaxy===i+1);
  return {galaxy:i+1,name:g.name,stages:rs.length,
   templateVariants:rs.filter(r=>r.origin==="template-variant").length,
   repeatedFamilyCandidates:rs.filter(r=>r.lineageGroupSize>=10).length,
   similarBoardCandidates:rs.filter(r=>r.exactBoardGroupSize>1).length,
   averageEstimatedDifficulty:Math.round(rs.reduce((n,r)=>n+r.difficultyEstimate,0)/Math.max(1,rs.length)),
   humanReviewed:0};
 });
 const summary={
  scoredVaults:rows.length,galaxies:galaxies.length,worlds:CHAPTERS.length,
  originalAuthored:rows.filter(r=>r.origin==="original-authored").length,
  templateVariants:rows.filter(r=>r.origin==="template-variant").length,
  revisedBoards:rows.filter(r=>r.revision>0).length,
  distinctLineageGroups:new Set(rows.map(r=>r.family)).size,
  repeatedFamilyCandidates:rows.filter(r=>r.flags.includes("REPEATED_FAMILY")).length,
  similarBoardCandidates:rows.filter(r=>r.flags.includes("SIMILAR_BOARD")).length,
  legalReferenceReplays:rows.filter(r=>r.proofStatus==="legal-replay").length,
  failedReferenceReplays:rows.filter(r=>r.proofStatus==="failed").length,
  inconclusiveReferenceReplays:rows.filter(r=>r.proofStatus==="inconclusive").length,
  uncheckedReferenceReplays:rows.filter(r=>r.proofStatus==="not-run").length,
  humanCurriculumReviewed:0,physicalDeviceReviewed:0,empiricalDifficultySamples:0
 };
 return {format:"mana-heist-readiness-audit",version:AUDIT_VERSION,
  engineVersion:VERSION,
  caveat:"Automated board similarity is a REVIEW CANDIDATE, not demonstrated strategic duplication. A legal route is NOT proof of uniqueness, optimality, educational merit, automatic casting, or human/device QA. Difficulty values are structural estimates, not player observations.",
  summary,galaxies,rows};
}
function referenceFor(level,cache){
 if(level.revision===4)return {kind:"authored-remix-v4",proof:certifyRemix(level)};
 if(level.revision===3)return {kind:"constructed-variety-v3",proof:certifyDiverse(level)};
 if(level.revision===2)return {kind:"constructed-mastery-v2",proof:certifyMastery(level)};
 if(level.revision===1)return {kind:"revised-capstone-v1",proof:certifyCapstone(level)};
 const source=level.templateId||level.id;
 if(!cache.has(source))return {kind:"none",proof:null};
 return {kind:level.templateId?"inherited-template":"original-solver",proof:cache.get(source)};
}
export function auditLegalRoutes(puzzles=LEVELS,{maxStates=200000}={}){
 const data=structuralAudit(puzzles),cache=new Map();
 // Solve only original teaching boards once, then replay legal routes on all
 // derived templates; every revised family has its own constructive proof.
 for(const base of BASE_LEVELS){
  try{cache.set(base.id,solve(base,{maxStates}));}
  catch(e){cache.set(base.id,{status:"inconclusive",reason:String(e.message||e)});}
 }
 for(let i=0;i<puzzles.length;i++){
  const p=puzzles[i],r=data.rows[i];
  try{
   validate(p);
   const {kind,proof}=referenceFor(p,cache);
   r.proofKind=kind;
   if(!proof||proof.status!=="solved"||!Array.isArray(proof.actions)){
    r.proofStatus="inconclusive";r.proofError=String(proof?.reason||"No solved legal reference route");
   }else{
    const route=replay(p,proof.actions);
    if(!route.ok){r.proofStatus="failed";r.proofError=String(route.error||"Reference did not complete all wards");}
    else if(route.state.turn>p.turnLimit||route.state.life<=0){
     r.proofStatus="failed";r.proofError="Reference violates turn/life budget";
    }else{
     r.proofStatus="legal-replay";
     r.referenceTurns=route.state.turn;
     r.referenceActions=proof.actions.length;
    }
   }
  }catch(e){
   r.proofStatus="failed";r.proofError=String(e?.message||e).slice(0,260);
  }
  r.flags=reviewFlags(r);
 }
 return finalize(data.rows);
}
const esc=t=>'"'+String(t??"").replaceAll('"','""').replaceAll("\r"," ").replaceAll("\n"," ")+'"';
export function auditCsv(report){
 const headers=["id","index","galaxy","world","title","revision","origin","family",
  "lineageGroupSize","exactBoardGroupSize","sources","sourceTypes","wards","turnLimit",
  "complexity","difficultyEstimate","proofStatus","proofKind","referenceTurns",
  "referenceActions","humanCurriculumReview","physicalDeviceReview",
  "empiricalDifficulty","flags","proofError"];
 const lines=[headers.join(",")];
 for(const row of report.rows)lines.push(headers.map(h=>esc(h==="flags"?row.flags.join("|"):row[h])).join(","));
 return lines.join("\n")+"\n";
}
