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

test("Frostfen Crossing is winter only and its ice slows ground enemies, not fliers",()=>{
 const g=createEngine(1,"sandbox","frostfen");assert.equal(g.map.season,"winter");assert.deepEqual(g.map.seasons,["winter"]);
 assert.ok(!g.command({type:"season",season:"summer"}));assert.equal(g.map.ice.length,1);
 const lake=g.map.ice[0],onLake=p=>{const q=g.pointAt(p);return q.x>=lake.x&&q.x<=lake.x+lake.w&&q.y>=lake.y&&q.y<=lake.y+lake.h;};
 let start=0;while(!onLake(start))start++;
 const travel=kind=>{const h=createEngine(1,"sandbox","frostfen");h.command({type:"sandboxEnemy",enemy:kind,count:1});const e=h.state.enemies[0];e.progress=start;e.attack=0;for(let i=0;i<20;i++)h.step();return (e.progress-start)/e.speed;};
 assert.ok(travel("raider")<travel("wing")*.8,"ground enemies cover less road on the ice");
 const save=g.snapshot();save.state.season="summer";const r=createEngine(1,"sandbox","frostfen");r.restore(save);assert.equal(r.map.season,"winter");
});
