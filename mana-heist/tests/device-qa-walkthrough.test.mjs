import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {LEVELS} from "../src/levels.js";
import {LEARN_LEVELS} from "../src/expanded-learn.js";
import {BONUS_TRIALS} from "../src/bonus-trials.js";
import {
 DEVICE_QA_KEY,DEVICE_QA_VERSION,DEVICE_QA_CHECKS,DEVICE_QA_STATUSES,
 blankDeviceQA,normalizeDeviceQA,setDeviceContext,setDeviceQAResult,
 summarizeDeviceQA,exportDeviceQA
} from "../src/device-qa.js";
const read=x=>readFileSync(new URL("../"+x,import.meta.url),"utf8");

test("no device QA outcomes are invented: all nine start Not tested",()=>{
 assert.equal(DEVICE_QA_KEY,"dc-mana-heist-device-qa-v1");
 assert.equal(DEVICE_QA_VERSION,1);
 assert.equal(DEVICE_QA_CHECKS.length,9);
 assert.deepEqual([...new Set(DEVICE_QA_CHECKS.map(c=>c.id))].length,9);
 const data=blankDeviceQA(),summary=summarizeDeviceQA(data);
 assert.equal(data.device,"unspecified");
 assert.equal(data.browser,"unspecified");
 assert.equal(data.orientation,"unspecified");
 assert.equal(summary.untested,9);
 assert.equal(summary.pass,0);
 assert.equal(summary.issue,0);
 assert.equal(summary.reviewed,0);
 assert.equal(summary.state,"incomplete");
 assert.ok(DEVICE_QA_STATUSES.includes("not-applicable"));
 assert.equal(exportDeviceQA(data).includes('"result": "pass"'),false);
});
test("every guided check opens an existing scored vault or real Learn Mana exercise",()=>{
 assert.equal(LEVELS.length,500);
 assert.equal(LEARN_LEVELS.length,28);
 assert.equal(BONUS_TRIALS.length,2);
 for(const q of DEVICE_QA_CHECKS){
  assert.ok(q.id&&q.title&&q.steps,q.id);
  assert.ok(q.target,q.id+" needs a guided test route");
  if(q.target.mode==="learn")assert.ok(LEARN_LEVELS[q.target.index],q.id);
  else if(q.target.mode==="heist")assert.ok(LEVELS[q.target.index],q.id);
  else assert.fail("Unrecognized QA mode "+q.target.mode);
 }
 assert.equal(DEVICE_QA_CHECKS.find(c=>c.id==="tap-choice").target.index,26);
 assert.equal(DEVICE_QA_CHECKS.find(c=>c.id==="life-choice").target.index,27);
 assert.equal(DEVICE_QA_CHECKS.find(c=>c.id==="advanced-rack").target.index,450);
 assert.ok(DEVICE_QA_CHECKS.some(c=>c.id==="keyboard"));
});
test("reported Pass/Issue/Not applicable are manual, whitelisted and preserved independently",()=>{
 const empty=blankDeviceQA();
 let d=setDeviceContext(empty,"device","phone");
 d=setDeviceContext(d,"browser","safari");
 d=setDeviceContext(d,"orientation","portrait");
 d=setDeviceQAResult(d,"basic-tap","pass");
 d=setDeviceQAResult(d,"landscape","issue");
 d=setDeviceQAResult(d,"keyboard","not-applicable");
 assert.equal(summarizeDeviceQA(d).reviewed,3);
 assert.equal(summarizeDeviceQA(d).issue,1);
 assert.equal(summarizeDeviceQA(d).state,"issues-reported");
 assert.equal(empty.checks["basic-tap"],"untested","immutable transitions do not mutate prior data");
 const invalid=setDeviceQAResult(d,"internal-free-text","pass");
 assert.deepEqual(invalid,d,"no arbitrary test IDs allowed");
 assert.deepEqual(setDeviceQAResult(d,"basic-tap","auto-pass"),d);
 assert.deepEqual(setDeviceContext(d,"device","iPhone 17 Pro"),d,"no identifying hardware model stored");
 const exported=JSON.parse(exportDeviceQA(d));
 assert.equal(exported.environment.device,"phone");
 assert.equal(exported.environment.browser,"safari");
 assert.equal(exported.environment.orientation,"portrait");
 assert.equal(exported.summary.pass,1);
 assert.equal(exported.summary.issue,1);
 assert.equal(exported.checks.find(x=>x.id==="keyboard").result,"not-applicable");
 assert.deepEqual(Object.keys(exported).sort(),["format","version","notice","environment","summary","checks"].sort());
 for(const item of exported.checks)assert.deepEqual(Object.keys(item).sort(),["id","label","result"].sort());
});
test("corrupted local storage, unknown fields and false certification attempts cannot create Pass",()=>{
 assert.deepEqual(normalizeDeviceQA(null),blankDeviceQA());
 assert.deepEqual(normalizeDeviceQA({v:0,checks:{"portrait":"pass"}}),blankDeviceQA());
 assert.deepEqual(normalizeDeviceQA({v:1,checks:[]}),blankDeviceQA());
 const d=normalizeDeviceQA({v:1,device:"Phone of Alex",browser:"automatic",orientation:"portrait",checks:{
  "basic-tap":"PASS","portrait":"pass","landscape":"issue","keyboard":"not-applicable",
  "meta-data":"pass"
 },email:"alex@example.test",timestamp:123});
 assert.equal(d.device,"unspecified");assert.equal(d.browser,"unspecified");
 assert.equal(d.orientation,"portrait");
 assert.equal(d.checks["basic-tap"],"untested");
 assert.equal(d.checks.portrait,"pass");
 assert.equal(d.checks.landscape,"issue");
 assert.equal(d.checks.keyboard,"not-applicable");
 assert.equal(Object.keys(d.checks).length,9);
 assert.equal(Object.hasOwn(d,"email"),false);
 const exported=JSON.parse(exportDeviceQA(d));
 assert.equal(Object.hasOwn(exported,"email"),false);
 assert.equal(Object.hasOwn(exported,"timestamp"),false);
});
test("QA is a separate player-triggered panel and cannot silently affect scores or opt-in stats",()=>{
 const html=read("index.html"),ui=read("src/main.js"),css=read("playtest-mobile.css");
 assert.match(html,/id="deviceQaPanel"/);
 assert.match(html,/id="deviceQaChecks"/);
 assert.match(html,/id="deviceQaDevice"/);
 assert.match(html,/id="deviceQaBrowser"/);
 assert.match(html,/id="deviceQaOrientation"/);
 assert.match(html,/id="deviceQaCopy"/);
 assert.match(html,/id="deviceQaClear"/);
 assert.match(html,/manual self-report, not an automated hardware test/);
 assert.match(ui,/deviceQa=normalizeDeviceQA/);
 assert.match(ui,/deviceQa=setDeviceQAResult/);
 assert.match(ui,/item\.target\.mode/);
 assert.match(ui,/load\(item\.target\.index,true\)/);
 assert.match(ui,/window\.confirm\("Reset only the manual device QA checklist/);
 assert.match(ui,/deviceQa=blankDeviceQA\(\);saveDeviceQA\(\);renderDeviceQA\(\)/);
 assert.match(ui,/await navigator\.clipboard\.writeText\(report\)/);
 assert.match(ui,/el\("deviceQaExportText"\)/);
 assert.match(ui,/dc-mana-heist-landfall-v2/);
 assert.match(ui,/dc-mana-heist-playtest-v1|PLAYTEST_KEY/);
 assert.match(ui,/dc-mana-heist-certified-remixes-v1|REMIX_KEY/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.match(css,/\.device-qa-case-controls button\{min-height:48px\}/);
 assert.match(css,/\.device-qa-environment select,\.device-qa-case select\{min-height:46px/);
 assert.match(css,/\.device-qa>summary:focus-visible/);
 assert.doesNotMatch(read("src/device-qa.js"),/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|navigator\.|Date\.now\(/);
});
