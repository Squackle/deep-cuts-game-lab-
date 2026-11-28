import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createGameOnlyMode} from "../src/game-only.js";

class Receiver {
 constructor(){this.listeners=new Map()}
 addEventListener(type,fn){const all=this.listeners.get(type)||[];all.push(fn);this.listeners.set(type,all)}
 removeEventListener(type,fn){this.listeners.set(type,(this.listeners.get(type)||[]).filter(f=>f!==fn))}
 emit(type,ev={}){for(const fn of this.listeners.get(type)||[])fn(ev)}
}
class Classes {
 set=new Set();
 add(k){this.set.add(k)}remove(k){this.set.delete(k)}contains(k){return this.set.has(k)}
}
function fakeDOM({native=false}={}){
 const doc=new Receiver(),win=new Receiver(),button=new Receiver(),root={};
 const props=new Map;
 doc.body={classList:new Classes()};
 doc.documentElement={classList:new Classes(),style:{setProperty:(k,v)=>props.set(k,v),removeProperty:k=>props.delete(k)}};
 doc.fullscreenElement=null;
 doc.exitFullscreen=async()=>{doc.fullscreenElement=null;doc.emit("fullscreenchange")};
 win.innerHeight=700;win.scrollY=249;
 win.scrollTo=options=>{win.lastScroll=options};
 win.visualViewport=new Receiver();win.visualViewport.height=690;
 button.setAttribute=(k,v)=>{button[k]=v};
 if(native)root.requestFullscreen=async()=>{doc.fullscreenElement=root;doc.emit("fullscreenchange")};
 return {doc,win,button,root,props,controller:createGameOnlyMode({doc,win,button,root})};
}
test("game-only fallback locks body, viewport and touch scrolling without native fullscreen",async()=>{
 const f=fakeDOM(),{controller:c,doc,button,win,props}=f;
 assert.equal(c.isActive(),false);
 assert.match(button.textContent,/GAME ONLY/);
 await c.enter();
 assert.equal(c.isActive(),true);
 assert.equal(doc.body.classList.contains("game-only"),true);
 assert.equal(doc.documentElement.classList.contains("game-only"),true);
 assert.equal(props.get("--game-only-height"),"690px");
 assert.equal(button["aria-pressed"],"true");
 let prevented=0;
 doc.emit("touchmove",{cancelable:true,target:{closest:()=>null},preventDefault:()=>prevented++});
 assert.equal(prevented,1,"touch gesture on arena must not scroll the document");
 doc.emit("touchmove",{cancelable:true,target:{closest:()=>({})},preventDefault:()=>prevented++});
 assert.equal(prevented,1,"mutation card dialog should scroll locally on short phones");
 win.visualViewport.height=650;win.visualViewport.emit("resize");
 assert.equal(props.get("--game-only-height"),"650px");
 assert.equal(c.leave(),true);
 assert.equal(doc.body.classList.contains("game-only"),false);
 assert.equal(props.has("--game-only-height"),false);
 assert.equal(button["aria-pressed"],"false");
 assert.equal(win.lastScroll.top,249);
 doc.emit("touchmove",{cancelable:true,target:{closest:()=>null},preventDefault:()=>prevented++});
 assert.equal(prevented,1,"exit must remove scroll-interception handler");
});
test("button toggles focus mode and Escape exits without triggering gameplay pause",()=>{
 const {controller:c,doc,button}=fakeDOM();
 button.emit("click");
 assert.equal(c.isActive(),true);
 let stopped=false,prevented=false;
 doc.emit("keydown",{key:"Escape",preventDefault:()=>prevented=true,stopImmediatePropagation:()=>stopped=true});
 assert.equal(c.isActive(),false);
 assert.equal(stopped,true);
 assert.equal(prevented,true);
 button.emit("click");
 assert.equal(c.isActive(),true);
 button.emit("click");
 assert.equal(c.isActive(),false);
});
test("browser-owned native fullscreen dismissal restores page mode",async()=>{
 const {controller:c,doc,root}=fakeDOM({native:true});
 await c.enter();
 assert.equal(doc.fullscreenElement,root);
 assert.equal(c.isActive(),true);
 doc.fullscreenElement=null;doc.emit("fullscreenchange");
 assert.equal(c.isActive(),false);
});
test("game-only HTML/CSS retain streamlined solo gameplay and touch safeguards",()=>{
 const html=readFileSync(new URL("../hive-run/index.html",import.meta.url),"utf8");
 const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
 const js=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
 for(const id of ["fullscreenButton","gameCanvas","gameOverlay","mutationOverlay","pauseButton","restartButton","musicButton","patchNotesTitle","fieldGuide","devDiagnostics"]){
  assert.match(html,new RegExp("id=\\\""+id+"\\\""),id);
 }
 assert.match(css,/body\.game-only \.arcade-frame/);
 assert.match(css,/body\.game-only \.arena/);
 assert.match(css,/touch-action:none/);
 assert.match(js,/createGameOnlyMode/);
 assert.match(js,/handleDirection/);
});


test("a delayed native fullscreen request cannot reopen Game Only after exit",async()=>{
 const {controller:c,doc,root,button}=fakeDOM();
 let resolveRequest;
 root.requestFullscreen=()=>new Promise(resolve=>{resolveRequest=()=>{
  doc.fullscreenElement=root;doc.emit("fullscreenchange");resolve();
 }});
 const entering=c.enter();
 assert.equal(c.isActive(),true);
 c.leave();resolveRequest();
 assert.equal(await entering,false);
 assert.equal(doc.fullscreenElement,null);
 assert.equal(c.isActive(),false);
 assert.equal(button["aria-pressed"],"false");
 assert.equal(doc.body.classList.contains("game-only"),false);
});


test("Game Only leaves Escape handling to the visible victory dialog",async()=>{
 const {controller:c,doc,root}=fakeDOM();
 root.querySelector=selector=>selector==="#victoryOverlay:not([hidden])"?{}:null;
 await c.enter();
 let prevented=false,stopped=false;
 doc.emit("keydown",{key:"Escape",preventDefault:()=>prevented=true,stopImmediatePropagation:()=>stopped=true});
 assert.equal(c.isActive(),true);
 assert.equal(prevented,false);assert.equal(stopped,false);
});
test("earned victory dialog is inside native fullscreen root, and hidden arena paint is skipped",()=>{
 const html=readFileSync(new URL("../hive-run/index.html",import.meta.url),"utf8");
 const start=html.indexOf('id="game"'),end=html.indexOf('<aside class="mission',start);
 assert.ok(start>=0&&end>start);
 const cabinet=html.slice(start,end);
 assert.match(cabinet,/id="victoryOverlay"/);
 assert.match(cabinet,/id="victoryPlayAgain"/);
 assert.equal((html.match(/id="victoryOverlay"/g)||[]).length,1);
 const js=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
 assert.match(js,/if\(victoryVisible\(\)\)drawVictoryCelebration\(time\);\s*else draw\(\);/);
});
