import test from "node:test";
import assert from "node:assert/strict";
import {APPROVED_ART,drawApprovedCreature} from "../src/approved-creature-art.js";
import {HIGH_VISIBILITY_BOSSES,drawMiniboss,drawAbilityMeter} from "../src/boss-art.js";
import {drawTerrain} from "../src/environments.js";
import {RULES_VERSION} from "../src/engine.js";
function luminance(hex){
 const bytes=hex.match(/[0-9a-f]{2}/ig).map(n=>parseInt(n,16)/255);
 const linear=bytes.map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
 return .2126*linear[0]+.7152*linear[1]+.0722*linear[2];
}
function canvasMock(){
 const fills=[],strokes=[],colors=[];
 let fill="#000",stroke="#000";
 const ctx={
  save(){},restore(){},fillRect(...args){fills.push({args,color:fill})},
  strokeRect(...args){strokes.push({args,color:stroke})},
  set fillStyle(v){fill=v;colors.push(v)},get fillStyle(){return fill},
  set strokeStyle(v){stroke=v;colors.push(v)},get strokeStyle(){return stroke},
  set imageSmoothingEnabled(v){},set lineWidth(v){},
  clearRect(){},setLineDash(){},
 };
 return {ctx,fills,strokes,colors};
}
test("The two previously dark boss palettes now contain multiple legible highlight shades",()=>{
 for(const kind of ["guardian","broodmother"]){
  const palette=APPROVED_ART[kind].palette;
  const highlights=Object.values(palette).filter(hex=>luminance(hex)>.44);
  assert.ok(highlights.length>=2,kind+" needs pale highlights as well as shadow colors");
  assert.ok(Object.values(palette).some(hex=>luminance(hex)>.67),kind+" needs a bright anchor");
  assert.ok(APPROVED_ART[kind].rows.every(row=>row.length===26));
 }
 assert.ok(!HIGH_VISIBILITY_BOSSES.stalker,"only hard-to-see boss artwork gets extra emphasis");
});
test("Guardian and Broodmother gain larger sprites and ground locators behind their art",()=>{
 for(const kind of ["guardian","broodmother"]){
  const {ctx,fills,strokes,colors}=canvasMock();
  drawMiniboss(ctx,[{kind,pos:{x:5,y:6}}],20,2);
  const h=HIGH_VISIBILITY_BOSSES[kind];
  assert.ok(strokes.some(s=>s.color===h.locator&&s.args[0]===101.5&&s.args[1]===121.5),
   kind+" should have a high-contrast ground locator at the real collision tile");
  assert.ok(fills.some(s=>s.color===h.locator&&s.args[2]===4&&s.args[3]===3),
   "tiny guide above creature remains visible on patterned backgrounds");
  assert.ok(fills.length>100,"36px approved creature sprite is fully drawn");
  assert.ok(colors.includes(h.locator));
 }
 const other=canvasMock();
 drawMiniboss(other.ctx,[{kind:"stalker",pos:{x:5,y:6}}],20,1);
 assert.equal(other.strokes.length,0,"existing bosses don't acquire bright locator rings");
});
test("Readable boss ability meters preserve center alignment and use distinct colors",()=>{
 for(const kind of ["guardian","broodmother"]){
  const {ctx,colors,fills}=canvasMock();
  const canvas={width:64,height:64,getContext:()=>ctx};
  drawAbilityMeter(canvas,kind,.5);
  assert.ok(colors.includes(HIGH_VISIBILITY_BOSSES[kind].ring));
  assert.ok(colors.includes(HIGH_VISIBILITY_BOSSES[kind].background));
  assert.ok(fills.length>150);
 }
});
test("Rift and egg warnings are unmistakable without changing hazard collision rules",()=>{
 for(const [kind,expected]of [["rift","#f3d6ff"],["egg","#fff0c0"]]){
  const {ctx,colors}=canvasMock();
  drawTerrain(ctx,{terrain:[{kind,pos:{x:7,y:9},warningMs:400,lifeMs:2500}]},20);
  assert.ok(colors.includes(expected),kind+" should have a bright telegraphed accent");
 }
 assert.equal(RULES_VERSION,"hive-1.5.2","visibility pass changes no deterministic gameplay");
});
