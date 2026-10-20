import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('index.html'),source=read('src/ui.js');
test('Only ranked embedded Daily hides duplicate Lab header, hero and non-game notes',()=>{
 assert.match(page,/body\.site-ranked-embed \.mast,/);
 assert.match(page,/body\.site-ranked-embed \.daily-banner,/);
 assert.match(page,/body\.site-ranked-embed \.study-notes/);
 assert.ok(!page.includes('body:not(.site-ranked-embed) .daily-banner{display:none}'));
 assert.ok(page.includes('body.site-ranked-embed #game'));
 for(const text of [page,source]){
  assert.ok(text.includes("if(siteRanked)document.body.classList.add('site-ranked-embed')"));
  assert.ok(text.includes("dc-sb-ranked-layout"));
  assert.ok(text.includes('frameObserver.observe(document.body)'));
  assert.ok(text.includes("dc-sb-ranked-ready"));
  assert.ok(text.includes("dc-sb-ranked-move"));
  assert.ok(text.includes("dc-sb-ranked-state"));
 }
 assert.ok(page.includes('id="fieldDrop"')&&page.includes('id="hand"'),'original board remains');
});
test('Visual layout reporting cannot grant scores or manipulate server authority',()=>{
 assert.match(page,/height>=500&&height<=3000/);
 assert.match(page,/const height=Math\.ceil\(document\.body\.getBoundingClientRect\(\)\.height\)/);
 assert.ok(page.includes("if(siteRanked&&scoredDaily())"));
 assert.ok(page.includes("siteRanked?null:readLocalDaily"));
 assert.ok(page.includes("function submitCast(id,target,spend)"));
});
