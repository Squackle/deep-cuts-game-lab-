// Mana Heist liquid-mixing colors: precomputed ONCE at module load.
// Preblend every reachable six-color count combination of up to ten mana:
// no palette calculation or network loading is required on orb arrival.
// This is visual only; costs and spending are defined by engine.js.
export const COLOR_ORDER=Object.freeze(["W","U","B","R","G","C"]);
export const COLOR_RGB=Object.freeze({
 W:Object.freeze([255,242,205]),
 U:Object.freeze([38,87,255]),
 B:Object.freeze([105,43,144]),
 R:Object.freeze([255,28,50]),
 G:Object.freeze([25,207,108]),
 C:Object.freeze([177,205,216])
});
const key=counts=>COLOR_ORDER.map(c=>counts[c]||0).join(",");
const encoded=rgb=>"rgb("+rgb.map(v=>Math.round(v)).join(",")+")";
const MIXES=new Map();
function populate(counts,offset,remaining){
 if(offset===COLOR_ORDER.length){
  let total=0,r=0,g=0,b=0;
  for(const c of COLOR_ORDER){
   const n=counts[c]||0;if(!n)continue;
   total+=n;r+=COLOR_RGB[c][0]*n;g+=COLOR_RGB[c][1]*n;b+=COLOR_RGB[c][2]*n;
  }
  MIXES.set(key(counts),total?Object.freeze([Math.round(r/total),Math.round(g/total),Math.round(b/total)]):Object.freeze([45,78,91]));
  return;
 }
 const c=COLOR_ORDER[offset];
 for(let n=0;n<=remaining;n++){counts[c]=n;populate(counts,offset+1,remaining-n);}
}
populate({},0,10);
export const PRELOADED_MIX_COUNT=MIXES.size;
export function countsFor(orbs){
 const counts=Object.fromEntries(COLOR_ORDER.map(c=>[c,0]));
 for(const o of orbs||[])if(o&&Object.hasOwn(counts,o.color))counts[o.color]++;
 return counts;
}
export function rgbForCounts(counts){
 const cached=MIXES.get(key(counts));
 if(cached)return cached;
 let r=0,g=0,b=0,total=0;
 for(const c of COLOR_ORDER){
  const n=Math.max(0,counts?.[c]||0);
  total+=n;r+=n*COLOR_RGB[c][0];g+=n*COLOR_RGB[c][1];b+=n*COLOR_RGB[c][2];
 }
 return total?[Math.round(r/total),Math.round(g/total),Math.round(b/total)]:[45,78,91];
}
export function rgbForOrbs(orbs){return rgbForCounts(countsFor(orbs));}
export function cssForOrbs(orbs){return encoded(rgbForOrbs(orbs));}
