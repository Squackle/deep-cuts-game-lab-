import {test} from "node:test";
import assert from "node:assert/strict";
import {createEngine,SEASONS} from "../engine.mjs";
import {sanitize} from "../progress.mjs";

test("seasons are chosen before the first wave and survive a save",()=>{
 const g=createEngine(1,"campaign","confluence");assert.equal(g.map.season,"summer");
 assert.ok(!g.command({type:"season",season:"spring"}));assert.ok(g.command({type:"season",season:"winter"}));assert.equal(g.map.season,"winter");
 assert.equal(g.playtestReport().season,"winter");
 const save=g.snapshot();const h=createEngine(1,"campaign","confluence");assert.ok(h.restore(save));assert.equal(h.map.season,"winter");
 g.command({type:"wave"});assert.ok(!g.command({type:"season",season:"autumn"}),"season is locked once waves start");assert.deepEqual(SEASONS,["summer","autumn","winter"]);
});

test("profile keeps a valid season only",()=>{
 assert.equal(sanitize({season:"autumn"}).season,"autumn");assert.equal(sanitize({season:"monsoon"}).season,"summer");
});
