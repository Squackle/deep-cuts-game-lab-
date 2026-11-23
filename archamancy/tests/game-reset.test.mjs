import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as progress from "../progress.mjs";
import * as daily from "../daily.mjs";
import {newCampaign} from "../campaign.mjs";
import {resetGameProgress,GAME_PROGRESS_KEYS} from "../game-reset.mjs";

const html=readFileSync(new URL("../../archemancy/index.html",import.meta.url),"utf8");
const main=readFileSync(new URL("../main.mjs",import.meta.url),"utf8");
const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
function storageMock(initial={}){
 const entries=new Map(Object.entries(initial)),removed=[];
 return {removed,entries,getItem(k){return entries.has(k)?entries.get(k):null;},setItem(k,v){entries.set(k,String(v));},removeItem(k){removed.push(k);entries.delete(k);}};
}

test("full reset removes only ARCHEMANCY progress, not sound, art caches or other Game Lab games",()=>{
 const p=progress.newProfile();progress.chooseStarter(p,"krenko");p.xp=5000;p.stars={normal:3};p.badges={"mono:R":true};p.seen.e=["raider"];p.camp={...newCampaign(),treasure:60};
 const s=storageMock({"archemancy.run.v1":'{"state":{"wave":17}}',"archemancy.daily.v1":JSON.stringify({days:{"2026-11-23":{tries:2}}}),"archemancy.tips.v1":"1","archemancy.sound.v1":'{"music":false}',"archemancy.cardart.v1":"CACHE","archemancy.peek.v1":"0","graftbound.save":"other-game"});
 progress.save(s,p);
 assert.ok(resetGameProgress(s));
 assert.deepEqual(s.removed.slice().sort(),GAME_PROGRESS_KEYS.slice().sort());
 assert.deepEqual(progress.load(s,["krenko"]),progress.newProfile());
 assert.deepEqual(daily.load(s),{days:{}});
 assert.equal(s.getItem("archemancy.run.v1"),null);
 assert.equal(s.getItem("archemancy.tips.v1"),null);
 assert.equal(s.getItem("archemancy.sound.v1"),'{"music":false}');
 assert.equal(s.getItem("archemancy.cardart.v1"),"CACHE");
 assert.equal(s.getItem("archemancy.peek.v1"),"0");
 assert.equal(s.getItem("graftbound.save"),"other-game");
 assert.equal(newCampaign().treasure,4,"reloaded game starts with starter deck and treasure");
});

test("blocked localStorage deletion reports failure and does not silently claim success",()=>{
 const s=storageMock({"archemancy.progress.v1":"SAVED"});
 s.removeItem=()=>{throw Error("storage denied");};
 assert.equal(resetGameProgress(s),false);
 assert.equal(s.getItem("archemancy.progress.v1"),"SAVED");
 assert.ok(resetGameProgress(null),"memory-only sessions can refresh to default");
});

test("main menu always offers a separate, explicit full game reset",()=>{
 assert.match(html,/<button id="resetGameProgress"[^>]*>Reset Game Progress<\/button>/);
 assert.match(html,/<dialog id="fullResetDialog"[^>]*aria-labelledby="fullResetTitle"[^>]*aria-describedby="fullResetWarning"/);
 for(const id of ["fullResetPhrase","fullResetConfirm","fullResetCancel","fullResetError"])assert.ok(html.includes('id="'+id+'"'));
 assert.match(html,/<button id="fullResetConfirm"[^>]*disabled/);
 for(const term of ["player level","stars","campaign deck","daily challenge records","tutorial progress","current saved run","cannot be undone"])
  assert.match(html,new RegExp(term,"i"));
 assert.match(main,/\$\("resetGameProgress"\)\.addEventListener\("click"/);
 assert.match(main,/\$\("fullResetPhrase"\)\.value\.trim\(\)!=="RESET"/);
 assert.match(main,/if\(\$\("fullResetPhrase"\)\.value\.trim\(\)!=="RESET"\)return/);
 assert.match(main,/resetGameProgress\(storage\)/);
 assert.ok(css.includes(".title-reset-progress"),"visible title reset has standalone styling");
});

test("no autosave can recreate the just-deleted run during reload, and in-game run restart is retained",()=>{
 assert.match(main,/let lastSave=0,resettingGame=false/);
 assert.match(main,/function saveRun\(\)\{if\(resettingGame\|\|!runLive\(\)\)return/);
 assert.match(main,/resettingGame=true;[^]*if\(!resetGameProgress\(storage\)\)\{resettingGame=false;/);
 assert.match(main,/location\.reload\(\); \/\/ Reconstruct level 1/);
 assert.match(main,/\$\("restart"\)\.addEventListener\("click",\(\)=>askRestart\("menu"\)\)/);
 assert.match(main,/\$\("titleRestart"\)\.addEventListener\("click",\(\)=>askRestart\("title"\)\)/);
 const click=main.slice(main.indexOf(' $("resetGameProgress").addEventListener'),main.indexOf(' $("continueRun").addEventListener'));
 assert.doesNotMatch(click,/localStorage\.clear\(|storage\.clear\(/);
});
