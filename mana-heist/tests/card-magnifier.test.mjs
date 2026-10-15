import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {installCardMagnifier} from "../src/card-magnifier.js";
const js=readFileSync(new URL("../src/card-magnifier.js",import.meta.url),"utf8");
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");

test("hover previews the exact existing printing without requesting another image",()=>{
 assert.match(js,/ctx\.drawImage\(image,0,0,canvas\.width,canvas\.height\)/);
 assert.doesNotMatch(js,/\.src\s*=/);
 assert.doesNotMatch(js,/fetch\(/);
 assert.match(js,/pointerover/);
 assert.match(js,/focusin/);
 assert.match(js,/pointerdown",hide,true/);
});
test("hover card magnifier canvas is a fixed overlay that does not block dragging",()=>{
 assert.match(html,/id="cardMagnifier"/);
 assert.match(html,/id="magnifierCanvas"/);
 assert.match(css,/\.card-magnifier\{[\s\S]*?pointer-events:none/);
 assert.match(css,/\.card-magnifier canvas\{/);
 assert.match(css,/@media\(hover:none\)/);
});
test("zoom controller rejects missing elements",()=>{
 assert.throws(()=>installCardMagnifier({battlefield:null,hand:null,panel:null,canvas:null,title:null}));
});
