// Full ARCHEMANCY progression reset. Never clear the whole origin: other Game Lab
// games, sound preferences and downloaded card-art metadata share localStorage.
export const GAME_PROGRESS_KEYS=Object.freeze([
 "archemancy.progress.v1", // XP, level, commanders, maps, stars, trials, codex, deck, shop
 "archemancy.run.v1",      // latest resumable battle
 "archemancy.daily.v1",    // daily completions and streaks
 "archemancy.tips.v1"      // first-play tutorial completion
]);

export function resetGameProgress(storage){
 if(!storage)return true; // No persistent storage: reloading still resets this session.
 try{
  for(const key of GAME_PROGRESS_KEYS)storage.removeItem(key);
  // Fail closed if the browser blocks or silently ignores persistent deletions.
  return GAME_PROGRESS_KEYS.every(key=>storage.getItem(key)===null);
 }catch{return false;}
}
