import test from "node:test";
import assert from "node:assert/strict";
import {VERSION,initial,actions,reduce,completed} from "../src/engine.js";
import {hintInstruction,validateHintRoute} from "../src/verified-hints.js";

const board=(field,stages)=>({id:"mh-hint-payment",version:VERSION,turnLimit:1,life:20,hand:[],library:[],field,stages});
const apply=(level,state,action)=>{assert.ok(action);const result=reduce(level,state,action);assert.ok(result.ok,result.error);return result.state;};

test("verified hints distinguish actual generic payment from required color",()=>{
 const level=board([{id:"blue",card:"island"},{id:"red",card:"mountain"}],[{name:"Generic ward",cost:{N:1}},{name:"Blue ward",cost:{U:1}}]);
 let s=initial(level);
 for(const id of ["blue","red"])s=apply(level,s,actions(level,s).find(a=>a.type==="tap"&&a.id===id));
 const first=actions(level,s).find(a=>a.type==="cast"&&a.spend.R===1);
 const after=apply(level,s,first),last=actions(level,after).find(a=>a.type==="cast");
 const route=validateHintRoute(level,s,[first,last]);assert.ok(route);
 const verified={status:"solved",...route};
 assert.match(hintInstruction(level,s,verified),/Generic ward.*spending 1 red/);
 const full=hintInstruction(level,s,verified,true);
 assert.match(full,/Blue ward.*spending 1 blue/);
 assert.ok(completed(level,apply(level,after,last)));
});

test("paired mana hint reflects both outputs; untap hint identifies chosen source",()=>{
 const level=board([{id:"pair",card:"bounceUG"}],[{name:"Refresh",cost:{U:1,G:1},effect:"untap"},{name:"Finish",cost:{U:1,G:1}}]);
 const s=initial(level),tap=actions(level,s).find(a=>a.type==="tap"),charged=apply(level,s,tap);
 const cast=actions(level,charged).find(a=>a.type==="cast"&&a.untapId==="pair");
 const refreshed=apply(level,charged,cast),tapAgain=actions(level,refreshed).find(a=>a.type==="tap");
 const chargedAgain=apply(level,refreshed,tapAgain),finish=actions(level,chargedAgain).find(a=>a.type==="cast");
 const route=validateHintRoute(level,s,[tap,cast,tapAgain,finish]);assert.ok(route);
 const text=hintInstruction(level,s,{status:"solved",...route},true);
 assert.match(text,/Tap Simic Growth Chamber for U \+ G/);
 assert.match(text,/Refresh.*spending 1 blue \+ 1 green; untap Simic Growth Chamber/);
});
