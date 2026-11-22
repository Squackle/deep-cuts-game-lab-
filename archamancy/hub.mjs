// Where the "back" links go. On the Game Lab they return to the Lab hub. When ARCHEMANCY is promoted to the
// main Deep Cuts site, the same build automatically points at the Arcade hub (/games) instead.
// A page can also force a hub with <meta name="archemancy-hub" content="/path|Label">.
const LAB_HOSTS=/(^|\.)deep-cuts-game-lab\.pages\.dev$|^localhost$|^127\.0\.0\.1$|^\[::1\]$|\.test$|\.localhost$/;
export const HUBS={lab:{href:"/",label:"Back to Game Lab"},arcade:{href:"/games",label:"Back to Arcade"}};
export function hubFor(host="",override=""){
 const m=/^(\/(?!\/)[^|\s]*)\|(.+)$/.exec(String(override||"").trim());
 if(m)return {href:m[1],label:m[2].trim()};
 return LAB_HOSTS.test(String(host).toLowerCase())?HUBS.lab:HUBS.arcade;
}
