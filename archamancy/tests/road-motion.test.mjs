import {test} from "node:test";
import assert from "node:assert/strict";
import {createRoadMotion} from "../road-motion.mjs";

test("between-tick road samples follow travel in both directions without changing game state",()=>{
 const motion=createRoadMotion();
 const actor={progress:24};
 assert.equal(motion.sample(actor,3,.5).progress,24);
 actor.progress=36;
 assert.equal(motion.sample(actor,4,0).progress,24);
 assert.equal(motion.sample(actor,4,.5).progress,30);
 assert.equal(motion.sample(actor,4,.75).travel,12);
 assert.equal(motion.sample(actor,4,1).progress,36);
 assert.equal(motion.sample(actor,4,0).progress,36,"resuming from pause must not rewind the visual actor");
 assert.deepEqual(actor,{progress:36});
 actor.progress=30;
 assert.equal(motion.sample(actor,5,.5).progress,33);
 assert.equal(motion.sample(actor,5,1).progress,30);
});

test("new spawns, lane jumps, same-tick moves and clock rewinds avoid drawing across the map",()=>{
 const motion=createRoadMotion();
 const actor={progress:100};
 motion.sample(actor,3,0);
 actor.progress=3000;
 assert.equal(motion.sample(actor,4,0).progress,3000);
 actor.progress=3020;
 assert.equal(motion.sample(actor,4,0).progress,3020);
 actor.progress=3010;
 assert.equal(motion.sample(actor,3,.5).progress,3010);
 assert.equal(motion.sample({progress:311},4,0).progress,311);
});
