import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {LEVELS} from "../src/levels.js";
import {actions,initial,reduce,completed} from "../src/engine.js";
import {chooseAutomaticCast} from "../src/auto-cast.js";

const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const main=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
const move=(puzzle,state,action)=>{const result=reduce(puzzle,state,action);assert.equal(result.ok,true,result.error);return result.state;};

test("a beginner must first tap a land then explicitly cast the affordable spell",()=>{
 const puzzle=LEVELS[0];
 const start=initial(puzzle);
 const tapped=move(puzzle,start,actions(puzzle,start).find(a=>a.type==="tap"));
 assert.equal(tapped.pool.U,1);
 assert.equal(tapped.stage,0,"tapping adds mana but never automatically casts in the engine");
 const available=chooseAutomaticCast(puzzle,tapped);
 assert.equal(available.type,"cast");
 const won=move(puzzle,tapped,available);
 assert.ok(completed(puzzle,won));
 assert.equal(won.pool.U,0,"the cast spends the mana");
});

test("a player learns that playing a Mountain, tapping it and casting are three distinct actions",()=>{
 const puzzle=LEVELS[1];
 const start=initial(puzzle);
 assert.equal(start.field.length,0);
 const played=move(puzzle,start,actions(puzzle,start).find(a=>a.type==="play"));
 assert.equal(played.field.length,1);
 assert.equal(played.pool.R,0,"land placement alone produces no mana");
 const tapped=move(puzzle,played,actions(puzzle,played).find(a=>a.type==="tap"));
 assert.equal(tapped.pool.R,1);
 assert.equal(tapped.field[0].tapped,true);
 assert.ok(completed(puzzle,move(puzzle,tapped,chooseAutomaticCast(puzzle,tapped))));
});

test("the game presents physical cards before explanations, without removing existing controls",()=>{
 const ids=["wardTarget","wardCost","castButton","autoCastToggle","lessonPrompt","battlefield","hand","playSelectedLand","inspectSelected","endTurn","undo","reset","returnMap"];
 for(const id of ids)assert.match(html,new RegExp('id="'+id+'"'),id);
 assert.ok(html.indexOf('id="battlefield"')<html.indexOf('id="hand"'));
 assert.ok(html.indexOf('id="hand"')<html.indexOf('id="gameNotes"'));
 assert.match(html,/<details id="gameNotes"/);
 assert.match(main,/onInspect:id=>playLand\(id\)/);
 assert.match(main,/el\("playSelectedLand"\)\.addEventListener/);
 assert.match(css,/--fan-tilt/);
 assert.match(css,/max-width:650px/);
});

test("real Magic symbols are correctly distinct: numeric generic versus diamond colorless",()=>{
 assert.match(main,/C:\{name:"Colorless"[^\n]+icon:"◇"/);
 assert.match(main,/k==="N"\?\(n\?\[coin\("N",String\(n\)\)\]:\[\]\)/);
 assert.match(main,/Numerals|Numbers show generic mana costs/);
 assert.match(html,/Optional auto-cast|optional auto-cast/);
});

test("auto-cast is opt-in; mana stays available for manual cast until explicitly spent",()=>{
 assert.match(main,/let autoCastEnabled=false/);
 assert.match(main,/if\(!autoCastEnabled\|\|pendingFlights\.size\|\|completed\(level,state\)\)return/);
 assert.match(main,/el\("castButton"\)\.addEventListener\("click"/);
 assert.match(main,/updateCastButton\(\)/);
 assert.match(main,/localStorage\.getItem\("dc-mana-heist-auto-cast"\)/);
 // Campaign and save identities are untouched by this presentation release.
 assert.match(main,/const storageKey="dc-mana-heist-landfall-v2"/);
 assert.equal(LEVELS.length,500);
});
