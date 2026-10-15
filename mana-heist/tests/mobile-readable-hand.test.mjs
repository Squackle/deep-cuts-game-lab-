import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const dragging=readFileSync(new URL("../src/drag-lands.js",import.meta.url),"utf8");

test("phones allocate real fixed-size hand card space instead of squeezing the card to 20 pixels",()=>{
 assert.match(css,/@media \(max-width:600px\)\{/);
 assert.match(css,/\.in-heist #gameScreen\{\s*height:auto!important;min-height:100dvh!important/);
 assert.match(css,/\.in-heist #heist #hand\{\s*height:157px!important;min-height:157px!important/);
 assert.match(css,/\.in-heist #heist #hand \.land-card\.mtg-real-land:not\(\.is-tapped\)\{\s*display:block!important;\s*width:107px!important;height:149px!important/);
 assert.match(css,/\.in-heist #heist #battlefield\{\s*height:132px!important;min-height:132px!important/);
});
test("hand becomes the first high-visibility playable zone on phone",()=>{
 assert.match(css,/\.in-heist #heist \.table-card\.hand-card\{\s*grid-column:1!important;grid-row:3!important/);
 assert.match(css,/\.in-heist #heist \.table-card:not\(\.hand-card\)\{\s*grid-column:1!important;grid-row:4!important/);
 assert.match(html,/id="handGuide"/);
 assert.match(html,/START HERE/);
 assert.match(css,/\.in-heist #heist \.hand-guide\{\s*display:block!important/);
});
test("larger cards can still be dragged by auto-scrolling a short phone viewport",()=>{
 assert.match(dragging,/function autoScroll\(\)/);
 assert.match(dragging,/window\.scrollBy\(0,delta\)/);
 assert.match(dragging,/requestAnimationFrame\(autoScroll\)/);
 assert.match(dragging,/stopAutoScroll\(\)/);
 assert.match(dragging,/onDrop\(id\)/);
 assert.match(dragging,/onInspect\?\.\(id\)/);
});
