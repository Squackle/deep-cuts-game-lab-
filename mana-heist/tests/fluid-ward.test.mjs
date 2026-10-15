import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {COLOR_RGB,PRELOADED_MIX_COUNT,countsFor,rgbForCounts,rgbForOrbs} from "../src/fluid-palette.js";
import {makeFluidGrid,addDye,stirDye,advanceFluid,installFluidWard} from "../src/fluid-ward.js";
import {chargeAllocation,renderWardCharge} from "../src/ward-charge.js";

const orbs=colors=>colors.map((color,i)=>({id:i+1,color}));
test("thousands of mana RGB mixes preload immediately, with no network request",()=>{
 assert.equal(PRELOADED_MIX_COUNT,8008);
 assert.deepEqual(countsFor(orbs(["R","R","U"])),{W:0,U:1,B:0,R:2,G:0,C:0});
 assert.deepEqual(rgbForOrbs(orbs(["R","U"])),[
  Math.round((COLOR_RGB.R[0]+COLOR_RGB.U[0])/2),
  Math.round((COLOR_RGB.R[1]+COLOR_RGB.U[1])/2),
  Math.round((COLOR_RGB.R[2]+COLOR_RGB.U[2])/2)
 ]);
 const purple=rgbForOrbs(orbs(["R","U"])),moreRed=rgbForOrbs(orbs(["R","R","U"]));
 assert.ok(moreRed[0]>purple[0],"two red one blue must mix redder");
 assert.ok(moreRed[2]<purple[2],"more red should reduce blue weight");
 assert.deepEqual(rgbForCounts({R:0,U:0,G:0,B:0,C:0,W:0}),[45,78,91]);
 assert.deepEqual(rgbForCounts({R:1,U:1}),purple);
});
test("pigment is injected into the water interior, not fixed to the circular rim",()=>{
 const g=makeFluidGrid();
 assert.equal(g.mass.length,4096);
 addDye(g,"R",32,28);
 assert.ok(g.mass.reduce((a,b)=>a+b,0)>0);
 assert.equal(g.mass[0],0,"the pot exterior stays empty");
 const center=g.mass[32*64+28],edge=g.mass[32*64+61];
 assert.ok(center>edge,"water center is pigmented, outer rim is not");
 const startMass=g.mass.reduce((a,b)=>a+b,0);
 stirDye(g,32,28,7,3);
 assert.ok(g.vx.some(v=>v!==0));
 for(let n=0;n<7;n++)advanceFluid(g);
 assert.ok(g.mass.reduce((a,b)=>a+b,0)>startMass*.6,"dye remains in the water during mixing");
 assert.equal(g.mass[0],0);
 assert.ok(g.mass.every(Number.isFinite),"simulation must remain stable");
});
test("the ward shows liquid rather than old pie segments with Canvas support",()=>{
 const svg={innerHTML:"",attributes:{},setAttribute(k,v){this.attributes[k]=v},querySelector(){return null}},counter={textContent:""};
 const result=renderWardCharge({svg,count:counter,cost:{R:2,U:1},orbs:orbs(["R","U","R"]),fluid:true});
 assert.equal(result.charged.length,3);
 assert.equal(counter.textContent,"3 / 3");
 assert.match(svg.innerHTML,/ward-water-rim/);
 assert.doesNotMatch(svg.innerHTML,/ward-mana-sector/);
 assert.doesNotMatch(svg.innerHTML,/ward-charge-arc/);
 const base=renderWardCharge({svg,count:counter,cost:{R:2,U:1},orbs:orbs(["R","U","R"])});
 assert.equal(base.charged.length,3);
 assert.match(svg.innerHTML,/ward-mana-sector/,"Canvas-free fallback retains the prior valid rendering");
});
test("fluid controller works as an inert Canvas-free fallback",()=>{
 const fallback=installFluidWard({canvas:{getContext(){return null}},target:{}});
 assert.equal(fallback.available,false);
 assert.doesNotThrow(()=>{fallback.sync([]);fallback.pause();fallback.resume();fallback.clear();});
});
test("the game connects immediately injected dye to orb arrival and bounded optional stirring",()=>{
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 const js=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
 const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
 assert.match(html,/id="wardFluidCanvas"/);
 assert.match(js,/chargeWard\(\{animateId:pendingId\}\)/);
 assert.match(js,/fluid\.sync\(result\.charged/);
 assert.match(js,/PRELOADED_MIX_COUNT/);
 assert.match(js,/AUTO_STIR_MAX_MS=5100/);
 assert.match(js,/fluid\.isStirring\(\)/);
 assert.match(css,/\.lock-ring\.fluid-enabled \.ward-fluid-canvas/);
 assert.match(css,/touch-action:none/);
 assert.doesNotMatch(js,/id="castButton"/);
});
