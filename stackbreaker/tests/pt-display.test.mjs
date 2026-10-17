import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {presentCreaturePT} from '../src/pt-display.js';
import {CARDS} from '../src/cards.js';
import {creaturePower,creatureToughness} from '../src/engine.js';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const print={power:2,toughness:1};
test('No modification: leave Scryfall printed P/T unobscured and no badges',()=>{
 assert.deepEqual(presentCreaturePT({},print,2,1),{
  kind:'printed',text:'',accessible:'',badges:[],showCurrent:false
 });
});
test('Elite Vanguard +3/+3: overprint 5/4 AND show a separate +3/+3 green chip',()=>{
 const u={card:'Elite Vanguard',powerBoost:3,toughnessBoost:3};
 const result=presentCreaturePT(u,CARDS[u.card],creaturePower(u),creatureToughness(u));
 assert.equal(result.showCurrent,true);assert.equal(result.text,'5/4');
 assert.deepEqual(result.badges.map(b=>b.text),['+3/+3']);
 assert.equal(result.badges[0].kind,'boost');
 assert.match(result.accessible,/Current power and toughness 5\/4/);
});
test('one +1/+1 counter as in Riku 3/3 to 4/4',()=>{
 const r=presentCreaturePT({counters:{'+1/+1':1}},{power:3,toughness:3},4,4);
 assert.equal(r.text,'4/4');
 assert.deepEqual(r.badges.map(b=>b.text),['+1/+1']);
 assert.equal(r.badges[0].kind,'counter');
});
test('multiple counters preserve count; multiple sources make distinct badges',()=>{
 const r=presentCreaturePT({plusOneCounters:2,powerBoost:1,toughnessBoost:1},print,5,4);
 assert.equal(r.text,'5/4');
 assert.deepEqual(r.badges.map(b=>b.text),['2 × +1/+1','+1/+1']);
 assert.deepEqual(r.badges.map(b=>b.kind),['counter','boost']);
});
test('counter contribution already included in boost fields does not double count',()=>{
 const r=presentCreaturePT({plusOneCounters:1,powerBoost:3,toughnessBoost:3},print,5,4);
 assert.deepEqual(r.badges.map(b=>b.text),['+1/+1','+2/+2']);
 assert.equal(r.text,'5/4');
});
test('different pumps, debuffs and damage show actual P/T plus known modifier',()=>{
 assert.equal(presentCreaturePT({powerBoost:0,toughnessBoost:3},print,2,4).text,'2/4');
 assert.equal(presentCreaturePT({powerBoost:0,toughnessBoost:3},print,2,4).badges[0].text,'0/+3');
 const weaken=presentCreaturePT({powerBoost:-2,toughnessBoost:-2,damage:2},print,0,-1);
 assert.equal(weaken.text,'0/-1');assert.equal(weaken.badges[0].text,'-2/-2');
 assert.equal(presentCreaturePT({damage:2,hexproof:true},print,2,1).showCurrent,false);
});
test('base-setting effects show effective stats and only known counters/boost badges',()=>{
 const r=presentCreaturePT({basePower:12,baseToughness:15,powerBoost:3,toughnessBoost:3},print,15,18);
 assert.equal(r.kind,'base-set');assert.equal(r.text,'15/18');
 assert.deepEqual(r.badges.map(b=>b.text),['+3/+3']);
 assert.equal(presentCreaturePT({basePTSet:true},print,2,1).showCurrent,true);
 const baseOnly=presentCreaturePT({basePTSet:true},print,1,1);
 assert.deepEqual(baseOnly.badges,[]);
});
test('unattributed effective P/T changes are shown but not labeled as invented bonuses',()=>{
 const r=presentCreaturePT({},print,9,9);
 assert.equal(r.text,'9/9');assert.deepEqual(r.badges,[]);
});
test('renderer retains the Scryfall image and displays two distinct overlay elements',()=>{
 const ui=read('src/ui.js'),css=read('observatory.css'),build=read('build.py');
 assert.match(ui,/presentCreaturePT\(u,printed,power,toughness\)/);
 assert.match(ui,/data-pt-badges/);
 assert.match(ui,/data-modified-pt/);
 assert.match(ui,/statBadges\+currentPT/);
 assert.match(ui,/thumb\(u\.card,'normal','battle-image'\)/);
 assert.match(css,/\.battle-card \.pt-badges/);
 assert.match(css,/\.battle-card \.pt-modifier\.pt-counter/);
 assert.match(css,/\.battle-card \.pt-replacement/);
 assert.match(css,/overflow:visible/);
 assert.match(build,/'src\/pt-display\.js'/);
});
test('shipped bundle embeds current CSS and presentation source; saves unchanged',()=>{
 const index=read('index.html'),tokens=read('design-tokens.css'),legacy=read('styles.css'),obs=read('observatory.css');
 assert.ok(index.includes('<style>'+tokens+legacy+obs+'</style>'));
 assert.ok(index.includes('function presentCreaturePT('));
 assert.ok(index.includes('data-pt-badges'));
 assert.ok(index.includes('dc-stackbreaker-progress-v3'));
 assert.ok(index.includes('dc-stackbreaker-last-level'));
});
