import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {createDirectorRun} from "../director/mode.js";
import {HIVE_FINALE_DESKTOP_AVIF,HIVE_FINALE_MOBILE_AVIF} from "../director/high-resolution-finale-art.js";
import {HIVE_FINALE_WEBP} from "../director/finale-art.js";
import {HIVE_MOBILE_FINALE_WEBP} from "../director/mobile-finale-art.js";
import {RULES_VERSION} from "../src/engine.js";

const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
function parseImage(url){
 assert.match(url,/^data:image\/avif;base64,/);
 const b=Buffer.from(url.split(",")[1],"base64");
 assert.equal(b.toString("ascii",4,8),"ftyp");
 assert.equal(b.toString("ascii",8,12),"avif");
 const i=b.indexOf("ispe");
 assert.ok(i>0,"AVIF image spatial extents box present");
 return {
  b, width:b.readUInt32BE(i+8),height:b.readUInt32BE(i+12),
  sha:createHash("sha256").update(b).digest("hex")
 };
}
test("Desktop poster uses actual sharp 1200px-wide approved illustration, not 160px stretched artwork",()=>{
 const x=parseImage(HIVE_FINALE_DESKTOP_AVIF);
 assert.equal(x.width,1200);assert.equal(x.height,675);
 assert.ok(x.b.length>55000,"must be a genuinely detailed final asset, not thumbnail");
 assert.equal(x.sha,"327ef71a810248b0a6d7e66172d3331fdffb345e6e597ce3fd27aa92b202d77b");
 assert.ok(HIVE_FINALE_WEBP.length>3500,"legacy WebP remains as old-browser fallback only");
});
test("Portrait poster uses the real mobile-specific artwork at 576x1024",()=>{
 const x=parseImage(HIVE_FINALE_MOBILE_AVIF);
 assert.equal(x.width,576);assert.equal(x.height,1024);
 assert.ok(x.b.length>40000);
 assert.equal(x.sha,"2dfa306736822cbc621e81fb868e6bad2964e000e248c33cee8e56b3ec16588b");
 assert.ok(HIVE_MOBILE_FINALE_WEBP.length>10000);
});
test("Victory uses AVIF first with WebP fallback; no text duplication and no image stretching",()=>{
 const js=read("../director/main.js"),css=read("../director/styles.css");
 assert.match(js,/HIVE_FINALE_DESKTOP_AVIF/);
 assert.match(js,/HIVE_FINALE_MOBILE_AVIF/);
 assert.match(js,/image-set\(url\(/);
 assert.match(js,/type\("image\/avif"\)/);
 assert.match(js,/type\("image\/webp"\)/);
 assert.match(css,/\.victory-screen--hunt \.victory-art\s*\{[^}]*image-rendering:auto/s);
 assert.match(css,/\.victory-screen--hunt \.victory-art\s*\{[^}]*background-size:contain/s);
 assert.match(css,/\.victory-screen--hunt \.victory-content h2,\s*\.victory-screen--hunt \.victory-won/s);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/\.victory-screen--hunt \.victory-actions button\s*\{[^}]*min-height:48px/s);
 assert.match(js,/document\.documentElement\.classList\.toggle\("director-finale-open",run\.status==="won"\)/);
});
test("Return-to-Director actually exits victory instead of reopening the configured forced win",()=>{
 const js=read("../director/main.js");
 const fn=js.match(/function returnToDirector\(\)\{[\s\S]*?\n\}/);
 assert.ok(fn,"Return handler is a distinct testable function");
 assert.match(js,/\$\("directorVictoryExit"\)\.addEventListener\("click",returnToDirector\)/);
 for(const mode of ["hunt","classic"]){
  const els={
   directorVictory:{hidden:false},
   directorPhase:{value:"victory"},
   directorGame:{value:mode},
   directorStart:{focus(o){this.focused=true;this.opts=o}}
  };
  let started;
  runInNewContext(fn[0]+"\nreturnToDirector()",{
   $:id=>els[id],
   startScene:()=>{
    const phase=els.directorPhase.value;
    started=createDirectorRun({mode,boss:"broodmother",phase});
   }
  });
  assert.equal(els.directorVictory.hidden,true);
  assert.equal(els.directorPhase.value,mode==="classic"?"first":"final");
  assert.equal(started.status,"running",mode+" must return to real interactive game, not another win");
  assert.equal(els.directorStart.focused,true);
 }
});
test("Non-forced victory return preserves selected first/final phase; normal game rules are unchanged",()=>{
 const js=read("../director/main.js");
 const fn=js.match(/function returnToDirector\(\)\{[\s\S]*?\n\}/)[0];
 const els={
  directorVictory:{hidden:false},directorPhase:{value:"first"},
  directorGame:{value:"hunt"},directorStart:{focus(){}}
 };
 let called=0;runInNewContext(fn+"\nreturnToDirector()",{
  $:id=>els[id],startScene:()=>{called++}
 });
 assert.equal(els.directorPhase.value,"first");
 assert.equal(called,1);assert.equal(els.directorVictory.hidden,true);
 assert.equal(RULES_VERSION,"hive-1.5.4");
 assert.doesNotMatch(read("../src/engine.js"),/director-finale-open|high-resolution-finale-art/);
 assert.doesNotMatch(read("../src/main.js"),/high-resolution-finale-art/);
});
