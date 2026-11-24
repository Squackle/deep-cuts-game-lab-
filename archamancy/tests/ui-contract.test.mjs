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
 assert.match(html,/id="ring"/);assert.match(js,/function placeRing\(pad\)/);assert.match(css,/\.ring-items>button\{/);
});
test("settings, statistics, deck editor and sandbox are modal rather than scrolling combat sections",()=>{
 for(const id of ["menuDialog","waveDialog","deckDialog","sandboxDialog","statsDialog"])assert.match(html,new RegExp('<dialog id="'+id+'"'));
 assert.match(js,/!document\.querySelector\("dialog\[open\]"\)/);
 assert.match(js,/\.showModal\(\)/);
});

test("wave calling and playtest report are exposed through accessible gameplay controls",()=>{assert.match(html,/id="copyStats"/);assert.match(html,/id="statsReport"[^>]*readonly/);assert.match(js,/game\.playtestReport\(\)/);assert.match(js,/navigator\.clipboard\.writeText\(report\)/);assert.match(js,/game\.canCallEarly\(\)/);assert.match(js,/game\.earlyBonus\(\)/);});

test("tier-three branch choice has a modal and both purchase options",()=>{assert.match(html,/id="branchDialog"/);assert.match(html,/id="branchChoices"/);assert.match(js,/game\.branchOptions\(t\)/);assert.match(js,/branch:option\.id/);});

test("portrait replaces the game with a rotation prompt and freezes the battle clock",()=>{
 assert.match(html,/<section id="orientationGate"[^>]*aria-labelledby="orientationTitle"[^>]*>/);
 assert.match(html,/Turn your phone sideways/);
 assert.match(css,/@media \(orientation:portrait\)\{\s*\.game-shell\{display:none\}/);
 assert.match(js,/function frame\(now\)\{\s*if\(portrait.matches\)return;/);
 assert.match(js,/portrait.addEventListener\("change",syncOrientation\)/);
});

test("sideways phones reserve side gutters so the HUD, hand and menus never cover the map",()=>{
 const block=css.slice(css.indexOf("@media (orientation:landscape) and (max-height:500px){"));
 assert.ok(block.length>0,"short-landscape phone block exists");
 // The gutter is measured from the real viewport and notch insets, with a floor so the hand always fits.
 assert.match(block,/--gut:max\(118px,calc\(\(100vw - var\(--sl\) - var\(--sr\) - \(100dvh - var\(--st\) - var\(--sb\)\) \* 5 \/ 3\) \/ 2\)\)/);
 assert.match(block,/\.map-stage\{padding:var\(--st\) calc\(var\(--sr\) \+ var\(--gut\)\) var\(--sb\) calc\(var\(--sl\) \+ var\(--gut\)\)\}/);
 // Panels start after the notch inset, not at the screen edge.
 assert.match(block,/--edge-l:calc\(var\(--sl\) \+ 6px\)/);assert.match(block,/\.hud\{[^}]*left:var\(--edge-l\)/);assert.match(block,/\.spell-tray\{[^}]*right:var\(--edge-r\)/);
 // The hand is a scrollable list of named spell buttons inside the gutter.
 assert.match(block,/\.hand\{[^}]*grid-template-columns:minmax\(0,1fr\)[^}]*overflow-y:auto/);
 assert.doesNotMatch(block,/\.hand \.spell strong\{display:none/);
 // Card details and the build ring's info box sit in the left gutter instead of over the battlefield.
 assert.match(block,/\.card-tip,\.ring \.ring-info\{position:fixed;left:var\(--edge-l\)!important/);
 assert.doesNotMatch(css,/min-aspect-ratio:21\/10/,"the old wide-only layout that ignored notch insets is gone");
});
