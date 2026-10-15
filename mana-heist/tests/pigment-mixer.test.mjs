import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {makeFluidGrid,fillDyeProportions,stirDye,advanceFluid} from "../src/fluid-ward.js";
import {pigmentStatistics} from "../src/pigment-mixer.js";
import {COLOR_RGB} from "../src/fluid-palette.js";

const mana=(colors)=>colors.map((color,i)=>({id:"mana-"+i,color}));
const stats=(grid)=>pigmentStatistics(grid);
function stirAcrossBoundary(grid,loops=16){
 for(let step=0;step<loops;step++){
  const direction=step%2?1:-1;
  for(let x=13;x<=49;x+=4){
   const pos=direction>0?x:62-x;
   const y=31.5+Math.sin(x*.33+step)*4;
   stirDye(grid,pos,y,direction*4,Math.cos(x*.33+step)*4);
   advanceFluid(grid);
  }
 }
}
test("single mana occupies the entire water surface with its own pure color",()=>{
 const grid=makeFluidGrid();
 fillDyeProportions(grid,mana(["R"]));
 const pigment=stats(grid);
 assert.ok(pigment.pixelCount>2600);
 assert.equal(pigment.blendedCells,0);
 assert.ok(Math.abs(pigment.ratio.R-1)<.00001);
 for(let i=0;i<grid.active.length;i++)if(grid.active[i]){
  assert.ok(Math.abs(grid.r[i]-COLOR_RGB.R[0])<.001);
  assert.ok(Math.abs(grid.b[i]-COLOR_RGB.R[2])<.001);
 }
});
test("red and blue genuinely blend into purple, without either being painted over",()=>{
 const grid=makeFluidGrid();
 fillDyeProportions(grid,mana(["R","U"]));
 const pristine=stats(grid);
 assert.equal(pristine.blendedCells,0);
 stirAcrossBoundary(grid,18);
 const stirred=stats(grid);
 assert.ok(stirred.blendedCells>140,"expected many physically mixed purple cells, found "+stirred.blendedCells);
 assert.ok(Math.abs(stirred.ratio.R-.5)<.035,"red fraction changed to "+stirred.ratio.R);
 assert.ok(Math.abs(stirred.ratio.U-.5)<.035,"blue fraction changed to "+stirred.ratio.U);
 const purpleCells=[];
 for(let i=0;i<grid.active.length;i++)if(grid.active[i]){
  const r=grid.pigments[3][i],b=grid.pigments[1][i];
  if(r>.25&&b>.25)purpleCells.push([grid.r[i],grid.g[i],grid.b[i]]);
 }
 assert.ok(purpleCells.length>80,"expect purple blends, not only moving pure-red/pure-blue patches");
 assert.ok(purpleCells.some(rgb=>rgb[0]>80&&rgb[2]>100),"mixed cells should contain both red and blue intensity");
});
test("a 2:1 red-to-blue ratio survives heavy stirring and never becomes only one color",()=>{
 const grid=makeFluidGrid();
 fillDyeProportions(grid,mana(["R","R","U"]));
 stirAcrossBoundary(grid,32);
 const mixed=stats(grid);
 assert.ok(Math.abs(mixed.ratio.R-2/3)<.035,"lost some red: "+mixed.ratio.R);
 assert.ok(Math.abs(mixed.ratio.U-1/3)<.035,"lost some blue: "+mixed.ratio.U);
 assert.ok(mixed.blendedCells>170,"stirring should yield many blended cells");
 const r=grid.r.reduce((sum,value,i)=>sum+(grid.active[i]?value:0),0)/mixed.pixelCount;
 const b=grid.b.reduce((sum,value,i)=>sum+(grid.active[i]?value:0),0)/mixed.pixelCount;
 const targetR=(COLOR_RGB.R[0]*2+COLOR_RGB.U[0])/3;
 const targetB=(COLOR_RGB.R[2]*2+COLOR_RGB.U[2])/3;
 assert.ok(Math.abs(r-targetR)<6,"global red hue should retain the weighted RGB average");
 assert.ok(Math.abs(b-targetB)<6,"global blue hue should retain the weighted RGB average");
});
test("mixing is independent of clicking, no extra API lookups, and mobile can still touch-drag",()=>{
 const script=readFileSync(new URL("../src/fluid-ward.js",import.meta.url),"utf8");
 const mixer=readFileSync(new URL("../src/pigment-mixer.js",import.meta.url),"utf8");
 assert.match(script,/canvas\.addEventListener\("pointermove"/);
 assert.match(script,/if\(hover\)\{/);
 assert.match(script,/if\(drag&&drag\.id===e\.pointerId\)/);
 assert.match(script,/mixPigments\(grid,dt\)/);
 assert.doesNotMatch(mixer,/\bfetch\s*\(/);
 assert.doesNotMatch(mixer,/XMLHttpRequest|WebSocket/);
});
