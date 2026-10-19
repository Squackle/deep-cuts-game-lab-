import test from "node:test";
import assert from "node:assert/strict";
import {newRun,start,step,DIRECTIONS,RULES_VERSION} from "../src/engine.js";
import {createLairRun,LAIR_BOSSES,isLairChallenge} from "../src/lair.js";
import {spawnMiniboss} from "../src/miniboss.js";

function contact(kind,practice=true){
 const r=practice?createLairRun(kind):newRun({seed:157,mode:"hunt"});
 if(!practice)assert.equal(spawnMiniboss(r,kind),true);
 r.body=Array.from({length:7},(_,i)=>({x:9-i,y:10}));
 r.direction="right";r.turnQueue=[];r.terrain=[];
 r.encounter.introMs=0;r.encounter.stunMs=0;r.encounter.telegraph=null;
 r.enemies[0].pos={x:10,y:10};r.effects.shield=0;r.effects.molt=0;
 start(r);
 return r;
}
test("Every Lair boss allows exactly one free Brood Instinct rescue",()=>{
 for(const {id} of LAIR_BOSSES){
  const r=contact(id);
  assert.equal(r.mercy,1);
  step(r);
  assert.equal(r.status,"running",id+" first contact forgiven");
  assert.equal(r.mercy,0);assert.equal(r.saves,1);
  assert.equal(r.event?.type,"rescue");
  assert.equal(r.event?.name,"Brood Instinct");
  assert.equal(r.score,0,"One free life grants no score");
  const h=r.body[0],d=DIRECTIONS[r.direction];
  r.enemies[0].pos={x:h.x+d.x,y:h.y+d.y};
  step(r);
  assert.equal(r.status,"over",id+" second contact fatal");
  assert.equal(r.saves,1);
 }
});
test("Broodmother spider hatchlings also cost the sole Lair life",()=>{
 const r=contact("broodmother");
 r.enemies[0].pos={x:14,y:4};
 r.hatchlings=[{id:900,pos:{x:10,y:10},lifeMs:7500,clockMs:0}];
 step(r);
 assert.equal(r.status,"running");assert.equal(r.mercy,0);assert.equal(r.saves,1);
 const h=r.body[0],d=DIRECTIONS[r.direction];
 r.hatchlings=[{id:901,pos:{x:h.x+d.x,y:h.y+d.y},lifeMs:7500,clockMs:0}];
 step(r);
 assert.equal(r.status,"over","Second hatchling hit is fatal");
});
test("Wall impacts remain lethal in practice even with an unused Instinct",()=>{
 const r=contact("stalker");
 r.body=Array.from({length:7},(_,i)=>({x:17-i,y:10}));
 r.enemies[0].pos={x:4,y:4};r.direction="right";
 step(r);
 assert.equal(r.status,"over");assert.equal(r.mercy,1);assert.equal(r.saves,0);
});
test("Ranked Hunt retains the original boss collision rule and replay version",()=>{
 const r=contact("stalker",false);
 assert.equal(r.lairBoss,undefined);assert.equal(r.mercy,1);
 step(r);
 assert.equal(r.status,"over","Ranked boss hits never receive the free prey dodge");
 assert.equal(r.mercy,1);assert.equal(r.saves,0);
 assert.equal(RULES_VERSION,"hive-1.5.4");
 assert.equal(isLairChallenge("hunt","practice"),true);
 assert.equal(isLairChallenge("hunt","arcade"),false);
});
