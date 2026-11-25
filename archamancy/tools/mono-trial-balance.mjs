// Command-only benchmark of the five mono-color trial strategies. No state mutation or artificial resources.
// A reproducible strategy is not a proof of optimal play. All scenarios use progressed campaign perks/relics.
import {createEngine} from "../engine.mjs";
import {STARTER_DECK} from "../campaign.mjs";
import {playMonoBlue,OPTIMIZED_DECK} from "./mono-blue-balance.mjs";
const CONFIG={
 W:{commander:"heliod",kinds:["judgment","legion","chapel"],ratio:[.68,.2,.12],deck:["legion","ward","twins","rally","valor","prism","resonance","matrix","blade","forge"],branch:{judgment:["A","B"],legion:["A","B"],chapel:["B","A"]}},
 B:{commander:"toxrill",kinds:["hex","necropolis","foundry"],ratio:[.58,.29,.13],deck:["raise","offering","recall","funeral","deathmark","prism","resonance","matrix","blade","forge"],branch:{hex:["A","B"],necropolis:["B","A"],foundry:["A","B"]}},
 R:{commander:"torbran",kinds:["storm","pyre","goblin"],ratio:[.55,.35,.10],deck:["meteor","flame","bloodrush","lightning","cascade","prism","resonance","matrix","blade","forge"],branch:{storm:["A","B"],pyre:["B","A"],goblin:["B","A"]}},
 G:{commander:"omnath",kinds:["thorn","beast","grove"],ratio:[.32,.42,.26],deck:["wild","root","verdant","awaken","bloom","prism","resonance","matrix","blade","forge"],branch:{thorn:["B","A"],beast:["A","B"],grove:["A","B"]}}
};
export function playMono({color="G",map="hollow",seed=1,difficulty="hard",onslaught=true,optimized=true,resumeEvery=0,engine=createEngine}={}){
 if(color==="U"){const r=playMonoBlue({map,seed,difficulty,onslaught,engine,commander:optimized?"atraxa":"urza",deck:optimized?OPTIMIZED_DECK:STARTER_DECK,resumeEvery,includeReport:true});return {...r,color,optimized,eligible:r.monoBlue};}
 const cf=CONFIG[color];if(!cf)throw Error("Unknown color");let g=engine(seed,"campaign",map),s=g.state;const cmd=c=>g.command(c);
 const deck=optimized?cf.deck:STARTER_DECK;
 for(const c of [{type:"difficulty",level:difficulty},{type:"perks",perks:{[color]:1,command:1}},{type:"commander",id:cf.commander},{type:"onslaught",on:onslaught},{type:"kit",deck,relics:["signet","boots","rhystic"],lands:{W:1,U:1,B:1,R:1,G:1,[color]:3}}])if(!cmd(c))throw Error("Invalid setup "+c.type);
 const points=g.map.spans.flatMap(([a,b])=>Array.from({length:Math.ceil((b-a)/25)},(_,i)=>g.pointAt(a+i*25))).filter(q=>!g.map.tunnel.some(z=>q.x>=z.x&&q.x<=z.x+z.w&&q.y>=z.y&&q.y<=z.y+z.h));
 const pads=g.map.pads.map(p=>({...p,score:Object.fromEntries(cf.kinds.map(k=>[k,points.filter(q=>Math.hypot(q.x-p.x,q.y-p.y)<=g.roster[k].range+(p.bonus==="height"?30:0)).length]))}));
 const troops=()=>Object.values(s.towers).filter(t=>g.roster[t.kind].kind==="troops");
 function val(p,k){if(k==="grove")return p.bonus==="spring"?48:Math.max(15,33-Math.max(...Object.values(p.score)));if(["chapel","foundry"].includes(k))return p.score[k]*.3+troops().filter(t=>Math.hypot(g.map.pads[t.id].x-p.x,g.map.pads[t.id].y-p.y)<g.roster[k].range).length*18;return p.score[k];}
 function build(k,id){const choices=pads.filter(p=>!s.towers[p.id]).sort((a,b)=>val(b,k)-val(a,k)||a.id-b.id),p=id==null?(choices.find(p=>!s.rubble[p.id])||choices[0]):pads[id];if(!p||s.towers[p.id])return false;const ok=cmd({type:s.rubble[p.id]?"clear":"build",pad:p.id,kind:k});if(ok&&k==="beast"&&map==="confluence"&&s.towers[p.id]&&p.x>=210&&Math.abs(p.y-300)<=g.roster.beast.range)cmd({type:"rally",pad:p.id,x:p.x,y:300});return ok;}
 const up=(t,branch)=>cmd({type:"upgrade",pad:t.id,...(t.tier===2?{branch}:{})});
 function invest(){const ts=Object.values(s.towers),n=ts.length,num=k=>ts.filter(t=>t.kind===k).length;
  if(color==="G"){const be=map==="confluence"?s.towers[4]:ts.find(t=>t.kind==="beast");if(!be)return build("beast",map==="confluence"?4:undefined);if(!num("grove"))return build("grove",map==="confluence"?19:undefined);if(be.tier<3)return up(be,"A");if(!num("thorn"))return build("thorn",map==="confluence"?5:undefined);if(s.wave>=7&&!ts.some(t=>t.kind==="thorn"&&t.branch==="B"))return up(ts.find(t=>t.kind==="thorn"),"B");if(num("grove")<Math.min(5,1+Math.floor(s.wave/5)))return build("grove");}
  let k=cf.kinds[0];if(n>=2){let deficit=-Infinity;for(let i=0;i<3;i++){const d=(n+1)*cf.ratio[i]-num(cf.kinds[i]);if(d>deficit){deficit=d;k=cf.kinds[i];}}}
  const choices=[];
  for(const p of pads)if(!s.towers[p.id]){const cost=g.roster[k].cost+(s.rubble[p.id]||0);choices.push({score:val(p,k)/cost,cost,pad:p.id,upgrade:false,act:()=>build(k,p.id)});}
  for(const t of ts)if(t.tier<4){const k=t.kind,b=cf.branch[k],branch=ts.filter(x=>x.kind===k&&x.branch===b[0]).length<Math.ceil(num(k)*.65)?b[0]:b[1],cost=g.upgradeCost(t);let values=[1,2.2,6.8,26];if(k==="grove")values=[1,2.5,6.5,16];if(k==="beast")values=[1,2.5,10,30];if(k==="thorn")values=[1,2.2,9,26];if(k==="judgment"&&branch==="A")values=[1,2.2,9,26];if(["chapel","foundry"].includes(k))values=[1,1.8,5,16];choices.push({score:val(pads[t.id],k)*(values[t.tier]-values[t.tier-1])/cost*.8,cost,pad:t.id,upgrade:true,act:()=>up(t,branch)});}
  const opts=(n<3?choices.filter(x=>!x.upgrade):choices).sort((a,b)=>b.score-a.score||a.pad-b.pad);return !!opts.length&&s.mana>=opts[0].cost&&opts[0].act();}
 const perms={twins:"twins",blade:"blade",forge:"construct",funeral:"funeral",resonance:"resonance"};
 const tc=new Set(["legion","twins","valor","raise","offering","funeral","bloom","forge","rally","bloodrush","verdant","blade","ward","resonance"]);
 function cast(){const es=s.enemies.filter(e=>e.hp>0&&!e.escaped&&!g.inTunnel(e));if(!es.length)return;const ts=Object.values(s.towers),tt=troops().sort((a,b)=>b.tier-a.tier||b.damage-a.damage),atk=ts.filter(t=>["strike","chain","hex","root","splash"].includes(g.roster[t.kind].kind)).sort((a,b)=>b.tier-a.tier||b.damage-a.damage),sorted=ts.slice().sort((a,b)=>b.tier-a.tier||b.damage-a.damage);const groups=es.map(e=>({e,q:g.pointAt(e.progress)}));let best=null;for(const x of groups){let score=0;for(const y of groups)if(Math.hypot(x.q.x-y.q.x,x.q.y-y.q.y)<=110)score+=y.e.boss?3:1;if(!best||score>best.score)best={...x,score};}
  for(let i=0;i<s.hand.length;i++){const id=s.hand[i],card=g.cards[id];if(color==="G"&&s.wave<5&&!tt.some(t=>t.branch==="A")&&id!=="wild")continue;if(!s.freeCast&&s.mana<Math.max(120,g.castCost(id)+40)&&id!=="offering")continue;
   if(card.target==="ground"&&best&&(best.score>=4||best.e.boss)&&cmd({type:"cast",index:i,...best.q}))return;
   if(card.target==="none"&&cmd({type:"cast",index:i}))return;
   if(card.target==="tower"){const targets=tc.has(id)?tt:id==="wild"?(color==="G"?ts.filter(t=>t.kind==="grove"&&t.growth<3).concat(atk):atk):id==="matrix"||id==="awaken"?atk.concat(tt):sorted;for(const t of targets){if(perms[id]&&t[perms[id]]||id==="resonance"&&!t.funeral&&!g.bonus(t,"death")||id==="wild"&&t.growth>=10)continue;if(cmd({type:"cast",index:i,pad:t.id}))return;}}}
  if(s.hand.length>=5&&s.mana>200){const i=s.hand.findIndex(id=>tc.has(id)&&(!tt.length||perms[id]&&tt.every(t=>t[perms[id]])||id==="resonance"&&!tt.some(t=>t.funeral||g.bonus(t,"death"))));if(i>=0)cmd({type:"discard",index:i});}}
 const [from,to]=g.map.spans.at(-1);cmd({type:"commanderMove",...(color==="G"&&map==="confluence"?{x:460,y:300}:g.pointAt(from+Math.floor((to-from)*.70)))});for(let n=0;n<10&&invest();n++);cmd({type:"wave"});
 for(let tick=0;tick<26000&&!["won","lost"].includes(s.phase);tick++){
  if(s.phase==="ready"){for(let n=0;n<20&&invest();n++);cmd({type:"wave"});}
  if(tick%20===0){for(let n=0;n<4&&invest();n++);if(g.abilityReady())cmd({type:"ability"});cast();}g.step();
  if(resumeEvery&&g.state.tick%resumeEvery===0&&["active","ready"].includes(g.state.phase)){const saved=JSON.parse(JSON.stringify(g.snapshot())),next=engine(1,s.initialMode,s.mapId);if(!next.restore(saved))throw Error("Resume failed "+color+" "+map+" "+s.tick);g=next;s=g.state;}
 }
 const colors=[...Object.values(s.towers),...s.towerHistory].map(t=>g.roster[t.kind].color);
 return {color,map,seed,difficulty,onslaught,optimized,commander:cf.commander,phase:s.phase,won:s.phase==="won"&&s.wave===25,wave:s.wave,completed:s.waveHistory.length,health:s.health,eligible:colors.length>0&&colors.every(x=>x===color),leaks:s.enemyLeaks,casts:s.stats.casts,report:g.playtestReport()};
}
if(import.meta.url==="file://"+process.argv[1]){
 const colors=process.argv[2]?[process.argv[2]]:[..."WUBRG"],maps=process.argv[3]?[process.argv[3]]:["hollow","confluence","frostfen","pass","caldera"],n=Math.max(1,Math.min(10,Number(process.argv[4])||1));
 for(const color of colors)for(const map of maps)for(let seed=1;seed<=n;seed++){const {report,...r}=playMono({color,map,seed,optimized:!process.argv.includes("--starter"),onslaught:!process.argv.includes("--standard"),difficulty:process.argv.find(x=>x.startsWith("--difficulty="))?.slice(13)||"hard"});console.log(JSON.stringify(r));}
}
