import {test} from "node:test";
import assert from "node:assert/strict";
import {createEngine} from "../engine.mjs";
import {legendRows} from "../legend-gallery.mjs";
import {STARTERS,requirement} from "../progress.mjs";
test("title gallery lists all sixteen commanders, preserves lock state and never mutates the profile or battle",()=>{
 const g=createEngine(1),p={unlocked:["urza"],starter:"talrand",last:"urza"},state=JSON.stringify(g.state),profile=JSON.stringify(p);
 const rows=legendRows({definitions:g.commanders,...p,starterIds:STARTERS,requirement:id=>requirement(p,id)});
 assert.equal(rows.length,16);assert.deepEqual(rows.filter(r=>r.owned).map(r=>r.id),["urza"]);
 assert.equal(rows.find(r=>r.selected).id,"urza");assert.ok(rows.every(r=>r.name&&r.hp>0&&Number.isFinite(r.damage)));
 assert.equal(JSON.stringify(g.state),state);assert.equal(JSON.stringify(p),profile);
});
test("starter options are visible as choices but never falsely counted as unlocked",()=>{
 const g=createEngine(1);
 const rows=legendRows({definitions:g.commanders,unlocked:[],starter:null,last:null,starterIds:STARTERS,requirement:()=>"Locked"});
 assert.deepEqual(rows.filter(r=>r.starterChoice).map(r=>r.id).sort(),[...STARTERS].sort());
 assert.equal(rows.filter(r=>r.owned).length,0);assert.equal(rows.some(r=>r.selected),false);
});
