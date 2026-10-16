import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const tokens=read('design-tokens.css');
const css=read('styles.css');
const source=read('template.html');
const built=read('index.html');

test('Phase 1 design tokens own the v1.4 palette and future semantics',()=>{
 for(const variable of ['--bg','--panel','--panel2','--edge','--gold','--ivory','--muted','--mana','--bad','--head-h','--sb-font-ui','--sb-font-display','--sb-space-1','--sb-shadow-card','--sb-motion-normal','--sb-focus-ring']){
  assert.ok(tokens.includes(variable+':'),variable+' missing');
 }
 assert.ok(tokens.startsWith('/* Stackbreaker'));
 assert.ok(!css.startsWith(':root{'),'palette duplicated in legacy CSS');
 for(const use of ['var(--sb-focus-ring)','var(--sb-mast-background)','var(--sb-mission-gradient)','var(--sb-radius-sm)'])assert.ok(css.includes(use),use+' is not adopted');
});

test('standalone shipped bundle matches the two source CSS files byte-for-byte',()=>{
 assert.ok(source.includes('<link rel="stylesheet" href="./design-tokens.css"><link rel="stylesheet" href="./styles.css">'));
 assert.ok(built.includes('<style>'+tokens+css+read('observatory.css')+'</style>'),'run python build.py after CSS edits');
 assert.ok(!built.includes('./design-tokens.css'),'standalone bundle has a stray local CSS import');
 assert.ok(built.includes('dc-stackbreaker-progress-v3'),'progress key changed or omitted from bundle');
 assert.ok(built.includes('dc-stackbreaker-last-level'),'selected stage persistence missing');
});

test('Phase 1 preserves responsive and reduced-motion guardrails',()=>{
 assert.match(css,/@media/);
 assert.match(css,/prefers-reduced-motion/);
 assert.ok(css.includes('.game-screen'),'game viewport shell removed');
 assert.ok(css.includes('.hand-row'),'seven-card hand styles removed');
 assert.ok(source.includes('id="stackDrop"')&&source.includes('id="fieldDrop"'),'drop zones changed');
});
