import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const src=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
test('Canonical Stackbreaker site-ranked bridge changes only Daily route; Classic game stays identical',()=>{
 assert.ok(src.includes("routeParams.get('daily')==='1'"));
 assert.ok(src.includes("routeParams.get('siteRanked')==='1'&&window.parent!==window"));
 assert.ok(src.includes("event.source!==window.parent||event.origin!==siteParentOrigin()"));
 assert.ok(src.includes("data.type==='dc-sb-ranked-state'"));
 assert.ok(src.includes("type:'dc-sb-ranked-move'"));
 assert.ok(src.includes("type:'tap',landId:id"));
 assert.ok(src.includes("type:'pass'"));
 assert.ok(src.includes("type:'cast',actionId:id"));
 assert.ok(src.includes("type:'play-land',handId:id"));
 assert.ok(src.includes("if(siteRanked&&scoredDaily())"));
 assert.ok(src.includes("rankedBusy=true"));
 assert.ok(src.includes("dailyRecord=siteRanked?null:readLocalDaily"));
 assert.ok(src.includes("$('dailyStart').hidden=true"));
 assert.ok(src.includes("localUnverified:false"));
 assert.ok(src.includes("window.parent.postMessage(message,origin)"));
});
test('Original full gameplay module still builds as browser JavaScript',()=>{
 const path=new URL('../src/ui.js',import.meta.url).pathname;
 assert.doesNotThrow(()=>execFileSync(process.execPath,['--check',path],{stdio:'pipe'}));
});
