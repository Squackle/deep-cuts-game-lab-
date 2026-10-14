/** Standalone Arcade seeds. Lair has separate fixed boss fixtures. */
export function createSoloSession(mode="hunt",challenge="arcade",_date=new Date(),random=Math.random){
 if(!["hunt","classic"].includes(mode))throw Error("Unknown mode");
 if(challenge!=="arcade")throw Error("Unknown expedition");
 const seed=typeof crypto!=="undefined"&&typeof crypto.getRandomValues==="function"?
  crypto.getRandomValues(new Uint32Array(1))[0]>>>0:Math.floor(random()*4294967296)>>>0;
 return {seed:seed||1,day:"",ranked:false};
}
