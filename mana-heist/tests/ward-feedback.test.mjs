import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {missingMana,failureText} from "../src/ward-feedback.js";
import {payOptions} from "../src/engine.js";
const read=(path)=>readFileSync(new URL(path,import.meta.url),"utf8");
test("blue mana satisfies generic, never a missing red pip",()=>{
 const cost={R:1,N:1};
 const pool={W:0,U:2,B:0,R:0,G:0,C:0};
 assert.deepEqual(missingMana(pool,cost),{R:1});
 assert.equal(payOptions(pool,cost).length,0);
 assert.match(failureText(missingMana(pool,cost)),/Need 1 red mana/);
 assert.deepEqual(missingMana({...pool,R:1},cost),{});
 assert.ok(payOptions({...pool,R:1},cost).some(s=>s.R===1&&s.U===1));
});
test("generic deficit needs any remaining mana; true colorless cannot be replaced with blue",()=>{
 const p={W:0,U:2,B:0,R:0,G:0,C:0};
 assert.deepEqual(missingMana(p,{N:2}),{});
 assert.deepEqual(missingMana(p,{N:3}),{N:1});
 assert.deepEqual(missingMana(p,{C:1}),{C:1});
 assert.equal(payOptions(p,{N:2}).length,1);
 assert.equal(payOptions(p,{C:1}).length,0);
 assert.match(failureText({N:1}),/any color/);
});
test("shortages are computed after reserving exact colored requirements",()=>{
 const p={W:1,U:2,B:0,R:1,G:0,C:0};
 assert.deepEqual(missingMana(p,{U:1,R:1,N:2}),{});
 assert.deepEqual(missingMana(p,{U:2,R:2,N:2}),{R:1,N:1});
});
test("rendering keeps intact Scryfall scans but scales both zones up with a landscape tapped hitbox",()=>{
 const css=read("../styles.css");
 const js=read("../src/main.js");
 assert.match(css,/--mh-land-width:clamp\(128px/);
 assert.match(css,/#battlefield \.land-card\.mtg-real-land\.is-tapped/);
 assert.match(css,/transform:translate\(-50%,-50%\) rotate\(90deg\)!important/);
 assert.match(css,/object-fit:contain!important/);
 assert.match(js,/cardImageUrl\(key\)/);
 assert.match(js,/flashWard\(/);
 assert.match(js,/rejectCast\(\)/);
 assert.match(js,/failureText\(missing\)/);
 assert.match(css,/\.feedback\.bad/);
});
