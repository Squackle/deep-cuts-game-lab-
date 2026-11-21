import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../../archemancy/index.html",import.meta.url),"utf8");
const js=readFileSync(new URL("../main.mjs",import.meta.url),"utf8");
const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
test("viewport shell and contextual combat controls have unique matching elements",()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,new Set(ids).size);
 for(const [,id] of js.matchAll(/\$\("([^"]+)"\)/g))assert.ok(ids.includes(id),id);
 assert.match(css,/height:100dvh/);
 assert.match(css,/html,body\{[^}]*overflow:hidden/);
 assert.match(html,/class="map-stage"/);
 assert.equal([...html.matchAll(/data-school="/g)].length,5);
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
});
test("settings, statistics, deck editor and sandbox are modal rather than scrolling combat sections",()=>{
 for(const id of ["menuDialog","waveDialog","deckDialog","sandboxDialog","statsDialog"])assert.match(html,new RegExp('<dialog id="'+id+'"'));
 assert.match(js,/!document\.querySelector\("dialog\[open\]"\)/);
 assert.match(js,/\.showModal\(\)/);
});

test("wave calling and playtest report are exposed through accessible gameplay controls",()=>{assert.match(html,/id="copyStats"/);assert.match(html,/id="statsReport"[^>]*readonly/);assert.match(js,/game\.playtestReport\(\)/);assert.match(js,/navigator\.clipboard\.writeText\(report\)/);assert.match(js,/game\.canCallEarly\(\)/);assert.match(js,/game\.earlyBonus\(\)/);});

test("tier-three branch choice has a modal and both purchase options",()=>{assert.match(html,/id="branchDialog"/);assert.match(html,/id="branchChoices"/);assert.match(js,/game\.branchOptions\(t\)/);assert.match(js,/branch:option\.id/);});
