import test from "node:test";import assert from "node:assert/strict";
import {DECISION_LADDER} from "../src/decision-ladder.js";
import {reviewAuthoredBoards} from "../src/authoring-review.js";
test("authoring gate detects cosmetic clones, safe generic decisions and bounded searches",()=>{
 const p=DECISION_LADDER[5],clone={...p,id:"mh-copy",title:"Renamed"};
 const before=JSON.stringify(p);const r=reviewAuthoredBoards([p,clone]);
 assert.ok(r.rows[0].flags.includes("NO_CONSEQUENTIAL_SHORTEST_COMMITMENT"));
 assert.ok(r.rows[1].flags.includes("SAME_BOARD_AS:"+p.id));assert.equal(JSON.stringify(p),before);
 const limited=reviewAuthoredBoards([p],{maxStates:1,solverStates:1});
 assert.equal(limited.rows[0].status,"inconclusive");assert.ok(limited.rows[0].flags.includes("GRAPH_INCONCLUSIVE"));
});
test("authored invalid certificates and duplicate IDs fail without claiming impossibility",()=>{
 const p=DECISION_LADDER[6],bad={...p,referenceActions:[{type:"tap",id:"missing",color:"U"}]};
 const r=reviewAuthoredBoards([bad,p,{id:"bad"}],{graph:false});
 assert.ok(r.rows[0].flags.includes("INVALID_PHYSICAL_CERTIFICATE"));assert.ok(r.rows[1].flags.includes("DUPLICATE_ID"));
 assert.equal(r.rows[2].status,"invalid");
});
