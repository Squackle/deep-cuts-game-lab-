// Daily Challenge: one fixed run per calendar day, the same for every player.
// Everything is derived from the date, so no server is needed. Results stay in this browser.
export const DAILY_KEY="archemancy.daily.v1";
export const DAILY_MAPS=["hollow","confluence","frostfen","pass"];
export const DAILY_COMMANDERS=["krenko","talrand","omnath","edgar","lightpaws","meren","teysa","korvold","atraxa","toxrill","torbran","urza","urdragon"];
const SCHOOLS=["W","U","B","R","G"];
const SCHOOL_NAMES={W:"White",U:"Blue",B:"Black",R:"Red",G:"Green"};
// Each twist uses only existing engine commands (difficulty, onslaught, tower locks), so runs stay deterministic.
export const TWISTS={
 onslaught:{name:"Onslaught",difficulty:"normal",desc:"Waves arrive every 30 seconds, cleared road or not."},
 duo:{name:"Two Colors",difficulty:"normal",desc:"Only two tower colors can be built."},
 hard:{name:"Hard Road",difficulty:"hard",desc:"Hard difficulty."},
 mono:{name:"Mono-Color",difficulty:"easy",desc:"Only one tower color can be built, on Easy."},
 banned:{name:"Banned Color",difficulty:"hard",desc:"One tower color is banned, on Hard."}
};

export function dateKey(d=new Date()){const p=n=>String(n).padStart(2,"0");return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate());}
function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let x=seed||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;x>>>=0;return x/4294967296;};}
const pick=(r,list)=>list[Math.floor(r()*list.length)];

// maps: {id:{name,seasons?}} from the engine's MAPS.
export function dailyFor(date,maps){
 const seed=hash("archemancy-daily:"+date)||1,r=rng(seed);
 const ids=DAILY_MAPS.filter(id=>maps?.[id]);const map=pick(r,ids.length?ids:["hollow"]);
 const season=pick(r,maps?.[map]?.seasons||["summer","autumn","winter"]);
 const commander=pick(r,DAILY_COMMANDERS);
 const twist=pick(r,Object.keys(TWISTS));
 const order=SCHOOLS.slice();for(let i=order.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
 const colors=twist==="mono"?[order[0]]:twist==="duo"?order.slice(0,2).sort((a,b)=>SCHOOLS.indexOf(a)-SCHOOLS.indexOf(b)):twist==="banned"?SCHOOLS.filter(c=>c!==order[0]):SCHOOLS.slice();
 const t=TWISTS[twist];
 const detail=twist==="mono"?"Only "+SCHOOL_NAMES[colors[0]]+" towers, on Easy.":twist==="duo"?"Only "+colors.map(c=>SCHOOL_NAMES[c]).join(" and ")+" towers.":twist==="banned"?"No "+SCHOOL_NAMES[order[0]]+" towers, on Hard.":t.desc;
 return {date,seed,map,season,commander,twist,twistName:t.name,detail,difficulty:t.difficulty,onslaught:twist==="onslaught",colors};
}
// Tower ids to lock for this challenge. roster: engine roster {id:{color}}.
export function dailyLocks(daily,roster){return Object.keys(roster).filter(k=>!daily.colors.includes(roster[k].color));}

// Higher is better: a win beats any loss, then stars, fortress left, wave reached.
export function score(r){return r?(r.won?1e6:0)+(r.stars||0)*1e4+(r.health||0)*100+(r.wave||0):-1;}
export function load(storage){try{const v=JSON.parse(storage?.getItem(DAILY_KEY)||"null");if(v&&typeof v==="object"&&v.days&&typeof v.days==="object")return v;}catch{}return {days:{}};}
export function save(storage,book){try{storage?.setItem(DAILY_KEY,JSON.stringify(book));}catch{}}
// Records a finished run. Returns {best, improved}. Keeps the last 60 days.
export function record(book,date,result){
 const day=book.days[date]||{best:null,tries:0};day.tries++;const improved=score(result)>score(day.best);if(improved)day.best=result;book.days[date]=day;
 const keys=Object.keys(book.days).sort();while(keys.length>60)delete book.days[keys.shift()];
 return {best:day.best,improved,tries:day.tries};
}
// Days in a row with a finished daily run, ending today (or yesterday if today is not played yet).
export function streak(book,today){
 let n=0,d=new Date(today+"T12:00:00");if(!book.days[today])d.setDate(d.getDate()-1);
 while(book.days[dateKey(d)]){n++;d.setDate(d.getDate()-1);}return n;
}
export function prettyDate(date){const d=new Date(date+"T12:00:00");return d.toLocaleDateString("en-US",{month:"short",day:"numeric"});}
