// Presentation only. Historical boards have a reusable scenario reserve;
// candidate boards expose the remaining physical instances from engine state.
export function reservePresentation(level,state){
 const physical=Array.isArray(state.libraryAvailable);
 const available=physical?new Set(state.libraryAvailable):null;
 const cards=level.library.filter(c=>!physical||available.has(c.id));
 return {physical,cards,visible:level.library.length>0,
  label:physical?"REMAINING PHYSICAL RESERVE":"SCENARIO RESERVE (legacy search model)"};
}
