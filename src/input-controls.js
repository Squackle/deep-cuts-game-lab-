/** Single keyboard routing, shared by the browser and deterministic tests. */
export const KEY_DIRECTIONS=Object.freeze({
 ArrowUp:"up",ArrowRight:"right",ArrowDown:"down",ArrowLeft:"left",
 w:"up",a:"left",s:"down",d:"right",
 W:"up",A:"left",S:"down",D:"right"
});
export function keyboardDirection(key,repeat=false){
 return repeat?null:(KEY_DIRECTIONS[key]??null);
}
