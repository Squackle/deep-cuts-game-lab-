import { test } from 'node:test';
import { createEngine } from '../engine.mjs';
function runFoundationChecks(make){
 const results=[];function check(name,f){f();results.push(name);}function assert(a,msg="assertion failed"){if(!a)throw Error(msg);}
 const finish=(e)=>{for(let i=0;i<3000&&e.state.phase==="active";i++)e.step();assert(e.state.phase!=="active","wave failed to resolve");};
 check("24 distinct pads & route endpoints",()=>{const e=make();assert(e.map.pads.length===24);assert(new Set(e.map.pads.map(p=>p.x+":"+p.y)).size===24);assert(e.pointAt(0).x===0);assert(e.pointAt(e.map.distance).x===1000);});
 check("invalid commands do not spend mana",()=>{const e=make();for(const c of [{type:"build",pad:-1,kind:"grove"},{type:"build",pad:0,kind:"__proto__"},{type:"build",pad:0.5,kind:"grove"},{type:"upgrade",pad:0}])assert(!e.command(c));assert(e.state.mana===350);});
 check("build, upgrade, sell and accounting",()=>{const e=make();assert(e.command({type:"build",pad:0,kind:"grove"}));assert(!e.command({type:"build",pad:0,kind:"grove"}));assert(e.command({type:"upgrade",pad:0}));const paid=e.state.towers[0].paid;assert(e.command({type:"sell",pad:0}));assert(e.state.mana===350-paid+Math.floor(paid*.7));assert(!e.state.towers[0]);});
 check("no passive farm while idle; income during battle",()=>{const e=make();e.command({type:"build",pad:20,kind:"grove"});const cash=e.state.mana;for(let i=0;i<50;i++)e.step();assert(e.state.mana===cash&&e.state.tick===0);e.command({type:"wave"});for(let i=0;i<21;i++)e.step();assert(e.state.stats.farmMana===20);});
 check("wave rejects overlapping duplicate start",()=>{const e=make();assert(e.command({type:"wave"}));assert(!e.command({type:"wave"}));finish(e);assert(e.state.wave===1&&e.state.stats.leaks===10&&e.state.health===10);});
 check("defeat is terminal",()=>{const e=make();e.command({type:"wave"});finish(e);e.command({type:"wave"});finish(e);assert(e.state.phase==="lost");assert(!e.command({type:"build",pad:0,kind:"grove"}));});
 check("rally snapping enforces range",()=>{const e=make();e.command({type:"build",pad:0,kind:"legion"});assert(e.command({type:"rally",pad:0,x:280,y:110}));assert(!e.command({type:"rally",pad:0,x:1000,y:490}));});
 check("tower combat, summons and event order",()=>{const e=make();e.command({type:"build",pad:4,kind:"legion"});e.command({type:"build",pad:0,kind:"arcanum"});e.command({type:"wave"});finish(e);assert(e.state.stats.summoned>0);assert(e.state.stats.kills>0);assert(e.state.stats.damage>0);assert(e.state.events.every((v,i,a)=>i===0||v.seq>a[i-1].seq));});
 check("flyers bypass ground-only splash",()=>{const e=make();e.command({type:"build",pad:0,kind:"pyre"});e.state.phase="active";e.state.enemies.push({id:1,kind:"wing",...e.types.wing,progress:220,slowUntil:0,nextAttack:0,maxHp:42});e.step();assert(e.state.enemies[0].hp===42);});
 check("same seed and commands reproduce full simulation",()=>{const a=make(42),b=make(42);for(const e of [a,b]){e.command({type:"build",pad:0,kind:"arcanum"});e.command({type:"build",pad:4,kind:"legion"});e.command({type:"build",pad:20,kind:"grove"});e.command({type:"wave"});finish(e);}assert(JSON.stringify(a.state)===JSON.stringify(b.state));});
 check("mana ledger reconciles",()=>{const e=make();e.command({type:"build",pad:20,kind:"grove"});e.command({type:"build",pad:0,kind:"arcanum"});e.command({type:"wave"});finish(e);const s=e.state.stats;assert(e.state.mana===350+s.manaEarned-s.spent+s.refunds);assert(s.manaEarned===s.farmMana+s.killMana+s.waveMana);});
 return results;
}
test('foundation invariants (11 scenarios)',()=>{runFoundationChecks(createEngine);});
