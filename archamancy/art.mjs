// Original cached procedural sprites and purely cosmetic combat illustrations.
export function createArt(ctx){
 const ink="#172722",metal="#7d8e85",stone="#aab0a0",gold="#ead49a",ice="#8ee5fb",violet="#ca9be9",fire="#ffb267",leaf="#a0d481";
 const school={W:gold,U:ice,B:violet,R:fire,G:leaf};
 const towerSchools={legion:"W",chapel:"W",judgment:"W",arcanum:"U",library:"U",mirror:"U",necropolis:"B",foundry:"B",hex:"B",pyre:"R",goblin:"R",storm:"R",grove:"G",beast:"G",thorn:"G"};
 const enemyKeys=["raider","runner","armored","wing","mage","regen","titan"],allyKeys=["legion","necropolis","goblin","beast","construct","bloom","marshal","quill","vesk","kragg","bramble"];
 function crown(a,y,c){poly(a,[[-7,y],[-7,y-7],[-3,y-3],[0,y-9],[3,y-3],[7,y-7],[7,y]],c);}
 function poly(a,points,fill,stroke=ink){a.beginPath();points.forEach(([x,y],i)=>i?a.lineTo(x,y):a.moveTo(x,y));a.closePath();a.fillStyle=fill;a.fill();if(stroke){a.strokeStyle=stroke;a.lineWidth=1.8;a.stroke();}}
 function oval(a,x,y,rx,ry,fill,stroke=null){a.beginPath();a.ellipse(x,y,rx,ry,0,0,Math.PI*2);a.fillStyle=fill;a.fill();if(stroke){a.strokeStyle=stroke;a.lineWidth=1.6;a.stroke();}}
 function rect(a,x,y,w,h,fill,stroke=ink){a.fillStyle=fill;a.fillRect(x,y,w,h);if(stroke){a.strokeStyle=stroke;a.lineWidth=1.5;a.strokeRect(x,y,w,h);}}
 function line(a,points,color,width=2){a.beginPath();points.forEach(([x,y],i)=>i?a.lineTo(x,y):a.moveTo(x,y));a.strokeStyle=color;a.lineWidth=width;a.lineCap="round";a.lineJoin="round";a.stroke();}
 function crystal(a,x,y,s,c){poly(a,[[x,y-s],[x+s*.58,y],[x,y+s],[x-s*.58,y]],c);poly(a,[[x,y-s],[x+s*.58,y],[x,y+s]],"#ffffff44",null);}
 function roof(a,y,c){poly(a,[[-25,y], [0,y-24],[25,y]],c);poly(a,[[0,y-24],[25,y],[6,y]],"#00000033",null);}
 function keep(a,top=-34,body=stone){rect(a,-19,top,38,-top+7,body);poly(a,[[10,top],[19,top],[19,7],[10,7]],"#00000033",null);rect(a,-7,-9,14,16,ink,null);for(let i=0;i<3;i++)line(a,[[-17,top+7+i*9],[-10,top+7+i*9]],"#ffffff55",1.5);}
 function flag(a,x,y,c){line(a,[[x,y],[x,y-24]],"#b6a486",2);poly(a,[[x,y-24],[x+15,y-20],[x,y-14]],c);}
 const cache=new Map();
 function makeSprite(key,draw,w=96,h=96){if(cache.has(key))return cache.get(key);const c=document.createElement("canvas");c.width=w;c.height=h;const a=c.getContext("2d");a.translate(w/2,h*.75);draw(a);cache.set(key,c);return c;}
 function towerModel(a,k,tier,branch){
  const c=school[towerSchools[k]];oval(a,0,10,28,11,"#10241eb0");poly(a,[[-27,1],[-18,-8],[18,-8],[27,1],[24,10],[-24,10]],"#637263");
  a.save();a.scale(1+(tier-1)*.065,1+(tier-1)*.09);
  switch(k){
   case "legion":keep(a,-25);for(const x of [-18,-5,8])rect(a,x,-31,10,9,stone);flag(a,13,-30,c);poly(a,[[-17,-15],[-4,-15],[-4,-3],[-10,4],[-17,-3]],gold);line(a,[[-10,-13],[-10,0]],"#fff4cb");break;
   case "chapel":keep(a,-34,"#d0c8ab");roof(a,-34,"#bc9a59");rect(a,-5,-28,10,17,"#ffe7a6");line(a,[[0,-59],[0,-41]],gold,4);line(a,[[-6,-52],[6,-52]],gold,4);break;
   case "judgment":poly(a,[[-13,7],[-10,-39],[0,-50],[10,-39],[13,7]],"#c6c4ad");line(a,[[0,-45],[0,-1]],"#fff2bd",3);poly(a,[[-7,-41],[0,-62],[7,-41]],gold);oval(a,0,-26,13,6,"#ead49a88");break;
   case "arcanum":keep(a,-22,"#658c9b");poly(a,[[-21,-23],[-15,-42],[-5,-33],[-10,-21]],"#b0d6dc");poly(a,[[21,-23],[15,-42],[5,-33],[10,-21]],"#b0d6dc");crystal(a,0,-39,18,c);break;
   case "library":rect(a,-23,-31,46,36,"#6b8593");roof(a,-32,"#324f69");for(let x=-18;x<19;x+=9)rect(a,x,-26,6,17,["#bc9177",ice,"#d4b46d"][(x+18)/9%3]);poly(a,[[-15,-35],[0,-29],[15,-35],[15,-23],[0,-17],[-15,-23]],"#f1e7c4");line(a,[[0,-29],[0,-17]],"#465c72");break;
   case "mirror":rect(a,-18,-31,36,36,"#4d697b");oval(a,0,-29,20,28,"#d3c9ae",ink);oval(a,0,-29,15,22,"#75bdd6","#314d67");line(a,[[-9,-17],[10,-40]],"#d3f9ff",3);crystal(a,0,-59,7,ice);break;
   case "necropolis":poly(a,[[-22,7],[-19,-29],[-10,-38],[0,-29],[10,-38],[19,-29],[22,7]],"#77728c");oval(a,0,-18,11,10,"#e0d7c3",ink);oval(a,-4,-19,3,3,ink);oval(a,4,-19,3,3,ink);rect(a,-4,-9,8,4,"#cfc6b0");crystal(a,0,-44,10,violet);break;
   case "foundry":rect(a,-22,-25,44,30,"#62616b");oval(a,0,-25,22,10,"#323745",ink);oval(a,0,-26,15,5,"#d7a0f5");rect(a,10,-48,10,23,"#797183");poly(a,[[-12,4],[-12,-10],[0,-17],[12,-10],[12,4]],"#352739");oval(a,0,-5,7,7,violet);break;
   case "hex":poly(a,[[-15,6],[-11,-38],[0,-53],[12,-36],[15,6]],"#65516d");poly(a,[[-20,-28],[0,-37],[20,-28],[11,-19],[-11,-19]],"#42374e");oval(a,0,-28,11,6,violet);oval(a,0,-28,3,6,ink);line(a,[[-10,-5],[0,-16],[10,-5]],violet,3);break;
   case "pyre":rect(a,-24,-15,48,20,"#82685b");oval(a,-10,-15,12,10,"#343b38",ink);poly(a,[[-15,-18],[-15,-33],[21,-33],[27,-26],[21,-18]],"#8d9691");oval(a,22,-25,6,9,"#332d28",ink);oval(a,22,-25,3,5,fire);poly(a,[[-15,-33],[-21,-45],[-10,-38],[-4,-52],[4,-33]],fire);break;
   case "goblin":poly(a,[[-25,5],[-19,-21],[0,-39],[19,-21],[25,5]],"#915d4b");poly(a,[[-25,5],[0,-39],[7,5]],"#b9835d");poly(a,[[-9,5],[0,-17],[10,5]],ink);flag(a,17,-24,fire);line(a,[[-22,4],[-28,-8]],"#bda788",3);break;
   case "storm":rect(a,-18,-15,36,20,"#79695c");poly(a,[[-15,-15],[-7,-42],[7,-42],[15,-15]],"#777c78");for(let y=-35;y<-12;y+=7)oval(a,0,y,12,3,"#e6b873",ink);crystal(a,0,-49,10,"#f8db83");line(a,[[-8,-55],[1,-65],[-1,-56],[10,-64]],"#fff5c9",3);break;
   case "grove":poly(a,[[-9,6],[-5,-30],[6,-30],[10,6]],"#927654");for(const [x,y,r] of [[-14,-24,15],[14,-24,15],[0,-40,17],[0,-22,21]])oval(a,x,y,r,r*.75,"#4e8251",ink);for(const [x,y] of [[-14,-28],[5,-42],[15,-19]])crystal(a,x,y,7,leaf);break;
   case "beast":poly(a,[[-27,6],[-21,-19],[0,-34],[20,-22],[27,6]],"#82775f");oval(a,0,-5,15,16,"#27372e",ink);poly(a,[[-20,-17],[-13,-33],[-8,-21],[8,-22],[15,-34],[21,-17]],"#a8b592");line(a,[[-8,4],[-13,-5]],"#d3cfb2",3);line(a,[[8,4],[13,-5]],"#d3cfb2",3);break;
   case "thorn":line(a,[[-18,6],[-10,-18],[3,-32],[0,-47]],"#61794f",9);line(a,[[13,7],[4,-12],[-7,-28],[0,-47]],"#9bad66",7);for(const [x,y] of [[-10,-18],[9,-9],[-6,-32],[5,-38]])poly(a,[[x-3,y+5],[x+13,y-12],[x+5,y+5]],leaf);crystal(a,0,-49,8,"#c5ef9b");break;
  }
  a.restore();
  if(branch==="A"){for(const x of [-23,23]){poly(a,[[x-5,6],[x-5,-18],[x,-26],[x+5,-18],[x+5,6]],c);if(tier===4)crystal(a,x,-28,5,"#f7e7ba");}}else if(branch==="B"){oval(a,0,-38,tier===4?26:22,8,c+"55",c);for(const x of [-17,17])crystal(a,x,-38,tier===4?9:6,c);}
  for(let i=0;i<tier;i++)oval(a,(i-(tier-1)/2)*6,12,2.6,2.6,c,ink);
 }
 function humanoid(a,c,skin,opts={}){
  const sw=opts.bulk?13:9;line(a,[[-4,-2],[-6,5]],"#242e2b",5);line(a,[[4,-2],[7,5]],"#242e2b",5);
  poly(a,[[-sw,-20],[sw,-20],[sw*.7,-3],[-sw*.7,-3]],c);poly(a,[[0,-20],[sw,-20],[sw*.7,-3],[0,-3]],"#00000044",null);
  oval(a,0,-25,7,8,skin,ink);
  if(opts.helmet){poly(a,[[-8,-27],[-5,-35],[5,-35],[8,-27],[8,-23],[-8,-23]],"#b2b9af");rect(a,-5,-26,10,3,ink,null);}
  if(opts.shield){poly(a,[[-14,-19],[-4,-20],[-3,-7],[-9,-2],[-15,-7]],opts.shield);line(a,[[-9,-18],[-9,-6]],"#e9dec1",2);}
  if(opts.staff){line(a,[[13,-38],[13,5]],"#9a8362",3);crystal(a,13,-38,6,opts.staff);}
  else {line(a,[[7,-13],[17,-19]],"#8f9389",4);line(a,[[13,-16],[22,-30]],"#e2e4d8",3);}
 }
 function beast(a,c,accent){oval(a,-5,-11,17,10,c,ink);line(a,[[-16,-7],[-17,4]],c,6);line(a,[[5,-7],[7,4]],c,6);line(a,[[-19,-12],[-26,-20]],c,5);poly(a,[[6,-18],[12,-30],[16,-22],[23,-28],[24,-10],[12,-5]],accent);oval(a,19,-16,2,2,"#fcf2b8");}
 function creature(a,k){
  switch(k){
   case "legion":humanoid(a,"#e2cc99","#e5bd93",{helmet:true,shield:gold});break;
   case "necropolis":humanoid(a,"#827393","#d8d7c1",{});oval(a,-3,-26,2,2,ink);oval(a,3,-26,2,2,ink);line(a,[[-6,-15],[6,-15]],"#e3decf",2);break;
   case "goblin":humanoid(a,"#bb7257","#90a86b",{});poly(a,[[-6,-29],[-15,-33],[-8,-23]],"#90a86b");poly(a,[[6,-29],[15,-33],[8,-23]],"#90a86b");break;
   case "beast":beast(a,"#827e61","#b9bc86");break;
   case "bloom":beast(a,"#668f54","#b1da79");crystal(a,-8,-25,9,"#b6f28a");break;
   case "construct":humanoid(a,"#788e8d","#acbbc0",{bulk:true,helmet:true});crystal(a,0,-13,6,ice);break;
   case "marshal":humanoid(a,"#f0dcaa","#e5bd93",{helmet:true,shield:gold});crown(a,-35,gold);flag(a,-14,-2,gold);break;
   case "quill":poly(a,[[-13,4],[-8,-22],[8,-22],[13,4]],"#3f6f9a");oval(a,0,-25,7,8,"#e2c3a0",ink);crown(a,-32,ice);line(a,[[14,-40],[14,4]],"#c2b07c",3);oval(a,14,-42,5,5,"#fff2b0","#a88f4f");break;
   case "vesk":poly(a,[[-14,4],[-8,-22],[8,-22],[14,4]],"#3a2f45");oval(a,0,-25,7,8,"#e4e0dc",ink);poly(a,[[-9,-24],[0,-38],[9,-24],[6,-19],[-6,-19]],"#d9d3e3");crown(a,-37,violet);line(a,[[13,-36],[13,4]],"#8d7aa3",3);crystal(a,13,-38,6,violet);break;
   case "kragg":humanoid(a,"#9b4a35","#c48766",{bulk:true});poly(a,[[-8,-31],[-12,-40],[-3,-33],[3,-33],[12,-40],[8,-31]],fire);line(a,[[9,-12],[22,-34]],"#d7d9d0",5);poly(a,[[16,-36],[28,-42],[24,-26]],"#e9ebe2");break;
   case "bramble":poly(a,[[-14,4],[-9,-22],[9,-22],[14,4]],"#4d7a41");oval(a,0,-25,7,8,"#b99a74",ink);for(const [x,y] of [[-9,-31],[0,-36],[9,-31]])oval(a,x,y,6,5,"#6c9c4f",ink);crystal(a,0,-40,5,leaf);line(a,[[13,-34],[13,4]],"#7e6544",4);break;
   case "runner":humanoid(a,"#b48b60","#d9ad89",{});poly(a,[[-8,-31],[0,-38],[8,-31]],"#9e5746");break;
   case "raider":humanoid(a,"#ae574a","#b8886f",{shield:"#9c5f4c"});break;
   case "armored":humanoid(a,"#7d8886","#9daba5",{helmet:true,shield:"#9ca6a0",bulk:true});break;
   case "mage":poly(a,[[-13,4],[-7,-22],[7,-22],[13,4]],"#765789");oval(a,0,-25,7,8,"#bc9b91",ink);poly(a,[[-10,-25],[0,-43],[10,-25]],"#624b79");line(a,[[14,-40],[14,4]],"#a7957c",3);crystal(a,14,-40,7,violet);break;
   case "wing":poly(a,[[-3,-14],[-27,-29],[-23,-8],[-14,-13],[-10,0],[0,-7]],"#9c7189");poly(a,[[3,-14],[27,-29],[23,-8],[14,-13],[10,0],[0,-7]],"#9c7189");oval(a,0,-13,8,12,"#68516c",ink);poly(a,[[-6,-21],[-10,-31],[0,-25],[10,-31],[6,-21]],"#786079");oval(a,-3,-18,2,2,fire);oval(a,3,-18,2,2,fire);break;
   case "regen":beast(a,"#61925c","#94ba6e");for(let x=-18;x<6;x+=9)poly(a,[[x,-15],[x+3,-28],[x+7,-15]],"#b5c988");break;
   case "titan":humanoid(a,"#927b72","#a68a79",{bulk:true,helmet:true,shield:"#bc9878"});poly(a,[[-8,-34],[-14,-46],[-2,-36],[2,-36],[14,-46],[8,-34]],"#c5b79e");crystal(a,0,-13,6,fire);break;
  }
 }
 function tower(t,p){const s=makeSprite("tower:"+t.kind+":"+t.tier+":"+(t.branch||"-"),a=>towerModel(a,t.kind,t.tier,t.branch),96,120);const scale=Math.min(1,p.y/71.25);ctx.drawImage(s,p.x-38*scale,p.y-71.25*scale,76*scale,95*scale);}
 function unit(k,x,y,opt={}){const s=makeSprite("unit:"+k,a=>creature(a,k),68,68),size=k==="titan"?61:["marshal","quill","vesk","kragg","bramble"].includes(k)?50:k==="bloom"?52:k==="wing"?46:40;ctx.save();oval(ctx,x,y+3,size*.28,4,"#10231d88");ctx.translate(x,y+(opt.flying?-14:0));ctx.scale(opt.dir<0?-1:1,1);const bob=opt.animate?Math.sin(opt.time*.4+(opt.id||0))*(opt.flying?2:1):0;ctx.drawImage(s,-size/2,-size*.75+bob,size,size);ctx.restore();const yy=y+(opt.flying?-14:0)-size*.65;const ww=size*.60;rect(ctx,x-ww/2,yy,ww,3,"#26332d",null);rect(ctx,x-ww/2,yy,ww*Math.max(0,Math.min(1,opt.hp||0)),3,opt.ally?"#94db93":"#e9a181",null);if(opt.ward) {ctx.strokeStyle="#f1d991aa";ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x,y-9,15,19,0,0,Math.PI*2);ctx.stroke();}}
 const projectileColors={strike:gold,arcane:ice,mirror:"#c1edff",hex:violet,splash:fire,chain:"#ffdf83",root:leaf,melee:"#f6e0bd",heal:"#b0efad"};
 function projectile(f,clock){
  const p=Math.max(0,Math.min(1,(clock-f.start)/f.duration)),c=projectileColors[f.kind]||gold;
  const x=f.x+(f.tx-f.x)*p,y=f.y+(f.ty-f.y)*p-(f.kind==="splash"?Math.sin(p*Math.PI)*40:0);
  ctx.save();ctx.globalAlpha=1-p*.25;
  if(f.kind==="chain"){const dx=f.tx-f.x,dy=f.ty-f.y;line(ctx,[[f.x,f.y],[f.x+dx*.25+dy*.05,f.y+dy*.25-dx*.05],[f.x+dx*.49-dy*.05,f.y+dy*.49+dx*.05],[f.x+dx*.75+dy*.04,f.y+dy*.75-dx*.04],[f.tx,f.ty]],c,3.5);line(ctx,[[f.x,f.y],[f.tx,f.ty]],"#fff3c5",1);}
  else if(f.kind==="melee"){ctx.strokeStyle=c;ctx.lineWidth=3;ctx.beginPath();ctx.arc(f.tx,f.ty-6,13,-1.8+p,0.9+p);ctx.stroke();}
  else if(f.kind==="strike"||f.kind==="root"){const dx=f.tx-f.x,dy=f.ty-f.y,len=Math.hypot(dx,dy)||1;line(ctx,[[x-dx/len*16,y-dy/len*16],[x,y]],c,3);oval(ctx,x,y,2.8,2.8,"#fff2d0");}
  else {const trail=Math.max(0,p-.18);line(ctx,[[f.x+(f.tx-f.x)*trail,f.y+(f.ty-f.y)*trail-(f.kind==="splash"?Math.sin(trail*Math.PI)*40:0)],[x,y]],c,f.kind==="splash"?5:3);oval(ctx,x,y,f.kind==="splash"?6:4,f.kind==="splash"?6:4,c);oval(ctx,x,y,2,2,"#fff7e1");}
  if(p>.72){const v=(p-.72)/.28;ctx.globalAlpha=(1-v)*.8;for(let i=0;i<5;i++){const a=i*Math.PI*2/5;line(ctx,[[f.tx+Math.cos(a)*v*5,f.ty+Math.sin(a)*v*5],[f.tx+Math.cos(a)*(5+v*12),f.ty+Math.sin(a)*(5+v*12)]],c,2);}}
  ctx.restore();
 }
 return {tower,unit,projectile,towerKeys:Object.keys(towerSchools),enemyKeys,allyKeys};
}
