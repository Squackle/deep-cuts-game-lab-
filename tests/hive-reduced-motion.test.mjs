import test from "node:test";
import assert from "node:assert/strict";
import {newRun} from "../src/engine.js";
import {renderMutationEffects} from "../src/evolution-visuals.js";
function render(run,time,reduced){
 const calls=[],ctx={save(){},restore(){},beginPath(){},stroke(){},moveTo(...p){calls.push(["move",...p])},lineTo(...p){calls.push(["line",...p])},arc(...p){calls.push(["arc",...p])}};
 renderMutationEffects(ctx,run,20,time,null,reduced);return calls;
}
test("reduced motion freezes Blue and Red decorative animation without erasing mutation visuals",()=>{
 const r=newRun({seed:7});
 r.effects.blueTicks=28;r.effects.redTicks=24;
 const a=render(r,0,true),b=render(r,1700,true);
 assert.ok(a.length>0);assert.deepEqual(a,b);
 assert.notDeepEqual(render(r,0,false),render(r,1700,false));
});
