import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {presentCreaturePT} from '../src/pt-display.js';
import {CARDS} from '../src/cards.js';
import {creaturePower,creatureToughness} from '../src/engine.js';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const print={power:2,toughness:1};
test('unmodified creatures show only unaltered Scryfall printed P/T',()=>{
 assert.deepEqual(presentCreaturePT({},print,2,1),{kind:'printed',text:'',accessible:''});
});
test('Elite Vanguard +3/+3 shows green additive chip and leaves printed 2/1 visible',()=>{
 const u={card:'Elite Vanguard',powerBoost:3,toughnessBoost:3};
 const p=CARDS[u.card];
 const display=presentCreaturePT(u,p,creaturePower(u),creatureToughness(u));
 assert.deepEqual({kind:display.kind,text:display.text},{kind:'modifier',text:'+3/+3'});
 assert.match(display.accessible,/Current power and toughness 5\/4/);
});
test('different additive P/T deltas, debuffs and non-P/T statuses are represented precisely',()=>{
 assert.equal(presentCreaturePT({powerBoost:0,toughnessBoost:3},print,2,4).text,'0/+3');
 assert.equal(presentCreaturePT({powerBoost:-2,toughnessBoost:-2,damage:2},print,0,-1).text,'-2/-2');
 assert.equal(presentCreaturePT({damage:2,hexproof:true},print,2,1).kind,'printed');
});
test('+1/+1 counters are distinguished from temporary stat pumps when identified',()=>{
 const pure=presentCreaturePT({counters:{'+1/+1':3}},print,5,4);
 assert.equal(pure.kind,'modifier');assert.equal(pure.text,'3 × +1/+1');
 const mixed=presentCreaturePT({plusOneCounters:2,powerBoost:1,toughnessBoost:1},print,5,4);
 assert.equal(mixed.text,'+3/+3');assert.match(mixed.accessible,/2 \+1\/\+1 counters/);
});
test('base-setting changes keep replacement P/T box including multiple-digit P/T',()=>{
 const p=presentCreaturePT({basePower:12,baseToughness:15,powerBoost:3,toughnessBoost:3},print,15,18);
 assert.equal(p.kind,'replacement');assert.equal(p.text,'15/18');
 assert.equal(presentCreaturePT({basePTSet:true},print,2,1).kind,'replacement');
 assert.equal(presentCreaturePT({powerBoost:3,toughnessBoost:3},print,8,8).kind,'replacement');
});
test('renderer uses a separate P/T chip and base replacement, with accurate native image',()=>{
 const ui=read('src/ui.js'),css=read('observatory.css'),build=read('build.py');
 assert.match(ui,/presentCreaturePT\(u,printed,power,toughness\)/);
 assert.match(ui,/pt-modifier/);
 assert.match(ui,/pt-replacement/);
 assert.match(css,/\.battle-card \.pt-modifier/);
 assert.match(css,/\.battle-card \.pt-replacement/);
 assert.match(css,/overflow:visible/);
 assert.match(build,/'src\/pt-display\.js'/);
});
test('standalone HTML includes exact presentation helper, current CSS and unchanged saves',()=>{
 const index=read('index.html'),tokens=read('design-tokens.css'),legacy=read('styles.css'),obs=read('observatory.css');
 assert.ok(index.includes('<style>'+tokens+legacy+obs+'</style>'));
 assert.ok(index.includes('function presentCreaturePT('));
 assert.ok(index.includes('dc-stackbreaker-progress-v3'));
 assert.ok(index.includes('dc-stackbreaker-last-level'));
});
