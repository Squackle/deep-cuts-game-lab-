/** In-memory score records per mode / expedition, reset with each page load. */
export function createSessionBest(){
 const values=new Map();
 return Object.freeze({
  get:key=>values.get(key)||0,
  record(key,score){
   const safe=Number.isFinite(score)?Math.max(0,Math.floor(score)):0;
   const best=Math.max(values.get(key)||0,safe);
   values.set(key,best);return best;
  }
 });
}
