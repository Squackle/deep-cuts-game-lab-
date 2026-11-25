// Actual local Chromium DOM/input smoke. No dependencies, remote APIs, or injected game state.
import test from "node:test";
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {spawn,spawnSync} from "node:child_process";
import {mkdtemp,readFile,realpath,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {resolve,join,sep,extname} from "node:path";
import {fileURLToPath} from "node:url";
import {setTimeout as sleep} from "node:timers/promises";
const root=await realpath(fileURLToPath(new URL("../",import.meta.url)));
const chrome=[process.env.HIVE_CHROME,"google-chrome","chromium","chromium-browser"].filter(Boolean).find(bin=>spawnSync(bin,["--version"],{timeout:5000,stdio:"ignore"}).status===0);
const required=process.env.GITHUB_ACTIONS==="true"||!!process.env.HIVE_CHROME;
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml",".png":"image/png",".avif":"image/avif",".webp":"image/webp"};
async function until(check,label,ms=12000){
 const end=Date.now()+ms;
 while(Date.now()<end){const result=await check();if(result)return result;await sleep(40)}
 throw Error("Timed out: "+label);
}
test("Chromium desktop and emulated touch Hive acceptance",{timeout:60000,skip:!chrome&&!required},async t=>{
 assert.ok(chrome,"Chromium is required in CI; HIVE_CHROME may specify the executable");
 const profile=await mkdtemp(join(tmpdir(),"hive-acceptance-"));
 const server=createServer(async(req,res)=>{
  try{
   const path=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
   if(path==="/api/lab-presence"){res.writeHead(200,{"Content-Type":"application/json"}).end('{"online":0,"ok":true}');return}
   if(req.method!=="GET"||path.startsWith("/api/")){res.writeHead(503).end();return}
   const file=await realpath(resolve(root,"."+path+(path.endsWith("/")?"index.html":"")));
   if(!file.startsWith(root+sep)){res.writeHead(403).end();return}
   res.writeHead(200,{"Content-Type":mime[extname(file)]||"application/octet-stream"}).end(await readFile(file));
  }catch{if(!res.headersSent)res.writeHead(404);res.end()}
 });
 let browser,socket;
 try{
  await new Promise((ok,fail)=>{server.once("error",fail);server.listen(0,"127.0.0.1",ok)});
  const origin="http://127.0.0.1:"+server.address().port;
  browser=spawn(chrome,["--headless","--no-sandbox","--disable-dev-shm-usage","--disable-background-networking","--no-first-run","--no-proxy-server","--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1","--remote-debugging-port=0","--user-data-dir="+profile,"about:blank"],{stdio:"ignore"});
  const port=await until(async()=>{try{return (await readFile(join(profile,"DevToolsActivePort"),"utf8")).split("\n")[0]}catch{return false}},"Chrome debugger");
  const targets=await (await fetch("http://127.0.0.1:"+port+"/json/list")).json();
  socket=new WebSocket(targets.find(x=>x.type==="page").webSocketDebuggerUrl);
  await new Promise((ok,fail)=>{socket.addEventListener("open",ok,{once:true});socket.addEventListener("error",fail,{once:true})});
  let id=0;const pending=new Map(),errors=[];
  socket.addEventListener("message",event=>{
   const msg=JSON.parse(event.data);
   if(msg.method==="Runtime.exceptionThrown")errors.push(msg.params.exceptionDetails.exception?.description||msg.params.exceptionDetails.text);
   const p=pending.get(msg.id);if(p){pending.delete(msg.id);clearTimeout(p.timer);msg.error?p.reject(Error(msg.error.message)):p.resolve(msg.result)}
  });
  const call=(method,params={})=>new Promise((resolve,reject)=>{
   const n=++id,timer=setTimeout(()=>{pending.delete(n);reject(Error("CDP timeout "+method))},10000);
   pending.set(n,{resolve,reject,timer});socket.send(JSON.stringify({id:n,method,params}));
  });
  const ev=async expression=>{
   const x=await call("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
   if(x.exceptionDetails)throw Error(x.exceptionDetails.exception?.description||x.exceptionDetails.text);
   return x.result.value;
  };
  const wait=(expr,label,ms)=>until(()=>ev(expr),label,ms);
  const dom=id=>"document.getElementById("+JSON.stringify(id)+")";
  const visible=id=>"!"+dom(id)+".hidden";
  const select=(id,value)=>ev("(()=>{const e="+dom(id)+";e.value="+JSON.stringify(value)+";e.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
  const box=selector=>ev("(()=>{const e=document.querySelector("+JSON.stringify(selector)+");e.scrollIntoView({block:'center',inline:'center',behavior:'instant'});const b=e.getBoundingClientRect(),x=b.x+b.width/2,y=b.y+b.height/2,hit=document.elementFromPoint(x,y);return {x,y,h:b.height,hit:hit?.id||hit?.tagName,reachable:!!hit&&e.contains(hit),disabled:!!e.disabled}})()");
  const touch=(type,points)=>call("Input.dispatchTouchEvent",{type,touchPoints:points});
  const click=async(selector,mobile=false)=>{
   const target=await box(selector),{x,y}=target;
   assert.ok(target.reachable&&!target.disabled,"unreachable control "+selector+" "+JSON.stringify(target));
   if(mobile){await touch("touchStart",[{x,y}]);await sleep(80);await touch("touchEnd",[])}
   else{await call("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",clickCount:1});await call("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",clickCount:1})}
  };
  const key=async(key,code,n)=>{
   const params={key,code,windowsVirtualKeyCode:n,nativeVirtualKeyCode:n};
   // Enter needs the native character event as well as keydown for button activation.
   await call("Input.dispatchKeyEvent",key==="Enter"?{...params,type:"keyDown",text:"\r",unmodifiedText:"\r"}:{...params,type:"rawKeyDown"});
   await call("Input.dispatchKeyEvent",{...params,type:"keyUp"});
  };
  await call("Page.enable");await call("Runtime.enable");
  // Test-only frame hold excludes runner delay while navigating live controls.
  // Real input, rendering, audio and simulation remain the actual game modules.
  await call("Page.addScriptToEvaluateOnNewDocument",{source:`
   window.__hiveHoldFrames=false;
   window.__hiveInputEvidence=[];
   const raf=window.requestAnimationFrame.bind(window);
   window.requestAnimationFrame=callback=>raf(function frame(time){
    if(window.__hiveHoldFrames){raf(frame);return}
    callback(time);
   });
   for(const type of ["pointerdown","pointermove","pointerup","pointercancel","click"]){
    document.addEventListener(type,event=>{
     const history=window.__hiveInputEvidence;
     history.push({type,id:event.target?.id||event.target?.tagName,pointer:event.pointerType,
      x:Math.round(event.clientX||0),y:Math.round(event.clientY||0),status:document.getElementById("stateLabel")?.textContent});
     if(history.length>40)history.shift();
    },true);
   }
  `});
  for(const mobile of [false,true]){
   await call("Emulation.setDeviceMetricsOverride",{width:mobile?390:1280,height:mobile?844:800,deviceScaleFactor:1,mobile});
   await call("Emulation.setTouchEmulationEnabled",{enabled:mobile,maxTouchPoints:mobile?2:1});
   await call("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:mobile?"reduce":"no-preference"}]});
   await call("Page.navigate",{url:origin+"/hive-run/"});
   await wait("document.readyState==='complete'&&document.getElementById('primaryButton')?.textContent.includes('START')","game initialization");
   assert.equal(await ev("matchMedia('(prefers-reduced-motion: reduce)').matches"),mobile);
   assert.ok(await ev("document.documentElement.scrollWidth<=document.documentElement.clientWidth+2"),"no horizontal overflow");
   if(mobile)await ev(dom("game")+".requestFullscreen=()=>Promise.reject(new Error('unsupported'))");
   await click("#fullscreenButton",mobile);
   await wait(dom("fullscreenButton")+".getAttribute('aria-pressed')==='true'","fullscreen entered");
   assert.equal(await ev("document.documentElement.classList.contains('game-only')"),true);
   t.diagnostic((mobile?"mobile CSS fallback":"desktop native active="+await ev("document.fullscreenElement===document.getElementById('game')")));
   await click("#fullscreenButton",mobile);
   await wait(dom("fullscreenButton")+".getAttribute('aria-pressed')==='false'&&!document.fullscreenElement","fullscreen exited");
   assert.equal(await ev("document.documentElement.classList.contains('game-only')"),false);
   await click("#soundButton",mobile);assert.equal(await ev(dom("soundButton")+".getAttribute('aria-pressed')"),"true");
   await click("#musicButton",mobile);assert.equal(await ev(dom("musicButton")+".getAttribute('aria-pressed')"),"true");
   await click("#musicButton",mobile);await click("#soundButton",mobile);
   assert.equal(await ev(dom("soundStatus")+".textContent"),"AUDIO OFF");
   await select("gameMode","hunt");await select("gameChallenge","practice");
   for(const boss of mobile?["broodmother"]:["stalker","warden","weaver","guardian","broodmother"]){
    await click('[data-lair-boss="'+boss+'"]',mobile);await click("#primaryButton",mobile);
    await wait(visible("bossBriefing"),boss+" dossier");
    assert.equal(await ev("document.activeElement.id"),"bossBriefingResume",boss+" initial dialog focus");
    assert.ok(await ev(dom("bossBriefingMechanics")+".children.length>=3"));
    assert.match(await ev(dom("rankedNotice")+".textContent"),/UNRANKED/);
    if(boss==="stalker"||mobile){
     if(mobile)await click("#bossBriefingResume",true);
     else{
      await key("Tab","Tab",9);assert.equal(await ev("document.activeElement.id"),"bossBriefingResume");
      await key("Enter","Enter",13);
     }
     await wait(visible("bossCountdown"),"input starts regroup");
     await wait(dom("bossCountdown")+".hidden&&"+dom("stateLabel")+".textContent==='IN MOTION'","regroup completes",8000);
     assert.equal(await ev("document.activeElement.id"),"gameCanvas");
     assert.equal(await ev(dom("abilityPanel")+".hidden"),false);
    }
    await click("#restartButton",mobile);await wait(visible("gameOverlay"),"practice reset");
   }
   await select("gameMode","classic");
   assert.equal(await ev(dom("gameChallenge")+".hidden"),true);
   await ev("window.__hiveHoldFrames=true");
   await click("#primaryButton",mobile);await wait(dom("stateLabel")+".textContent==='IN MOTION'","Classic starts");
   // Initial Classic head (9,11), accepted up turn marker center (9,10).
   const marker="Array.from(document.getElementById('gameCanvas').getContext('2d').getImageData(189,209,1,1).data)";
   assert.notDeepEqual(await ev(marker),[255,226,160,255],"no queued turn before input");
   try{
    if(mobile){
     const {x,y,h,reachable}=await box("#gameCanvas"),scroll=await ev("scrollY");
     assert.ok(reachable,"arena receives actual touch");
     // Chromium raw dispatchTouchEvent move/end can suppress the next tap even
    // on a standalone canvas/button fixture. Use its complete native touch
    // gesture sequence; real pointer movement and the canvas marker remain required.
    await call("Input.synthesizeScrollGesture",{x,y,yDistance:-Math.min(55,h/4),speed:400,gestureSourceType:"touch",preventFling:true});
     assert.equal(await ev("scrollY"),scroll,"swipe does not scroll document");
    }else await key("ArrowUp","ArrowUp",38);
    assert.deepEqual(await ev(marker),[255,226,160,255],"actual input painted queued up turn");
    if(mobile){await sleep(100);await click("#pauseButton",true)}
    else await key("Escape","Escape",27);
    await wait(dom("stateLabel")+".textContent==='PAUSED'","pause accepted",4000);
   }catch(error){
    t.diagnostic(JSON.stringify(await ev("({status:document.getElementById('stateLabel').textContent,description:document.getElementById('overlayDescription').textContent,scroll:scrollY,events:window.__hiveInputEvidence.slice(-24)})")));
    throw error;
   }finally{await ev("window.__hiveHoldFrames=false")}
   await click("#restartButton",mobile);await wait(visible("gameOverlay"),"Classic reset");
   t.diagnostic((mobile?"mobile 390×844 touch/reduced-motion":"desktop 1280×800 keyboard")+" PASS");
  }
  assert.deepEqual(errors,[],"uncaught browser exceptions");
 }finally{
  socket?.close();
  if(browser&&browser.exitCode===null){browser.kill();await Promise.race([new Promise(ok=>browser.once("exit",ok)),sleep(2000)])}
  if(server.listening){server.closeAllConnections();await new Promise(ok=>server.close(ok))}
  await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100});
 }
});
