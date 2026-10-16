import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {LEVELS} from "../src/levels.js";
import {VERSION} from "../src/engine.js";
const read=(f)=>readFileSync(new URL("../"+f,import.meta.url),"utf8");

test("fixed guide uses an actual close button, never a hash link behind the overlay",()=>{
 const html=read("index.html");
 assert.match(html,/<button type="button" id="returnFromGuide"/);
 assert.match(html,/aria-label="Close guide and return to Mana Heist game"/);
 assert.doesNotMatch(html,/<a href="#heist">↑ BACK TO GAME<\/a>/);
});
test("guide trigger and return button share state, accessibility and focus recovery",()=>{
 const main=read("src/main.js");
 assert.match(main,/function setGuideOpen\(open,\{restoreFocus=true\}=\{\}\)/);
 assert.match(main,/guide\.open=Boolean\(open\)/);
 assert.match(main,/setAttribute\("aria-expanded",String\(guide\.open\)\)/);
 assert.match(main,/el\("returnFromGuide"\)\.addEventListener\("click",\(\)=>setGuideOpen\(false\)\)/);
 assert.match(main,/el\("toggleGuide"\)\.addEventListener\("click",\(\)=>setGuideOpen\(!el\("gameNotes"\)\.open\)\)/);
 assert.match(main,/el\("gameNotes"\)\.addEventListener\("toggle"/);
 assert.match(main,/\.focus\(\{preventScroll:true\}\)/);
 assert.match(main,/if\(el\("gameNotes"\)\.open\)\{e\.preventDefault\(\);setGuideOpen\(false\);return;\}/);
});
test("guide remains a fixed screen-friendly overlay with a visible keyboard accessible return control",()=>{
 const css=read("tabletop-immersion.css");
 assert.match(css,/body\.in-heist #gameNotes\.game-notes\{/);
 assert.match(css,/position:fixed!important;z-index:120!important/);
 assert.match(css,/body\.in-heist #gameNotes \.notes-heading #returnFromGuide\{/);
 assert.match(css,/min-height:40px/);
 assert.match(css,/#returnFromGuide:focus-visible/);
});
test("guide hotfix does not touch mana puzzle definitions, engine version or saved progress",()=>{
 assert.equal(LEVELS.length,250);
 assert.equal(new Set(LEVELS.map(l=>l.id)).size,250);
 assert.equal(VERSION,"mh-landfall-0.2.0");
 assert.match(read("src/main.js"),/dc-mana-heist-landfall-v2/);
});
