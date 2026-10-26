#!/usr/bin/env node
// Offline, reproducible: no HTTP calls or player records. Optional output paths
// are explicit local CLI arguments, never served from a browser request.
import {writeFileSync,readFileSync,readdirSync} from "node:fs";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {campaignDecisionAudit,campaignDecisionSummary} from "../src/campaign-decision-audit.js";
const args=process.argv.slice(2),values={};
for(const arg of args){
 const match=/^--(max-states|max-edges|ids|json|summary)=(.+)$/.exec(arg);
 if(!match||Object.hasOwn(values,match[1]))throw new Error("Unknown, empty or duplicate argument: "+arg);
 values[match[1]]=match[2];
}
const options={};
for(const [flag,key] of [["max-states","maxStates"],["max-edges","maxEdges"]])if(values[flag]!==undefined)options[key]=Number(values[flag]);
if(values.ids!==undefined)options.graphIds=values.ids==="none"?[]:values.ids.split(",");
options.onProgress=({index,id,graph})=>{if(graph!=="not-selected"||index%100===0)console.error(index+"/500 "+id+" "+graph);};
const report=campaignDecisionAudit(options),summary=campaignDecisionSummary(report);
const sources=readdirSync(new URL("../src/",import.meta.url)).filter(name=>name.endsWith(".js")).sort();
const provenance={workingSourceDirty:execFileSync("git",["status","--porcelain","--","mana-heist/src","mana-heist/scripts"],{cwd:fileURLToPath(new URL("../../",import.meta.url)),encoding:"utf8"}).trim()!=="",sourceCommit:execFileSync("git",["rev-parse","HEAD"],{cwd:fileURLToPath(new URL("../../",import.meta.url)),encoding:"utf8"}).trim(),
 sourceHashes:Object.fromEntries(sources.map(name=>[name,createHash("sha256").update(readFileSync(new URL("../src/"+name,import.meta.url))).digest("hex")]))};
report.provenance=provenance;summary.provenance=provenance;
if(values.json)writeFileSync(values.json,JSON.stringify(report,null,2)+"\n");
if(values.summary)writeFileSync(values.summary,JSON.stringify(summary,null,2)+"\n");
console.log(JSON.stringify(summary,null,2));
