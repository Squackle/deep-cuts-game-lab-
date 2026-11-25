import test from "node:test";import assert from "node:assert/strict";
import {STRATEGY_TRIALS} from "../src/strategy-trials.js";
import {reviewBoards,authoringFingerprint} from "../src/authoring-review.js";
test("authoring reviewer detects cosmetic clones and shorter reference subsets without mutating boards",()=>{
 const p=STRATEGY_TRIALS[0],copy={...p,id:"st-copy",title:"Different title"};
 const before=JSON.stringify(p);assert.equal(authoringFingerprint(p),authoringFingerprint(copy));
 const r=reviewBoards([p,copy],{graph:false});
 assert.ok(r.rows[0].flags.includes("SHORTER_REFERENCE_SUBSET"));
 assert.ok(r.rows[1].flags.includes("SAME_BOARD_AS:"+p.id));assert.equal(JSON.stringify(p),before);
});
test("authoring reviewer separates malformed, duplicate and budget-limited cases",()=>{
 const p=STRATEGY_TRIALS[6],r=reviewBoards([p,p,{id:"bad"}],{maxStates:1});
 assert.ok(r.rows[0].flags.includes("GRAPH_INCONCLUSIVE"));assert.ok(r.rows[1].flags.includes("DUPLICATE_ID"));
 assert.equal(r.rows[2].status,"invalid");
});
