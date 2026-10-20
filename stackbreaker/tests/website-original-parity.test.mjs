import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,activate,tapLand,pass,playLand} from '../src/engine.js';
import {RULES_VERSION} from '../src/cards.js';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('Original bundled Stackbreaker is still the one played in ranked and normal modes',()=>{
 assert.ok(html.length>400000);
 assert.ok(html.includes('const siteRanked=dailyRoute&&routeParams.get(\'siteRanked\')===\'1\''));
 assert.ok(html.includes("if(siteRanked&&scoredDaily())"));
 assert.ok(html.includes("dc-sb-ranked-ready"));
 assert.ok(html.includes("dc-sb-ranked-move"));
 assert.ok(html.includes("dc-sb-ranked-state"));
 assert.ok(html.includes("siteRanked?null:readLocalDaily"));
 assert.ok(html.includes("if(siteRanked){$('dailyStart').hidden=true;$('dailyPractice').hidden=true;"));
 assert.ok(html.includes("pushState(after,{type:'pass'})"));
 assert.ok(html.includes("pushState(after,{type:'tap',landId:id})"));
 assert.ok(html.includes("{type:'play-land',handId:id}"));
 assert.ok(html.includes("{type:'cast',actionId:id,targetId:target,genericSpend:spend}"));
 assert.ok(html.includes("event.source!==window.parent||event.origin!==siteParentOrigin()"));
 assert.ok(html.includes("parent.postMessage(message,origin)"));
 assert.ok(html.includes("dc-stackbreaker-progress-v3"),'unchanged original progress');
 assert.ok(html.includes("function renderWorldMap"),'unchanged 250-stage world map');
});
test('Original source keeps unchanged Classic engine and bounded replay rules',()=>{
 assert.equal(RULES_VERSION,'sb-mtg-training-0.3.0');
 for(const value of [createGame,activate,tapLand,pass,playLand])assert.equal(typeof value,'function');
});
