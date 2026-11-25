import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RULES_VERSION} from '../src/cards.js';
import {createGame,activate,autoplay,paymentOptions,legalActions} from '../src/engine.js';

test('unranked practice exposes both generic payments; only one preserves the winning response',()=>{
 const scene={id:'test-payment',version:RULES_VERSION,title:'Payment choice',intro:'Choose mana.',hint:'Save red.',explanation:'Spend green.',tier:'Investigator',
  life:{player:1,opponent:3},mana:{U:1,R:1,G:1},lands:[],activeActor:'opponent',opponentPolicy:'alwaysPass',units:[],
  stack:[{id:'incoming',card:'Lightning Bolt',controller:'opponent',targetId:'player'}],
  hand:[{id:'negate',card:'Negate'},{id:'bolt',card:'Lightning Bolt'}],objective:{type:'win'}};
 const s=createGame(scene);
 const options=paymentOptions(s,{generic:1,U:1});
 assert.equal(options.length,2);
 const good=options.find(o=>o.spend.G===1),bad=options.find(o=>o.spend.R===1);
 assert.ok(good&&bad);
 const preserved=activate(s,'negate','incoming',good.spend);
 assert.ok(legalActions(preserved).includes('bolt'));
 assert.equal(autoplay(activate(preserved,'bolt','opponent')).status,'won');
 const depleted=activate(s,'negate','incoming',bad.spend);
 assert.ok(!legalActions(depleted).includes('bolt'));
 assert.equal(autoplay(depleted).status,'lost');
 assert.equal(s.mana.R,1,'original state is untouched');
});

test('strategy trial UI passes selected generic allocation to the unchanged engine',()=>{
 const ui=readFileSync(new URL('../strategy-lab.js',import.meta.url),'utf8');
 assert.match(ui,/paymentOptions\(state,/);
 assert.match(ui,/dataset\.paymentFor/);
 assert.match(ui,/activate\(state,a\.id,target,payment\)/);
});
