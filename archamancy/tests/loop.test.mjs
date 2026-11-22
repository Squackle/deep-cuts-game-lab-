import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {animationLoop} from "../loop.mjs";

// Regression: the next frame was only requested at the very end of a frame, so one exception
// anywhere in the update or drawing code stopped the game loop for good (a frozen battlefield).
test("an error in one frame is reported and the next frames still run",()=>{
 const queue=[],errors=[],ran=[];
 const start=animationLoop(now=>{ran.push(now);if(now===2)throw new Error("bad frame");},{raf:f=>queue.push(f),onError:e=>errors.push(e.message)});
 start();for(let now=1;now<=4;now++)queue.shift()(now);
 assert.deepEqual(ran,[1,2,3,4]);assert.deepEqual(errors,["bad frame"]);assert.equal(queue.length,1,"frame 5 is scheduled");
});

test("a failing error reporter cannot stop the loop either",()=>{
 const queue=[];const start=animationLoop(()=>{throw new Error("x");},{raf:f=>queue.push(f),onError:()=>{throw new Error("y");}});
 start();queue.shift()(1);assert.equal(queue.length,1);
});

const main=readFileSync(new URL("../main.mjs",import.meta.url),"utf8");
test("the page runs its frames through the safe loop",()=>{
 assert.match(main,/animationLoop\(frame,/);
 assert.equal((main.match(/requestAnimationFrame\(frame\)/g)||[]).length,0,"no unguarded frame scheduling");
});

// The engine file is 77 KB; two separate checkers each downloaded it every five minutes.
test("one update checker downloads the live version, every five minutes while visible",()=>{
 assert.equal((main.match(/fetch\("\/archamancy\/engine\.mjs/g)||[]).length,1);
 assert.equal((main.match(/setInterval\(/g)||[]).length,1);
});
