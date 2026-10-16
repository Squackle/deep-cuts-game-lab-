import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openingDrill,createDrill,tapMana,castSpell,passPriority} from '../src/final-turn-engine.js';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const app=read('final-turn/app.js'),css=read('final-turn/drill.css'),page=read('final-turn/index.html');

test('hand cards display only the full Scryfall card image, not duplicated titles or helper text',()=>{
 const handRenderer=app.slice(app.indexOf("$('hand').innerHTML="),app.indexOf("$('handCount')"));
 assert.ok(handRenderer.includes("cardArt(name)"));
 assert.ok(!handRenderer.includes("'</b>'"));
 assert.ok(!handRenderer.includes("<b>"));
 assert.ok(!handRenderer.includes("<small>"));
 assert.ok(handRenderer.includes('aria-label="Cast '),'art-only buttons must retain an accessible name');
 assert.ok(app.includes('candidate.normal||candidate.large||candidate.small'),
  'full readable print, not tiny Scryfall thumbnail');
 assert.match(css,/\.card img,\.land img\{display:block;width:100%;height:100%/);
 assert.match(css,/\.card,\.land\{appearance:none/);
 assert.match(css,/\.card,.land\{appearance:none/);
 assert.match(css,/border:0!important/);
 assert.match(css,/width:clamp\(165px,19vw,246px\)/);
});

test('each physical Island and Mountain fetches an independent random real Scryfall printing',()=>{
 assert.ok(app.includes("for(const land of openingDrill.lands)"));
 assert.ok(app.includes("https://api.scryfall.com/cards/random?q="));
 assert.ok(app.includes("game:paper"));
 assert.ok(app.includes("card.name===land.card"));
 assert.ok(app.includes("landArt.get(l.id)"),'independent land instances must not share an identical random printing');
 assert.ok(app.includes("cards\\.scryfall\\.io"));
 assert.ok(app.includes("sessionStorage"));
 assert.ok(!app.includes("Math.random()"),'game rules and mana must not become random');
 assert.ok(app.includes('data-land='),'cards must still be tap targets');
 assert.ok(app.includes('tapMana(s,el.dataset.land)'),'clicks must reach original engine');
});

test('the new look does not alter gameplay or save legacy progress',()=>{
 let s=createDrill(openingDrill);
 s=tapMana(tapMana(s,'island-a'),'island-b');
 s=passPriority(castSpell(s,'Counterspell','enemy-bolt'));
 assert.equal(s.status,'playing');
 for(let i=0;i<3;i++)s=passPriority(s);
 s=tapMana(s,'mountain-a');
 s=passPriority(castSpell(s,'Lava Spike','opponent'));
 assert.equal(s.status,'won');
 assert.ok(app.includes('dc-stackbreaker-final-turn-v1'));
 assert.ok(!app.includes('dc-stackbreaker-progress-v3'));
 assert.ok(page.includes('id="hand"')&&page.includes('id="lands"'));
});
