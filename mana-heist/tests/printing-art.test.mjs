import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {LEVELS} from "../src/levels.js";
import {randomPrintingUrl,startStagePrintings,imageFor,printingFor,invalidateStagePrintings} from "../src/printing-art.js";
import {cardImageUrl} from "../src/scryfall-cards.js";

test("Scryfall random printing image redirects are exact-name, English, full-card and cache-distinct",()=>{
 const url=new URL(randomPrintingUrl("Steam Vents","instance-A-42"));
 assert.equal(url.pathname,"/cards/random");
 assert.equal(url.searchParams.get("q"),'!"Steam Vents" lang:en');
 assert.equal(url.searchParams.get("format"),"image");
 assert.equal(url.searchParams.get("version"),"small");
 assert.equal(url.searchParams.get("_"),"instance-A-42");
 assert.ok(!url.href.includes("art_crop"));
});
test("every card gets a distinct stable genuine printing URL during a stage",()=>{
 const level=LEVELS[1];
 startStagePrintings(level);
 const instances=[...level.field,...level.hand,...level.library];
 const urls=instances.map(instance=>imageFor(instance.id,instance.card));
 assert.equal(new Set(urls).size,urls.length);
 assert.ok(urls.every(url=>url.startsWith("https://api.scryfall.com/cards/random?")));
 assert.equal(imageFor(instances[0].id,instances[0].card),urls[0]);
 assert.equal(printingFor(instances[0].id)?.small,urls[0]);
 startStagePrintings(level);
 const next=instances.map(instance=>imageFor(instance.id,instance.card));
 assert.ok(next.every((url,i)=>url!==urls[i]),"restart should request fresh printings");
 invalidateStagePrintings();
 assert.equal(imageFor("unknown","mountain"),cardImageUrl("mountain"));
});
test("all campaign lands can use Scryfall randomized reprints without altering identities",()=>{
 for(const level of LEVELS){
  startStagePrintings(level);
  for(const c of [...level.field,...level.hand,...level.library]){
   const url=new URL(imageFor(c.id,c.card));
   assert.equal(url.pathname,"/cards/random");
   assert.match(url.searchParams.get("q"),/lang:en$/);
  }
 }
});
test("no header inspector button; keyed card nodes keep the same image on tap and Undo",()=>{
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 const js=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
 const img=readFileSync(new URL("../src/printing-art.js",import.meta.url),"utf8");
 assert.doesNotMatch(html,/id="inspectLand"/);
 assert.match(js,/onInspect:id=>inspectById\(id\)/);
 assert.match(js,/function syncLandRows\(\)/);
 assert.match(js,/existing\.get\(id\)/);
 assert.match(js,/replaceChildren\(/);
 assert.match(js,/startStagePrintings\(level\)/);
 assert.doesNotMatch(img,/fetch\(/);
});
test("fixed viewport protects the whole ward and shares space between card rows",()=>{
 const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
 assert.match(css,/grid-template-rows:minmax\(max-content, 226px\) 42px minmax\(0,1fr\) minmax\(0,1fr\)/);
 assert.match(css,/\.vault-stage\{[\s\S]*?flex:0 0 auto!important/);
 assert.match(css,/height:min\(calc\(var\(--mh-land-width\)\*680\/488\),calc\(100% - 8px\)\)/);
});
