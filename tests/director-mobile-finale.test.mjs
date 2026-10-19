import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {HIVE_MOBILE_FINALE_WEBP} from "../director/mobile-finale-art.js";
import {HIVE_FINALE_WEBP} from "../director/finale-art.js";
import {RULES_VERSION} from "../src/engine.js";
const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");

test("Mobile art is a real self-contained pixelated 9:16 WebP, not a network dependency",()=>{
 assert.match(HIVE_MOBILE_FINALE_WEBP,/^data:image\/webp;base64,/);
 const bytes=Buffer.from(HIVE_MOBILE_FINALE_WEBP.split(",")[1],"base64");
 assert.equal(bytes.toString("ascii",0,4),"RIFF");
 assert.equal(bytes.toString("ascii",8,12),"WEBP");
 assert.equal(bytes.length,9496);
 assert.equal(createHash("sha256").update(bytes).digest("hex"),
 "c1bc28553c70c3535a5079e49c85f4341ba3fb922055d8dde84058d32941a071");
 assert.ok(HIVE_FINALE_WEBP.length>3500,"existing landscape poster remains intact");
});

test("Director selects portrait only for Hunt in portrait mobile viewports",()=>{
 const js=read("../director/main.js"),css=read("../director/styles.css");
 assert.match(js,/HIVE_MOBILE_FINALE_WEBP/);
 assert.match(js,/victory\.classList\.toggle\("victory-screen--hunt",isHunt\)/);
 assert.match(js,/--director-finale-mobile/);
 assert.match(css,/@media\s*\(max-width:700px\)\s*and\s*\(orientation:portrait\)/);
 assert.match(css,/\.victory-screen--hunt \.victory-art/);
 assert.match(css,/background-image:var\(--director-finale-mobile/);
 assert.match(css,/\.victory-screen--hunt \.victory-content h2/);
 assert.match(css,/\.victory-screen--hunt \.victory-won/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/min-height:48px/);
 assert.ok(js.includes('linear-gradient(145deg,#96754b,#30204f,#112a2d)'),
  "Brood Trail maintains its distinct prototype backdrop");
 assert.equal(RULES_VERSION,"hive-1.5.4","no ranked engine changes permitted");
});

test("Mobile finale remains permanently Game Lab-only",()=>{
 const promotion=read("../docs/MAIN-SITE-PROMOTION.md");
 const publicGame=read("../src/main.js");
 const root=read("../index.html");
 assert.match(promotion,/director\/\*\*/);
 assert.doesNotMatch(publicGame,/mobile-finale-art|HIVE_MOBILE_FINALE_WEBP/);
 assert.match(root,/href="\.\/director\//);
});
