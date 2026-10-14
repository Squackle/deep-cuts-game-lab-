export const MODES=Object.freeze({hunt:{name:'Predator Hunt',verb:'HUNT',description:'Trap wandering Skitters and straight-running prey. Outsmart smarter guardians and their powers.'},classic:{name:'Brood Trail',verb:'TRAIL',description:'Classic Snake, born in the hive. Collect orbs, grow and evolve. No enemies or bosses.'}});
export function chicagoDay(date=new Date()){
 return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
export function dailySeed(day,mode){
 let hash=2166136261;
 for(const char of 'hive-1.0.1|'+day+'|'+mode){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619)}
 return (hash>>>0)||1;
}
export const boardKey=(mode,challenge,day)=>mode+'|'+(challenge==='daily'?day:'arcade');
