import test from "node:test";
import assert from "node:assert/strict";
import {newRun,start,pause,step,turn,emptyTile,progress} from "../src/engine.js";

test("run starts ready and moves right only after start",()=>{
 const run=newRun({cols:10,rows:10,random:()=>0});
 const before={...run.body[0]};
 step(run);assert.deepEqual(run.body[0],before);
 start(run);step(run);
 assert.deepEqual(run.body[0],{x:before.x+1,y:before.y});
 assert.equal(run.status,"running");assert.equal(run.body.length,3);
});
test("touch and keyboard direction input cannot reverse into existing body",()=>{
 const run=newRun({cols:10,rows:10,random:()=>0});
 start(run);
 assert.equal(turn(run,"left"),false);
 assert.equal(turn(run,"up"),true);
 assert.equal(turn(run,"down"),false,"one direction per tick");
 step(run);assert.equal(run.direction,"up");
 assert.equal(turn(run,"down"),false,"no 180-degree reversal");
 assert.equal(turn(run,"left"),true);
});
test("collecting a pickup earns points and increases swarm length",()=>{
 const run=newRun({cols:10,rows:10,random:()=>0});
 start(run);const {x,y}=run.body[0];
 run.food={x:x+1,y};const length=run.body.length;
 step(run);
 assert.equal(run.score,100);assert.equal(run.brood,1);
 assert.equal(run.body.length,length+1);
 assert.equal(progress(run).untilNext,4);
 assert.ok(run.food===null || !run.body.some(p=>p.x===run.food.x&&p.y===run.food.y));
});
test("stage increases and tick duration decreases every fifth pickup",()=>{
 const run=newRun({cols:10,rows:10,random:()=>0});
 start(run);run.brood=4;
 const {x,y}=run.body[0];run.food={x:x+1,y};
 step(run);
 assert.equal(run.stage,2);assert.equal(run.tickMs,147);assert.equal(progress(run).untilNext,5);
});
test("wall collision ends game without advancing score",()=>{
 const run=newRun({cols:10,rows:10,random:()=>0});
 start(run);run.body=[{x:9,y:4},{x:8,y:4},{x:7,y:4}];run.direction="right";
 step(run);assert.equal(run.status,"over");assert.match(run.endReason,/wall/i);assert.equal(run.score,0);
});
test("self-collision is game over",()=>{
 const run=newRun({cols:10,rows:10,random:()=>0});
 start(run);run.body=[{x:5,y:5},{x:5,y:6},{x:4,y:6},{x:4,y:5},{x:4,y:4}];run.direction="left";
 step(run);assert.equal(run.status,"over");assert.match(run.endReason,/own swarm/);
});
test("stepping onto old tail space without eating is valid",()=>{
 const run=newRun({cols:10,rows:10,random:()=>0});
 start(run);run.body=[{x:5,y:5},{x:5,y:6},{x:4,y:6},{x:4,y:5}];
 run.direction="left";run.food={x:0,y:0};
 step(run);assert.equal(run.status,"running");assert.deepEqual(run.body[0],{x:4,y:5});
});
test("paused or game-over engine ignores movement",()=>{
 const run=newRun({cols:10,rows:10,random:()=>0});
 start(run);pause(run);const h={...run.body[0]};
 assert.equal(turn(run,"up"),false);step(run);assert.deepEqual(run.body[0],h);
 start(run);assert.equal(run.status,"running");
 run.status="over";step(run);assert.deepEqual(run.body[0],h);
});
test("food appears only on unoccupied tiles, with deterministic injectable randomness",()=>{
 const body=[{x:0,y:0},{x:1,y:0},{x:0,y:1}];
 assert.deepEqual(emptyTile(body,2,2,()=>0.75),{x:1,y:1});
 assert.equal(emptyTile([{x:0,y:0}],1,1,()=>0),null);
});
test("full-board pickup ends in a win without trying to spawn unavailable food",()=>{
 const run=newRun({cols:8,rows:8,random:()=>0});
 run.status="running";run.direction="right";
 const free={x:7,y:7},head={x:6,y:7};
 const all=[];for(let y=0;y<8;y++)for(let x=0;x<8;x++)if(!(x===free.x&&y===free.y)&&!(x===head.x&&y===head.y))all.push({x,y});
 run.body=[head,...all];run.food=free;
 step(run);assert.equal(run.status,"won");assert.equal(run.food,null);assert.equal(run.score,100);
});
