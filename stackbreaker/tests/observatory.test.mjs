import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const tokens=read('design-tokens.css'),legacy=read('styles.css'),observatory=read('observatory.css');
const template=read('template.html'),built=read('index.html');
const scenarios=JSON.parse(read('data/scenarios.json')),expansion=JSON.parse(read('data/campaign-expansion.json'));

test('Arcane Observatory is bundled after the verified legacy source CSS',()=>{
 const links='<link rel="stylesheet" href="./design-tokens.css"><link rel="stylesheet" href="./styles.css"><link rel="stylesheet" href="./observatory.css">';
 assert.ok(template.includes(links));
 assert.ok(built.includes('<style>'+tokens+legacy+observatory+'</style>'),'Regenerate index.html via python build.py');
 assert.equal((built.match(/<style>/g)||[]).length,1,'standalone game should not require external CSS');
 assert.ok(!built.includes('href="./observatory.css"'));
 assert.match(observatory,/ARCANE OBSERVATORY/);
});

test('Phase 2 retains all gameplay hooks, saved progress and case data',()=>{
 for(const id of ['game','fieldDrop','stackDrop','scenarioSelect','mapButton','worldMap','battlefield','stack','lands','manaPool','hand','passButton','undoButton','restartButton','playPrompt','cardPreview']){
  assert.equal((template.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'bad hook '+id);
 }
 assert.match(template,/class="observatory-orbit" aria-hidden="true"/);
 assert.equal(scenarios.length+expansion.length,30);
 assert.ok(built.includes('dc-stackbreaker-progress-v3'));
 assert.ok(built.includes('dc-stackbreaker-last-level'));
 assert.ok(template.includes('data-target-person="opponent"')&&template.includes('data-target-person="player"'));
 assert.ok(template.includes('aria-label="Commander singleton hand, horizontally browse cards"'));
});

test('Phase 2 does not rely on ornament for interactivity, keeps responsive input',()=>{
 for(const name of ['.game-grid','.stack-list','.hand-scroller','.life-widget','.lands-zone','.hand-zone','.game-controls','@media(max-width:600px)','@media(max-width:370px)','prefers-reduced-motion']){
  assert.ok(observatory.includes(name),'missing '+name);
 }
 assert.match(observatory,/overflow-y:auto/);
 assert.match(observatory,/pointer-events:none/);
 assert.match(template,/class="skip"/);
 assert.match(template,/id="live" class="sr-only" role="status"/);
});
