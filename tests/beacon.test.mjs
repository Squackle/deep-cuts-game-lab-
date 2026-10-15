import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {newRun,start,RULES_VERSION} from "../src/engine.js";
import {newTraining,trainingProgress} from "../src/beacon-training.js";
import {captureFlash,drawCaptureFlash} from "../src/beacon-feedback.js";
import {codexEntry,CODEX_ORDER} from "../src/codex-preview.js";
import {trapSignal,drawTrapHints} from "../src/trap-assist.js";

test("Beacon First Hunt trains steering, amber traps and capture without changing ranked rules",()=>{
 const run=newRun({seed:402014,mode:"hunt"});start(run);const coach=newTraining();
 assert.match(trainingProgress(coach,run),/SWIPE/);
 assert.match(trainingProgress(coach,run,{turned:true}),/TRAP/);
 run.kills=1;
 assert.match(trainingProgress(coach,run),/CAPTURE/);
 assert.equal(coach.complete,true);
 assert.equal(trainingProgress(newTraining(),newRun({seed:2,mode:"classic"})),null);
 assert.equal(RULES_VERSION,"hive-1.3");
});
test("Beacon popup uses actual awarded score and never changes the score",()=>{
 const flash=captureFlash({x:4,y:7},300,100);
 assert.deepEqual(flash.pos,{x:4,y:7});assert.equal(flash.score,300);
 const calls=[],ctx={save(){},restore(){},strokeRect(...a){calls.push(["stroke",...a])},
 fillText(...a){calls.push(["text",...a])},globalAlpha:1};
 drawCaptureFlash(ctx,flash,20,350,false);
 assert.ok(calls.some(a=>a[0]==="text"&&a[1]==="+300"));
 assert.equal(drawCaptureFlash(ctx,flash,20,960,false),undefined);
 assert.equal(captureFlash({x:NaN,y:0},5),null);
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
 assert.match(html,/id="trainingButton"/);assert.match(html,/id="trainingPrompt"/);
 assert.doesNotMatch(html,/id="codexList"/);
 assert.match(profile,/id="codexList"/);assert.match(profile,/no player login or production profile access/);
 assert.match(main,/beginTraining/);assert.match(main,/captureFlash/);
 assert.match(main,/if\(lairActive\(\)\|\|training\)return;/);
 assert.match(policy,/All future Hive Run updates must deploy/);
 assert.match(policy,/owner uses an explicit/);
});
