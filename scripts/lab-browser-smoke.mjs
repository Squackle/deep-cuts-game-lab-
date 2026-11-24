// Shared navigation QA only. Local static server; never contacts production or game APIs.
import assert from "node:assert/strict";
import {test,before,after} from "node:test";
import {createServer} from "node:http";
import {createReadStream} from "node:fs";
import {stat,realpath,mkdir,writeFile} from "node:fs/promises";
import {resolve,extname,sep,join} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";

const root=await realpath(fileURLToPath(new URL("../",import.meta.url)));
const routes=[
 ["/hive-run/","Hive Run","Game Lab | Hive Run"],
 ["/stackbreaker/","Stackbreaker","Game Lab | Stackbreaker"],
 ["/mana-heist/","Mana Heist","Game Lab | Mana Heist"],
 ["/graftbound/","GRAFTBOUND","GRAFTBOUND"],
 ["/archemancy/","ARCHEMANCY","ARCHEMANCY | Deep Cuts Game Lab"]
];
const types={".html":"text/html; charset=utf-8",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".svg":"image/svg+xml",".json":"application/json",".png":"image/png",".webp":"image/webp",".jpg":"image/jpeg",".jpeg":"image/jpeg",".avif":"image/avif",".woff2":"font/woff2",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
const inside=p=>p.startsWith(root+sep);
let server,browser,origin;
const artifactDir=process.env.LAB_SMOKE_ARTIFACT_DIR?resolve(process.env.LAB_SMOKE_ARTIFACT_DIR):null;
const captured=[];
async function capture(page,label,failed=false){
 if(!artifactDir)return;
 const filename=label+(failed?"-failure":"")+".png";
 try{
  await mkdir(artifactDir,{recursive:true});
  if(!failed)await page.waitForLoadState("load",{timeout:10000});
  await page.screenshot({path:join(artifactDir,filename),animations:"disabled",caret:"hide",scale:"css",timeout:10000});
  captured.push({file:filename,viewport:page.viewportSize(),route:new URL(page.url()).pathname,failed});
 }catch(e){if(!failed)throw e;console.warn("Failure screenshot unavailable:",e.name);}
}

before(async()=>{
 const module=process.env.PLAYWRIGHT_MODULE;
 assert.ok(module,"Set PLAYWRIGHT_MODULE to the pinned playwright-core entry file");
 const {chromium}=await import(pathToFileURL(module).href);
 server=createServer(async(req,res)=>{
  try{
   if(!["GET","HEAD"].includes(req.method)){res.writeHead(405).end();return;}
   const path=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
   if(path.startsWith("/api/")){res.writeHead(503).end();return;}
   let file=resolve(root,"."+path);
   if(file===root||path.endsWith("/"))file=resolve(file,"index.html");
   if(!inside(file)){res.writeHead(403).end();return;}
   file=await realpath(file);
   if(!inside(file)){res.writeHead(403).end();return;}
   const info=await stat(file);
   if(!info.isFile()){res.writeHead(404).end();return;}
   res.writeHead(200,{"Content-Type":types[extname(file)]||"application/octet-stream","Content-Length":info.size});
   if(req.method==="HEAD"){res.end();return;}
   createReadStream(file).on("error",()=>res.destroy()).pipe(res);
  }catch{res.writeHead(404).end();}
 });
 await new Promise((ok,fail)=>{server.once("error",fail);server.listen(0,"127.0.0.1",ok);});
 origin="http://127.0.0.1:"+server.address().port;
 browser=await chromium.launch({headless:true});
});
after(async()=>{
 try{if(artifactDir){await mkdir(artifactDir,{recursive:true});await writeFile(join(artifactDir,"manifest.json"),JSON.stringify({revision:process.env.LAB_SMOKE_SHA??"local-unverified",mode:"local-only",screenshots:captured},null,2)+"\n");}}
 finally{try{await browser?.close();}finally{if(server)await new Promise(ok=>server.close(ok));}}
});
async function contextFor(viewport,mobile){
 const c=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,serviceWorkers:"block",reducedMotion:"reduce",locale:"en-US",timezoneId:"UTC"});
 await c.routeWebSocket("**/*",ws=>ws.close());
 await c.route("**/*",async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin!==origin){await route.abort();return;}
  if(url.pathname==="/api/lab-presence"){await route.fulfill({json:{online:0,ok:true}});return;}
  if(url.pathname.startsWith("/api/")||!["GET","HEAD"].includes(req.method())){await route.fulfill({status:503,json:{error:"offline fixture"}});return;}
  await route.continue();
 });
 return c;
}
async function catalog(page,path){
 const errors=[];
 const onError=e=>errors.push(e.name+": "+e.message);
 page.on("pageerror",onError);
 try{
  const response=await page.goto(origin+path,{waitUntil:"load",timeout:30000});
  assert.equal(response?.status(),200,path+" status");
  assert.equal(await page.title(),"Game Lab | Deep Cuts EDH");
  assert.equal(await page.getByRole("navigation",{name:"Playtest games"}).getByRole("link").count(),5);
  for(const [href,name] of routes){
   const tile=page.getByRole("link",{name:"Playtest "+name,exact:true});
   assert.equal(await tile.getAttribute("href"),href);
   assert.ok(await tile.isVisible(),name+" tile visible");
  }
  await page.waitForFunction(()=>[...document.querySelectorAll(".game-cover")].length===5&&[...document.querySelectorAll(".game-cover")].every(img=>img.complete&&img.naturalWidth>0),{},{timeout:10000});
  const dimensions=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(dimensions.scroll<=dimensions.width+2,path+" horizontal overflow: "+JSON.stringify(dimensions));
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(()=>document.activeElement?.textContent?.trim()),"Skip to games","keyboard skip link");
  assert.deepEqual(errors,[],path+" catalog JavaScript exceptions");
 }finally{page.off("pageerror",onError);}
}
for(const [name,viewport,mobile] of [["desktop",{width:1280,height:800},false],["mobile",{width:390,height:844},true]]){
 test(name+" catalog: covers, accessible tiles, keyboard and layout",async()=>{
  const c=await contextFor(viewport,mobile);
  const p=await c.newPage();let label=name+"-catalog-root";
  try{await catalog(p,"/");await capture(p,label);label=name+"-catalog-legacy";await catalog(p,"/lab/");await capture(p,label);}
  catch(e){await capture(p,label,true);throw e;}
  finally{await c.close();}
 });
 test(name+" clicks every catalog tile and loads actual game entry scripts",async()=>{
  const c=await contextFor(viewport,mobile);
  const p=await c.newPage();let label=name+"-entry";
  try{
   for(const [href,game,title] of routes){
    label=name+"-"+href.replace(/[^a-z0-9-]/gi,"");
    await p.goto(origin+"/",{waitUntil:"domcontentloaded",timeout:30000});
    const navigation=p.waitForURL(origin+href,{waitUntil:"domcontentloaded",timeout:30000});
    await p.getByRole("link",{name:"Playtest "+game,exact:true}).click();
    await navigation;
    assert.ok((await p.title()).includes(title),game+" wrong destination identity");
    const scripts=await p.locator("script[src]").evaluateAll(nodes=>nodes.map(n=>n.src));
    const entries=scripts.filter(s=>new URL(s).origin===origin&&!new URL(s).pathname.startsWith("/lab/"));
    if(game==="Stackbreaker"){
     // The classic entry deliberately embeds its generated engine and daily manifest.
     assert.ok(await p.locator("script:not([src])").evaluateAll(nodes=>nodes.some(n=>n.textContent.includes("dailyManifest"))),game+" missing inline engine");
    }else assert.ok(entries.length>0,game+" no first-party entry script");
    for(const script of entries){
     const result=await fetch(script,{method:"HEAD",redirect:"error",signal:AbortSignal.timeout(10000)});
     assert.equal(result.status,200,game+" missing entry script "+new URL(script).pathname);
     assert.match(result.headers.get("content-type")||"",/javascript/,game+" invalid entry MIME");
    }
    await capture(p,label);
    console.log(name+" PASS "+game+" "+href+" ("+entries.length+" entry scripts)");
   }
  }catch(e){await capture(p,label,true);throw e;}
  finally{await c.close();}
 });
}
