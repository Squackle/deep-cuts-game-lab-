import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {LEVELS} from "../src/levels.js";
import {chargeAllocation,renderWardCharge} from "../src/ward-charge.js";
import {payOptions} from "../src/engine.js";
const mana=colors=>colors.map((color,i)=>({id:i+1,color}));
test("three mana charge equal ring thirds in precise tap order",()=>{
 const one=chargeAllocation({R:2,U:1},mana(["R"]));
 assert.equal(one.total,3);assert.deepEqual(one.charged.map(x=>x.color),["R"]);
 const two=chargeAllocation({R:2,U:1},mana(["R","U"]));
 assert.deepEqual(two.charged.map(x=>x.color),["R","U"]);
 const three=chargeAllocation({R:2,U:1},mana(["R","U","R"]));
 assert.deepEqual(three.charged.map(x=>x.color),["R","U","R"]);
 const target={innerHTML:"",setAttribute(){},querySelector(){return null}};
 const count={textContent:""};
 renderWardCharge({svg:target,count,cost:{R:2,U:1},orbs:mana(["R","U","R"])});
 assert.equal(count.textContent,"3 / 3");
 assert.equal((target.innerHTML.match(/class="ward-charge-arc/g)||[]).length,3);
 assert.equal((target.innerHTML.match(/class="ward-charge-track/g)||[]).length,3);
 assert.deepEqual([...target.innerHTML.matchAll(/class="ward-charge-arc[^"]*"[^>]*data-color="([A-Z])"/g)].map(m=>m[1]),["R","U","R"]);
});
test("blue contributes to generic only, not a required red mana",()=>{
 const cost={R:1,N:1};
 const twoBlue=chargeAllocation(cost,mana(["U","U"]));
 assert.equal(twoBlue.charged.length,1);
 assert.equal(twoBlue.charged[0].requirement,"N");
 assert.equal(payOptions({W:0,U:2,B:0,R:0,G:0,C:0},cost).length,0);
 const withRed=chargeAllocation(cost,mana(["U","U","R"]));
 assert.equal(withRed.charged.length,2);
 assert.deepEqual(withRed.charged.map(x=>x.color),["U","R"]);
});
test("exact colors are reserved before generic even if acquired afterward",()=>{
 const cost={U:2,N:1};
 const result=chargeAllocation(cost,mana(["U","R","U"]));
 assert.deepEqual(result.charged.map(x=>x.requirement),["U","N","U"]);
 assert.equal(chargeAllocation({R:2,U:1},mana(["R","R","R"])).charged.length,2);
 assert.equal(chargeAllocation({C:1},mana(["U"])).charged.length,0);
 assert.equal(chargeAllocation({C:1},mana(["C"])).charged.length,1);
});
test("pending mana orb fills the ward only after reaching the center",()=>{
 const rings={innerHTML:"",attrs:{},setAttribute(k,v){this.attrs[k]=v},querySelector(){return null}};
 const count={textContent:""};
 let res=renderWardCharge({svg:rings,count,cost:{R:2,U:1},orbs:mana(["R","U","R"]),pendingId:3});
 assert.equal(res.charged.length,2);
 assert.equal(count.textContent,"2 / 3");
 res=renderWardCharge({svg:rings,count,cost:{R:2,U:1},orbs:mana(["R","U","R"]),animateId:3});
 assert.equal(res.charged.length,3);
 assert.equal(count.textContent,"3 / 3");
});
test("every authored mana cost builds the intended number of proportional slices",()=>{
 for(const level of LEVELS){
  for(const stage of level.stages){
   const expected=Object.values(stage.cost).reduce((a,b)=>a+b,0);
   assert.equal(chargeAllocation(stage.cost,[]).total,expected,level.id+" "+stage.name);
  }
 }
});
test("markup wires ring animation to land-to-ward flight without old socket mechanics",()=>{
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 const js=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
 assert.match(html,/id="wardManaRing"/);
 assert.match(html,/id="wardTarget"/);
 assert.match(html,/id="wardChargeCount"/);
 assert.match(html,/class="mana-ledger-grid"/);
 assert.doesNotMatch(html,/class="pool mana-sockets"/);
 assert.match(js,/destination:el\("wardTarget"\)/);
 assert.match(js,/onArrival:/);
 assert.match(js,/chargeWard\(\{animateId:pendingId\}\)/);
});
