/** Optional synergies between ORIGINAL five WUBRG mutations (not new cards/colors). */
export function compostMoltCost(run){
 return run.mutations?.B>0&&run.mutations?.G>0&&run.effects?.greenPickups>0?2:3;
}
/** Temporal Drift + Blood Rush yields extra steering time while both are active. */
export function driftRushMultiplier(run){
 return run.effects?.blueTicks>0&&run.effects?.redTicks>0&&run.mutations?.U>0&&run.mutations?.R>0?1.5:1.35;
}
