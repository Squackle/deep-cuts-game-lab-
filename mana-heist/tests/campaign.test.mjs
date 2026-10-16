import test from "node:test";
import assert from "node:assert/strict";
import {LEVELS,CHAPTERS,GALAXIES} from "../src/levels.js";
import {highestUnlocked,unlocked,chapterIndex,stageCode,chapterAccessible,galaxyAccessible,normalizedBests} from "../src/campaign.js";
import {consistent,reconstruct,renderLedger,transitionOrbs} from "../src/mana-orbs.js";
const win=(i)=>({[LEVELS[i].id]:{turn:1,spentLife:0}});
test("all stages and worlds are available from the start",()=>{
 assert.equal(highestUnlocked({}),0);
 assert.equal(unlocked(0,{}),true);
 assert.equal(unlocked(1,{}),true);
 assert.equal(unlocked(249,{}),true);
 assert.equal(unlocked(250,{}),false);
 assert.equal(chapterAccessible(0,{}),true);
 assert.equal(chapterAccessible(1,{}),true);
 assert.equal(galaxyAccessible(4,{}),true);
 assert.equal(stageCode(0),"1:1:1");
 assert.equal(stageCode(2),"1:1:3");
 assert.equal(stageCode(3),"1:1:4");
 assert.equal(stageCode(6),"1:1:7");
 assert.equal(stageCode(7),"1:1:8");
 assert.equal(stageCode(17),"1:2:8");
 assert.equal(stageCode(50),"2:1:1");
 assert.equal(stageCode(249),"5:5:10");
 assert.equal(CHAPTERS.length,25);
 assert.equal(GALAXIES.length,5);
});
test("sequential wins still track historic bests but do not gate vault access",()=>{
 const best={};
 for(let i=0;i<LEVELS.length-1;i++){
  assert.equal(highestUnlocked(best),i,"stage "+i);
  assert.equal(unlocked(i+1,best),true);
  Object.assign(best,win(i));
  assert.equal(unlocked(i+1,best),true);
  assert.equal(chapterIndex(i+1)>=chapterIndex(i),true);
 }
 assert.equal(highestUnlocked(best),LEVELS.length-1);
 assert.equal(chapterAccessible(24,best),true);
 assert.equal(galaxyAccessible(4,best),true);
});
test("out-of-order legacy wins are preserved while every stage stays playable",()=>{
 const best={...win(4),...win(12),...win(0)};
 assert.equal(highestUnlocked(best),1);
 assert.equal(unlocked(2,best),true);
});
test("saved v2 medals are kept and malformed records are dropped",()=>{
 const data={...win(0),...win(1),[LEVELS[3].id]:{turn:-50,spentLife:0},rogue:{turn:1,spentLife:0}};
 const normalized=normalizedBests(data);
 assert.equal(Object.keys(normalized).length,2);
 assert.equal(highestUnlocked(normalized),2);
 assert.deepEqual(normalizedBests([]),{});
});
test("mana orbs track taps, casts, end-turn, and rebuilds without affecting reducer",()=>{
 const empty={W:0,U:0,B:0,R:0,G:0,C:0};
 let visual=reconstruct(empty);
 assert.equal(consistent(empty,visual),true);
 visual=transitionOrbs(visual,{type:"tap",color:"U"},{...empty,U:1});
 assert.equal(visual.length,1);
 assert.equal(visual[0].color,"U");
 assert.equal(consistent({...empty,U:1},visual),true);
 visual=transitionOrbs(visual,{type:"tap",color:"R"},{...empty,U:1,R:1});
 assert.equal(visual.length,2);
 const spent=transitionOrbs(visual,{type:"cast",spend:{W:0,U:1,B:0,R:0,G:0,C:0}},{...empty,R:1});
 assert.deepEqual(spent.map(o=>o.color),["R"]);
 assert.equal(consistent({...empty,R:1},spent),true);
 assert.deepEqual(transitionOrbs(spent,{type:"end"},empty),[]);
});
test("mana ledger shows three columns, two rows of stored colors and blanks",()=>{
 const target={innerHTML:""};
 const pool={W:0,U:1,B:0,R:2,G:0,C:0};
 const orbs=[
  {id:1,color:"R"},{id:2,color:"R"},{id:3,color:"U"}
 ];
 renderLedger(target,pool,orbs,{pendingId:3});
 assert.equal((target.innerHTML.match(/class="mana-ledger-entry/g)||[]).length,6);
 assert.deepEqual([...target.innerHTML.matchAll(/data-color="([A-Z])"/g)].map(m=>m[1]),["R","R","U"]);
 assert.match(target.innerHTML,/RED/);
 assert.match(target.innerHTML,/BLUE/);
 assert.match(target.innerHTML,/in-flight/);
 assert.equal((target.innerHTML.match(/Empty mana slot/g)||[]).length,3);
 assert.doesNotMatch(target.innerHTML,/mana-socket/);
});
