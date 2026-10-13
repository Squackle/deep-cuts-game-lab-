/**
 * HIVE RUN — original-creature Snake-style arcade simulation.
 * This module intentionally has no DOM, canvas, timing or storage dependencies.
 * The random source may be injected to make spawn order deterministic in tests.
 */
export const DIRECTIONS=Object.freeze({
 up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}
});
const equal=(a,b)=>a.x===b.x&&a.y===b.y;
const key=p=>p.x+","+p.y;

export function emptyTile(body,cols,rows,random=Math.random){
 const occupied=new Set(body.map(key));
 const free=[];
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  if(!occupied.has(x+","+y))free.push({x,y});
 }
 if(!free.length)return null;
 const candidate=Number(random());
 const fraction=Number.isFinite(candidate)?Math.max(0,Math.min(0.999999999999,candidate)):0;
 return free[Math.floor(fraction*free.length)];
}
export function newRun({cols=18,rows=22,random=Math.random}={}){
 if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<8||rows<8)throw Error("Invalid arena dimensions");
 const y=Math.floor(rows/2),x=Math.max(2,Math.floor(cols/2));
 const body=[{x,y},{x:x-1,y},{x:x-2,y}];
 return {cols,rows,body,direction:"right",turnQueue:[],food:emptyTile(body,cols,rows,random),
  score:0,brood:0,stage:1,tickMs:120,status:"ready",endReason:"",random};
}
export function start(run){
 if(run.status==="ready")run.status="running";
 else if(run.status==="paused")run.status="running";
 return run;
}
export function pause(run){
 if(run.status==="running")run.status="paused";
 return run;
}
// Buffer two valid bends. Fast consecutive swipes needn't wait for each movement tick.
export function turn(run,heading){
 if(!Object.hasOwn(DIRECTIONS,heading)||run.status!=="running")return false;
 if(run.turnQueue.length>=2)return false;
 const last=run.turnQueue.at(-1)??run.direction;
 const current=DIRECTIONS[last],next=DIRECTIONS[heading];
 if(current.x+next.x===0&&current.y+next.y===0)return false;
 if(equal(current,next))return false;
 run.turnQueue.push(heading);
 return true;
}
export function step(run){
 if(run.status!=="running")return run;
 const going=run.turnQueue.shift()??run.direction;
 run.direction=going;
 const delta=DIRECTIONS[going],head=run.body[0];
 const next={x:head.x+delta.x,y:head.y+delta.y};
 if(next.x<0||next.x>=run.cols||next.y<0||next.y>=run.rows){
  run.status="over";run.endReason="You hit the arena wall.";return run;
 }
 const eating=!!run.food&&equal(next,run.food);
 const collisionBody=eating?run.body:run.body.slice(0,-1);
 if(collisionBody.some(part=>equal(part,next))){
  run.status="over";run.endReason="You crossed your own swarm.";return run;
 }
 run.body.unshift(next);
 if(eating){
  run.score+=100;run.brood++;
  run.stage=1+Math.floor(run.brood/5);
  run.tickMs=Math.max(75,120-Math.floor(run.brood/5)*6);
  run.food=emptyTile(run.body,run.cols,run.rows,run.random);
  if(!run.food){run.status="won";run.endReason="The entire arena is yours!"}
 }else run.body.pop();
 return run;
}
export function progress(run){return {stage:run.stage,untilNext:5-(run.brood%5),speedMs:run.tickMs}}
