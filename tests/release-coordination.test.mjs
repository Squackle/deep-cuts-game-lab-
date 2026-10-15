import test from "node:test";
import assert from "node:assert/strict";
import {validatePR,findOverlaps} from "../scripts/release-coordination.mjs";
const main="Squackle/deep-cuts-edh",lab="Squackle/deep-cuts-game-lab-";
const fields=["Owner authorization: Explicit owner approval October 15","Files/Scope: Docs and workflow only","Concurrent work: no open PRs checked","Test plan: node --test","Rollback: revert release commit"].join("\n");
test("Coordination touches documentation and CI only; runtime edits blocked",()=>{
 const body="Workstream: Coordination\n"+fields;
 assert.deepEqual(validatePR({repo:main,body,files:["AGENTS.md","docs/DEVELOPMENT-LANES.md",".github/CODEOWNERS","scripts/release-coordination.mjs","tests/release-coordination.test.mjs"]}),[]);
 assert.ok(validatePR({repo:main,body,files:["library.js"]}).some(x=>x.includes("runtime")));
 assert.ok(validatePR({repo:lab,body,files:["src/engine.js"]}).some(x=>x.includes("runtime")));
});
test("Website PR can change library; Hive Run requires tested lab evidence",()=>{
 const site="Workstream: Website\n"+fields;
 assert.deepEqual(validatePR({repo:main,body:site,files:["library.js"]}),[]);
 assert.ok(validatePR({repo:main,body:site,files:["games/hive-run/src/main.js"]}).length>=3);
 const promotion=["Workstream: Game Lab Promotion",fields,
  "Lab source SHA: "+"a".repeat(40),"Rules version: hive-1.3",
  "Score/replay validation: main client/server deterministic suite passing"].join("\n");
 assert.deepEqual(validatePR({repo:main,body:promotion,files:["games/hive-run/src/main.js","src/hive-server/leaderboard.js"]}),[]);
});
test("Lab developer must document version; shared account is not assumed independent",()=>{
 const body=["Workstream: Game Lab",fields,"Rules version: unchanged","Main-site impact: none"].join("\n");
 assert.deepEqual(validatePR({repo:lab,body,files:["src/engine.js"]}),[]);
 assert.ok(validatePR({repo:lab,body:body.replace("Rules version: unchanged","Rules version: [TODO]"),files:["src/engine.js"]}).length>0);
});
test("PR templates with unfilled placeholders never pass",()=>{
 const body=["Workstream: Coordination","Owner authorization: [approval pending]","Files/Scope: [fill]","Concurrent work: [none]","Test plan: [run]","Rollback: [SHA]"].join("\n");
 assert.equal(validatePR({repo:main,body,files:["AGENTS.md"]}).length,5);
});
test("Newer overlapping open PR waits; unrelated files never block",()=>{
 const theirs=[{number:11,title:"old",files:["library.js","docs/A.md"]},
  {number:17,title:"newer",files:["library.js"]},
  {number:9,title:"unrelated",files:["games.html"]}];
 assert.deepEqual(findOverlaps(["library.js","styles.css"],theirs,12),[
  {number:11,title:"old",shared:["library.js"]}]);
 assert.deepEqual(findOverlaps(["styles.css"],theirs,12),[]);
});
