/**
 * HIVE RUN — deterministic arcade + WUBRG evolution model.
 * No DOM, timers, networking or audio here. Supports seeded RNG for tests.
 */
export const DIRECTIONS=Object.freeze({
 up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}
});
export const COLORS=Object.freeze(["W","U","B","R","G"]);
export const MUTATIONS=Object.freeze({
 W:Object.freeze({color:"W",name:"Hardened Shell",school:"CARAPACE",icon:"◈",description:"Gain one impact shield. A fatal crash deflects your swarm to safety.",short:"+1 shield"}),
 U:Object.freeze({color:"U",name:"Temporal Drift",school:"ADAPTATION",icon:"◷",description:"Slow the arena for 28 movements. Gain control over difficult turns.",short:"28 slow steps"}),
 B:Object.freeze({color:"B",name:"Emergency Molt",school:"REGENERATION",icon:"✦",description:"Bank one emergency escape. Shed three tail segments to survive a fatal hit.",short:"+1 molt"}),
 R:Object.freeze({color:"R",name:"Blood Rush",school:"FRENZY",icon:"✹",description:"Move 22% faster and score double points for 24 movements.",short:"24 frenzy steps"}),
 G:Object.freeze({color:"G",name:"Rapid Brood",school:"BROOD",icon:"✿",description:"Your next four brood pickups each grow an extra segment.",short:"4 bonus pickups"})
});
const eq=(a,b)=>a.x===b.x&&a.y===b.y;
const key=p=>p.x+","+p.y;
const value=(fn)=>{const n=Number(fn());return Number.isFinite(n)?Math.max(0,Math.min(.999999999999,n)):0};
const clone=p=>({x:p.x,y:p.y});
export function emptyTile(body,cols,rows,random=Math.random){
 const occupied=new Set(body.map(key)),free=[];
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)
  if(!occupied.has(x+","+y))free.push({x,y});
 return free.length?free[Math.floor(value(random)*free.length)]:null;
}
export function draftMutationOptions(random=Math.random){
 const remaining=[...COLORS],result=[];
 for(let i=0;i<3;i++)result.push(remaining.splice(Math.floor(value(random)*remaining.length),1)[0]);
 return result;
}
export function newRun({cols=18,rows=22,random=Math.random}={}){
 if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<8||rows<8)throw Error("Invalid arena dimensions");
 const y=Math.floor(rows/2),x=Math.max(2,Math.floor(cols/2));
 const body=[{x,y},{x:x-1,y},{x:x-2,y}];
 return {cols,rows,body,direction:"right",turnQueue:[],food:emptyTile(body,cols,rows,random),
  score:0,brood:0,stage:1,tickMs:135,status:"ready",endReason:"",random,
  draftOptions:[],draftCount:0,lastMutation:null,mutations:{W:0,U:0,B:0,R:0,G:0},
  effects:{shield:0,molt:0,blueTicks:0,redTicks:0,greenPickups:0},growthDebt:0,
  moves:0,saves:0,event:null,eventSerial:0};
}
export function start(run){
 if(run.status==="ready"||run.status==="paused")run.status="running";
 return run;
}
export function pause(run){if(run.status==="running")run.status="paused";return run}
export function turn(run,heading){
 if(!Object.hasOwn(DIRECTIONS,heading)||run.status!=="running")return false;
 if(run.turnQueue.length>=2)return false;
 const last=run.turnQueue.at(-1)??run.direction;
 const a=DIRECTIONS[last],b=DIRECTIONS[heading];
 if(a.x+b.x===0&&a.y+b.y===0)return false;
 if(eq(a,b))return false;
 run.turnQueue.push(heading);return true;
}
export function chooseMutation(run,color){
 if(run.status!=="draft"||!run.draftOptions.includes(color)||!MUTATIONS[color])return false;
 run.mutations[color]++;
 const e=run.effects;
 if(color==="W")e.shield++;
 if(color==="U")e.blueTicks=Math.min(84,e.blueTicks+28);
 if(color==="B")e.molt++;
 if(color==="R")e.redTicks=Math.min(72,e.redTicks+24);
 if(color==="G")e.greenPickups=Math.min(12,e.greenPickups+4);
 run.lastMutation={color,name:MUTATIONS[color].name,move:run.moves};
 run.draftOptions=[];run.status="running";run.turnQueue=[];
 run.event={type:"mutation",color,name:MUTATIONS[color].name};run.eventSerial++;
 return true;
}
export function effectiveTickMs(run){
 const blue=run.effects.blueTicks>0?1.35:1;
 const red=run.effects.redTicks>0?.78:1;
 return Math.max(65,Math.round(run.tickMs*blue*red));
}
function decreaseDuration(run){
 if(run.effects.blueTicks>0)run.effects.blueTicks--;
 if(run.effects.redTicks>0)run.effects.redTicks--;
}
function lethalReason(wall){return wall?"You hit the arena wall.":"You crossed your own swarm."}
function evaluateNext(run,direction){
 const d=DIRECTIONS[direction],h=run.body[0];
 const candidate={x:h.x+d.x,y:h.y+d.y};
 const wall=candidate.x<0||candidate.x>=run.cols||candidate.y<0||candidate.y>=run.rows;
 if(wall)return {wall:true,body:false,candidate};
 const eating=!!run.food&&eq(candidate,run.food);
 const occupied=eating?run.body:run.body.slice(0,-1);
 return {wall:false,body:occupied.some(p=>eq(p,candidate)),candidate,eating};
}
function escapeHeading(run,failed){
 // Never reverse; choose a valid bend. The choice is deterministic and
 // prefers a left/right diversion over an unpredictable teleport.
 const options=["up","right","down","left"],index=options.indexOf(failed);
 for(const offset of [3,1]){
  const d=options[(index+offset)%4];
  const probe=evaluateNext(run,d);
  if(!probe.wall&&!probe.body)return d;
 }
 return null;
}
function recoverPosition(run,length){
 // Last-resort blink when trapped on all sides. Keep score, abilities and
 // length-to-regrow instead of consuming a shield but still ending the run.
 const y=Math.floor(run.rows/2),x=Math.max(2,Math.floor(run.cols/2));
 run.body=[{x,y},{x:x-1,y},{x:x-2,y}];
 run.direction="right";
 run.growthDebt+=Math.max(0,length-3);
 if(run.food&&run.body.some(p=>eq(p,run.food)))
  run.food=emptyTile(run.body,run.cols,run.rows,run.random);
}
function rescue(run,failed){
 const e=run.effects;
 let color;
 if(e.shield>0){e.shield--;color="W"}
 else if(e.molt>0&&run.body.length>=5){e.molt--;color="B"}
 else return false;
 const oldLength=run.body.length;
 if(color==="B"){
  run.body.splice(Math.max(2,run.body.length-3));
  run.growthDebt=Math.min(run.growthDebt,run.body.length);
 }
 const safe=escapeHeading(run,failed);
 if(safe){run.direction=safe;run.turnQueue=[]}
 else recoverPosition(run,run.body.length);
 run.saves++;
 run.event={type:"rescue",color,name:color==="W"?"Hardened Shell":"Emergency Molt"};
 run.eventSerial++;
 // A collision consumes one simulation step and preserves an escape window:
 // no movement until the following tick, and no instant repeat collision.
 decreaseDuration(run);run.moves++;
 // A successful recovery cannot place food inside a body tile.
 if(run.food&&run.body.some(p=>eq(p,run.food)))
  run.food=emptyTile(run.body,run.cols,run.rows,run.random);
 return true;
}
export function step(run){
 if(run.status!=="running")return run;
 const going=run.turnQueue.shift()??run.direction;
 const target=evaluateNext(run,going);
 if(target.wall||target.body){
  run.direction=going;
  if(rescue(run,going))return run;
  run.status="over";run.endReason=lethalReason(target.wall);return run;
 }
 run.direction=going;
 run.body.unshift(target.candidate);
 if(target.eating){
  const multiplier=run.effects.redTicks>0?2:1;
  run.score+=100*multiplier;
  run.brood++;
  if(run.effects.greenPickups>0){
   run.effects.greenPickups--;
   run.growthDebt++;
  }
  run.stage=1+Math.floor(run.brood/5);
  run.tickMs=Math.max(85,135-Math.floor(run.brood/5)*6);
  run.food=emptyTile(run.body,run.cols,run.rows,run.random);
  if(!run.food){run.status="won";run.endReason="The entire arena is yours!"}
 }else if(run.growthDebt>0)run.growthDebt--;
 else run.body.pop();
 decreaseDuration(run);run.moves++;
 if(target.eating){
  run.event={type:"brood",color:null,multiplier:run.effects.redTicks>0?2:1};
  run.eventSerial++;
  if(run.status==="running"&&run.brood%5===0){
   run.status="draft";run.draftCount++;
   run.draftOptions=draftMutationOptions(run.random);
   run.event={type:"draft",color:null,name:"Choose a mutation"};
   run.eventSerial++;
  }
 }
 return run;
}
export function progress(run){
 return {stage:run.stage,untilNext:5-(run.brood%5),speedMs:effectiveTickMs(run),drafts:run.draftCount}
}
export function activeEffects(run){
 const e=run.effects,parts=[];
 if(e.shield>0)parts.push({color:"W",count:e.shield,label:e.shield+" shield"+(e.shield===1?"":"s")});
 if(e.blueTicks>0)parts.push({color:"U",count:e.blueTicks,label:e.blueTicks+" slow steps"});
 if(e.molt>0)parts.push({color:"B",count:e.molt,label:e.molt+" molt"+(e.molt===1?"":"s")});
 if(e.redTicks>0)parts.push({color:"R",count:e.redTicks,label:e.redTicks+" frenzy steps"});
 if(e.greenPickups>0)parts.push({color:"G",count:e.greenPickups,label:e.greenPickups+" bonus brood"});
 return parts;
}
