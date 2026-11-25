import {DIRECTIONS} from "../../src/engine.js";

export const REVIEW_WINDOW_MS=5000;
const headings=new Set(Object.keys(DIRECTIONS));
const inputSources=new Set(["keyboard","swipe"]);
const attemptedStepReasons=new Set([
 "A hatchling blocked your path.",
 "A hunter collided with you.",
 "You hit the arena wall.",
 "You crossed your own swarm."
]);
const copyTile=({x,y})=>({x,y});

function snapshot(run,elapsedMs,turns){
 const {encounter,event}=run;
 const ending=run.status==="over"?run.endReason:null;
 const head=run.body[0];
 const direction=DIRECTIONS[run.direction];
 const impact=ending&&event?.type==="death"
  ?event.at?copyTile(event.at):attemptedStepReasons.has(ending)
   ?{x:head.x+direction.x,y:head.y+direction.y}:null
  :null;
 return {
  elapsedMs,
  tick:run.runTicks,
  cols:run.cols,
  rows:run.rows,
  biome:run.biome,
  body:run.body.map(copyTile),
  direction:run.direction,
  turnQueue:[...run.turnQueue],
  turns,
  terrain:run.terrain.map(tile=>({kind:tile.kind,pos:copyTile(tile.pos),warningMs:tile.warningMs})),
  enemies:run.enemies.map(enemy=>({kind:enemy.kind,pos:copyTile(enemy.pos)})),
  hatchlings:run.hatchlings.map(hatchling=>({id:hatchling.id,pos:copyTile(hatchling.pos)})),
  encounter:encounter?{
   kind:encounter.kind,
   phase:encounter.phase,
   telegraph:encounter.telegraph?{pos:copyTile(encounter.telegraph.pos)}:null,
   webs:encounter.webs.map(web=>({pos:copyTile(web.pos),lifeMs:web.lifeMs})),
   stunMs:encounter.stunMs
  }:null,
  impact,
  ending
 };
}

/** Record only the live Lair attempt and its accepted inputs. Captures are separate from the scored replay format. */
export function createLossReview(run){
 if(!run.lairBoss)throw Error("The loss review requires a Lair encounter.");
 let frames=[snapshot(run,0,[])];
 let turns=[];
 let elapsedMs=0;
 let finished=false;
 return {
  acceptedTurn(heading,source){
   if(!finished&&headings.has(heading)&&inputSources.has(source))turns.push({heading,source});
  },
  capture(stepMs){
   if(finished)return;
   elapsedMs+=stepMs;
   frames.push(snapshot(run,elapsedMs,turns));
   turns=[];
   const firstInWindow=frames.findIndex(frame=>frame.elapsedMs>=elapsedMs-REVIEW_WINDOW_MS);
   if(firstInWindow>0)frames.splice(0,firstInWindow);
   finished=run.status==="over"||run.status==="won";
  },
  loss(){
   if(!finished||run.status!=="over")return null;
   return {boss:run.lairBoss,seed:run.seed,frames:[...frames],reason:run.endReason};
  }
 };
}

const WARNING_NAMES=Object.freeze({rock:"Rock",seal:"Seal",rift:"Rift",egg:"Egg"});
const position=tile=>`column ${tile.x+1}, row ${tile.y+1}`;

export function describeLossFrame(frame){
 const warnings=[];
 if(frame.encounter?.telegraph)warnings.push(`Burrow exit at ${position(frame.encounter.telegraph.pos)}`);
 for(const tile of frame.terrain){
  if(tile.warningMs>0)warnings.push(`${WARNING_NAMES[tile.kind]} warning at ${position(tile.pos)}`);
 }
 for(const web of frame.encounter?.webs??[])warnings.push(`Web at ${position(web.pos)}`);
 return {
  turns:frame.turns.map(turn=>`${turn.heading} (${turn.source})`).join(", ")||"None on this step",
  warnings:warnings.join("; ")||"None on this step",
  heading:frame.direction,
  finding:frame.ending||(frame.encounter?.stunMs>0?"Swarm webbed":"")
 };
}
