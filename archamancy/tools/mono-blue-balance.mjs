// Deterministic command-only Mono-Blue Trial balance benchmark. No artificial mana, HP, or enemy changes.
// The loadout matches the reported 13.53 Caldera playtest. This is not a replay of that player's commands.
import { createEngine } from "../engine.mjs";
export function playMonoBlue({seed=1,map="caldera",onslaught=true,difficulty="hard",mirrorRatio=.65,mirrorTier4=26,engine=createEngine}={}){
 const g=engine(seed,"campaign",map),s=g.state,cmd=c=>g.command(c);
 const setup=[{type:"difficulty",level:difficulty},{type:"perks",perks:{W:1,U:1,command:1}},{type:"commander",id:"urza"},{type:"onslaught",on:onslaught},{type:"kit",relics:["signet","boots","rhystic"],lands:{W:1,U:3,B:1,R:1,G:1},deck:["meteor","flame","legion","ward","inquiry","freeze","root","offering","deathmark","funeral","prism","bloom","awaken","matrix","lightning"]}];
 for(const c of setup)if(!cmd(c))throw Error("Invalid benchmark setup: "+c.type);
 const points=g.map.spans.flatMap(([a,b])=>Array.from({length:Math.ceil((b-a)/25)},(_,i)=>g.pointAt(a+i*25)));
 const pads=g.map.pads.map(p=>({...p,score:points.filter(q=>Math.hypot(q.x-p.x,q.y-p.y)<=165+(p.bonus==="height"?30:0)&&!g.map.tunnel.some(z=>q.x>=z.x&&q.x<=z.x+z.w&&q.y>=z.y&&q.y<=z.y+z.h)).length})).sort((a,b)=>b.score-a.score||a.id-b.id);
 const lookup=Object.fromEntries(pads.map(p=>[p.id,p]));
 function invest(){
  const ts=Object.values(s.towers),num=k=>ts.filter(t=>t.kind===k).length,n=ts.length;
  const candidates=[];
  for(const p of pads)if(!s.towers[p.id]){
   const kind=(num("mirror")<Math.ceil(num("arcanum")*mirrorRatio)&&n>=2)?"mirror":"arcanum";
   const cost=g.roster[kind].cost+(s.rubble[p.id]||0);
   const score=p.score*(kind==="mirror"?1.05:1)/cost;
   candidates.push({score,cost,c:{type:s.rubble[p.id]?"clear":"build",pad:p.id,kind}});
  }
  for(const t of ts){
   if(t.tier>=4||t.kind==="library")continue;
   const branch=t.kind==="mirror"?"A":ts.filter(x=>x.kind==="arcanum"&&x.branch==="A").length<Math.max(1,Math.ceil(num("arcanum")/4))?"A":"B";
   const values=t.kind==="arcanum"?[1,2.25,branch==="B"?8.5:5.5,t.branch==="B"?37:20]:[1,2.1,5.6,mirrorTier4];
   const cost=g.upgradeCost(t);
   const score=lookup[t.id].score*(values[t.tier]-values[t.tier-1])/cost*.8;
   candidates.push({score,cost,c:{type:"upgrade",pad:t.id,...(t.tier===2?{branch}:{})}});
  }
  const options=(n<3?candidates.filter(x=>x.c.type==="build"||x.c.type==="clear"):candidates).sort((a,b)=>b.score-a.score||a.c.pad-b.c.pad);
  if(!options.length||s.mana<options[0].cost)return false;
  return cmd(options[0].c);
 }
 const discard=new Set(["legion","offering","funeral","bloom","twins","valor","rally","raise","verdant","blade","forge","bloodrush","resonance","ward"]);
 function spell(){
  const es=s.enemies.filter(e=>e.hp>0&&!e.escaped&&!g.inTunnel(e));if(!es.length)return;
  for(let i=0;i<s.hand.length;i++)if(discard.has(s.hand[i])){cmd({type:"discard",index:i});return;}
  if(!s.freeCast&&s.mana<450)return;
  const groups=es.map(e=>({e,q:g.pointAt(e.progress)}));
  const best=groups.reduce((best,x)=>{let score=0;for(const y of groups)if(Math.hypot(x.q.x-y.q.x,x.q.y-y.q.y)<=110)score+=(y.e.boss?3:y.e.resist>=100?.3:1);return !best||score>best.score?{...x,score}:best},null);
  for(const id of ["meteor","lightning","deathmark","flame","freeze","root","matrix","awaken","wild","inquiry","prism","echo"]){
   const i=s.hand.indexOf(id);if(i<0)continue;const card=g.cards[id];
   if(card.target==="ground"&&best&&(best.score>=5||best.e.boss)&&cmd({type:"cast",index:i,...best.q}))return;
   if(card.target==="none"&&cmd({type:"cast",index:i}))return;
   if(card.target==="tower"){const t=Object.values(s.towers).filter(t=>t.kind!=="library").sort((a,b)=>b.tier-a.tier||b.damage-a.damage)[0];if(t&&cmd({type:"cast",index:i,pad:t.id}))return;}
  }
 }
 const [from,to]=g.map.spans.at(-1),q=g.pointAt(from+Math.floor((to-from)*.84));cmd({type:"commanderMove",...q});
 for(let i=0;i<10&&invest();i++);cmd({type:"wave"});
 for(let tick=0;tick<26000&&!["won","lost"].includes(s.phase);tick++){
  if(s.phase==="ready"){for(let n=0;n<20&&invest();n++);cmd({type:"wave"});}
  if(tick%20===0){for(let n=0;n<4&&invest();n++);if(g.abilityReady()&&!s.freeCast)cmd({type:"ability"});spell();}
  g.step();
 }
 const colors=[...Object.values(s.towers),...s.towerHistory].map(t=>g.roster[t.kind].color);
 return {seed,map,onslaught,difficulty,phase:s.phase,won:s.phase==="won"&&s.wave===25,monoBlue:colors.length>0&&colors.every(c=>c==="U"),wave:s.wave,completed:s.waveHistory.length,health:s.health,kills:s.stats.kills,leaks:s.stats.leaks,wardenLeaks:s.enemyLeaks.warden||0,stalkerLeaks:s.enemyLeaks.stalker||0,casts:s.stats.casts,towers:Object.values(s.towers).map(t=>[t.kind,t.tier,t.branch]),tick:s.tick};
}
if(import.meta.url==="file://"+process.argv[1]){
 const n=Math.max(1,Math.min(20,Number(process.argv[2])||3)),map=process.argv[3]||"caldera",difficulty=process.argv[4]||"hard";
 for(let seed=1;seed<=n;seed++)console.log(JSON.stringify(playMonoBlue({seed,map,difficulty,onslaught:!process.argv.includes("--standard")})));
}
