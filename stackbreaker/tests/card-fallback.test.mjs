import test from 'node:test';
import assert from 'node:assert/strict';
import {renderCardFallback} from '../src/card-fallback.js';
import {CARDS,LANDS} from '../src/cards.js';
test('offline card displays local identity, cost, ability and printed creature stats',()=>{
 const html=renderCardFallback('Selfless Spirit',CARDS['Selfless Spirit'],'battle-image');
 for(const value of ['Selfless Spirit','1 W','2/1','indestructible','card-fallback'])assert.ok(html.includes(value),value);
});
test('basic land retains its name and mana text without fetched metadata',()=>{
 const html=renderCardFallback('Island',LANDS.Island,'land-image');
 assert.match(html,/>Island</);
 assert.ok(html.includes(LANDS.Island.oracle));
});

test('names, classes and external oracle metadata cannot inject markup',()=>{
 const html=renderCardFallback('<img src=x onerror=alert(1)>',{},'" onclick="bad','<script>bad()</script>');
 assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script>'));
 assert.ok(html.includes('&quot; onclick=&quot;bad'));
 assert.ok(html.includes('&lt;script&gt;'));
});
test('noncreatures do not gain fictitious power and toughness',()=>{
 assert.ok(!renderCardFallback('Island',LANDS.Island).includes('<b>'));
});
