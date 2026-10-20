import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const bundled=read('index.html'),source=read('src/ui.js');
test('Ranked Daily uses exact original bundled UI without allowing replaying its daily case',()=>{
 for(const s of [bundled,source]){
  assert.ok(s.includes("$('dailyPractice').disabled=siteRanked||!active"));
  assert.ok(s.includes("$('dailyPractice').hidden=true"));
  assert.ok(s.includes("function startDailyPractice(){\n if(siteRanked){"));
  assert.ok(s.includes("const siteRanked=dailyRoute&&routeParams.get('siteRanked')==='1'"));
  assert.ok(s.includes("dc-sb-ranked-move"));
  assert.ok(s.includes("dc-sb-ranked-state"));
  assert.ok(s.includes("siteRanked?null:readLocalDaily"));
 }
 assert.ok(bundled.includes("function renderWorldMap"),'original world map remains');
 assert.ok(bundled.length>400000,'original bundled visual UI preserved');
});
