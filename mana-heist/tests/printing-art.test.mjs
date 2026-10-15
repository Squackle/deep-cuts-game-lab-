import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {artSearchUrl,uniquePrints,selectPrinting,imageFor,printingFor} from "../src/printing-art.js";
import {cardImageUrl} from "../src/scryfall-cards.js";
const card=(name,n,overrides={})=>({name,image_uris:{small:"https://cards.scryfall.io/small/front/"+n+".jpg",normal:"https://cards.scryfall.io/normal/front/"+n+".jpg"},...overrides});
test("Scryfall print search requests exact named English cards with unique illustrations",()=>{
 const url=new URL(artSearchUrl("Steam Vents"));
 assert.equal(url.pathname,"/cards/search");
 assert.equal(url.searchParams.get("unique"),"art");
 assert.equal(url.searchParams.get("q"),'!"Steam Vents" lang:en');
});
test("only genuine same-name card images are selected and all frames remain intact",()=>{
 const items=uniquePrints([
  card("Mountain","a"),card("Mountain","b"),
  card("Island","x"),card("Mountain","a"),
  card("Mountain","unsafe",{image_uris:{small:"javascript:alert(1)",normal:"bad"}})
 ],"Mountain");
 assert.equal(items.length,2);
 assert.deepEqual(items.map(x=>x.small),[
  "https://cards.scryfall.io/small/front/a.jpg",
  "https://cards.scryfall.io/small/front/b.jpg"
 ]);
 assert.ok(items.every(p=>p.normal.includes("/normal/front/")));
});
test("random printing picks valid variants and fallback preserves card identity",()=>{
 const printings=uniquePrints([card("Forest","a"),card("Forest","b"),card("Forest","c")],"Forest");
 assert.equal(selectPrinting(printings,()=>0).small,printings[0].small);
 assert.equal(selectPrinting(printings,()=>.45).small,printings[1].small);
 assert.equal(selectPrinting(printings,()=>.999).small,printings[2].small);
 assert.equal(selectPrinting([],()=>0),null);
 assert.equal(imageFor("not-assigned","mountain"),cardImageUrl("mountain"));
 assert.equal(printingFor("not-assigned","mountain"),null);
});
test("the game has no MTG CARD header, but inspecting a land remains possible",()=>{
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 const js=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
 assert.doesNotMatch(html,/id="inspectLand"/);
 assert.match(js,/onInspect:id=>inspectById\(id\)/);
 assert.match(js,/startStagePrintings\(level,updateVisiblePrints\)/);
 assert.match(js,/printingFor\(id,record.card\)/);
});
test("layout uses intrinsic full ward height and divides remaining card space fairly",()=>{
 const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
 assert.match(css,/grid-template-rows:minmax\(max-content, 226px\) 42px minmax\(0,1fr\) minmax\(0,1fr\)/);
 assert.match(css,/\.vault-stage\{[\s\S]*?flex:0 0 auto!important/);
 assert.match(css,/height:min\(calc\(var\(--mh-land-width\)\*680\/488\),calc\(100% - 8px\)\)/);
});
