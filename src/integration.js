/**
 * Portable integration points for future merge into Deep Cuts EDH.
 * Copy the entire game folder to /games/hive-run/ and mirror its Functions route.
 * All assets and API paths are relative to this module, not site root.
 * Public profile URLs remain intentionally external while sites are separate.
 */
export const GAME_ID="hive-run";
export const PROFILE_ORIGIN="https://deep-cuts-edh.pages.dev";
export const API_URL=new URL("../api/leaderboard",import.meta.url).toString();
export const profileLink=handle=>{
 if(typeof handle!=="string"||!/^[A-Za-z][A-Za-z0-9_]{2,23}$/.test(handle))return null;
 return PROFILE_ORIGIN+"/community.html?profile="+encodeURIComponent(handle);
};
export function gamePaths(){
 return {assetRoot:new URL("../assets/",import.meta.url).toString(),api:API_URL,profileOrigin:PROFILE_ORIGIN};
}
