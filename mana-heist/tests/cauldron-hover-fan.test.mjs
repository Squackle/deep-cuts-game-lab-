import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {handFanLayout} from "../src/hand-fan-layout.js";
import {LEVELS} from "../src/levels.js";
import {VERSION} from "../src/engine.js";
const read=f=>readFileSync(new URL("../"+f,import.meta.url),"utf8");

test("pot stays translated to its true center on hover and during stirring",()=>{
 const css=read("tabletop-immersion.css");
 assert.match(css,/body\.in-heist #heist #wardTarget\.lock-ring:hover,/);
 assert.match(css,/body\.in-heist #heist #wardTarget\.lock-ring\.is-stirring,/);
 assert.match(css,/body\.in-heist #heist #wardTarget\.lock-ring\.fluid-enabled:hover,/);
 assert.match(css,/transform:translateX\(-50%\)!important/);
 assert.match(css,/transition:box-shadow \.24s ease,filter \.24s ease!important/);
 // A regression in legacy CSS had changed transform:none!important,
 // losing 50% translateX and moving the pot half a pot-width right.
 const base=read("styles.css");
 assert.match(base,/\.in-heist #heist #wardTarget\.lock-ring\.is-stirring/);
});
test("hand fan remains on screen and fits 1-10 cards without zone scrolling",()=>{
 for(const [vw,vh] of [[320,568],[375,812],[703,777],[1280,800],[1536,706]]){
  for(let count=0;count<=10;count++){
   const f=handFanLayout(count,vw,vh);
   assert.equal(f.cards.length,count);
   assert.ok(f.cardWidth>=86&&f.cardWidth<=160);
   assert.ok(f.totalWidth<=vw-12,JSON.stringify({vw,vh,count,f}));
   assert.ok(f.overlap<=0);
   for(const p of f.cards)assert.ok(Number.isFinite(p.tilt)&&p.drop>=0);
   if(count>2){
    assert.equal(f.cards[0].drop,f.cards[count-1].drop);
    assert.equal(f.cards[0].tilt,-f.cards[count-1].tilt);
   }
  }
 }
 const css=read("tabletop-immersion.css");
 assert.match(css,/body\.in-heist #heist #hand\{\s*bottom:0!important/);
 assert.match(css,/height:100%!important/);
 assert.match(css,/body\.in-heist #gameScreen\{\s*--hand-height/);
 assert.match(css,/hand-selected/);
 assert.match(read("src/main.js"),/handFanLayout\(handNodes\.length,vw,vh\)/);
 assert.match(read("src/main.js"),/--hand-overlap",fan\.overlap/);
});
test("spell and auto-cast option avoid the center cauldron and keep keyboard accessibility",()=>{
 const css=read("tabletop-immersion.css");
 const main=read("src/main.js");
 assert.match(css,/\.ward-info \.auto-option\{\s*position:static!important/);
 assert.match(css,/@media\(min-width:950px\)/);
 assert.match(css,/left:calc\(50% \+ var\(--pot-size\) \/ 2 \+ 28px\)!important/);
 assert.match(main,/autoCastToggle/);
 assert.match(main,/playSelectedLand/);
});
test("this patch changes only UI and retains the same campaign, engine and save key",()=>{
 assert.equal(VERSION,"mh-landfall-0.2.0");
 assert.equal(LEVELS.length,500);
 const main=read("src/main.js");
 assert.match(main,/dc-mana-heist-landfall-v2/);
 assert.match(main,/launchOrbitMana/);
 assert.match(read("index.html"),/tabletop-immersion\.css/);
});
