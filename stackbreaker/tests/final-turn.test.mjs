import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openingDrill,createDrill,tapMana,castSpell,passPriority,isSorceryWindow,validateDrill,legalCast,DRILL_RULES_VERSION} from '../src/final-turn-engine.js';
const start=()=>createDrill(openingDrill);
const doubleBlue=s=>tapMana(tapMana(s,'island-a'),'island-b');
const stopBolt=s=>passPriority(castSpell(doubleBlue(s),'Counterspell','enemy-bolt'));
function reachMain(){
 let s=stopBolt(start());
 s=passPriority(s); // end step -> cleanup -> our untap & upkeep
 s=passPriority(s); // upkeep -> draw
 s=passPriority(s); // draw -> precombat main
 return s;
}
test('Scenario schema isolates Final Turn rules and rejects unsupported content',()=>{
 assert.deepEqual(validateDrill(openingDrill),[]);
 assert.equal(start().version,DRILL_RULES_VERSION);
 assert.ok(validateDrill({...openingDrill,opponentPolicy:'ai'}).length);
 assert.ok(validateDrill({...openingDrill,hand:['Black Lotus']}).length);
 assert.ok(validateDrill({...openingDrill,stack:[]}).length);
});
test('An unanswered lethal spell resolves and loses, not automatically wins',()=>{
 const s=passPriority(start());
 assert.equal(s.status,'lost');assert.equal(s.life.player,-1);
 assert.ok(s.graveyards.opponent.includes('Lightning Bolt'));
});
test('Sorcery timing is enforced at the opponent end step even with mana available',()=>{
 const s=tapMana(start(),'mountain-a');
 assert.equal(s.mana.R,1);
 assert.throws(()=>castSpell(s,'Lava Spike','opponent'),/Sorcery timing/);
 assert.equal(s.hand.length,2);
});
test('Insufficient colored mana and invalid targets reject without mutating state',()=>{
 const s=tapMana(start(),'island-a');
 assert.throws(()=>castSpell(s,'Counterspell','enemy-bolt'),/Not enough U/);
 assert.throws(()=>castSpell(s,'Counterspell','opponent'),/must target a spell/);
 assert.equal(s.mana.U,1);assert.equal(s.stack.length,1);
});
test('Counterspell resolves top-first and removes Lightning Bolt without ending the drill',()=>{
 const s=stopBolt(start());
 assert.equal(s.status,'playing');assert.equal(s.life.player,2);
 assert.equal(s.stack.length,0);
 assert.ok(s.graveyards.opponent.includes('Lightning Bolt'));
 assert.ok(s.graveyards.player.includes('Counterspell'));
 assert.equal(s.step,'endStep');
});
test('Empty stack advances only on another priority pass; mana empties and lands untap',()=>{
 let s=stopBolt(start());s=tapMana(s,'mountain-a');
 assert.equal(s.mana.R,1);
 s=passPriority(s);
 assert.equal(s.turn,2);assert.equal(s.activePlayer,'player');assert.equal(s.step,'upkeep');
 assert.equal(s.mana.R,0);assert.ok(s.lands.every(l=>!l.tapped));
});
test('Upkeep advances to draw, and draw to a legal precombat main',()=>{
 const s=reachMain();
 assert.equal(s.step,'precombatMain');assert.equal(s.turn,2);assert.ok(isSorceryWindow(s));
 assert.deepEqual(s.hand,['Lava Spike','Mountain']);
 assert.equal(s.library.length,0);assert.equal(s.status,'playing');
});
test('Legal sorcery cast requires red mana and a pass to resolve; lethal wins game',()=>{
 let s=reachMain();
 assert.equal(legalCast(s,'Lava Spike'),false);
 s=tapMana(s,'mountain-a');
 assert.equal(legalCast(s,'Lava Spike'),true);
 s=castSpell(s,'Lava Spike','opponent');
 assert.equal(s.life.opponent,3);assert.equal(s.status,'playing');
 s=passPriority(s);
 assert.equal(s.status,'won');assert.equal(s.life.opponent,0);
 assert.ok(s.graveyards.player.includes('Lava Spike'));
});
test('Phase 1 endgame trial expires after own turn without lethal',()=>{
 let s=reachMain();
 for(let i=0;i<5&&s.status==='playing';i++)s=passPriority(s);
 assert.equal(s.status,'failed');
 assert.equal(s.life.opponent,3);
});
test('Classic remains isolated; new drill is a visible, separately routed game',()=>{
 const load=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
 const source=load('template.html'),built=load('index.html'),classic=load('src/ui.js'),html=load('final-turn/index.html'),app=load('final-turn/app.js');
 assert.ok(source.includes('href="./final-turn/"'));
 assert.ok(built.includes('href="./final-turn/"'));
 assert.ok(classic.includes('dc-stackbreaker-progress-v3'));
 assert.ok(app.includes('dc-stackbreaker-final-turn-v1'));
 assert.ok(!app.includes('dc-stackbreaker-progress-v3'));
 assert.ok(html.includes('<script type="module" src="./app.js">'));
 assert.ok(html.includes('id="stack"')&&html.includes('id="hand"')&&html.includes('id="pass"'));
});
