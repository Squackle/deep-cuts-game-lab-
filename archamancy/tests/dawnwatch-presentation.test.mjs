import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=name=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
test("title and result art is local and contains no remote references or active content",()=>{
 const svg=read("title-landscape.svg"),css=read("styles.css");
 assert.match(svg,/<svg[^>]+viewBox="0 0 1600 900"/);
 assert.doesNotMatch(svg,/<script|foreignObject|\bon\w+=|href=["'](?:https?:|\/\/)/i);
 assert.match(css,/\.title-screen\{background:[^\n]*url\("\.\/title-landscape\.svg"\)/);
 assert.match(css,/\.end-screen\{overflow:auto;[^\n]*url\("\.\/title-landscape\.svg"\)/);
});
test("spellbook retains the original copy-count contract and attributes cached artwork",()=>{
 const js=read("main.mjs");
 assert.match(js,/s\.setAttribute\("aria-label",d\.name\+" copies"\)/);
 assert.match(js,/s\.dataset\.card=id/);
 assert.match(js,/for\(let i=0;i<=3;i\+\+\)/);
 assert.match(js,/function configuredDeck\(\)/);
 assert.match(js,/credit\.textContent="Art: "\+artwork\.artist/);
});
