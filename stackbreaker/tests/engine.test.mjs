import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {CARDS,LANDS,RULES_VERSION} from '../src/cards.js';
import {validateScenario,createGame,tapLand,legalActions,legalTargets,activate,autoplay,paymentOptions,remainingMana,creaturePower,creatureToughness,pass} from '../src/engine.js';
const cases=[...JSON.parse(readFileSync(new URL('../data/scenarios.json',import.meta.url),'utf8')),...JSON.parse(readFileSync(new URL('../data/campaign-expansion.json',import.meta.url),'utf8'))];
const solutions={
 'sb-01':[['ward',null]],
 'sb-02':[['counter','bolt']],
 'sb-03':[['growth','bear']],
 'sb-04':[['negate','wrath']],
 'sb-05':[['intervene',null]],
 'sb-06':[['salve','player'],['dispel','theircounter']],
 'sb-07':[['ward',null],['counter','murder']],
 'sb-08':[['ward',null],['salve','player'],['counter','murder']],
 'sb-09':[['salve','player'],['dispel1','theircounter'],['dispel2','theirbolt']],
 'sb-10':[['salve1','player'],['salve2','player'],['dispel','theircounter']],
 'sb-11':[['salve','player'],['dispel','theircounter']],
 'sb-12':[['salve1','player'],['salve2','player'],['dispel1','theircounter'],['dispel2','bolt1']],

 'sb-13':[['defend','bear']],
 'sb-14':[['defend','lion']],
 'sb-15':[['dive','giant']],
 'sb-16':[['titan','bear'],['blossom','lion']],
 'sb-17':[['dive','giant'],['blossom','bear']],
 'sb-18':[['titan','bear'],['cancel','wrath']],
 'sb-19':[['blossom','bear'],['dive','giant']],
 'sb-20':[['ward',null],['dive','giant']],
 'sb-21':[['ward',null],['dive','giant'],['salve','player']],
 'sb-22':[['cancel','counterspell'],['salve','player'],['blossom','giant']],
 'sb-23':[['salve','player'],['counter','shock']],
 'sb-24':[['salve1','player'],['salve2','player'],['dispel1','enemycounter'],['dispel2','bolt1']],
 'sb-25':[['ward',null],['blossom','bear']],
 'sb-26':[['blossom','giant'],['salve','player']],
 'sb-27':[['ward',null],['dive','giant'],['salve','player']],
 'sb-28':[['blossom','giant'],['salve','player'],['dispel','enemycounter']],
 'sb-29':[['ward',null],['blossom','giant'],['salve','player'],['dispel','enemycounter']],
 'sb-30':[['ward',null],['blossom','giant'],['salve','player'],['dispel1','enemycounter'],['dispel2','bolt']]
};
const poolByLands=s=>s.lands.reduce((m,l)=>{m[LANDS[l.card].mana]=(m[LANDS[l.card].mana]||0)+1;return m;},{});
function tapAll(s){for(const land of s.lands){s=tapLand(s,land.id);}return s;}
for(const p of cases){test(`${p.id}: physical-land mana, winning line, losing line and deterministic replay`,()=>{
 assert.deepEqual(validateScenario(p),{valid:true,errors:[]});
 let s=createGame(p);assert.equal(s.version,RULES_VERSION);assert.equal(s.status,'playing');assert.ok(s.lands.every(l=>!l.tapped));
 const untappedActions=legalActions(s);assert.ok(untappedActions.every(id=>p.hand.find(a=>a.id===id).sourceId));
 assert.deepEqual(createGame(p).mana,{});
 s=tapAll(s);assert.deepEqual(Object.fromEntries(Object.entries(s.mana).filter(([k,n])=>n>0)),poolByLands(s));
 for(const [id,target] of solutions[p.id]){const a=s.hand.find(x=>x.id===id);assert.ok(legalActions(s).includes(id),`${p.id} ${id} illegal: ${s.log.join('|')}`);assert.ok(legalTargets(s,a).includes(target),`${p.id}: invalid target ${target}`);const old=JSON.stringify(s);s=activate(s,id,target);assert.notEqual(JSON.stringify(s),old);}
 const result=autoplay(s);assert.equal(result.status,'won',`${p.id} failed: ${result.log.join(' | ')}`);
 let same=tapAll(createGame(p));for(const [id,target] of solutions[p.id])same=activate(same,id,target);assert.deepEqual(autoplay(same),result);
 assert.equal(autoplay(createGame(p)).status,'lost',`${p.id} wins with no response`);
 });}
test('The Final Exchange is case six and later worlds require layered responses',()=>{assert.equal(cases[5].title,'The Final Exchange');assert.equal(cases[5].id,'sb-06');assert.deepEqual(cases.map(c=>c.id),Array.from({length:30},(_,i)=>`sb-${String(i+1).padStart(2,'0')}`));assert.ok(solutions['sb-12'].length>solutions['sb-06'].length);});
test('Mana is NOT preloaded; tapping real named lands changes the pool without using the stack',()=>{const s=createGame(cases[1]);assert.deepEqual(s.mana,{});assert.ok(!legalActions(s).includes('counter'));let t=tapLand(s,'land-1');assert.equal(t.mana.U,1);assert.equal(t.lands[0].tapped,true);assert.equal(t.stack.length,s.stack.length);assert.equal(t.passCount,s.passCount);assert.deepEqual(s.mana,{});assert.throws(()=>tapLand(t,'land-1'),/cannot be tapped/);t=tapLand(t,'land-2');assert.ok(legalActions(t).includes('counter'));assert.ok(!s.lands[0].tapped);});
test('Colored and true colorless costs must be paid distinctly from generic costs',()=>{let s={mana:{U:1,W:1,C:1,G:1}};assert.equal(remainingMana(s,{U:2}),null);assert.equal(remainingMana(s,{C:2}),null);assert.deepEqual(remainingMana(s,{U:1,C:1,generic:1},{W:1}),{W:0,U:0,B:0,R:0,G:1,C:0});assert.equal(remainingMana(s,{U:1,C:1,generic:1},{W:0}),null);});
test('Players can choose the color paid for generic costs',()=>{const options=paymentOptions({mana:{U:1,G:1,W:1,C:1}},{U:1,generic:1});assert.ok(options.length>=3);let payGreen=options.find(x=>x.spend.G===1);let payWhite=options.find(x=>x.spend.W===1);assert.equal(payGreen.pool.G,0);assert.equal(payGreen.pool.W,1);assert.equal(payWhite.pool.W,0);assert.equal(payWhite.pool.G,1);});
test('Insufficient colored mana, untapped state and illegal targets cannot be bypassed',()=>{let p=cases[2],s=createGame(p);assert.throws(()=>activate(s,'growth','bear'),/unaffordable/);assert.throws(()=>tapLand(s,'land-99'),/cannot be tapped/);s=tapAll(s);assert.throws(()=>activate(s,'growth','player'),/Illegal target/);let p2=cases[3],s2=tapAll(createGame(p2));assert.deepEqual(legalTargets(s2,s2.hand.find(x=>x.id==='scatter')),[]);});
test('Sacrifice is a cost that resolves through a removed source',()=>{let s=activate(createGame(cases[0]),'ward');assert.equal(s.units.find(u=>u.id==='spirit').zone,'graveyard');assert.equal(s.stack.at(-1).spell,false);s=autoplay(s);assert.equal(s.status,'won');assert.ok(s.units.find(u=>u.id==='bear').indestructible);});
test('Creature toughness, marked damage and state-based actions are accurate within supported scope',()=>{let s=autoplay(createGame(cases[2]));assert.equal(s.units[0].zone,'graveyard');s=tapAll(createGame(cases[2]));s=autoplay(activate(s,'growth','bear'));assert.equal(s.units[0].zone,'battlefield');assert.equal(s.units[0].damage,3);assert.equal(creaturePower(s.units[0]),5);assert.equal(creatureToughness(s.units[0]),5);});
test('Hexproof invalidates targeted removal on resolution, not on initial cast',()=>{let s=tapAll(createGame(cases[4]));s=autoplay(activate(s,'intervene'));assert.equal(s.units.find(u=>u.id==='giant').zone,'battlefield');assert.match(s.log.join(' '),/all targets illegal/);});
test('Countering wrong spell loses level six',()=>{let s=tapAll(createGame(cases[5]));s=activate(s,'salve','player');s=activate(s,'dispel','theirbolt');assert.equal(autoplay(s).status,'lost');});
test('All starting spells and lands reference verified catalog entries; schema rejects duplicates and fiction',()=>{for(const p of cases){assert.ok(p.lands.every(l=>LANDS[l.card]));assert.ok(p.stack.every(s=>CARDS[s.card]));}const p=structuredClone(cases[1]);p.lands[0].card='Imaginary Land';assert.equal(validateScenario(p).valid,false);const q=structuredClone(cases[1]);q.lands[1].id='land-1';assert.equal(validateScenario(q).valid,false);});