import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validatePR,validateLabGameLane,findOverlaps} from "../scripts/release-coordination.mjs";
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

test("Stackbreaker and Mana Heist source stays exclusive to matching agent branches",()=>{
 assert.deepEqual(validateLabGameLane({repo:lab,branch:"game/stackbreaker-land-v05",files:["stackbreaker/src/engine.js","stackbreaker/tests/engine.test.mjs"]}),[]);
 assert.deepEqual(validateLabGameLane({repo:lab,branch:"game/mana-heist-v06",files:["mana-heist/src/solver.js"]}),[]);
 assert.ok(validateLabGameLane({repo:lab,branch:"game/stackbreaker-v05",files:["stackbreaker/src/ui.js","mana-heist/index.html"]})[0].includes("out-of-lane"));
 assert.ok(validateLabGameLane({repo:lab,branch:"game/mana-heist-v06",files:["src/engine.js"]})[0].includes("out-of-lane"));
 assert.ok(validateLabGameLane({repo:lab,branch:"game/matriarch-v15",files:["mana-heist/styles.css"]})[0].includes("require their own"));
 assert.ok(validateLabGameLane({repo:lab,branch:"coord/unified-game-lab-hub",files:["stackbreaker/index.html"]}).length);
 assert.deepEqual(validateLabGameLane({repo:lab,branch:"coord/unified-game-lab-hub",files:["lab/index.html","lab/lab.css","index.html","AGENTS.md"]}),[]);
 assert.deepEqual(validateLabGameLane({repo:lab,branch:"game/matriarch-v15",files:["src/engine.js","styles.css"]}),[]);
 assert.deepEqual(validateLabGameLane({repo:main,branch:"site/arcade",files:["games.html"]}),[]);
});

test("Protected release coordination fails closed when unified game tests fail",()=>{
 const catalog=readFileSync(new URL("../.github/workflows/lab-catalog.yml",import.meta.url),"utf8");
 const coordination=readFileSync(new URL("../.github/workflows/release-coordination.yml",import.meta.url),"utf8");
 assert.ok(catalog.includes("  workflow_call:"),"Unified suite must be reusable");
 assert.ok(coordination.includes("  game-lab-suite:"),"Suite prerequisite job must exist");
 assert.ok(coordination.includes("uses: ./.github/workflows/lab-catalog.yml"),"Use actual unified suite");
 assert.ok(coordination.includes("needs: game-lab-suite"),"Required job must wait on suite");
 assert.ok(coordination.includes("if: ${{ always() }}"),"Required job must not skip when suite fails");
 assert.ok(coordination.includes("SUITE_RESULT: ${{ needs.game-lab-suite.result }}"),"Propagate suite result");
 assert.ok(coordination.includes('run: test "$SUITE_RESULT" = "success"'),"Fail required job unless suite passes");
});
