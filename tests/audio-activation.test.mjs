import test from "node:test";
import assert from "node:assert/strict";
import {canPlayMusic,resumeFromGesture} from "../src/audio-activation.js";
test("music requires opt-in and a foreground playable state",()=>{
 for(const status of ["ready","running"])assert.equal(canPlayMusic(true,status,false),true);
 for(const status of ["paused","draft","over","won"])assert.equal(canPlayMusic(true,status,false),false);
 assert.equal(canPlayMusic(false,"running",false),false);
 assert.equal(canPlayMusic(true,"running",true),false);
});
test("gesture resumes suspended desktop audio context",async()=>{
 let resumed=0,ready=0;
 const ctx={state:"suspended",resume(){resumed++;return Promise.resolve().then(()=>{this.state="running"})}};
 assert.equal(resumeFromGesture(ctx,()=>{ready++}),true);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(resumed,1);assert.equal(ready,1);
 assert.equal(resumeFromGesture(ctx,()=>{ready++}),true);
 assert.equal(resumed,1);assert.equal(ready,2);
});
test("blocked and unsupported contexts cannot crash gameplay",async()=>{
 assert.equal(resumeFromGesture(null),false);
 assert.equal(resumeFromGesture({state:"closed"}),false);
 assert.equal(resumeFromGesture({state:"suspended",resume(){throw Error("blocked")}}),false);
 assert.equal(resumeFromGesture({state:"suspended",resume(){return Promise.reject(Error("blocked"))}}),true);
 await new Promise(resolve=>setImmediate(resolve));
});
