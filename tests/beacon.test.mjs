import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {newRun,RULES_VERSION} from "../src/engine.js";
import {captureFlash,drawCaptureFlash,isScoreFlashVisible,SCORE_FLASH_DURATION_MS} from "../src/beacon-feedback.js";
import {codexEntry,CODEX_ORDER} from "../src/codex-preview.js";
import {trapSignal,drawTrapHints} from "../src/trap-assist.js";

test("Beacon is ordinary arcade without tutorial gates; replay rules remain unchanged",()=>{
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 const main=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
 const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
 assert.doesNotMatch(html,/trainingButton|trainingPrompt|FIRST HUNT · OPTIONAL TRAINING/);
 assert.doesNotMatch(main,/beginTraining|syncTrainingPrompt|beacon-training|trainingButton|trainingPrompt/);
 assert.doesNotMatch(css,/beacon-training-(prompt|button)/);
 assert.match(main,/function begin\(\)/);
 assert.match(main,/if\(lairActive\(\)\)return;/);
 assert.equal(RULES_VERSION,"hive-1.3");
});
test("Beacon scores blink three times, fixed at the capture tile, then vanish",()=>{
 const flash=captureFlash({x:4,y:7},300,100);
 assert.deepEqual(flash.pos,{x:4,y:7});assert.equal(flash.score,300);
 assert.equal(flash.until-flash.started,SCORE_FLASH_DURATION_MS);
 const drawn=[],ctx={save(){},restore(){},strokeRect(...a){drawn.push(["stroke",...a])},
 fillText(...a){drawn.push(["text",...a])},globalAlpha:1};
 for(const time of [100,380,660]){
  assert.equal(isScoreFlashVisible(flash,time),true);
  drawCaptureFlash(ctx,flash,20,time);
 }
 const stamps=drawn.filter(a=>a[0]==="text");
 assert.equal(stamps.length,3,"a single score remains in place across all three flashes");
 for(const [,label,x,y] of stamps){
  assert.equal(label,"+300");
  assert.equal(x,90,"fixed X at center of captured tile");
  assert.equal(y,154,"fixed Y at center of captured tile");
 }
 for(const time of [240,520,800,940]){
  const prev=drawn.length;
  assert.equal(isScoreFlashVisible(flash,time),false,"between flashes or expired");
  drawCaptureFlash(ctx,flash,20,time);
  assert.equal(drawn.length,prev,"no visible score in the dark phase");
 }
 const prev=drawn.length;
 drawCaptureFlash(ctx,flash,20,240,true);
 assert.equal(drawn.length,prev+2,"reduced-motion players see one steady stamp");
 assert.equal(isScoreFlashVisible(flash,80,true),false);
 assert.equal(captureFlash({x:NaN,y:0},5),null);
 assert.equal(RULES_VERSION,"hive-1.3","presentation-only; replay scoring unchanged");
});
test("amber feedback marks the last open escape without an added global HUD",()=>{
 const run=newRun({seed:5,mode:"hunt"});
 run.body=[{x:10,y:10},{x:5,y:4},{x:6,y:5}];
 run.enemies=[{id:7,kind:"skitter",pos:{x:5,y:5},dir:"right"}];
 assert.equal(trapSignal(run,run.enemies[0]).escape,"down");
 const rects=[],ctx={save(){},restore(){},setLineDash(){},strokeRect(){},fillRect(...a){rects.push(a)}};
 drawTrapHints(ctx,run,20);
 assert.ok(rects.some(([x,y,w,h])=>x===102&&y===122&&w===16&&h===16));
});
test("Hive Codex stays in profile preview, never on game HUD, pending account integration",()=>{
 assert.equal(CODEX_ORDER.length,4);
 for(const id of CODEX_ORDER){const entry=codexEntry(id);assert.ok(entry?.name);assert.ok(entry?.tip);assert.ok(entry?.phases>=2)}
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 const profile=readFileSync(new URL("../profile-preview.html",import.meta.url),"utf8");
 const main=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
 const policy=readFileSync(new URL("../docs/TEST-FIRST-RELEASE-POLICY.md",import.meta.url),"utf8");
 assert.doesNotMatch(html,/id="trainingButton"|id="trainingPrompt"/);
 assert.doesNotMatch(html,/id="codexList"/);
 assert.match(profile,/id="codexList"/);assert.match(profile,/no player login or production profile access/);
 assert.doesNotMatch(main,/beginTraining/);assert.match(main,/captureFlash/);
 assert.match(main,/if\(lairActive\(\)\)return;/);
 assert.match(policy,/All future Hive Run updates must deploy/);
 assert.match(policy,/owner uses an explicit/);
});
