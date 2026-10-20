import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('DEPLOYED Stackbreaker HTML includes ranked bridge, not just dormant source module',()=>{
 const html=read('index.html'),ui=read('src/ui.js');
 const start=html.lastIndexOf('<script>'),end=html.lastIndexOf('</script>');
 assert.ok(start>100000&&end>start,'Original game must retain bundled play code');
 const bundle=html.slice(start+8,end);
 assert.doesNotThrow(()=>new Script(bundle,{filename:'stackbreaker-production-bundle.js'}));
 const required=[
  "routeParams.get('siteRanked')==='1'",
  "if(siteRanked)window.parent.postMessage(message,siteParentOrigin()||'*')",
  "event.source!==window.parent||!siteOriginAllowed(event.origin)",
  "type:'dc-sb-ranked-ready'",
  "type:'dc-sb-ranked-move'",
  "type:'tap',landId:id",
  "type:'play-land',handId:id",
  "type:'cast',actionId:id",
  "type:'pass'",
  "function pushState(s,instruction=null)",
  "rankedBusy=true",
  "dailyRecord=siteRanked?null:readLocalDaily"
 ];
 for(const token of required){
  assert.ok(bundle.includes(token),'Actual deployed inline game missing '+token);
  assert.ok(ui.includes(token),'Game Lab source counterpart missing '+token);
 }
 assert.equal(html.includes('bridge-diagnostic'),false);
 assert.equal(bundle.includes('dc-sb-ranked-diagnostic'),false);
});
test('Normal original Stackbreaker stays unchanged outside gated Daily iframe',()=>{
 const source=read('index.html');
 assert.ok(source.includes('const siteRanked=dailyRoute&&routeParams.get'));
 assert.ok(source.includes('&&window.parent!==window;'));
 assert.ok(source.includes("if(siteRanked&&scoredDaily())"));
 assert.ok(source.includes('localUnverified:false'));
 assert.ok(source.includes('const scryfallCatalog=new Map()'));
 assert.ok(source.includes('function activateFromBattlefield(id)'));
 assert.ok(source.includes('function applyPass()'));
 assert.ok(source.includes('function startDailyPractice()'));
});
