import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createEngine,VERSION,SAVE_FORMAT} from "../engine.mjs";
import {PACKS} from "../campaign.mjs";
import {tierFourCastSignature} from "../fx.mjs";

const main=readFileSync(new URL("../main.mjs",import.meta.url),"utf8");
const html=readFileSync(new URL("../../archemancy/index.html",import.meta.url),"utf8");

test("coordinated Archemancy release includes the latest rules and all intended features",()=>{
 const g=createEngine(1,"sandbox","hollow");
 assert.equal(VERSION,"0.1.0-beta.13.60");
 assert.equal(SAVE_FORMAT,1,"ordinary balance releases do not invalidate saved runs");
 assert.equal(g.roster.chapel.damage,16);
 assert.equal(g.roster.chapel.range,190);
 assert.ok(g.types.isu&&g.types.infernotitan,"new regional bosses are available");
 assert.ok(Object.keys(PACKS).length>=2,"campaign shop booster packs are available");
 assert.ok(tierFourCastSignature({tier:4,branch:"A"},{kind:"strike",color:"W"}),"Tier IV cast visuals remain available");
 for(const marker of [
  "function towerTargetHint(","function renderDraft(swapFor=null)","function renderBattleDeck(",
  "function renderPack(","function packTiles(","function askRestart(source)","function renderCampShop("
 ])assert.ok(main.includes(marker),"preserved integrated UI: "+marker);
 for(const id of ["titleRestart","restartConfirmDialog","restartConfirm","restartCancel","battleDeckDialog","packDialog"])
  assert.ok(html.includes('id="'+id+'"'),"integrated page includes "+id);
});

test("regional frost overlay has access to the combat canvas, not an undefined top-level context",()=>{
 const boot=main.indexOf("function boot(createEngine){");
 const canvas=main.indexOf('ctx=canvas.getContext("2d")',boot);
 const frost=main.indexOf("function drawFrost(");
 assert.ok(boot>=0&&canvas>boot&&frost>canvas,"drawFrost must be declared after boot's ctx binding");
 assert.ok(main.includes("if(u.frozenUntil>s.tick)drawFrost(x,y)"));
 assert.ok(main.includes("if(cm.frozenUntil>s.tick)drawFrost(q.x,q.y)"));
});

test("rejected saved-run data is retained and never used to replace a live engine",()=>{
 assert.match(main,/function loadRun\(key=RUN_KEY\)\{try\{const raw=storage\?\.getItem\(key\);if\(!raw\|\|raw\.length>4\*1024\*1024\)return null/);
 const load=main.slice(main.indexOf("function loadRun(key=RUN_KEY)"),main.indexOf("function loadRun(key=RUN_KEY)")+450);
 assert.doesNotMatch(load,/clearRun\(\)/);assert.match(main,/if\(!resumed\.restore\(save\)\)/);
});

test("ritual and paid upgrade selectors expose next-battle values and all five lands",()=>{
 assert.match(main,/upgradePreview:upgrading/);assert.match(main,/fromPack\?"Upgrade for free":"Upgrade/);assert.match(main,/spellUpgradePreview\(camp,id,game.cards,profile.perks.spellcraft/);assert.match(main,/Land bonuses · this battle/);assert.match(main,/Lands · color damage & troop health/);assert.match(main,/landPreview\(camp,d.color\)/);
});
