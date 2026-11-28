#!/usr/bin/env node
import {readFileSync} from "node:fs";
import {DECISION_LADDER} from "../src/decision-ladder.js";
import {reviewAuthoredBoards} from "../src/authoring-review.js";
const values={};
for(const arg of process.argv.slice(2)){
 if(arg==="--no-graph"){values.graph=false;continue;}
 const match=/^--(file|max-states|max-edges|solver-states)=(.+)$/.exec(arg);
 if(!match||Object.hasOwn(values,match[1]))throw Error("Unknown or repeated option "+arg);
 values[match[1]]=match[2];
}
const boards=values.file?JSON.parse(readFileSync(values.file,"utf8")):DECISION_LADDER;
if(!Array.isArray(boards))throw Error("Expected an array of puzzle definitions");
const report=reviewAuthoredBoards(boards,{graph:values.graph!==false,maxStates:Number(values["max-states"]||3000),
 maxEdges:Number(values["max-edges"]||60000),solverStates:Number(values["solver-states"]||65000)});
console.log(JSON.stringify(report,null,2));
if(report.rows.some(r=>r.status==="invalid"||r.status==="reference-invalid"||r.flags.includes("DUPLICATE_ID")||r.flags.includes("INVALID_GRAPH_PHYSICAL_WITNESS")||r.flags.includes("GRAPH_UNSOLVABLE")))process.exitCode=1;
