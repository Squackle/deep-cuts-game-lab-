// Original cached procedural sprites and purely cosmetic combat illustrations.
export function createArt(ctx,{res:startRes=1}={}){
 const ink="#172722",metal="#7d8e85",stone="#aab0a0",gold="#ead49a",ice="#8ee5fb",violet="#ca9be9",fire="#ffb267",leaf="#a0d481";
 const school={W:gold,U:ice,B:violet,R:fire,G:leaf};
 const towerSchools={legion:"W",chapel:"W",judgment:"W",arcanum:"U",library:"U",mirror:"U",necropolis:"B",foundry:"B",hex:"B",pyre:"R",goblin:"R",storm:"R",grove:"G",beast:"G",thorn:"G"};
 const enemyKeys=["raider","runner","armored","wing","mage","regen","titan","stalker","warden","golem","grimgut","matron","colossus","hierophant","tyrant"],allyKeys=["legion","necropolis","goblin","beast","construct","bloom","drake","vampire","krenko","talrand","omnath","edgar","lightpaws","meren","teysa","korvold","atraxa","urdragon"];
 const commanderKeys=["krenko","talrand","omnath","edgar","lightpaws","meren","teysa","korvold","atraxa","urdragon"];
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
 let res=startRes;
 // Sprites are drawn at res× their layout size so they stay sharp on high-density and large screens.
 function setRes(r){r=Math.max(1,Math.min(4,r));if(r!==res){res=r;cache.clear();}}
 function makeSprite(key,draw,w=96,h=96){if(cache.has(key))return cache.get(key);const c=document.createElement("canvas");c.width=Math.round(w*res);c.height=Math.round(h*res);const a=c.getContext("2d");if(res!==1)a.scale(res,res);a.translate(w/2,h*.75);draw(a);cache.set(key,c);return c;}
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
   case "drake":poly(a,[[-3,-16],[-24,-28],[-18,-10],[-6,-12]],"#5f9ccf");poly(a,[[3,-16],[24,-28],[18,-10],[6,-12]],"#5f9ccf");oval(a,0,-12,7,11,"#3d78a8",ink);poly(a,[[-4,-21],[0,-30],[4,-21]],"#9fd2f2");break;
   case "vampire":humanoid(a,"#5b2230","#e6d9d2",{});poly(a,[[-9,-21],[0,-12],[9,-21],[9,-4],[-9,-4]],"#8e2f3e",null);break;
   case "krenko":humanoid(a,"#b8573c","#8fae63",{});poly(a,[[-6,-29],[-16,-34],[-8,-23]],"#8fae63");poly(a,[[6,-29],[16,-34],[8,-23]],"#8fae63");crown(a,-34,gold);break;
   case "talrand":poly(a,[[-13,4],[-8,-22],[8,-22],[13,4]],"#2f6c93");oval(a,0,-25,7,8,"#6fb7c9",ink);poly(a,[[-8,-27],[-14,-36],[-4,-31]],"#4aa3c6");poly(a,[[8,-27],[14,-36],[4,-31]],"#4aa3c6");line(a,[[14,-40],[14,4]],"#c2b07c",3);crystal(a,14,-41,6,ice);break;
   case "omnath":oval(a,0,-16,15,19,"#4f9a4a",ink);oval(a,0,-16,9,12,"#8ee06c");crystal(a,0,-38,8,leaf);for(const x of [-11,11])line(a,[[x,-10],[x*1.6,4]],"#3f7b3c",5);break;
   case "edgar":humanoid(a,"#3b2029","#ece2dc",{});poly(a,[[-14,-20],[-18,2],[0,-6],[18,2],[14,-20]],"#7c1f2c",null);crown(a,-34,"#d9c08a");break;
   case "lightpaws":beast(a,"#e9e2cf","#f3dc93");crystal(a,-8,-26,6,gold);line(a,[[-14,-20],[4,-20]],"#d6b85c",3);break;
   case "meren":poly(a,[[-14,4],[-8,-22],[8,-22],[14,4]],"#2e3b2f");oval(a,0,-25,7,8,"#c9b39a",ink);poly(a,[[-9,-26],[0,-38],[9,-26]],"#5d7a46");line(a,[[13,-36],[13,4]],"#8b7a5a",3);oval(a,13,-38,5,5,"#d9d4c3",ink);break;
   case "teysa":poly(a,[[-13,4],[-8,-22],[8,-22],[13,4]],"#e8e2d3");oval(a,0,-25,7,8,"#d9b9a1",ink);poly(a,[[-8,-29],[0,-35],[8,-29]],"#2a2530");line(a,[[13,-36],[13,4]],"#3b3442",3);crystal(a,13,-38,6,violet);break;
   case "korvold":beast(a,"#6b3a2c","#c86b4b");poly(a,[[-10,-20],[-24,-36],[-6,-26]],"#4c2a22");crown(a,-33,gold);break;
   case "atraxa":humanoid(a,"#e8e6dc","#f1e4d0",{});poly(a,[[-4,-18],[-30,-34],[-24,-8]],"#f4f1e6");poly(a,[[4,-18],[30,-34],[24,-8]],"#f4f1e6");for(const [x,c] of [[-9,gold],[-3,ice],[3,violet],[9,leaf]])oval(a,x,-36,2.6,2.6,c);break;
   case "urdragon":for(const [x,c] of [[-26,gold],[-14,ice],[14,fire],[26,leaf]])poly(a,[[0,-18],[x,-34],[x*.8,-10]],c);oval(a,0,-14,9,14,"#5a3f63",ink);poly(a,[[-5,-26],[0,-40],[5,-26]],"#7a4c6e");oval(a,-3,-24,2,2,fire);oval(a,3,-24,2,2,fire);break;
   case "stalker":humanoid(a,"#2d2a3a","#6e6880",{});poly(a,[[-9,-24],[0,-38],[9,-24],[7,-16],[-7,-16]],"#1d1b26");oval(a,-3,-25,1.8,1.8,"#b9f0ff");oval(a,3,-25,1.8,1.8,"#b9f0ff");break;
   case "warden":humanoid(a,"#6a7aa6","#c3b3a4",{helmet:true,shield:"#9fb7e8"});oval(a,-9,-12,7,7,"#ffffff22","#bfe8ff");break;
   case "golem":humanoid(a,"#6f6a62","#8d877c",{bulk:true});for(const [x,y] of [[-6,-15],[5,-9],[0,-27]])rect(a,x-3,y-3,6,6,"#a59d8f");break;
   case "grimgut":humanoid(a,"#a1402f","#b98a6c",{bulk:true,shield:"#7c3b2c"});crown(a,-34,"#d1a654");line(a,[[10,-12],[24,-36]],"#9a9a8e",5);break;
   case "matron":poly(a,[[-16,4],[-9,-24],[9,-24],[16,4]],"#2b2436");oval(a,0,-27,8,9,"#5a5368",ink);poly(a,[[-12,-26],[0,-44],[12,-26]],"#3b3049");for(const x of [-6,0,6])oval(a,x,-29,1.6,1.6,"#c9f3ff");break;
   case "colossus":humanoid(a,"#5d6268","#7c8389",{bulk:true,helmet:true,shield:"#8b9298"});rect(a,-12,-22,24,6,"#3e4246");crystal(a,0,-11,6,"#9fb4c1");break;
   case "hierophant":poly(a,[[-15,4],[-9,-24],[9,-24],[15,4]],"#5c3f7a");oval(a,0,-27,7,8,"#d9c8b6",ink);poly(a,[[-10,-28],[0,-46],[10,-28]],"#e2d6f2");line(a,[[15,-44],[15,4]],"#bda98a",3);oval(a,15,-46,6,6,"#00000000","#d7a6ff");break;
   case "tyrant":humanoid(a,"#3a3238","#5e555b",{bulk:true,helmet:true});poly(a,[[-10,-34],[-18,-50],[-4,-38],[4,-38],[18,-50],[10,-34]],"#a99c8d");crystal(a,-6,-13,5,"#76bdf1");crystal(a,6,-13,5,"#d9d3c3");break;
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
 // Wooden scaffolding for a tower under construction; k (0 to 1) is how far it has gone up.
 function scaffold(x,y,k){const h=62*Math.min(1,k),w=24;ctx.save();ctx.lineCap="round";ctx.strokeStyle="#4a3324";ctx.lineWidth=5;
  for(const dx of [-w,w]){ctx.beginPath();ctx.moveTo(x+dx,y+2);ctx.lineTo(x+dx*.82,y+2-h);ctx.stroke();}
  ctx.strokeStyle="#a9814f";ctx.lineWidth=3;for(const dx of [-w,w]){ctx.beginPath();ctx.moveTo(x+dx,y+2);ctx.lineTo(x+dx*.82,y+2-h);ctx.stroke();}
  ctx.strokeStyle="#c79d62";ctx.lineWidth=2.5;for(let yy=y-14;yy>y+2-h;yy-=20){const f=(y-yy)/78,dx=w*(1-.18*f);ctx.beginPath();ctx.moveTo(x-dx,yy);ctx.lineTo(x+dx,yy);ctx.stroke();ctx.beginPath();ctx.moveTo(x-dx,yy);ctx.lineTo(x+dx,yy-18);ctx.globalAlpha=.7;ctx.stroke();ctx.globalAlpha=1;}
  oval(ctx,x,y+4,30,8,"#10231d55");ctx.restore();}
 function sizeOf(k){return ["titan","grimgut","matron","colossus","hierophant","tyrant"].includes(k)?(k==="tyrant"?72:64):commanderKeys.includes(k)?(k==="urdragon"?62:50):k==="bloom"?52:k==="wing"?46:40;}
 function unit(k,x,y,opt={}){const s=makeSprite("unit:"+k,a=>creature(a,k),68,68),size=sizeOf(k);ctx.save();oval(ctx,x,y+3,size*.28,4,"#10231d88");ctx.translate(x,y+(opt.flying?-14:0));ctx.scale(opt.dir<0?-1:1,1);const bob=opt.animate?Math.sin(opt.time*.4+(opt.id||0))*(opt.flying?2:1):0;ctx.drawImage(s,-size/2,-size*.75+bob,size,size);ctx.restore();const yy=y+(opt.flying?-14:0)-size*.65;const ww=size*.60;rect(ctx,x-ww/2,yy,ww,3,"#26332d",null);rect(ctx,x-ww/2,yy,ww*Math.max(0,Math.min(1,opt.hp||0)),3,opt.ally?"#94db93":"#e9a181",null);if(opt.ward) {ctx.strokeStyle="#f1d991aa";ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x,y-9,15,19,0,0,Math.PI*2);ctx.stroke();}}
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
 // Status effects on enemies: a look that stays on the body for the whole duration, plus small icons over the health bar.
 // st = {burn, poison (stacks), freeze, curse}; t = time in ms.
 const STATUS={burn:"#ff8a3d",poison:"#79d158",freeze:"#9fe3ff",curse:"#b98af0"};
 function status(k,x,y,st,{flying=false,t=0,id=0}={}){const size=sizeOf(k),cy=y+(flying?-14:0),body=cy-size*.32,s=t/1000;
  if(st.curse){const rx=size*.38,ry=rx*.4,cx0=x,cy0=cy+3,r=s*1.4;ctx.globalAlpha=.85;ctx.strokeStyle=STATUS.curse;ctx.lineWidth=1.6;ctx.beginPath();ctx.ellipse(cx0,cy0,rx,ry,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();for(let i=0;i<=3;i++){const a=r+i*Math.PI*2/3,px=cx0+Math.cos(a)*rx,py=cy0+Math.sin(a)*ry;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.stroke();ctx.globalAlpha=1;
   ctx.globalAlpha=.55+.25*Math.sin(s*4+id);ctx.fillStyle=STATUS.curse;ctx.font="700 "+Math.round(size*.28)+"px Georgia,serif";ctx.textAlign="center";ctx.fillText("✶",x,body-size*.42);ctx.textAlign="start";ctx.globalAlpha=1;}
  if(st.freeze){ctx.globalAlpha=.28;oval(ctx,x,body,size*.3,size*.4,"#c8f1ff");ctx.globalAlpha=.9;for(let i=0;i<3;i++){const a=i*2.1+id,px=x+Math.cos(a)*size*.27,py=body+Math.sin(a)*size*.3;poly(ctx,[[px,py-4],[px+2.5,py],[px,py+4],[px-2.5,py]],"#e9fbff","#7cc9ec");}ctx.globalAlpha=1;}
  if(st.poison){for(let i=0;i<Math.min(3,st.poison);i++){const ph=((s*1.2+i*.37+id*.13)%1),px=x+(i-1)*size*.16,py=body-size*.05+ph*size*.45;ctx.globalAlpha=1-ph*.7;ctx.fillStyle=STATUS.poison;ctx.strokeStyle="#1d4a16";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px,py-6);ctx.quadraticCurveTo(px+4.5,py+1,px,py+3.5);ctx.quadraticCurveTo(px-4.5,py+1,px,py-6);ctx.fill();ctx.stroke();}ctx.globalAlpha=.22;oval(ctx,x,body,size*.26,size*.34,STATUS.poison);ctx.globalAlpha=1;}
  if(st.burn){for(let i=0;i<3;i++){const fl=Math.sin(s*14+i*2+id)*.5+.5,px=x+(i-1)*size*.17,base=body+size*.12,h=size*(.22+.14*fl);ctx.globalAlpha=.9;poly(ctx,[[px-4,base],[px,base-h],[px+4,base]],"#ff7a2e",null);poly(ctx,[[px-2,base],[px,base-h*.6],[px+2,base]],"#ffd36b",null);}ctx.globalAlpha=1;}
  const keys=["burn","poison","freeze","curse"].filter(k=>st[k]);if(!keys.length)return;const iy=cy-size*.65-7,w=keys.length*10;
  keys.forEach((kk,i)=>{const ix=x-w/2+5+i*10;oval(ctx,ix,iy,4.6,4.6,"#0d1712",null);oval(ctx,ix,iy,3.6,3.6,STATUS[kk],null);ctx.fillStyle="#0d1712";ctx.strokeStyle="#0d1712";ctx.lineWidth=1;
   if(kk==="burn")poly(ctx,[[ix-1.6,iy+2],[ix,iy-2.4],[ix+1.6,iy+2]],"#0d1712",null);
   else if(kk==="poison"){ctx.font="800 6px system-ui";ctx.textAlign="center";ctx.fillText(String(Math.min(9,st.poison)),ix,iy+2.2);ctx.textAlign="start";}
   else if(kk==="freeze"){for(let j=0;j<3;j++){const a=j*Math.PI/3;ctx.beginPath();ctx.moveTo(ix-Math.cos(a)*2.4,iy-Math.sin(a)*2.4);ctx.lineTo(ix+Math.cos(a)*2.4,iy+Math.sin(a)*2.4);ctx.stroke();}}
   else {ctx.beginPath();ctx.arc(ix,iy,1.5,0,Math.PI*2);ctx.fill();}});}
 return {scaffold,setRes,status,tower,unit,projectile,towerKeys:Object.keys(towerSchools),enemyKeys,allyKeys};
}
