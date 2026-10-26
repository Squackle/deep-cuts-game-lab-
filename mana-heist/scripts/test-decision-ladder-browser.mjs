#!/usr/bin/env node
// Real UI input against local files only; all external requests are blocked.
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readdirSync,readFileSync,mkdirSync} from "node:fs";
import {join,extname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright-core";
import {DECISION_LADDER} from "../src/decision-ladder.js";
import {initial,actions,reduce} from "../src/engine.js";
import {solve} from "../src/solver.js";
const root=fileURLToPath(new URL("../",import.meta.url));
const types={".html":"text/html",".js":"application/javascript",".css":"text/css",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".webp":"image/webp",".woff2":"font/woff2"};
// Snapshot known assets; HTTP request text is never used as a filesystem path.
const assets=new Map();
function collect(directory,url){
 for(const e of readdirSync(directory,{withFileTypes:true})){
  if(e.name.startsWith(".")||["node_modules","scripts","tests","release"].includes(e.name)||e.isSymbolicLink())continue;
  const path=join(directory,e.name),key=url+e.name;
  if(e.isDirectory())collect(path,key+"/");
  else if(types[extname(e.name)])assets.set(key,{body:readFileSync(path),type:types[extname(e.name)]});
 }
}
collect(root,"/mana-heist/");assets.set("/mana-heist/",assets.get("/mana-heist/index.html"));
const server=createServer((req,res)=>{
 if(req.method!=="GET")return res.writeHead(405).end();
 const asset=assets.get(new URL(req.url,"http://local").pathname);
 if(!asset)return res.writeHead(404).end();
 res.writeHead(200,{"Content-Type":asset.type,"X-Content-Type-Options":"nosniff"}).end(asset.body);
});
await new Promise(r=>server.listen(0,"127.0.0.1",r));
const base="http://127.0.0.1:"+server.address().port;
const routes=DECISION_LADDER.map(level=>{
 const proof=solve(level,{maxStates:65000});assert.equal(proof.status,"solved");return proof.actions;
});
let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{}),args:["--no-sandbox","--disable-dev-shm-usage"]});
 for(const [width,height] of [[320,568],[375,667],[390,844],[1280,900]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:"reduce"});
  await context.route("**/*",r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  const page=await context.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(base+"/mana-heist/");
  await page.locator('[data-mode="learn"]').click();
  const saves=()=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k!=="dc-mana-heist-mode-v1").map(k=>[k,localStorage.getItem(k)])));
  const before=await saves();
  for(let i=0;i<DECISION_LADDER.length;i++){
   const level=DECISION_LADDER[i];
   if(i===0)await page.locator('[data-decision-index="0"]').click();
   assert.equal(await page.locator("#vaultName").textContent(),level.title);
   assert.equal(await page.locator("#masteryRating").isVisible(),false,"no uncalibrated numeric rating");
   await page.locator("#toggleGuide").click();
   assert.equal(await page.locator("#decisionPlan").isVisible(),true);
   assert.equal(await page.locator("#decisionPlan p").count(),level.stages.length);
   for(const [j,stage] of level.stages.entries())assert.equal(await page.locator("#decisionPlan p").nth(j).locator(".mana-glyph").count(),Object.values(stage.cost).reduce((a,b)=>a+b,0));
   await page.locator("#returnFromGuide").click();
   // Measure the title text, not its intentionally full-width centering box.
   const title=await page.locator("#vaultName").evaluate(node=>{
    const range=document.createRange();range.selectNodeContents(node);return range.getBoundingClientRect().toJSON();
   });
   for(const id of ["endTurn","undo","reset"]){
    const control=await page.locator("#"+id).boundingBox();
    assert.ok(!title||!control||Math.min(title.x+title.width,control.x+control.width)<=Math.max(title.x,control.x)||Math.min(title.y+title.height,control.y+control.height)<=Math.max(title.y,control.y),"title overlaps "+id);
   }
   for(const label of await page.locator("#heist .stats>div:nth-child(-n+2) small").all())assert.equal(await label.isVisible(),true);
   if(process.env.SCREENSHOT_DIR){mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:resolve(process.env.SCREENSHOT_DIR,`${level.id}-${width}.png`)});}
   let state=initial(level);
   // Test recovery with real controls, then solve via UI (no private game hooks).
   const first=routes[i][0];
   async function input(move){
    const possible=actions(level,state);
    if(move.type==="cast"){
     await page.waitForFunction(()=>!document.querySelector("#castButton").disabled);
     await page.locator("#castButton").click({timeout:5000}).catch(async error=>{
      console.error(await page.evaluate(()=>{
       const b=document.querySelector("#castButton"),r=b.getBoundingClientRect(),at=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
       return {body:document.body.className,button:r.toJSON(),over:at?.outerHTML,ancestors:[b,document.querySelector(".vault-stage"),document.querySelector(".vault-card"),document.querySelector(".hand-card")].map(e=>({name:e.className,z:getComputedStyle(e).zIndex,position:getComputedStyle(e).position,transform:getComputedStyle(e).transform}))};
      }));throw error;
     });
    }else if(move.type==="end")await page.locator("#endTurn").click();
    else{
     const candidates=possible.filter(a=>move.type==="play"?a.type==="play"&&a.id===move.id:["tap","activate","fetch"].includes(a.type)&&a.id===move.id);
     await page.locator(`[data-zone="${move.type==="play"?"hand":"field"}"][data-cardid="${move.id}"]`).press("Enter");
     if(candidates.length>1){
      const choice=candidates.findIndex(a=>JSON.stringify(a)===JSON.stringify(move));assert.ok(choice>=0);
      await page.locator(`[data-choice="${choice}"]`).click();
     }
    }
    const next=reduce(level,state,move);assert.ok(next.ok,next.error);state=next.state;
    assert.equal(await page.locator("#lifeTotal").textContent(),String(state.life));
    assert.equal(await page.locator("#turnNumber").textContent(),state.turn+" / "+level.turnLimit);
    assert.equal(await page.locator("#wardCounter").textContent(),state.stage===level.stages.length?"VAULT OPEN":"WARD "+(state.stage+1)+" OF "+level.stages.length);
   }
   await input(first);await page.locator("#undo").click();state=initial(level);
   assert.equal(await page.locator("#undo").isDisabled(),true);
   await input(first);await page.locator("#reset").click();state=initial(level);
   assert.equal(await page.locator("#vaultName").textContent(),level.title);
   for(const move of routes[i])await input(move);
   assert.equal(await page.locator("#winTitle").textContent(),"DECISION VAULT OPEN");
   assert.equal(await page.locator("#winCopy").textContent(),level.decision.why);
   assert.deepEqual(await saves(),before,"practice must not change campaign, lessons or bonus saves");
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"horizontal page overflow");
   await page.locator("#winNext").click();
   console.log(`PASS ${level.id} ${width}x${height}: UI replay, costs, undo, restart, save isolation, next`);
  }
  assert.equal(await page.locator("#campaignScreen").isVisible(),true);
  await page.locator('[data-learn-level="0"]').click();
  assert.ok((await page.locator("#stageLabel").textContent()).startsWith("LEARN"));
  await page.locator("#returnMap").click();
  await page.locator('[data-trial-index="0"]').click();
  assert.ok((await page.locator("#stageLabel").textContent()).startsWith("BONUS"));
  await page.locator("#returnMap").click();
  await page.locator('[data-mode="heist"]').click();await page.locator('[data-galaxy="0"]').click();await page.locator('[data-level="0"]').click();
  assert.equal(await page.locator("#vaultName").textContent(),"First Charge");
  await page.locator('#battlefield [data-cardid]').first().press("Enter");
  await page.waitForFunction(()=>!document.querySelector("#castButton").disabled);
  await page.locator("#castButton").click();await page.locator("#winPanel").waitFor();
  assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem("dc-mana-heist-landfall-v2")).bests["mh-01"]));
  assert.deepEqual(errors,[]);
  await context.close();
 }
}finally{await browser?.close();await new Promise(r=>server.close(r));}
