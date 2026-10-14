/** Offline deterministic testing: never makes a network call. */
import {chicagoDay,dailySeed} from "./modes.js";
export function createSoloSession(mode="hunt",challenge="arcade",date=new Date(),random=Math.random){
 if(!["hunt","classic"].includes(mode))throw Error("Unknown mode");
 if(!["arcade","daily"].includes(challenge))throw Error("Unknown expedition");
 const day=challenge==="daily"?chicagoDay(date):"";
 let seed=0;
 if(day)seed=dailySeed(day,mode);
 else if(typeof crypto!=="undefined"&&typeof crypto.getRandomValues==="function")
  seed=crypto.getRandomValues(new Uint32Array(1))[0]>>>0;
 else seed=Math.floor(random()*4294967296)>>>0;
 return {seed:seed||1,day,ranked:false};
}
