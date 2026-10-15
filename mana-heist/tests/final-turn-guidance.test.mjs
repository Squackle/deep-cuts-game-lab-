import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {BASE_LEVELS} from "../src/levels.js";
import {initial,actions,reduce,completed} from "../src/engine.js";
import {resolveAutomaticCasts} from "../src/auto-cast.js";
import {isFinalTurn,requiredManaText,tappedLandMessage,finalTurnMessage} from "../src/turn-guidance.js";

const level=BASE_LEVELS[3]; // Two Roads: Volcanic Island, U on turn 1, R on turn 2
function act(state,criteria){
 const choice=actions(level,state).find(criteria);
 assert.ok(choice,"expected legal move");
 const out=reduce(level,state,choice);
 assert.equal(out.ok,true);
 return out.state;
}
function turnTwo(){
 let state=initial(level);
 state=act(state,a=>a.type==="play"&&a.id==="a");
 state=act(state,a=>a.type==="tap"&&a.id==="a"&&a.color==="U");
 state=resolveAutomaticCasts(level,state).state;
 assert.equal(state.stage,1,"first blue ward should auto-cast");
 state=act(state,a=>a.type==="end");
 assert.equal(state.turn,2);
 return state;
}
test("Two Roads intentionally ends on turn 2, but can still be won with red mana",()=>{
 const two=turnTwo();
 assert.equal(isFinalTurn(level,two),true);
 assert.equal(requiredManaText(level,two),"1 red mana");
 assert.ok(!actions(level,two).some(a=>a.type==="end"),"no legal third turn");
 const red=act(two,a=>a.type==="tap"&&a.color==="R");
 const result=resolveAutomaticCasts(level,red).state;
 assert.equal(completed(level,result),true,"taking R on final turn wins normally");
});
test("tapping blue on final turn gives accurate Undo/Restart hint, not End Turn",()=>{
 const two=turnTwo();
 const wrong=act(two,a=>a.type==="tap"&&a.color==="U");
 assert.equal(wrong.pool.U,1);
 assert.equal(completed(level,wrong),false);
 assert.ok(!actions(level,wrong).some(a=>a.type==="end"));
 const help=tappedLandMessage(level,wrong);
 assert.match(help,/final permitted turn/i);
 assert.match(help,/red mana/i);
 assert.match(help,/undo/i);
 assert.match(help,/restart/i);
 assert.doesNotMatch(help,/End your turn to untap it/);
 assert.match(finalTurnMessage(level,wrong),/There is no next turn/i);
});
test("tapped-land hint still recommends End Turn before the last turn",()=>{
 const state=initial(level);
 assert.equal(isFinalTurn(level,state),false);
 assert.match(tappedLandMessage(level,state),/End your turn to untap it/);
});
test("final turn control remains tappable, accessible and shows immediate help",()=>{
 const main=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
 const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
 assert.match(main,/endButton\.disabled=isWin/);
 assert.doesNotMatch(main,/endTurn"\)\.disabled=isWin\|\|state\.turn===level\.turnLimit/);
 assert.match(main,/endButton\.classList\.toggle\("turn-limit",finalTurn\)/);
 assert.match(main,/else message\(finalTurnMessage\(level,state\),true\)/);
 assert.match(main,/message\(tappedLandMessage\(level,state\),true\)/);
 assert.match(css,/#endTurn\.turn-limit/);
});
