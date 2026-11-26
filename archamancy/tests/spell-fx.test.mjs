import {test} from "node:test";
import assert from "node:assert/strict";
import {createEngine} from "../engine.mjs";
import {createFx} from "../fx.mjs";
import {drawCast,spellStyles,commanderStyles,towerStyles} from "../spell-fx.mjs";

function drawingContext(){
 const translations=[];
 const ctx=new Proxy({canvas:{width:1000,height:600}},{
  get:(target,key)=>key in target?target[key]:(...args)=>{
   for(const value of args)if(typeof value==="number")assert(Number.isFinite(value));
   if(key==="translate")translations.push(args);
  }
 });
 return {ctx,translations};
}

test("every spell, commander and tower branch has a renderable cast style",()=>{
 const game=createEngine(1);
 for(const [visuals,definitions] of [[spellStyles,game.cards],[commanderStyles,game.commanders],[towerStyles,game.roster]]){
  assert.deepEqual(Object.keys(visuals).sort(),Object.keys(definitions).sort());
 }
 const {ctx}=drawingContext();
 const styles=[...Object.values(spellStyles),...Object.values(commanderStyles),...Object.values(towerStyles).flat().map(kind=>[kind,59])];
 for(const [kind,radius] of styles)for(const calm of [false,true]){
  drawCast(ctx,{kind,radius,x:320,y:240,school:"W",seed:3},.4,calm);
 }
});

test("spell cues are bounded and reset between runs",()=>{
 const {ctx,translations}=drawingContext(),fx=createFx(ctx);
 for(let i=0;i<50;i++)fx.spell("meteor","R",{x:i,y:80},1000);
 fx.draw(1230);
 assert.equal(translations.length,10);
 fx.reset();
 translations.length=0;
 fx.draw(1240);
 assert.equal(translations.length,0);
});

test("a successful commander ability has a cue at the caster without mutating the game",()=>{
 const game=createEngine(1,"sandbox");
 assert(game.command({type:"commander",id:"omnath"}));
 assert(game.command({type:"sandboxEnemy",enemy:"runner",count:1}));
 const {ctx,translations}=drawingContext(),fx=createFx(ctx);
 fx.sync(game);
 assert(game.command({type:"ability"}));
 const before=JSON.stringify(game.state);
 fx.update(game,1000);
 fx.draw(1200);
 const {x,y}=game.pointAt(game.state.commander.progress);
 assert(translations.some(point=>point[0]===x&&point[1]===y));
 assert.equal(JSON.stringify(game.state),before);
});
