import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=name=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
test("title landscape is local decorative art with no scripts or external references",()=>{
 const svg=read("title-landscape.svg"),css=read("styles.css");
 assert.match(svg,/<svg[^>]+viewBox="0 0 1600 900"/);
 assert.doesNotMatch(svg,/<script|foreignObject|\bon\w+=|href=["'](?:https?:|\/\/)/i);
 assert.match(css,/\.title-screen\{background:[^\n]*url\("\.\/title-landscape\.svg"\)/);
});
test("commander collection is read-only and existing deck editor retains accessible counts",()=>{
 const js=read("main.mjs");
 assert.match(js,/legendTab\.dataset\.codex="h"/);
 const legend=js.slice(js.indexOf("function legendEntry"),js.indexOf("function legendEntry")+js.slice(js.indexOf("function legendEntry")).indexOf("return row;}")+12);
 assert.match(legend,/profile\.unlocked\.includes\(id\)/);
 assert.doesNotMatch(legend,/game\.command|progress\.save|profile\.unlocked\.push/);
 assert.match(js,/s\.setAttribute\("aria-label",d\.name\+" copies"\)/);
 assert.match(js,/s\.dataset\.card=id/);
});
