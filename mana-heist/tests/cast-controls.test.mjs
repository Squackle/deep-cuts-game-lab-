import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {DECISION_LADDER} from "../src/decision-ladder.js";
import {actions,initial,reduce,completed} from "../src/engine.js";
import {manualCastOptions,popUndoFrame} from "../src/cast-controls.js";
import {chooseAutomaticCast} from "../src/auto-cast.js";
const hard=DECISION_LADDER[6];
test("manual payment does not silently choose the solver's recommended cost",()=>{
 let s=initial(hard);
 for(const id of ["blue","red"])s=reduce(hard,s,actions(hard,s).find(a=>a.id===id&&a.type==="tap")).state;
 const opts=manualCastOptions(hard,s);assert.equal(opts.length,2);
 const red=opts.find(a=>a.spend.R===1),blue=opts.find(a=>a.spend.U===1);
 assert.deepEqual(chooseAutomaticCast(hard,s),red);
 const failed=reduce(hard,s,blue).state;assert.equal(failed.stage,1);assert.equal(manualCastOptions(hard,failed).length,0);
 const correct=reduce(hard,s,red).state;assert.ok(completed(hard,reduce(hard,correct,manualCastOptions(hard,correct)[0]).state));
});
test("undo groups automatic consequences but preserves deliberate casts as separate steps",()=>{
 const tap={state:"before tap",actionType:"tap",automatic:false};
 const manual={state:"charged",actionType:"cast",automatic:false};
 const auto1={state:"after tap",actionType:"cast",automatic:true};
 const auto2={state:"after first auto",actionType:"cast",automatic:true};
 const m=[tap,manual];assert.equal(popUndoFrame(m),manual);assert.deepEqual(m,[tap]);
 const a=[tap,auto1,auto2];assert.equal(popUndoFrame(a),tap);assert.equal(a.length,0);
 const mixed=[tap,manual,auto1];assert.equal(popUndoFrame(mixed),manual);assert.deepEqual(mixed,[tap]);
 assert.equal(popUndoFrame([]),undefined);
});
test("UI manual handler enumerates explicit legal payments; only timer tags automatic casts",()=>{
 const js=readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
 const handler=js.slice(js.indexOf('el("castButton").addEventListener'),js.indexOf('el("playSelectedLand").addEventListener'));
 assert.match(handler,/manualCastOptions\(level,state\)/);
 assert.match(handler,/CHOOSE SPELL PAYMENT/);
 assert.doesNotMatch(handler,/chooseAutomaticCast/);
 assert.match(js,/perform\(stillLegal,\{automatic:true\}\)/);
 assert.match(js,/popUndoFrame\(history\)/);
});
