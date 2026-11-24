#!/usr/bin/env node
import {readFileSync} from "node:fs";
import {STRATEGY_TRIALS} from "../src/strategy-trials.js";
import {reviewBoards} from "../src/authoring-review.js";
import original from "../data/scenarios.json" with {type:"json"};
import expansion from "../data/campaign-expansion.json" with {type:"json"};
import {generateStages} from "../src/galaxies.js";
import {commanderScenario} from "../src/commander.js";
const args=process.argv.slice(2),values={};
for(const arg of args){
 const m=/^--(file|max-states|max-edges)=(.+)$/.exec(arg);
 if(m){if(values[m[1]])throw Error("Duplicate option "+m[1]);values[m[1]]=m[2];}
 else if(arg==="--campaign"||arg==="--no-graph")values[arg.slice(2)]=true;
 else throw Error("Unknown option "+arg);
}
if(values.file&&values.campaign)throw Error("Choose file OR campaign");
const base=[...original,...expansion];
const boards=values.file?JSON.parse(readFileSync(values.file,"utf8")):values.campaign?[...base,...generateStages(base)].map((p,i)=>commanderScenario(p,i)):STRATEGY_TRIALS;
if(!Array.isArray(boards))throw Error("Expected an array of boards");
const graph=!values["no-graph"]&&!values.campaign;
const report=reviewBoards(boards,{graph,maxStates:Number(values["max-states"]||3000),maxEdges:Number(values["max-edges"]||20000)});
console.log(JSON.stringify(report,null,2));
if(report.rows.some(r=>r.status!=="reference-valid"||r.flags.includes("DUPLICATE_ID")||r.flags.includes("GRAPH_UNSOLVABLE")))process.exitCode=1;
