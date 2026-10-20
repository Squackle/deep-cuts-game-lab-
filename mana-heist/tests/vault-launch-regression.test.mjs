import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {LEVELS} from "../src/levels.js";
import {LEARN_LEVELS} from "../src/expanded-learn.js";
import {BONUS_TRIALS} from "../src/bonus-trials.js";
const source=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
test("selected hand state is initialized before boot, level selection or vault render",()=>{
 const declaration=/\blet world=chapterIndex\(index\),manaOrbs=reconstruct\(state\.pool\),landDrag=null,lastCardId=null,selectedHandId=null;/;
 assert.match(source,declaration,"Regression: the October 19 device-QA refactor dropped selectedHandId, causing every vault button to crash.");
 const declarationAt=source.search(declaration);
 const firstUseAt=source.indexOf("selectedHandId=null;",declarationAt+10);
 const bootAt=source.lastIndexOf("load(mode===");
 assert.ok(declarationAt>=0&&declarationAt<firstUseAt&&declarationAt<bootAt,"selection state must exist before game is loaded");
 assert.match(source,/el\("chapterPicker"\)\.addEventListener\("click",e=>\{/);
 assert.match(source,/if\(x\)load\(Number\(x\.dataset\.level\),true\)/);
 assert.match(source,/if\(enter\)showGame\(\)/);
 assert.match(source,/el\("campaignScreen"\)\.addEventListener\("click",e=>\{/);
 assert.match(source,/data-learn-level/);
 assert.match(source,/data-trial-index/);
});
test("bug fix never revises game rules, lessons, bonuses or stored score namespaces",()=>{
 assert.equal(LEVELS.length,500);
 assert.equal(LEARN_LEVELS.length,28);
 assert.equal(BONUS_TRIALS.length,2);
 for(const key of ["dc-mana-heist-landfall-v2","dc-mana-heist-capstones-v1","dc-mana-heist-variety-v1"])
 assert.ok(source.includes(key),key);
 assert.match(source,/REMIX_KEY/);
 assert.match(source,/BONUS_TRIAL_STORAGE_KEY/);
});
