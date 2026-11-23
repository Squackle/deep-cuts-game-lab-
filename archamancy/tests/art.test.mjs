import {test} from "node:test";
import assert from "node:assert/strict";
import {createEngine} from "../engine.mjs";
import {createArt} from "../art.mjs";
test("all tower tiers, creature models and projectile families can render with cached sprites",()=>{
 const counts={drawImage:0,createElement:0};const ctx=new Proxy({}, {get:(o,k)=>k in o?o[k]:(...args)=>{if(k==="drawImage")counts.drawImage++;for(const a of args)if(typeof a==="number")assert.ok(Number.isFinite(a));if(String(k).endsWith("Gradient"))return {addColorStop(){}};}});
 const old=globalThis.document;globalThis.document={createElement:()=>{counts.createElement++;return {getContext:()=>ctx}}};
 try{const art=createArt(ctx),game=createEngine(1);assert.deepEqual(art.towerKeys.slice().sort(),Object.keys(game.roster).sort());assert.deepEqual(art.enemyKeys.slice().sort(),Object.keys(game.types).sort());
 for(const kind of art.towerKeys)for(let tier=1;tier<=4;tier++)art.tower({kind,tier},{x:220,y:47});
 for(const kind of [...art.enemyKeys,...art.allyKeys])art.unit(kind,100,100,{ally:art.allyKeys.includes(kind),hp:0.8,dir:-1,ward:1,animate:true,time:10});
 for(const kind of art.towerKeys)for(const branch of ["A","B"])for(const tier of [3,4])art.tower({kind,tier,branch},{x:220,y:47});
 const initial=counts.createElement;art.tower({kind:"legion",tier:1},{x:220,y:47});assert.equal(counts.createElement,initial);
 for(const kind of ["strike","arcane","mirror","hex","splash","chain","root","melee","heal"])art.projectile({kind,x:20,y:50,tx:80,ty:50,start:2,duration:5},6);
 assert.equal(initial,165);// 153 sprites + 1 shared scratch canvas for the outline/lighting pass
assert.ok(counts.drawImage>=134);
 }finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}
});
test("enemies are drawn as card-based models (no card-art tokens) and mirror to face their direction",()=>{
 const calls=[];const ctx=new Proxy({}, {get:(o,k)=>k in o?o[k]:(...args)=>{if(k==="scale"||k==="drawImage")calls.push([k,args]);if(String(k).endsWith("Gradient"))return {addColorStop(){}};}});
 const old=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>ctx})};
 const img={naturalWidth:626,naturalHeight:457},asked=[];
 try{const art=createArt(ctx,{portrait:k=>{asked.push(k);return img;}});
  for(const k of ["raider","tyrant","runner"])art.unit(k,100,100,{hp:1,dir:-1});
  assert.deepEqual(asked,[]);
  assert.equal(calls.filter(([k,a])=>k==="drawImage"&&a[0]===img).length,0);
  assert.equal(calls.filter(([k,a])=>k==="scale"&&a[0]<0).length,3);
 }finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}
});
