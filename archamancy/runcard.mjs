// Shareable run card: a 1080x1350 picture of a finished run, drawn on a canvas.
export const CARD_W=1080,CARD_H=1350;
const SEASON_TAG={summer:"Summer",autumn:"Autumn",winter:"Winter"};
const fmt=n=>Math.round(n||0).toLocaleString("en-US");

// Pure: turns the finished game into the card's text. Kept separate so it can be tested without a canvas.
export function cardData(game,{daily=null,levelName={},url="",stars=0}={}){
 const s=game.state,won=s.phase==="won",campaign=s.mode==="campaign";
 const towers=[...(s.towerHistory||[]),...Object.values(s.towers||{})].sort((a,b)=>b.damage-a.damage),best=towers[0];
 const diff=levelName[s.difficulty]||"Normal";
 const mode=daily?"Daily Challenge":campaign?(s.onslaught?"Onslaught ":"")+"Gauntlet":"Endless Siege";
 const cm=s.commander?game.commanders[s.commander.id]:null;
 return {
  won,mode,difficulty:diff,url,
  kicker:daily?"Daily · "+daily.pretty+" · "+daily.twistName:mode+" · "+diff,
  map:game.map.name,season:SEASON_TAG[s.season]||"",
  title:won?"VICTORY":campaign?"DEFEAT":"WAVE "+s.wave,
  stars:won?Math.max(0,Math.min(3,stars|0)):0,
  sub:won?s.health+" fortress left":campaign?"Fell on wave "+s.wave+" of 25":"Held until wave "+s.wave,
  commander:cm?{name:cm.name,damage:(s.commander.damage||0)+(s.stats.commanderArmyDamage||0)}:null,
  stats:[["Enemies defeated",fmt(s.stats.kills)],["Total damage",fmt(s.stats.damage)],["Mana earned",fmt(s.stats.manaEarned)],["Time",Math.floor(s.tick/600)+"m "+String(Math.floor(s.tick/10)%60).padStart(2,"0")+"s"]],
  best:best?{name:game.branchName(best),damage:best.damage}:null
 };
}
export function shareText(d){return "ARCHEMANCY "+d.kicker+": "+(d.won?"Victory "+"★".repeat(d.stars)+"☆".repeat(3-d.stars)+", "+d.sub:d.sub)+" on "+d.map+"."+(d.url?" Can you beat it? "+d.url:"");}

function round(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function fit(ctx,text,max,size,weight="700",family="Georgia, 'Times New Roman', serif"){let s=size;do{ctx.font=weight+" "+s+"px "+family;s-=2;}while(ctx.measureText(text).width>max&&s>14);return text;}

// mapImage: a canvas or image of the battlefield (1000x600 or any 5:3), or null.
export function drawRunCard(ctx,d,mapImage){
 const W=CARD_W,H=CARD_H,gold="#e9c66f",ink="#f3ead2",dim="#b9c4a8",sans="system-ui, -apple-system, 'Segoe UI', sans-serif";
 const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,"#1d3326");bg.addColorStop(1,"#0e1913");ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 ctx.strokeStyle=gold;ctx.lineWidth=6;round(ctx,18,18,W-36,H-36,28);ctx.stroke();ctx.strokeStyle="#7a5a26";ctx.lineWidth=2;round(ctx,32,32,W-64,H-64,22);ctx.stroke();
 ctx.textAlign="center";ctx.textBaseline="alphabetic";
 // Header
 ctx.fillStyle=gold;ctx.font="700 64px Georgia, 'Times New Roman', serif";ctx.fillText("ARCHEMANCY",W/2,112);
 ctx.fillStyle=dim;ctx.font="600 28px "+sans;fit(ctx,d.kicker.toUpperCase(),W-140,28,"600",sans);ctx.fillText(d.kicker.toUpperCase(),W/2,156);
 // Battlefield
 const mw=840,mh=504,mx=(W-mw)/2,my=180;
 ctx.save();round(ctx,mx,my,mw,mh,18);ctx.clip();
 if(mapImage){try{ctx.drawImage(mapImage,mx,my,mw,mh);}catch{ctx.fillStyle="#2c4a33";ctx.fillRect(mx,my,mw,mh);}}else{ctx.fillStyle="#2c4a33";ctx.fillRect(mx,my,mw,mh);}
 const shade=ctx.createLinearGradient(0,my+mh-110,0,my+mh);shade.addColorStop(0,"#0000");shade.addColorStop(1,"#000b");ctx.fillStyle=shade;ctx.fillRect(mx,my+mh-110,mw,110);
 ctx.restore();ctx.strokeStyle=gold;ctx.lineWidth=3;round(ctx,mx,my,mw,mh,18);ctx.stroke();
 ctx.textAlign="left";ctx.fillStyle=ink;ctx.font="700 36px Georgia, serif";ctx.fillText(d.map,mx+24,my+mh-26);
 if(d.season){ctx.textAlign="right";ctx.fillStyle=dim;ctx.font="600 28px "+sans;ctx.fillText(d.season,mx+mw-24,my+mh-28);}
 // Result
 let y=my+mh+(d.won?92:130);ctx.textAlign="center";ctx.fillStyle=d.won?gold:"#e59a7c";fit(ctx,d.title,W-140,88,"700");ctx.fillText(d.title,W/2,y);
 if(d.won){y+=66;ctx.font="56px "+sans;for(let i=0;i<3;i++){ctx.fillStyle=i<d.stars?gold:"#4b5a48";ctx.fillText("★",W/2+(i-1)*78,y);}}
 y+=50;ctx.fillStyle=ink;ctx.font="600 32px "+sans;ctx.fillText(d.sub,W/2,y);
 // Commander + best tower
 y+=22;const rows=[];if(d.commander)rows.push(["Commander",d.commander.name,fmt(d.commander.damage)+" dmg"]);if(d.best)rows.push(["Best tower",d.best.name,fmt(d.best.damage)+" dmg"]);
 for(const [label,name,val] of rows){y+=12;ctx.fillStyle="#ffffff10";round(ctx,70,y,W-140,68,14);ctx.fill();
  ctx.textAlign="left";ctx.fillStyle=dim;ctx.font="600 20px "+sans;ctx.fillText(label.toUpperCase(),96,y+26);ctx.fillStyle=ink;fit(ctx,name,W-460,28,"700",sans);ctx.fillText(name,96,y+56);
  ctx.textAlign="right";ctx.fillStyle=gold;ctx.font="700 30px "+sans;ctx.fillText(val,W-96,y+46);y+=68;}
 // Stat grid
 y+=18;const cw=(W-140-20)/2;
 d.stats.forEach(([k,v],i)=>{const x=70+(i%2)*(cw+20),yy=y+Math.floor(i/2)*86;ctx.fillStyle="#ffffff0c";round(ctx,x,yy,cw,76,14);ctx.fill();
  ctx.textAlign="left";ctx.fillStyle=dim;ctx.font="600 20px "+sans;ctx.fillText(k.toUpperCase(),x+24,yy+28);ctx.fillStyle=ink;ctx.font="700 32px "+sans;ctx.fillText(v,x+24,yy+64);});
 // Footer
 ctx.textAlign="center";ctx.fillStyle=dim;ctx.font="600 24px "+sans;ctx.fillText(d.url?d.url.replace(/^https?:\/\//,"").replace(/\/$/,""):"Deep Cuts Game Lab",W/2,H-56);
}
