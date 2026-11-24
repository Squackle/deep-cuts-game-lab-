import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const get=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=get('strategy-lab.html'),js=get('strategy-lab.js'),css=get('strategy-lab.css');
test('Strategy trials entry is isolated and keyboard-friendly',()=>{
 for(const x of ['id="trialNav"','id="trial"','id="notice"','role="status"',
  'id="stack"','id="units"','id="lands"','id="hand"','id="pass"',
  'id="hint"','id="restart"'])assert.ok(html.includes(x),x);
 assert.ok(html.includes('name="robots" content="noindex, nofollow"'));
 assert.ok(html.includes('src="./strategy-lab.js"'));
 assert.ok(!html.includes('src="https://'));
 assert.ok(!js.includes('localStorage')&&!js.includes('fetch(')&&!js.includes('/api/'));
 // The isolated practice UI must still use the authoritative reducer and
 // must pass the selected, legal generic allocation rather than discard it.
 assert.ok(js.includes('activate(state,a.id,target,payment)'));
 assert.ok(js.includes("label.htmlFor='payment-'+a.id"));
 assert.ok(js.includes('dataset.paymentFor=a.id'));
 assert.ok(js.includes('tapLand(state,b.dataset.land)'));
 assert.ok(js.includes('pass(state)'));
 assert.ok(js.includes('referenceSubsetEvidence(p)'));
 assert.ok(css.includes('prefers-reduced-motion'));
 assert.ok(css.includes('focus-visible'));
 assert.ok(css.includes('@media(max-width:720px)'));
});

test('unranked trial undo and visible resolution feedback remain isolated',()=>{
 assert.match(html,/id="undo"/);assert.match(html,/id="actionLog"/);
 assert.match(js,/history.push\(state\)/);assert.match(js,/state=history.pop\(\)/);
 assert.match(js,/state.log.slice\(-8\)/);
});
