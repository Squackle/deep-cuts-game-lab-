import {test} from "node:test";
import assert from "node:assert/strict";
import {createEngine} from "../engine.mjs";
import {createFx} from "../fx.mjs";
const ctx=new Proxy({canvas:{width:1000,height:600}},{get:(o,k)=>k in o?o[k]:()=>{},set:()=>true});
test("effects read engine events without changing the simulation",()=>{
 const g=createEngine(1),fx=createFx(ctx);fx.sync(g);g.command({type:"build",pad:4,kind:Object.keys(g.roster).find(k=>g.roster[k].cost<=200)});
 const before=JSON.stringify(g.playtestReport());const cues0=fx.update(g,1000);assert.deepEqual(cues0,[]);assert.equal(JSON.stringify(g.playtestReport()),before);
 assert.ok(g.command({type:"wave"}));const cues=fx.update(g,1016);assert.ok(cues.some(c=>c.type==="banner"&&c.title==="Wave 1"));
 let t=1016,seen=[];for(let i=0;i<1500&&g.state.phase==="active";i++){g.step();t+=16;seen.push(...fx.update(g,t));fx.draw(t);}
 const o=fx.offset(t+10000);assert.deepEqual(o,{x:0,y:0});
 const b=createEngine(1),f2=createFx(ctx);f2.sync(b);b.state.wave=4;b.command({type:"wave"});const c5=f2.update(b,0);assert.ok(c5.some(c=>c.tone==="boss"&&/Grimgut/.test(c.sub)),JSON.stringify(c5));
});
